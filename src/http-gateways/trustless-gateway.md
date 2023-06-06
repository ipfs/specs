---
title: Trustless Gateway Specification
description: >
  Trustless Gateways are a minimal subset of Path Gateways that allow light IPFS
  clients to retrieve data behind a CID and verify its integrity without delegating any
  trust to the gateway itself.
date: 2023-04-17
maturity: reliable
editors:
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
tags: ['httpGateways', 'lowLevelHttpGateways']
order: 1
---

Trustless Gateway is a _subset_ of :cite[path-gateway]
that allows light IPFS clients to retrieve data behind a CID and verify its
integrity without delegating any trust to the gateway itself.

The minimal implementation means:

- response type is always fully verifiable: client can decide between a raw block or a CAR stream
- no UnixFS/IPLD deserialization
- for CAR files:
  - the behavior is identical to :cite[path-gateway]
- for raw blocks:
  - data is requested by CID, only supported path is `/ipfs/{cid}`
  - no path traversal or recursive resolution

# HTTP API

A subset of "HTTP API" of :cite[path-gateway].

## `GET /ipfs/{cid}[/{path}][?{params}]`

Downloads verifiable data for the specified **immutable** content path.

Optional `path` is permitted for requests that specify CAR format (`application/vnd.ipld.car`).

For RAW requests, only `GET /ipfs/{cid}[?{params}]` is supported.

## `HEAD /ipfs/{cid}[/{path}][?{params}]`

Same as GET, but does not return any payload.

## `GET /ipns/{key}[?{params}]`

Downloads data at specified IPNS Key. Verifiable :cite[ipns-record] can be requested via `?format=ipns-record`

## `HEAD /ipns/{key}[?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Same as in :cite[path-gateway], but with limited number of supported response types.

## Request Headers

### `Accept` (request header)

This HTTP header is required when running in a strict, trustless mode.

Gateway is free to return HTTP 400 Bad Request when running in strict trustless
mode and  `Accept` header is missing

Below response types MUST to be supported:

- [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw) – requests a single, verifiable raw block to be returned
- [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) – disables IPLD/IPFS deserialization, requests a verifiable CAR stream to be returned
- [application/vnd.ipfs.ipns-record](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) – requests a verifiable :cite[ipns-record] (multicodec `0x0300`).

## Request Query Parameters

### :dfn[dag-scope] (request query parameter)

Optional, `dag-scope=(block|entity|all)` with default value `all`, only available for CAR requests.

Describes the shape of the DAG fetched the terminus of the specified path whose blocks
are included in the returned CAR file after the blocks required to traverse
path segments.

- `block` - Only the root block at the end of the path is returned after blocks
  required to verify the specified path segments.

- `entity` - For queries that traverse UnixFS data, `entity` roughly means return
  blocks needed to verify the terminating element of the requested content path.
  For UnixFS, all the blocks needed to read an entire UnixFS file, or enumerate a UnixFS directory.
  For all queries that reference non-UnixFS data, `entity` is equivalent to `block`

- `all` - Transmit the entire contiguous DAG that begins at the end of the path
  query, after blocks required to verify path segments

When present, returned `Etag` must include unique prefix based on the passed scope type.

### :dfn[entity-bytes] (request query parameter)

Optional, `entity-bytes=from:to` with the default value `0:*`, only available for CAR requests.
Serves as a trustless form of an HTTP Range Request.

When the terminating entity at the end of the specified content path can be
interpreted as a continuous array of bytes (such as a UnixFS file), returns
only the minimal set of blocks required to verify the specified byte range of
said entity.

Allowed values for `from` and `to` are positive integers where `to` >= `from`, which
limit the return blocks to needed to satisfy the range `[from,to]`:

- `from` value gives the byte-offset of the first byte in a range.
- `to` value gives the byte-offset of the last byte in the range; that is,
the byte positions specified are inclusive.  Byte offsets start at zero.

If the entity at the end of the path cannot be interpreted as a continuous
array of bytes (such as a DAG-CBOR/JSON map, or UnixFS directory), this
parameter has no effect.

The following additional values are supported:

- `*` can be substituted for end-of-file
  - `entity-bytes=0:*` is the entire file (a verifiable version of HTTP request for `Range: 0-`)
- Negative numbers can be used for referring to bytes from the end of a file
  - `entity-bytes=-1024:*` is the last 1024 bytes of a file
    (verifiable version of HTTP request for `Range: -1024`)
  - It is also permissible (unlike with HTTP Range Requests) to ask for the
    range of 500 bytes from the beginning of the file to 1000 bytes from the
    end: `entity-bytes=499:-1000`

When present, returned `Etag` must include unique prefix based on the passed range.

# HTTP Response

Below MUST be implemented **in addition** to "HTTP Response" of :cite[path-gateway].

## HTTP Response Headers

### `Content-Type` (response header)

MUST be returned and include additional format-specific parameters when possible.

If a CAR stream was requested, the response MUST include the parameter specifying CAR version.
For example: `Content-Type: application/vnd.ipld.car; version=1`

### `Content-Disposition` (response header)

MUST be returned and set to `attachment` to ensure requested bytes are not rendered by a web browser.

## HTTP Response Payload

### Block Response

An opaque bytes matching the requested block CID
([application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw)).

The Body hash MUST match the Multihash from the requested CID.

### CAR Response

A CAR stream
([application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car))
for the requested content type,  path and optional `dag-scope` and `entity-bytes` URL parameters.

:::note

By default, block order in CAR response is not deterministic, blocks can
be returned in different order, depending on implementation choices (traversal,
speed at which blocks arrive from the network, etc). An opt-in ordered CAR
responses MAY be introduced in a future, see [IPIP-412](https://github.com/ipfs/specs/pull/412).

:::

#### CAR version

Value returned in `CarV1Header.version` struct  MUST match the `version`
parameter returned in `Content-Type` header

#### CAR roots

:::issue

TODO: we need to specify expectations about what should be returned in
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header).

##### Option A: always empty

If the response uses version 1 or 2 of the CAR spec, the
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) struct
MUST be empty.

##### Option B: only CID of the terminating element

If the response uses version 1 or 2 of the CAR spec, the
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) struct
MUST contain CID of the terminating entity.

##### Option C: only CIDs of fully returned DAGs

If the response uses version 1 or 2 of the CAR spec, the
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) struct
MUST be either empty, or only contain CIDs of complete DAGs present in the response.

CIDs from partial DAGs, such as parent nodes on the path, or terminating
element returned with `dag-scope=block`, or UnixFS directory returned with
`dag-scope=entity` MUST never be returned in the `CarV1Header.roots` list, as
they may cause overfetching on systems that perform recursive pinning of DAGs
listed in `CarV1Header.roots`.

##### Option D: CIDs for all logical path segments (same as X-Ipfs-Roots)

If the response uses version 1 or 2 of the CAR spec, the
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) struct
MUST contain all the logical roots related to the requested content path.

The CIDs here MUST be the same as ones in `X-Ipfs-Roots` header.

:::
