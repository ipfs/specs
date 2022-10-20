# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Delegated Content Routing HTTP API

**Author(s)**:
- Gus Eggert

**Maintainer(s)**:

* * *

**Abstract**

"Delegated content routing" is a mechanism for IPFS implementations to use for offloading content routing to another process/server. This spec describes an HTTP API for delegated routing.

# API Specification
The Delegated Content Routing Routing HTTP API uses the `application/json` content type by default. Clients and servers *should* support `application/cbor`, which can be negotiated using the standard `Accept` and `Content-Type` headers.

## Common Data Types:

- CIDs are always encoded using a [multibase](https://github.com/multiformats/multibase)-encoded [CIDv1](https://github.com/multiformats/cid#cidv1).
- Multiaddrs are encoded according to the [human-readable multiaddr specification](https://github.com/multiformats/multiaddr#specification)
- Peer IDs are encoded according [PeerID string representation specification](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#string-representation)
- Multibase bytes are encoded according to [the Multibase spec](https://github.com/multiformats/multibase), and *should* use Base64.

## API
- `GET /v1/providers/{CID}`
    - Response
        
        ```json
        {
            "Providers": [
                {
                    "PeerID": "12D3K...",
                    "Multiaddrs": ["/ip4/.../tcp/.../p2p/...", "/ip4/..."],
                    "Protocols": [
                        {
                            "Codec": 2320,
                            "Payload": { ... }
                        }
                    ]
                }
            ]
        }
        ```
        
    - Default limit: 100 providers
    - Optional query parameters
        - `transfer` only return providers who support the passed transfer protocols, expressed as a comma-separated list of [multicodec codes](https://github.com/multiformats/multicodec/blob/master/table.csv) in decimal form such as `2304,2320`
        - `transport` only return providers whose published multiaddrs explicitly support the passed transport protocols, such as `460,478` (`/quic` and `/tls/ws`)
        - Servers should treat the multicodec codes used in the `transfer` and `transport` parameters as opaque, and not validate them, for forwards compatibility
- `GET /v1/providers/hashed/{multihash}`
    - This is the same as `GET /v1/providers/{CID}`, but takes a hashed CID encoded as a [multihash](https://github.com/multiformats/multihash/)
- `PUT /v1/providers`
    - Reframe equivalent: Provide
    - Body
        ```json
        {
            "Signature": "multibase bytes",
            "Payload": "multibase bytes"
        }
        ```
	    - `Payload` is a multibase-encoded string containing a JSON object with the following schema:
		```json
		{
                "Keys": ["cid1", "cid2"],
                "Timestamp": 1234,
                "AdvisoryTTL": 1234,
                "Provider": {
                    "PeerID": "12D3K...",
                    "Multiaddrs": ["/ip4/.../tcp/.../p2p/...", "/ip4/..."],
                    "Protocols": [
                        {
                            "Codec": 1234,
                            "Payload": { ... }
                        }
                    ]
                }
		}
		```
        - `Signature` is a multibase-encoded signature of the sha256 hash of the `Payload` field, signed using the private key of the Peer ID specified in the `Payload` JSON. See the [Peer ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#keys) specification for the encoding of Peer IDs. Servers must verify the payload using the public key from the Peer ID. If the verification fails, the server must return a 403 status code.
    - Idempotent
	- Default limit of 100 keys per request
- `GET /v1/ping`
    - Returns 200 once the server is ready to accept requests

## Limits

    - Responses with collections of results must have a default limit on the number of results that will be returned in a single response
    - Pagination and/or dynamic limit configuration may be added to this spec in the future, once there is a concrete requirement

## Error Codes

    - A 404 must be returned if a resource was not found
	- A 501 must be returned if a method is not supported
