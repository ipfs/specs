# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Reframe: Known Methods

**Author(s)**:
- Adin Schmahmann
- Petar Maymounkov

**Maintainer(s)**:

* * *

**Abstract**

This document is defining known methods (request-response message types) and semantics.

# Organization of this document

- [Known Methods](#known-methods)
  - [Cachable/Non-Cachable Methods](#cachablenon-cachable-methods)
- [Message Specs](#message-specs)
  - [Error](#error)
  - [Identify](#identify)
    - [DAG-JSON Examples](#dag-json-examples)
  - [FindProviders](#findproviders)
    - [DAG-JSON Examples](#dag-json-examples-1)
  - [GetIPNS](#getipns)
    - [DAG-JSON Examples](#dag-json-examples-2)
  - [PutIPNS](#putipns)
    - [DAG-JSON Examples](#dag-json-examples-3)
- [Method Upgrade Paths](#method-upgrade-paths)
- [Implementations](#implementations)

# Known Methods

The known Request types are the following and are described below:

```ipldsch
type Request union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "GetIPNSRequest" GetIPNSRequest
    | "PutIPNSRequest" PutIPNSRequest
    | "ProvideRequest" ProvideRequest
}
```

The known Response types are the following and are described below:

```ipldsch
type Response union {
    | "IdentifyResponse" IdentifyResponse
    | "FindProvidersResponse" FindProvidersResponse
    | "GetIPNSResponse" GetIPNSResponse
    | "PutIPNSResponse" PutIPNSResponse
    | "ProvideResponse" ProvideResponse
    | "Error" Error
}
```

Note: Each Request type has a corresponding Response type.
Every message except the Error type should end in Request/Response.

## Cachable/Non-Cachable Methods

The following methods (request-response pairs) are _cachable_:

```ipldsch
type CachableRequest union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "GetIPNSRequest" GetIPNSRequest
}
```

Methods that are not listed above are considered _non-cachable_.

Implementations are encouraged to improve performance of  `CachableRequest` methods by applying transport and method-specific caching strategies.

# Message Specs

## Error

The Error message type should be used in Responses to indicate that an error has occurred.

```ipldsch
    type Error struct {
        Method String
    }
```

## Identify

A message for discovering which messages a server supports. May be used by applications to optimize which servers get sent which types of requests.

```ipldsch
    type IdentifyRequest struct {}

    type IdentifyResponse struct {
        Methods [String]
    }
```

`IdentifyResponse` should return the set of supported methods aside from the "Identify" method.

### DAG-JSON Examples

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

## FindProviders

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

### DAG-JSON Examples

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

## GetIPNS

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

### DAG-JSON Examples

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

## PutIPNS

A message for putting the latest IPNS records for a given identifier.

```ipldsch
    type PutIPNSRequest struct {
        ID Bytes # IPNS Identifier
        Record Bytes # IPNS record
    }
    
    type PutIPNSResponse struct {}
```

### DAG-JSON Examples

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

#### Provide

A message for indicating that the client is able to act as a provider for a given key.

```ipldsch
    type ProvideRequest struct 
        Key &Any
        Providers [Provider]
    }

    type ProvideResponse struct {}
```

Note: While the Key is a CID it is highly recommended that server implementations treat these Requests as if they were for the multihash.

##### DAG-JSON Examples

Request:
```
{"ProvideRequest" : {
    "Key" : {"/":{"bytes":"AXIUBPnagss"}},
    "Providers" : [
        {"Node":{"Peer":{"ID":{
            "/":{"bytes":"EncodedPeerID"}}
        }}}
    ]
}}
```

Response:
```
{"ProvideResponse : {}"}
```

# Method Upgrade Paths

It is acknowledged that the initial methods and mechanisms of this protocol will likely need to change over time and that we should prepare for how to do so without the need to wholesale replace this protocol with an alternative.

2. If it is desired to add optional parameters to a given method (in either a request or response) new fields can be added. It is recommended that new fields be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Field`).
3. New methods can be added in the event a new method needs to be added, or an existing one changed in a way which would be backwards incompatible. It is recommended that new methods be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Method`).

# Implementations

https://github.com/ipfs/go-delegated-routing
