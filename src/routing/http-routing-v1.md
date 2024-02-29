---
title: Delegated Routing V1 HTTP API
description: >
  Delegated routing is a mechanism for IPFS implementations to use for offloading
  content routing, peer routing and naming to another process/server. This specification describes
  an HTTP API for delegated routing of content, peers, and IPNS.
date: 2024-02-05
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

Delegated routing is a mechanism for IPFS implementations to use for offloading content routing, peer routing, and naming to another process/server. This specification describes a vendor-agnostic HTTP API for delegated content routing.

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

#### `GET` Path Parameters

- `cid` is the [CID](https://github.com/multiformats/cid) to fetch provider records for.

#### `GET` Response Status Codes

- `200` (OK): the response body contains 0 or more records.
- `404` (Not Found): must be returned if no matching records are found.
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints.

#### `GET` Response Body

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

### `POST /routing/v1/providers`

#### `POST` Request Body

```json
{
  "Providers": [
    {
      "Schema": "announcement",
      ...
    }
  ]
}
```

Each object in the `Providers` list is a *write provider record* entry.

Server SHOULD accept  representing writes is [Announcement Schema](#announcement-schema).

:::warn

Since non-streaming results have to be buffered before sending,
server SHOULD be no more than 100 `Providers` per `application/json` response.

:::

#### `POST` Response Status Codes

- `200` (OK): the server processed the full list of provider records (possibly unsuccessfully, depending on the semantics of the particular records)
- `400` (Bad Request): the server deems the request to be invalid and cannot process it
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints
- `501` (Not Implemented): the server does not support providing records

#### `POST` Response Body

  ```json
  {
      "ProvideResults": [
          { ... }
      ]
  }
  ```

- `ProvideResults` is a list of results in the same order as the `Providers` in the request, and the schema of each object is determined by the `Schema` of the corresponding write object
  - Returned list MAY contain entry-specific information such as server-specific TTL, per-entry error message, etc. Fields which are not relevant, can be omitted.
  - In error scenarios, a client can check for presence of non-empty `Error` field (top level, or per `ProvideResults` entry) to learn about the reason why POST failed.
- The work for processing each provider record should be idempotent so that it can be retried without excessive cost in the case of full or partial failure of the request

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
      "Schema": "peer",
      "ID": "bafz...",
      "Addrs": ["/ip4/..."],
      "Protocols": ["<protocol-a>", "<protocol-b>", ...],
      ...
    },
    ...
  ]
}
```

The `application/json` responses SHOULD be limited to 100 peers.

The client SHOULD be able to make a request with `Accept: application/x-ndjson` and get a [stream](#streaming) with more results.

Each object in the `Peers` list is a record conforming to the [Peer Schema](#peer-schema).

### `POST /routing/v1/peers`

#### `POST` Request Body

```json
{
  "Peers": [
    {
      "Schema": "announcement",
      ...
    }
  ]
}
```

Each object in the `Peers` list is a *write peer record* entry.

Server SHOULD accept writes represented with [Announcement Schema](#announcement-schema).

#### `POST` Response Status Codes

- `200` (OK): the server processed the full list of provider records (possibly unsuccessfully, depending on the semantics of the particular records)
- `400` (Bad Request): the server deems the request to be invalid and cannot process it
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints
- `501` (Not Implemented): the server does not support providing records

#### `POST` Response Body

  ```json
  {
      "PeersResults": [
          { ... }
      ]
  }
  ```

- `PeersResults` is a list of results in the same order as the `Peers` in the request, and the schema of each object is determined by the `Schema` of the corresponding write object:
  - Returned list MAY contain entry-specific information such as server-specific TTL, per-entry error message, etc. Fields which are not relevant, can be omitted.
  - In error scenarios, a client can check for presence of non-empty `Error` field (top level, or per `ProvideResults` entry) to learn about the reason why POST failed.
- The work for processing each provider record should be idempotent so that it can be retried without excessive cost in the case of full or partial failure of the request

#### `POST` Response Status Codes

- `200` (OK): processed - inspect response to see if there are any `Error` results.
- `400` (Bad Request): unable to process POST request, make sure JSON schema and values are correct.

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
Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS
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

### Announcement Schema

The `announcement` schema can be used in `POST` operations to announce content providers or peer routing information.

```json
  {
    "Schema": "announcement",
    "Payload": {
      "CID": "bafy..cid",
      "Scope": "block",
      "Timestamp": "YYYY-MM-DDT23:59:59Z",
      "TTL": 0,
      "ID": "12D3K...",
      "Addrs": ["/ip4/...", ...],
      "Protocols": ["foo", ...],
      "Metadata": "mbase64-blob",
    },
    "Signature": "mbase64-signature"
  }
