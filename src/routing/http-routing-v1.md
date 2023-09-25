---
title: Routing V1 HTTP API
description: >
  Delegated routing is a mechanism for IPFS implementations to use for offloading
  content routing and naming to another process/server. This specification describes
  an HTTP API for delegated content routing.
date: 2023-08-31
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
- Peer IDs are string-encoded according [PeerID string representation specification][peer-id-representation]: either a Multihash in Base58btc, or a CIDv1 with libp2p-key (`0x72`) codec.
- Multibase bytes are string-encoded according to [the Multibase spec][multibase], and SHOULD use base64.
- Timestamps are Unix millisecond epoch timestamps.

Until required for business logic, servers should treat these types as opaque strings, and should preserve unknown JSON fields.

## Versioning

This API uses a standard version prefix in the path, such as `/v1/...`. If a backwards-incompatible change must be made, then the version number should be increased.

## Content Routing API

### `GET /routing/v1/providers/{cid}`

#### Path Parameters

- `cid` is the [CID](https://github.com/multiformats/cid) to fetch provider records for.

#### Response Status Codes

- `200` (OK): the response body contains 0 or more records.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

#### Response Body

```json
{
  "Providers": [
    {
      "Schema": "<schema>",
      "ID": "bafz...",
      "Addrs": ["/ip4/..."],
      ...
    },
    ...
  ]
}
```

The `application/json` responses SHOULD be limited to 100 providers.

The client SHOULD be able to make a request with `Accept: application/x-ndjson` and get a [stream](#streaming) with more results.

Each object in the `Providers` list is a record conforming to a schema, usually the [Peer Schema](#peer-schema).

## Peer Routing API

### `GET /routing/v1/peers/{peer-id}`

#### Path Parameters

- `peer-id` is the [Peer ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md) to fetch peer records for,
represented as a CIDv1 encoded with `libp2p-key` codec.

#### Response Status Codes

- `200` (OK): the response body contains the peer record.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

#### Response Body

```json
{
  "Peers": [
    {
      "Schema": "<schema>",
      "Protocols": ["<protocol-a>", "<protocol-b>", ...],
      "ID": "bafz...",
      "Addrs": ["/ip4/..."],
      ...
    },
    ...
  ]
}
```

The `application/json` responses SHOULD be limited to 100 peers.

The client SHOULD be able to make a request with `Accept: application/x-ndjson` and get a [stream](#streaming) with more results.

Each object in the `Peers` list is a record conforming to the [Peer Schema](#peer-schema).

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

The response body contains a :ref[IPNS Record] serialized using the verifiable [`application/vnd.ipfs.ipns-record`](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) protobuf format.

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

Streaming is opt-in and backwards-compatible with clients and servers that do
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

This section contains a non-exhaustive list of known schemas that MAY be supported by clients and servers.

### Peer Schema

The `peer` schema represents an arbitrary peer.

```json
{
  "Schema": "peer",
  "ID": "bafz...",
  "Addrs": ["/ip4/..."],
  "Protocols": ["transport-bitswap", ...]
  ...
}
```

- `ID`: the [Peer ID][peer-id] as Multihash in Base58btc or CIDv1 with libp2p-key codec.
- `Addrs`: an optional list of known [multiaddrs][multiaddr] for this peer.
  - If missing or empty, it means the router server is missing that information, and the client should use `ID` to lookup updated peer information.
- `Protocols`: an optional list of protocols known to be supported by this peer.
  - If missing or empty, it means the router server is missing that information, and the client should use `ID` and `Addrs` to lookup connect to the peer and use the [libp2p identify protocol](https://github.com/libp2p/specs/tree/master/identify) to learn about supported ones.

:::note

To allow for protocol-specific fields and future-proofing, the parser MUST
allow for unknown fields, and the clients MUST ignore unknown ones.

Below is an example on how one could include `protocol-a` and `protocol-b`
protocols that includes an additional fields `protocol-a` and `protocol-b`.

If the client knows the protocol, they are free to use the extra binary
(base64) or JSON information contained in the additional field. If that is not
the case, the field MUST be ignored.

```json
{
  "Schema": "peer",
  "ID": "bafz...",
  "Addrs": ["/ip4/..."],
  "Protocols": ["transport-bitswap", "protocol-a", "protocol-b", ...],
  "protocol-a": "[base64-blob]",
  "protocol-b": { "foo": "bar" }
}
```

:::

### Legacy Schemas

Legacy schemas include `ID` and optional `Addrs` list just like
the [`peer` schema](#peer-schema) does.

These schemas are deprecated and SHOULD be replaced with `peer` over time, but
MAY be returned by some legacy endpoints. In such case, a client MAY parse
them the same way as the `peer` schema.

#### Bitswap Schema

A legacy schema used by some routers to indicate a peer supports retrieval over
the `/ipfs/bitswap[/*]` libp2p protocol.

```json
{
  "Protocol": "transport-bitswap",
  "Schema": "bitswap",
  "ID": "bafz...",
  "Addrs": ["/ip4/..."]
}
```

#### Graphsync Schema

A legacy schema used by some routers to indicate a peer supports retrieval over
the [graphsync](https://github.com/ipfs/go-graphsync/blob/main/docs/architecture.md)
libp2p protocol.

```json
{
  "Protocol": "transport-graphsync-filecoinv1",
  "Schema": "graphsync-filecoinv1",
  "ID": "bafz...",
  "Addrs": ["/ip4/..."],
  "PieceCID": "<cid>",
  "VerifiedDeal": true,
  "FastRetrieval": true
}
```

[multibase]: https://github.com/multiformats/multibase
[CIDv1]: https://github.com/multiformats/cid#cidv1
[multiaddr]: https://github.com/multiformats/multiaddr#specification
[peer-id]: https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md
[peer-id-representation]: https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#string-representation
[application/vnd.ipfs.ipns-record]: https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record
