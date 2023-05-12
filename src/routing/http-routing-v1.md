---
title: Routing V1 HTTP API
description: >
  Delegated content routing is a mechanism for IPFS implementations to use for
  offloading content routing to another process. This specification describes
  an HTTP API for delegated content routing.
date: 2023-03-22
maturity: reliable
editors:
  - name: Gus Eggert
    github: guseggert 
order: 0
tags: ['routing']
---

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

- `Protocol` is the multicodec name of the transfer protocol or an opaque string (for experimenting with novel protocols without a multicodec)
- `Schema` denotes the schema to use for encoding/decoding the record
  - This is separate from the `Protocol` to allow this HTTP API to evolve independently of the transfer protocol
  - Implementations should switch on this when parsing records, not on `Protocol`
- `...` denotes opaque JSON, which may contain information specific to the transfer protocol

Specifications for some transfer protocols are provided in the "Transfer Protocols" section.

## API

### `GET /routing/v1/providers/{CID}`

#### Response codes

- `200` (OK): the response body contains 0 or more records
- `404` (Not Found): must be returned if no matching records are found
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints

#### Response Body

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

Response limit: 100 providers

Each object in the `Providers` list is a *read provider record*.

## Pagination

This API does not support pagination, but optional pagination can be added in a backwards-compatible spec update.

## Streaming

This API does not currently support streaming, however it can be added in the future through a backwards-compatible update by using a content type other than `application/json`.

## Error Codes

- `501` (Not Implemented): must be returned if a method/path is not supported
- `429` (Too Many Requests): may be returned along with optional [Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) header to indicate to the caller that it is issuing requests too quickly
- `400` (Bad Request): must be returned if an unknown path is requested

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
Specification: [ipfs/specs/BITSWAP.md](https://github.com/ipfs/specs/blob/main/BITSWAP.md)

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
Specification: [ipfs/go-graphsync/blob/main/docs/architecture.md](https://github.com/ipfs/go-graphsync/blob/main/docs/architecture.md)

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
