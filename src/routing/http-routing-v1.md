---
title: Routing V1 HTTP API
description: >
  Delegated routing is a mechanism for IPFS implementations to use for offloading
  content routing and naming to another process/server. This specification describes
  an HTTP API for delegated content routing.
date: 2023-03-22
maturity: reliable
editors:
  - name: Gus Eggert
    github: guseggert
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Masih H. Derkani
    github: masih
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Henrique Dias
    url: https://hacdias.com/
    github: hacdias
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Adin Schmahmann
    github: aschmahmann
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
xref:
  - ipns-record
order: 0
tags: ['routing']
---

Delegated routing is a mechanism for IPFS implementations to use for offloading content routing and naming to another process/server. This specification describes a vendor-agnostic HTTP API for delegated content routing.

## API Specification

The Routing HTTP API uses the `application/json` content type by default. For :ref[IPNS Names], the verifiable [`application/vnd.ipfs.ipns-record`][application/vnd.ipfs.ipns-record] content type is used.

As such, human-readable encodings of types are preferred. This specification may be updated in the future with a compact `application/cbor` encoding, in which case compact encodings of the various types would be used.

## Common Data Types

- CIDs are always string-encoded using a [multibase]-encoded [CIDv1].
- Multiaddrs are string-encoded according to the [human-readable multiaddr specification][multiaddr].
- Peer IDs are string-encoded according [PeerID string representation specification][peer-id-representation].
- Multibase bytes are string-encoded according to [the Multibase spec][multibase], and SHOULD use base64.
- Timestamps are Unix millisecond epoch timestamps.

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

## Content Providers API

### `GET /routing/v1/providers/{cid}`

#### Path Parameters

