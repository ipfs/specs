# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Reframe

**Author(s)**:
- Adin Schmahmann
- Petar Maymounkov

**Maintainer(s)**:

* * *

**Abstract**

The Reframe protocol is designed for request-response messages that is sufficiently generic and extensible to evolve over time as new needs for it arise. This includes separately defining the transport and message serialization mechanisms from the actual method types and semantics.

The initial use case motivating the protocol's design is to help peers discover various routing hints that enable them to find the content or service they are actually looking for. The extensibility required in this case is that various routing systems could share the protocol so that applications can work on them generically and that recursive routing systems could choose to use the protocol themselves to maximize interoperability.

# Organization of this document

- [Introduction](#introduction)
- [Spec](#spec)
- [Intended Upgrade Paths](#intended-upgrade-paths)
- [Implementations](#implementations)

# Introduction

The Reframe protocol is a request-response based protocol. Upon receiving a request a Reframe server should respond to clients with information they have pertaining to the request. It's possible that a Reframe server may not have all of the information necessary for a client to actually get the data they need, but even partial resolution is acceptable. For example, if a peer is looking to download some block of data a Reframe server may only know about some peers that have the data but not their network addresses. That's ok and the client can always choose alternative mechanisms to discover the missing information. 

# Spec

To build an implementation of the protocol it is required to both define a transport for the messages and the method types supported by the given implementation. Over time both the method and transport types may grow and also be included in this specification.

## Interaction Pattern

Given that a client C wants to request information from some server S:

1. C opens sends a request to S that is a single message
2. S will respond to C with either a single message or a group of messages

## Cachability

Some methods are prone to being cachable while others are not. Methods are tagged within the spec as cachable/not cachable. Transports may leverage that information to decide if cachable/not cachable methods should be treated differently.

## Transports

### HTTP + DAG-JSON

All messages sent in HTTP body MUST be encoded as DAG-JSON and use explicit content type `application/vnd.ipfs.rpc+dag-json; version=1`

Requests MUST be sent as either:
- `GET /reframe/{mbase64url-dag-cbor}`
  - Cacheable HTTP `GET` requests with message passed as DAG-CBOR in HTTP path segment, encoded as URL-safe [`base64url` multibase](https://docs.ipfs.io/concepts/glossary/#base64url) string
  - Suitable for sharing links, sending smaller messages, and when a query result MUST benefit from HTTP caching (see _HTTP Caching Considerations_ below).
- `POST /reframe`
  - Ephemeral HTTP `POST` request with message passed as DAG-JSON in HTTP request body
  - Suitable for bigger messages, and when HTTP caching should be skipped for the most fresh results

Severs MUST support `GET` for methods marked as cacheable and MUST support `POST` for all methods (both cacheable and not-cacheable). This allows clients to use `POST` as a fallback in case there is a technical problem with bigger Reframe messages not fitting in a `GET` URL.

If a server supports HTTP/1.1, then it MAY send chunked-encoded messages. Clients supporting HTTP/1.1 MUST accept chunked-encoded responses.

Requests and Responses MUST occur over a single HTTP call instead of the server being allowed to dial back the client with a response at a later time.

If a server chooses to respond to a single request message with a group of messages in the response it should do so as a set of `\n` delimited DAG-JSON messages (i.e. `{Response1}\n{Response2}...`).

Requests and responses MUST come with `version=1` as a _Required Parameter_  in the `Accept` and `Content-Type` HTTP headers.

Note: This version header is what allows the transport to more easily evolve over time (e.g. if it was desired to change the transport to support other encodings than DAG-JSON, utilize headers differently, move the request data from the body, etc.). Not including the version number is may lead to incompatibility with future versions of the transport.

#### HTTP Caching Considerations

**POST vs GET**

HTTP `POST` requests do not benefit from any preexisting HTTP caching because
every `POST` response will overwrite the cached resource.

While it is possible to write custom middleware to cache `POST` responses based on
request body, this is not a standard behavior and is discouraged.

Use of `GET` endpoint is not mandatory, but suggested if a Reframe deployment
expects to handle the same message query multiple times, and want to leverage
existing HTTP tooling to maximize HTTP cache hits.

**Avoiding sending the same response messages twice**

Implementations MUST always return strong
[`Etag`](https://httpwg.org/specs/rfc7232.html#header.etag) HTTP header based
on digest of DAG-JSON response messages. This allows clients to send
inexpensive conditional requests with
[`If-None-Match`](https://httpwg.org/specs/rfc7232.html#header.if-none-match)
header, which will skip when the response message did not change.

**Client controls for time-based caching**

Implementations MUST always return
[`Last-Modified`](https://httpwg.org/specs/rfc7232.html#header.last-modified)
HTTP header, allowing clients to send conditional requests with
[`If-Modified-Since`](https://httpwg.org/specs/rfc7232.html#header.if-modified-since)
header to specify their acceptance for stale (cached) responses.

**Rate-limiting non-cachable POST requests**

HTTP endpoint can return status code
[429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4)
with `Retry-After` header to throttle the number of `POST` requests a client can send.

The body returned with `429` response should suggest use of HTTP `GET` endpoint
for cacheable Reframe methods:

```
HTTP/1.1 429 Too Many Requests
Content-Type: text/plain
Retry-After: 3600

too many POST requests: consider switching to cachable GET or try again later (see Retry-After header)
```

## Protocol Message Overview

We can represent each message as an IPLD Schema to denote its abstract representation independent of the serialization scheme. 

To help visualize example messages and illustrate implementation of the first concrete transport (HTTP + DAG-JSON) example messages will be given in DAG-JSON.

The payload sent as a request is a single message. The response is a repeated set of messages until the transport signals that the response is completed (e.g. closing a stream, connection, etc.)

Reception, on the server or client side, of:
1. New or unknown fields in any request or response message are ignored (rather than causing an error)
2. Missing fields or unknown union cases cause a terminal error

### Known Methods

The known Request types are the following and are described below:

```ipldsch
type Request union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "GetIPNSRequest" GetIPNSRequest
    | "PutIPNSRequest" PutIPNSRequest
}
```

The known Response types are the following and are described below:

```ipldsch
type Response union {
    | "IdentifyResponse" IdentifyResponse
    | "FindProvidersResponse" FindProvidersResponse
    | "GetIPNSResponse" GetIPNSResponse
    | "PutIPNSResponse" PutIPNSResponse
    | "Error" Error
}
```

Note: Each Request type has a corresponding Response type.
Every message except the Error type should end in Request/Response.

#### Cachable/Non-Cachable Methods

The following method responses are _cachable_:

```ipldsch
type CachableRequest union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "GetIPNSRequest" GetIPNSRequest
}
```

Methods that are not listed above are considered _non-cachable_.

Implementations are encouraged to improve performance of  `CachableRequest` methods by applying transport and method-specific caching strategies.
#### Error

The Error message type should be used in Responses to indicate that an error has occurred.

```ipldsch
    type Error struct {
        Method String
    }
```

#### Identify

A message for discovering which messages a server supports. May be used by applications to optimize which servers get sent which types of requests.

```ipldsch
    type IdentifyRequest struct {}

    type IdentifyResponse struct {
        Methods [String]
    }
```

`IdentifyResponse` should return the set of supported methods aside from the "Identify" method.

##### DAG-JSON Examples

Request:
```
{"IdentifyRequest" : {}}
```

Response:
```
{"IdentifyResponse" : {
    "Methods" : ["FindProviders", "GetIPNS"]
}}
```

#### FindProviders

A message for finding nodes that have an interest in a given key. Some common examples include finding which peers have advertised that they have a given CID, or which peers are interested in a given pubsub topic.

```ipldsch
    type FindProvidersRequest struct 
        Key &Any
    }
```

Note: While the Key is a CID it is highly recommended that server implementations treat these FindProvidersRequests as if they were for the multihash. This allows consumers that perform lookups by CID but with a different IPLD codec than one that is known to the server to still get back valid responses.

```ipldsch
    type FindProvidersResponse struct {
        Providers [Provider]
    }

    type Provider struct {
     Node Node
     Proto optional [TransferProtocol]
     }

    # Note: This is not quite valid IPLD Schema because having fallbacks within unions is not yet implemented and codified https://github.com/ipld/ipld/issues/194. We will use this syntax within this spec though.

    # Node describes a node (identity, network address, authentication, whatever else applies)
    # We expect different types of nodes, e.g. peer, miner, public IP, etc.
    type Node union {
     | Peer "peer"
     | Any default
    } representation keyed

    type Peer struct {
        ID Bytes # The binary representation of a libp2p peerID https://github.com/libp2p/specs/blob/f433ad595224cf33d916c166d1738f11aadfa9f7/peer-ids/peer-ids.md
        Multiaddresses optional [Bytes] # Each element in the list is the binary representation of a complete multiaddr without a peerID suffix
                                        # https://github.com/multiformats/multiaddr/blob/d02c681171629912dd977f4f5d4b3b72dcac507f/README.md
                                        # https://github.com/libp2p/specs/blob/98e0ca0e54fd83f7b8c86d7e9677e1e430da5810/addressing/README.md#multiaddr-in-libp2p
    }

    type TransferProtocol union {
        | Bitswap "2304" # Table entry interpretted as decimal string https://github.com/multiformats/multicodec/blob/f5dd49f35b26b447aa380e9a491f195fd49d912c/table.csv#L133
        | GraphSync-FILv1 "2320" # Table entry interpretted as decimal string https://github.com/multiformats/multicodec/blob/f5dd49f35b26b447aa380e9a491f195fd49d912c/table.csv#L134
        | Any default
    } representation keyed 
    
    type Bitswap struct {}
    
    type GraphSync-FILv1 struct {
        PieceCID Link  # Taken from: https://github.com/filecoin-project/index-provider/blob/305bfab501d8850a5b6761df7af6c38ba2359a85/metadata/graphsync_filecoinv1.ipldsch
        VerifiedDeal Bool
        FastRetrieval Bool
    }
```

##### DAG-JSON Examples

Request:
```
{"FindProviders" : {
    "Key" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```
{"FindProviders" : {
    "Key" : {"/":{"bytes":"AXIUBPnagss"}},
    "Providers" : [
        {"Node":{"Peer":{"ID":{
            "/":{"bytes":"EncodedPeerID"}},
            "Multiaddresses":[{"/":{"bytes":"EncodedAddr1"}}, {"/":{"bytes":"EncodedAddr2"}}]}}},
        {"Node":{"Peer":{"ID":{
            "/":{"bytes":"EncodedPeerID2"}},
            "Multiaddresses":[{"/":{"bytes":"EncodedAddr1"}}, {"/":{"bytes":"EncodedAddr2"}}]}}},
                "Proto" : [
                    { "2320" : { # the integer of the graphsync-filv1 code
                            "PieceCID" : {"/": "bsome-base32-CidV1"},
                            "VerifiedDeal" : true,
                            "FastRetrieval" : false
                        }
                    },
                    { "2304" : {} }
                ]
    ]
}}
```

#### GetIPNS

A message for finding the latest IPNS records for a given identifier.

```ipldsch
    type GetIPNSRequest struct {
        ID Bytes # An IPNS Identifier, matches a peerID https://github.com/libp2p/specs/blob/f433ad595224cf33d916c166d1738f11aadfa9f7/peer-ids/peer-ids.md
    }
```

```ipldsch
    type GetIPNSResponse struct {
        Record Bytes # An IPNS record
    }
```

##### DAG-JSON Examples

Request:
```
{"GetIPNS" : {
    "ID" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```
{"GetIPNS" : {
    "Record" : {"/":{"bytes":"firstRecord"}}
}}{"GetIPNS" : {
    "Record" : {"/":{"bytes":"laterRecord"}}
}}...
```

#### PutIPNS

A message for putting the latest IPNS records for a given identifier.

```ipldsch
    type PutIPNSRequest struct {
        ID Bytes # IPNS Identifier
        Record Bytes # IPNS record
    }
    
    type PutIPNSResponse struct {}
```

##### DAG-JSON Examples

Request:
```
{"PutIPNSRequest" : {
    "ID" : {"/":{"bytes":"AXIUBPnagss"}},
    "Record" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```
{"PutIPNSResponse : {}"}
```

# Method Upgrade Paths

It is acknowledged that the initial methods and mechanisms of this protocol will likely need to change over time and that we should prepare for how to do so without the need to wholesale replace this protocol with an alternative.

2. If it is desired to add optional parameters to a given method (in either a request or response) new fields can be added. It is recommended that new fields be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Field`).
3. New methods can be added in the event a new method needs to be added, or an existing one changed in a way which would be backwards incompatible. It is recommended that new methods be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Method`).

# Implementations

https://github.com/ipfs/go-delegated-routing