```

#### Announcement Payload

- `Payload`: is a map object with a subset of the below fields.
  - `CID` is a string with multibase-encoded CID being provided (`/routing/v1/providers` only).
    - This field is not present when used for `POST /routing/v1/peers`
  - `Scope` (optional) is a string hint that provides semantic meaning about CID (`/routing/v1/providers` only):
    - `block` announces only the individual block (this is the implicit default if `Scope` field is not present).
    - `entity` announces CIDs required for enumerating entity behind the CID (e.g.: all blocks for UnixFS file or a minimum set of blocks to enumerate contents of HAMT-sharded UnixFS directory, only top level of directory tree, etc).
    - `recursive` announces entire DAGs behind the CIDs (e.g.: entire DAG-CBOR DAG, or everything in UnixFS directory, including all files in all subdirectories).

  - `Timestamp` is the current time, formatted as an ASCII string that follows notation from [rfc3339](https://specs.ipfs.tech/ipns/ipns-record/#ref-rfc3339).

  - `TTL` is caching and expiration hint informing the server how long to keep the record available, specified as integer in milliseconds.
    - If this value is unknown, the caller may skip this field or set it to 0. The server's default will be used.

  - `ID` is a multibase-encoded Peer ID of the node that provides the content and also indicates the `libp2p-key` that SHOULD be used for verifying `Signature` field.
    - ED25519 and other small public keys MUST be inlined inside of the `ID` field
      with the identity multihash type.
    - Key types that exceed 42 bytes (e.g. RSA) SHOULD NOT be inlined, the `ID`
      field should only include the multihash of the key. The key itself SHOULD be
      obtained out-of-band (e.g. by fetching the block via IPFS) and cached to
      reduce the size of the signed `Payload`.

      If support for big keys is needed in
      the future, this spec can be updated to allow the client to provide the key
      and key type out-of-band by adding optional `PublicKey` fields, and if the
      Peer ID is a CID, then the server can verify the public key's authenticity
      against the CID, and then proceed with the rest of the verification scheme.

  - `Addrs` (optional) is an a list of string-encoded multiaddrs without `/p2p/peerID` suffix.

  - `Protocols` (optional) is a list of strings with protocols supported by `ID` and/or `Addrs`, if known upfront.

  - `Metadata` (optional) is a string with multibase-encoded binary metadata that should be passed as-is

#### Announcement Signature

- `Signature` is a string with multibase-encoded binary signature that provides integrity and authenticity of the `Payload` field.

  - Signature is created by following below steps:
    1. Convert `Payload` JSON to deterministic, ordered [DAG-CBOR](https://ipld.io/specs/codecs/dag-cbor/spec/) map notation
       - Specification intention here is to use similar signature normalization as with DAG-CBOR `Data` field in IPNS Records, allowing for partial code and dependency reuse.
    2. Prefix the DAG-CBOR bytes with ASCII string `routing-record:`
    3. Sign the bytes with the private key of the Peer ID specified in the `Payload.ID`.
       - Signing details for specific key types should follow [libp2p/peerid specs](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#key-types), unless stated otherwise.

  - Client SHOULD sign every announcement.
  - Servers SHOULD verify signature before accepting a record, unless running in a trusted environment.
  - A [400 Bad Request](https://httpwg.org/specs/rfc9110.html#status.400)  response code SHOULD be returned if (in order):
    - `Payload` serialized to DAG-CBOR is bigger than 2MiB
    - `Signature` is not valid

### Announcement Response Schema

The `announcement-response` schema can be used as `POST` responses when announcing content providers or peer routing information. This schema allows the server to return additional TTL information if the TTL is not provided in the request, or if the server policy is to provide TTL different than the requested one.

```json
{
  "Schema": "announcement-response",
  "Error": "error in case there was error",
  "TTL": 17280000
}
```

- `Error` is a string representing the error that might have happened when announcing.

- `TTL` in response is the time at which the server expects itself to drop the record
  - If less than the `TTL` in the request, then the client SHOULD repeat announcement earlier, before the announcement TTL expires and is forgotten by the routing system
  - If greater than the `TTL` in the request, then the server client SHOULD save resources and not repeat announcement until the announcement TTL expires and is forgotten by the routing system
  - If `0`, the server makes no claims about the lifetime of the record

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