- `cid` is the [CID](https://github.com/multiformats/cid) to fetch provider records for.

#### Query Parameters

##### `routers` (request query parameter)

An optional comma-separated list of routers that should be consulted for responses.

If no `routers` are provided the server SHOULD decide which ones to use as an implicit default.

The specification imposes no constraints on the order by which the results are returned.

Clients SHOULD be able to explicitly select all available backend routers via opt-in `?routers=all` query prameter.

Servers SHOULD allow clients to determine the list of available routers via `GET /routing/v1/routers`.

#### Response Status Codes

- `200` (OK): the response body contains 0 or more records.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

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

## Routers API

### `GET /routing/v1/routers`

#### Response Status Codes

- `200` (OK): the response body contains 0 or more records.
- `404` (Not Found): returned if backend enumeration is not possible

#### Response Body

```json
{
  "Routers": [
    {
      "Schema": "router",
      "Name": "<router_name>",
      ...
    },
    ...
  ]
}
```

Response limit: 100 routers

Each `Name` can be used in explicit `?routers=name1,name2` queries.

Additional metadata per router SHOULD be included in other fields defined by `router` schema.

## IPNS API

### `GET /routing/v1/ipns/{name}`

#### Path Parameters

- `name` is the :ref[IPNS Name] to resolve, encoded as CIDv1.

#### Response Status Codes

- `200` (OK): the response body contains the :ref[IPNS Record] for the given :ref[IPNS Name].
- `404` (Not Found): must be returned if no matching records are found.
- `406` (Not Acceptable): requested content type is missing or not supported. Error message returned in body should inform the user to retry with `Accept: application/vnd.ipfs.ipns-record`.

#### Response Headers

- `Etag`: a globally unique opaque string used for HTTP caching. MUST be derived from the protobuf record returned in the body.
- `Cache-Control: max-age={TTL}`: cache TTL returned with :ref[IPNS Record] that has `IpnsEntry.data[TTL] > 0`. When present, SHOULD match the TTL value from the record. When record was not found (HTTP 404) or has no TTL (value is `0`), implementation SHOULD default to `max-age=60`.

#### Response Body

The response body contains a  :ref[IPNS Record] serialized using the verifiable [`application/vnd.ipfs.ipns-record`](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) protobuf format.

### `PUT /routing/v1/ipns/{name}`

#### Path Parameters

- `name` is the :ref[IPNS Name] to publish, encoded as CIDv1.

#### Request Body

The content body must be a [`application/vnd.ipfs.ipns-record`][application/vnd.ipfs.ipns-record] serialized :ref[IPNS Record], with a valid signature matching the `name` path parameter.

#### Response Status Codes

- `200` (OK): the provided :ref[IPNS Record] was published.
- `400` (Bad Request): the provided :ref[IPNS Record] or :ref[IPNS Name] are not valid.
- `406` (Not Acceptable): submitted content type is not supported. Error message returned in body should inform the user to retry with `Content-Type: application/vnd.ipfs.ipns-record`.

## Pagination

This API does not support pagination, but optional pagination can be added in a backwards-compatible spec update.

## Streaming

JSON-based endpoints support streaming requests made
with `Accept: application/x-ndjson` HTTP Header.

Steaming responses are formatted as
[Newline Delimited JSON (ndjson)](https://github.com/ndjson/ndjson-spec),
with one result per line:

```json
{"Schema": "<schema>", ...}
{"Schema": "<schema>", ...}
{"Schema": "<schema>", ...}
...
```

:::note

Streaming is opt-in and backwards-compatibile with clients and servers that do
not support streaming:

- Requests without the `Accept: application/x-ndjson` header MUST default to
  regular, non-streaming, JSON responses.
- Legacy server MAY respond with non-streaming `application/json` response even
  if the client requested streaming. It is up to the client to inspect
  the `Content-Type` header before parsing the response.
- The server MUST NOT respond with streaming response if the client did not
  explicitly request so.

:::

## Error Codes

- `400` (Bad Request): must be returned if an unknown path is requested.
- `429` (Too Many Requests): may be returned along with optional [Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) header to indicate to the caller that it is issuing requests too quickly.
- `501` (Not Implemented): must be returned if a method/path is not supported.

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

## Known Schemas

This section contains a non-exhaustive list of known schemas (by name) that may be supported by clients and servers.

### Router

- Schema: `router`
- Specification: see `GET /routing/v1/routers` above

```json
{
  "Schema": "router",
  "Name": "example",
  "Default": false, // is it used when no ?routers is not passed
  "RoutingType": ["providers", "ipns", "peers"], // where can this router be used
  "Description": "A human-readable description of this router.",
  "Addrs": ["/ip4/..."] // optional URLs or Multiddrs of the upstream router
}
```

The `Name` is an opaque string but it MUST never be `all`, as it is reserved
keywork for enabling all backend routers via `?routers=all`.

There is no canonical set of router names, each `/routing/v1` implementation SHOULD come up with meaningful names and descriptions.

### Bitswap

- Multicodec name: `transport-bitswap`
- Schema: `bitswap`
- Specification: [ipfs/specs/BITSWAP.md](https://github.com/ipfs/specs/blob/main/BITSWAP.md)

#### Bitswap Read Provider Records

```json
{
  "Protocol": "transport-bitswap",
  "Schema": "bitswap",
  "ID": "12D3K...",
  "Addrs": ["/ip4/..."]
}
```

- `ID`: the [Peer ID][peer-id] to contact
- `Addrs`: a list of known multiaddrs for the peer
  - This list may be incomplete or incorrect and should only be treated as *hints* to improve performance by avoiding extra peer lookups

The server should respect a passed `transport` query parameter by filtering against the `Addrs` list.

### Filecoin Graphsync

- Multicodec name: `transport-graphsync-filecoinv1`
- Schema: `graphsync-filecoinv1`
- Specification: [ipfs/go-graphsync/blob/main/docs/architecture.md](https://github.com/ipfs/go-graphsync/blob/main/docs/architecture.md)

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

- `ID`: the [Peer ID][peer-id] of the provider
- `Addrs`: a list of known multiaddrs for the provider
- `PieceCID`: the CID of the [piece](https://spec.filecoin.io/systems/filecoin_files/piece/#section-systems.filecoin_files.piece) within which the data is stored
- `VerifiedDeal`: whether the deal corresponding to the data is verified
- `FastRetrieval`: whether the provider claims there is an unsealed copy of the data available for fast retrieval

[multibase]: https://github.com/multiformats/multibase
[CIDv1]: https://github.com/multiformats/cid#cidv1
[multiaddr]: https://github.com/multiformats/multiaddr#specification
[peer-id]: https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md
[peer-id-representation]: https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#string-representation
[application/vnd.ipfs.ipns-record]: https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record
