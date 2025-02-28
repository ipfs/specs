---
title: Delegated Routing V1 HTTP API
description: >
  Delegated routing is a mechanism for IPFS implementations to use for offloading
  content routing, peer routing and naming to another process/server. This specification describes
  an HTTP API for delegated routing of content, peers, and IPNS.
date: 2024-10-29
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
      name: Shipyard
      url: https://ipshipyard.com
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
  - name: Daniel Norman
    github: 2color
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
xref:
  - ipns-record
order: 0
tags: ['routing']
---

Delegated routing is a mechanism for IPFS implementations to use for offloading content routing, peer routing, and naming to another process/server. This specification describes a vendor-agnostic HTTP API for delegated content routing.

## API Specification

The Routing HTTP API uses the `application/json` content type by default. For :ref[IPNS Names], the verifiable [`application/vnd.ipfs.ipns-record`][application/vnd.ipfs.ipns-record] content type is used.

As such, human-readable encodings of types are preferred. This specification may be updated in the future with a compact `application/cbor` encoding, in which case compact encodings of the various types would be used.

## Common Data Types

- CIDs are always string-encoded using a [multibase]-encoded [CIDv1].
- Multiaddrs are string-encoded according to the [human-readable multiaddr specification][multiaddr].
- Peer IDs are string-encoded according [PeerID string representation specification][peer-id-representation]: either a Multihash in Base58btc, or a CIDv1 with libp2p-key (`0x72`) codec in Base36 or Base32.
- Multibase bytes are string-encoded according to [the Multibase spec][multibase], and SHOULD use base64.
- Timestamps are Unix millisecond epoch timestamps.

Until required for business logic, servers should treat these types as opaque strings, and should preserve unknown JSON fields.

## Versioning

This API uses a standard version prefix in the path, such as `/v1/...`. If a backwards-incompatible change must be made, then the version number should be increased.

## Content Routing API

### `GET /routing/v1/providers/{cid}`

#### Path Parameters

