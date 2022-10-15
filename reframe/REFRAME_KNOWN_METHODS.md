# ![Status: WIP](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Reframe: Known Methods

**Author(s)**:
- Adin Schmahmann
- Petar Maymounkov

**Maintainer(s)**:

* * *

**Abstract**

This document is defining known methods (request-response message types) and semantics.

## Organization of this document

- [Known Methods](#known-methods)
  - [Cachable/Non-Cachable Methods](#cachablenon-cachable-methods)
- [Message Specs](#message-specs)
  - [Error](#error)
  - [Identify](#identify)
    - [Identify DAG-JSON Examples](#identify-dag-json-examples)
  - [FindProviders](#findproviders)
    - [FindProviders DAG-JSON Examples](#findproviders-dag-json-examples)
  - [FindProvidersBlinded](#findproviders-blinded)
  - [GetIPNS](#getipns)
    - [GetIPNS DAG-JSON Examples](#getipns-dag-json-examples)
  - [PutIPNS](#putipns)
    - [PutIPNS DAG-JSON Examples](#putipns-dag-json-examples)
  - [Provide](#provide)
    - [Provide DAG-JSON Examples](#provide-dag-json-examples)
- [Method Upgrade Paths](#method-upgrade-paths)
- [Implementations](#implementations)

## Known Methods

The known Request types are the following and are described below:

```ipldsch
type Request union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "FindHashedSHA256Request" FindHashedSHA256Request
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
    | "FindHashedSHA256Response" FindHashedSHA256Response
    | "GetIPNSResponse" GetIPNSResponse
    | "PutIPNSResponse" PutIPNSResponse
    | "ProvideResponse" ProvideResponse
    | "Error" Error
}
```

Note: Each Request type has a corresponding Response type.
Every message except the Error type should end in Request/Response.

### Cachable/Non-Cachable Methods

The following methods (request-response pairs) are _cachable_:

```ipldsch
type CachableRequest union {
    | "IdentifyRequest" IdentifyRequest
    | "FindProvidersRequest" FindProvidersRequest
    | "FindHashedSHA256Request" FindHashedSHA256Request
    | "GetIPNSRequest" GetIPNSRequest
}
```

Methods that are not listed above are considered _non-cachable_.

Implementations are encouraged to improve performance of  `CachableRequest` methods by applying transport and method-specific caching strategies.

## Message Specs

### Error

The Error message type should be used in Responses to indicate that an error has occurred.

```ipldsch
    type Error struct {
        Method String
    }
```

### Identify

A message for discovering which messages a server supports. May be used by applications to optimize which servers get sent which types of requests.

```ipldsch
    type IdentifyRequest struct {}

    type IdentifyResponse struct {
        Methods [String]
    }
```

`IdentifyResponse` should return the set of supported methods aside from the "Identify" method.

#### Identify DAG-JSON Examples

Request:
```json
{"IdentifyRequest" : {}}
```

Response:
```json
{"IdentifyResponse" : {
    "Methods" : ["FindProviders", "GetIPNS"]
}}
```

### FindProviders

A message for finding nodes that have an interest in a given key. Some common examples include finding which peers have advertised that they have a given CID, or which peers are interested in a given pubsub topic.

```ipldsch
    type FindProvidersRequest struct {
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
     | AuthenticatedPeer "apeer"  # This type will be returned in blinded queries
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

#### FindProviders DAG-JSON Examples

Request:
```json
{"FindProviders" : {
    "Key" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```json
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
                    { "2320" : {
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

### FindProviders Blinded

A message for finding nodes with interest in a given key using double hashing to blind the key being requested.

```ipldsch
    type FindHashedSHA256Request struct {
        Query Bytes
    }
```

The query is a derived hash of the multihash being requested.
It is constructed by taking the raw bytes of the multihash, prepending the ascii bytes "CR_DOUBLEHASH", and taking the SHA256 hash of that data.
The resulting digest is then packed itself into a multihash, using the multihash code identifier multihash.DBL_SHA2_256.

The full semantics of double hashing in the context of content routing are described at https://www.notion.so/protocollabs/IPFS-Double-Hashing-Repurpose-8fdaae8748414ae592a5d24d59c0d8ed

```ipldsch
    type FindHashedSHA256Response struct {
        Providers [Provider]
    }

    type AuthenticatedPeer struct {
        // ID is included in this superset of 'Peer'
        ID Bytes // Enc_{MH}(PeerID || 0[32bytes]) 
        // Multiaddresses may be set as a hint if the server knows the publisher.
        Multiaddresses optional [Bytes]

        Signature Bytes // signature of ID field by the publisher's PeerID.
    }
}
```


### GetIPNS

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

#### GetIPNS DAG-JSON Examples

Request:
```json
{"GetIPNS" : {
    "ID" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```json
{"GetIPNS" : {
    "Record" : {"/":{"bytes":"firstRecord"}}
}}{"GetIPNS" : {
    "Record" : {"/":{"bytes":"laterRecord"}}
}}
```

### PutIPNS

A message for putting the latest IPNS records for a given identifier.

```ipldsch
    type PutIPNSRequest struct {
        ID Bytes # IPNS Identifier
        Record Bytes # IPNS record
    }
    
    type PutIPNSResponse struct {}
```

#### PutIPNS DAG-JSON Examples

Request:
```json
{"PutIPNSRequest" : {
    "ID" : {"/":{"bytes":"AXIUBPnagss"}},
    "Record" : {"/":{"bytes":"AXIUBPnagss"}}
}}
```

Response:
```json
{"PutIPNSResponse : {}"}
```

### Provide

A message for indicating that the client is able to act as a provider for a given key.

```ipldsch
    type ProvideRequest struct 
        Key [&Any]
        Provider Provider
        Timestamp Integer
        AdvisoryTTL Integer
        Signature Bytes
    }

    type ProvideResponse struct {
        AdvisoryTTL Integer
    }
```

Note: While keys are formatted as CIDs, it is highly recommended that server implementations treat these requests at the multihash level - subsequent calls to `FindProviders` should be multicodec agnostic.

There are a few semantics relevant to the construction of a ProvideRequest:

* The timestamp should be the current unix timestamp, encoded in an int64
* AdvistoryTTL may list the time for which the provider desires the content will remain available. If the provider cannot not anticipate how long the content will remain available, it may use a 0 value for this field.
* The AdvisoryTTL response may provide an expectation from the reframe endpoint of how long the content will remain available.
  * If it is less than the requested TTL from the request, it indicates that the client should re-issue a ProvideRequest for the content by that point.
  * If it is greater than the clients request, it indicates that the client may be perceived as responsible for the content for up to that amount of time.
  * If it is 0, the endpoint is indicating it cannot make any claims about the lifetime of the request.
* Construction of the Signature is performed as follows:
  1. Create the ProviderRequest struct, with empty bytes for Signature
  2. Serialize the ProviderRequest as DagJSON
  3. Hash the serialization with Sha256
  4. Sign the Hash using the keypair associated with the Provider.ID


#### Provide DAG-JSON Examples

Request:
```json
{"ProvideRequest" : {
    "Key" : [{"/":{"bytes":"AXIUBPnagss"}}],
    "Provider" : {
        "Peer":{
            "ID": {"/":{"bytes":"EncodedPeerID"}},
            "Multiaddresses" [{"/":{"bytes":"Encoded Multiaddr"}}]
        },
        "ProviderProto": [
            { "2304" : {} }
        ]
    },
    "Timestamp" : 1589788800,
    "AdvisoryTTL": 3600,
    "Signature": {"/":{"bytes":"Encoded Signature"}}
}}
```

Response:
```json
{"ProvideResponse : {
    AdvisoryTTL: 3600
}"}
```

## Method Upgrade Paths

It is acknowledged that the initial methods and mechanisms of this protocol will likely need to change over time and that we should prepare for how to do so without the need to wholesale replace this protocol with an alternative.

2. If it is desired to add optional parameters to a given method (in either a request or response) new fields can be added. It is recommended that new fields be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Field`).
3. New methods can be added in the event a new method needs to be added, or an existing one changed in a way which would be backwards incompatible. It is recommended that new methods be submitted to this spec to prevent conflicts and for unsubmitted features to be added using namespaces unlikely to conflict (e.g. `MyProject-Method`).

## Implementations

[go-delegated-routing](https://github.com/ipfs/go-delegated-routing)
