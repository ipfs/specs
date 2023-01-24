# Delegated Content Routing HTTP API

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Delegated Content Routing HTTP API

**Author(s)**:

- Gus Eggert

**Maintainer(s)**:

* * *

**Abstract**

"Delegated content routing" is a mechanism for IPFS implementations to use for offloading content routing to another process/server. This spec describes an HTTP API for delegated content routing.

## API Specification

The Delegated Content Routing Routing HTTP API uses the `application/json` content type by default.

As such, human-readable encodings of types are preferred. This spec may be updated in the future with a compact `application/cbor` encoding, in which case compact encodings of the various types would be used.

## Common Data Types

- CIDs are always string-encoded using a [multibase](https://github.com/multiformats/multibase)-encoded [CIDv1](https://github.com/multiformats/cid#cidv1).
- Multiaddrs are string-encoded according to the [human-readable multiaddr specification](https://github.com/multiformats/multiaddr#specification)
- Peer IDs are string-encoded according [PeerID string representation specification](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#string-representation)
- Multibase bytes are string-encoded according to [the Multibase spec](https://github.com/multiformats/multibase), and *should* use base64.
- Timestamps are Unix millisecond epoch timestamps

Until required for business logic, servers should treat these types as opaque strings, and should preserve unknown JSON fields.

### Versioning

This API uses a standard version prefix in the path, such as `/v1/...`. If a backwards-incompatible change must be made, then the version number should be increased.

### Provider Records

A provider record contains information about a content provider, including the transfer protocol and any protocol-specific information useful for fetching the content from the provider.

The information required to write a record to a router (*"write" provider records*) may be different than the information contained when reading provider records (*"read" provider records*).

For example, indexers may require a signature in `bitswap` write records for authentication of the peer contained in the record, but the read records may not include this authentication information.

Both read and write provider records have a minimal required schema as follows:

```json
{
    "Protocol": "<transfer_protocol_name>",
    "Schema": "<transfer_protocol_schema>",
    ...
}
```

Where:

- `Protocol` is the multicodec name of the transfer protocol
- `Schema` denotes the schema to use for encoding/decoding the record
  - This is separate from the `Protocol` to allow this HTTP API to evolve independently of the transfer protocol
  - Implementations should switch on this when parsing records, not on `Protocol`
- `...` denotes opaque JSON, which may contain information specific to the transfer protocol

Specifications for some transfer protocols are provided in the "Transfer Protocols" section.

## API

### `GET /routing/v1/providers/{CID}`

- Response codes
  - `200`: the response body contains 0 or more records
  - `404`: must be returned if no matching records are found
  - `422`: request does not conform to schema or semantic constraints
- Response Body
  
  ```json
  {
      "Providers": [
          {
              "Protocol": "<protocol_name>",
              "Schema": "<schema>",
              ...
          }
      ]
  }
  ```
  
- Default limit: 100 providers
- Optional query parameters
  - `transfer` only return providers who support the passed transfer protocols, expressed as a comma-separated list of transfer protocol names such as `transfer=bitswap,filecoin-graphsync-v1`
  - `transport` for provider records with multiaddrs, only return records with multiaddrs explicitly supporting the passed transport protocols, encoded as decimal multicodec codes such as `transport=460,478` (`/quic` and `/tls/ws` respectively)
- Implements pagination according to the Pagination section

Each object in the `Providers` list is a *read provider record*.

## Pagination

APIs that return collections of results should support pagination as follows:

- If there are more results, then a `NextPageToken` field should include an opaque string value, otherwise it should be undefined
- The value of `NextPageToken` can be specified as the value of a `pageToken` query parameter to fetch the next page
  - Character set is restricted to the regular expression `[a-zA-Z0-9-_.~]+`, since this is intended to be used in URLs
- The client continues this process until `NextPageToken` is undefined or doesn't care to continue
- A `pageLimit` query parameter specifies the maximum size of a single page

### Implementation Notes

Servers are required to return *at most* `pageLimit` results in a page. It is recommended for pages to be as dense as possible, but it is acceptable for them to return any number of items in the closed interval [0, pageLimit]. This is dependent on the capabilities of the backing database implementation.
For example, a query specifying a `transfer` filter for a rare transfer protocol should not *require* the server to perform a very expensive database query for a single request. Instead, this is left to the server implementation to decide based on the constraints of the database.

Implementations should encode into the token whatever information is necessary for fetching the next page. This could be a base32-encoded JSON object like `{"offset":3,"limit":10}`, an object ID of the last scanned item, etc.

## Error Codes

- `501`: must be returned if a method/path is not supported
- `429`: may be returned to indicate to the caller that it is issuing requests too quickly
- `400`: must be returned if an unknown path is requested

## CORS and Web Browsers

Browser interoperability requires implementations to support
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

JavaScript client running on a third-party Origin must be able to send HTTP
request to the endpoints defined in this specification, and read the received
values. This means HTTP server implementing this API must (1) support
[CORS preflight requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
sent as HTTP OPTIONS, and (2) always respond with headers that remove CORS
limits, allowing every site to query the API for results:

```plaintext
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

## Known Transfer Protocols

This section contains a non-exhaustive list of known transfer protocols (by name) that may be supported by clients and servers.

### Bitswap

Multicodec name: `transport-bitswap`
Schema: `bitswap`

#### Bitswap Read Provider Records

```json
{
    "Protocol": "transport-bitswap",
    "Schema": "bitswap",
    "ID": "12D3K...",
    "Addrs": ["/ip4/..."]
}
```

- `ID`: the [Peer ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md) to contact
- `Addrs`: a list of known multiaddrs for the peer
  - This list may be incomplete or incorrect and should only be treated as *hints* to improve performance by avoiding extra peer lookups

The server should respect a passed `transport` query parameter by filtering against the `Addrs` list.

### Filecoin Graphsync

Multicodec name: `transport-graphsync-filecoinv1`
Schema: `graphsync-filecoinv1`

#### Filecoin Graphsync Read Provider Records

```json
{
    "Protocol": "transport-graphsync-filecoinv1",
    "Schema": "graphsync-filecoinv1",
    "ID": "12D3K...",
    "Addrs": ["/ip4/..."],
    "PieceCID": "<cid>",
    "VerifiedDeal": true,
    "FastRetrieval": true
}
```

- `ID`: the peer ID of the provider
- `Addrs`: a list of known multiaddrs for the provider
- `PieceCID`: the CID of the [piece](https://spec.filecoin.io/systems/filecoin_files/piece/#section-systems.filecoin_files.piece) within which the data is stored
- `VerifiedDeal`: whether the deal corresponding to the data is verified
- `FastRetrieval`: whether the provider claims there is an unsealed copy of the data available for fast retrieval