- `cid` is the [CID](https://github.com/multiformats/cid) to fetch provider records for (preferably normalized to a CIDv1 in Base32, to maximize HTTP cache hits).

#### Request Query Parameters

##### `filter-addrs` (providers request query parameter)

Optional `?filter-addrs` to apply Network Address Filtering from [IPIP-484](https://specs.ipfs.tech/ipips/ipip-0484/).

- `?filter-addrs=<comma-separated-list>` optional parameter that indicates which network transports to return by filtering the multiaddrs in the `Addrs` field of the [Peer schema](#peer-schema).
- The value of the `filter-addrs` parameter is a comma-separated (`,` or `%2C`) list of network transport protocol _name strings_ as defined in the [multiaddr protocol registry](https://github.com/multiformats/multiaddr/blob/master/protocols.csv), e.g. `?filter-addrs=tls,webrtc-direct,webtransport`.
- `unknown` can be be passed to include providers whose multiaddrs are unknown, e.g. `?filter-addrs=unknown`. This allows for not removing providers whose multiaddrs are unknown at the time of filtering (e.g. keeping DHT results that require additional peer lookup).
- Multiaddrs are filtered by checking if the protocol name appears in any of the multiaddrs (logical OR).
- Negative filtering is done by prefixing the protocol name with `!`, e.g. to skip IPv6 and QUIC addrs: `?filter-addrs=!ip6,!quic-v1`. Note that negative filtering is done by checking if the protocol name does not appear in any of the multiaddrs (logical AND).
- If no parameter is passed, the default behavior is to return the original list of addresses unchanged.
- If only negative filters are provided, addresses not passing any of the negative filters are included.
- If positive filters are provided, only addresses passing at least one positive filter (and no negative filters) are included.
- If both positive and negative filters are provided, the address must pass all negative filters and at least one positive filter to be included.
- If there are no multiaddrs that match the passed transports, the provider is omitted from the response.
- Filtering is case-insensitive.

##### `filter-protocols` (providers request query parameter)

Optional `?filter-protocols` to apply IPFS Protocol Filtering from [IPIP-484](https://specs.ipfs.tech/ipips/ipip-0484/).

- The `filter-protocols` parameter is a comma-separated (`,` or `%2C`) list of transfer protocol names, e.g. `?filter-protocols=unknown,transport-bitswap,transport-ipfs-gateway-http`.
- Transfer protocols names should be treated as opaque strings and have a max length of 63 characters. A non-exhaustive list of transfer protocols are defined per convention in the [multicodec registry](https://github.com/multiformats/multicodec/blob/3b7b52deb31481790bc4bae984d8675bda4e0c82/table.csv#L149-L151).
- Implementations MUST preserve all transfer protocol names when returning a positive result that matches one or more of them.
- A special `unknown` name can be be passed to include providers whose transfer protocol list is empty (unknown), e.g. `?filter-protocols=unknown`. This allows for including providers returned from the DHT that do not contain explicit transfer protocol information.
- Providers are filtered by checking if the transfer protocol name appears in the `Protocols` array (logical OR).
- If the provider doesn't match any of the passed transfer protocols, the provider is omitted from the response.
- If a provider passes the filter, it is returned unchanged, i.e. the full set of protocols is returned including protocols that not included in the filter. (note that this is different from `filter-addrs` where only the multiaddrs that pass the filter are returned)
- Filtering is case-insensitive.
- If no parameter is passed, the default behavior is to not filter by transfer protocol.

#### Response Status Codes

- `200` (OK): the response body contains 0 or more records.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

#### Response Headers

- `Content-Type`: the content type of this response, which MUST be `application/json` or `application/x-ndjson` (see [streaming](#streaming)).
- `Last-Modified`: an HTTP-date timestamp ([RFC9110, Section 5.6.7](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7)) of the resolution, allowing HTTP proxies and CDNs to support inexpensive update checks via `If-Modified-Since`
- `Cache-Control: public, max-age={ttl}, public, stale-while-revalidate={max-ttl}, stale-if-error={max-ttl}`: meaningful cache TTL returned with the response.
  - The `max-age` SHOULD be shorter for responses whose resolution ended in no results (e.g. 15 seconds),
    and longer for responses that have results (e.g. 5 minutes).
  - Implementations SHOULD include `max-ttl`, set to the maximum cache window of the underlying routing system.
    For example, if Amino DHT results are returned, `stale-while-revalidate` SHOULD be set to `172800` (48h, which at the time of writing this specification, is the provider record expiration window).
- `Vary: Accept`: allows intermediate caches to play nicely with the different possible content types.

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
represented as either a Multihash in Base58btc, or a CIDv1 with libp2p-key (`0x72`) codec (in Base36 or Base32).

#### Request Query Parameters

##### `filter-addrs` (peers request query parameter)

Optional, same rules as [`filter-addrs` providers request query parameter](#filter-addrs-providers-request-query-parameter).

##### `filter-protocols` (peers request query parameter)

Optional, same rules as [`filter-protocols` providers request query parameter](#filter-protocols-providers-request-query-parameter).

#### Response Status Codes

- `200` (OK): the response body contains the peer record.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

#### Response Headers

- `Content-Type`: the content type of this response, which MUST be `application/json` or `application/x-ndjson` (see [streaming](#streaming)).
- `Last-Modified`: an HTTP-date timestamp ([RFC9110, Section 5.6.7](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7)) of the resolution, allowing HTTP proxies and CDNs to support inexpensive update checks via `If-Modified-Since`
- `Cache-Control: public, max-age={ttl}, public, stale-while-revalidate={max-ttl}, stale-if-error={max-ttl}`: meaningful cache TTL returned with the response.
  - When present, `ttl` SHOULD be shorter for responses whose resolution ended in no results (e.g. 15 seconds),
    and longer for responses that have results (e.g. 5 minutes).
  - Implementations SHOULD include `max-ttl`, set to the maximum cache window of the underlying routing system.
    For example, if Amino DHT results are returned, `stale-while-revalidate` SHOULD be set to `172800` (48h, which at the time of writing this specification, is the provider record expiration window).
- `Vary: Accept`: allows intermediate caches to play nicely with the different possible content types.

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
- `Cache-Control: public, max-age={ttl}, public, stale-while-revalidate={sig-ttl}, stale-if-error={sig-ttl}`: meaningful cache TTL returned with :ref[IPNS Record]
  - The `max-age` value in seconds SHOULD match duration from `IpnsEntry.data[TTL]`, if present and bigger than `0`. Otherwise, implementation SHOULD default to `max-age=60`.
  - Implementations SHOULD include `sig-ttl`, set to the remaining number of seconds the returned IPNS Record is valid.
- `Expires:`: an HTTP-date timestamp ([RFC9110, Section 5.6.7](https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7)) when the validity of IPNS Record expires (if `ValidityType=0`, when signature expires)
- `Last-Modified`: an HTTP-date timestamp of when cacheable resolution occurred: allows HTTP proxies and CDNs to support inexpensive update checks via `If-Modified-Since`
- `Vary: Accept`: allows intermediate caches to play nicely with the different possible content types.

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
