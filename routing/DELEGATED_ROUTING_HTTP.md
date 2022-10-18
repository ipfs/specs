# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Delegated Routing HTTP API

**Author(s)**:
- Gus Eggert

**Maintainer(s)**:

* * *

**Abstract**

"Delegated routing" is a mechanism for IPFS implementations to use for offloading content routing to another process/server. This spec describes an HTTP API for delegated routing.

# Organization of this document

- [Introduction](#introduction)
- [Spec](#spec)
  - [Interaction Pattern](#interaction-pattern)
  - [Cachability](#cachability)
  - [Transports](#transports)
  - [Protocol Message Overview](#protocol-message-overview)
    - [Known Methods](#known-methods)
- [Method Upgrade Paths](#method-upgrade-paths)
- [Implementations](#implementations)

# API Specification
By default, the Delegated Routing HTTP API uses the `application/json` content type. Clients and servers may optionally negotiate other content types such as `application/cbor`, `application/vnd.ipfs.rpc+dag-json`, etc. using the standard `Accept` and `Content-Type` headers.

- `GET /v1/providers/{CID}`
    - Reframe equivalent: FindProviders
    - Response
        
        ```json
        {
        	"Providers": [
        		{
        			"PeerID": "...",
        			"Multiaddrs": ["...", "..."]
        			"Protocols": [
        				{
        					"Codec": 2320,
        					"Payload": <opaque data>
        				}
        			]
        		}
        	]
        	"NextPageToken": "<token>"
        }
        ```
        
    - Default limit: 100 providers
    - Optional query parameters
        - `transfer` only return providers who support the passed transfer protocols, expressed as a comma-separated list of multicodec IDs such as `2304,2320`,
        - `transport` only return providers whose published multiaddrs explicitly support the passed transport protocols, such as `/quic` or `/tls/ws`.
- `GET /v1/providers/hash/{multihash}`
    - This is the same as `GET /v1/providers/{CID}`, but takes a hashed CID encoded as a multihash
- `GET /v1/ipns/{ID}`
    - Reframe equivalent: GetIPNS
    - Response
        - record bytes
- `POST /v1/ipns/{ID}`
    - Reframe equivalent: PutIPNS
    - Body
        - record bytes
    - No need for idempotency
- `PUT /v1/providers/{CID}`
    - Reframe equivalent: Provide
    - Body
        
        ```json
        {
        	"Keys": ["cid1", "cid2"],
        	"Timestamp": 1234,
        	"AdvisoryTTL": 1234,
        	"Signature": "multibase bytes",
        	"Provider": {
        		"Peer": {
        			"ID": "peerID",
        			"Addrs": ["multiaddr1", "multiaddr2"]
        		},
        		"Protocols": [
        			{
        				"Codec": 1234,
        				"Payload": <opaque data>
        			}
        		]
        	}
        }
        ```
        
    - Idempotent
- `GET /v1/ping`
    - This is absent from Reframe but is necessary for supporting e.g. the accelerated DHT client which can take many minutes to bootstrap
    - Returns 200 once the server is ready to accept requests
    - An alternate approach is w/ an orchestration dance in the server by not listening on the socket until the dependencies are ready, but this makes the “dance” easier to implement
- Pagination
    - Responses with collections of results must have a default limit on the number of results that will be returned in a single response
    - Servers may optionally implement pagination by responding with an opaque page token which, when provided as a subsequent query parameter, will fetch the next page of results.
    - Clients may continue paginating until no `NextPageToken` is returned.
    - Clients making calls that return collections may limit the number of per-page results returned with the `limit` query parameter, i.e. `GET /v1/providers/{CID}?limit=10`
    - Additional filtering/sorting operations may be defined on a per-path basis, as needed
