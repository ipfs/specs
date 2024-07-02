---
title: Trustless Gateway Specification
description: >
  The minimal subset of HTTP Gateway response types facilitates data retrieval
  via CID and ensures integrity verification, all while eliminating the need to
  trust the gateway itself.
date: 2024-04-17
maturity: reliable
editors:
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
xref:
  - url
  - path-gateway
  - ipip-0412
tags: ['httpGateways', 'lowLevelHttpGateways', 'exchange']
order: 1
---

Trustless Gateway is a _subset_ of :cite[path-gateway]
that allows light IPFS clients to retrieve data behind a CID and verify its
integrity without delegating any trust to the gateway itself.

The minimal implementation means:

- response type is always fully verifiable: client can decide between a raw block or a CAR stream
- no UnixFS/IPLD deserialization
- for raw blocks:
  - data is requested by CID, only supported path is `/ipfs/{cid}`
  - no path traversal or recursive resolution
- for CAR files:
  - the pathing behavior is identical to :cite[path-gateway]

# HTTP API

A subset of "HTTP API" of :cite[path-gateway].

## `GET /ipfs/{cid}[/{path}][?{params}]`

Downloads verifiable, content-addressed data for the specified **immutable** content path.

Optional `path` is permitted for requests that specify CAR format (`?format=car` or `Accept: application/vnd.ipld.car`).

For block requests (`?format=raw` or `Accept: application/vnd.ipld.raw`), only `GET /ipfs/{cid}[?{params}]` is supported.

## `HEAD /ipfs/{cid}[/{path}][?{params}]`

Same as GET, but does not return any payload.

## `GET /ipns/{key}[?{params}]`

Downloads data at specified IPNS Key. Verifiable :cite[ipns-record] can be requested via `?format=ipns-record` or `Accept: application/vnd.ipfs.ipns-record`.

## `HEAD /ipns/{key}[?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Same as in :cite[path-gateway], but with limited number of supported response types.

## Request Headers

### `Accept` (request header)

A Client SHOULD send this HTTP header to leverage content type negotiation
based on section 12.5.1 of :cite[rfc9110].

Below response types MUST be supported:

- [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw)
  - A single, verifiable raw block to be returned.

Below response types SHOULD be supported:

- [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car)
  - Disables IPLD/IPFS deserialization, requests a verifiable CAR stream to be
    returned, implementations MAY support optional CAR content type parameters
    (:cite[ipip-0412]) and the explicit [CAR format signaling in HTTP Request](#car-format-signaling-in-request).

- [application/vnd.ipfs.ipns-record](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record)
  - A verifiable :cite[ipns-record] (multicodec `0x0300`).

A Gateway SHOULD return HTTP 400 Bad Request when running in strict trustless
mode (no deserialized responses) and `Accept` header is missing.

:::note

A Client SHOULD include the [`format` query parameter](#format-request-query-parameter)
in the request URL, in addition to the `Accept` header. This provides the best
interoperability and ensures consistent HTTP cache behavior across various
gateway implementations.

:::

## Request Query Parameters

### :dfn[`format`] (request query parameter)

Same as [`format`](https://specs.ipfs.tech/http-gateways/path-gateway/#format-request-query-parameter) in :cite[path-gateway], but with limited number of supported response types:
- `format=raw` → `application/vnd.ipld.raw`
- `format=car` → `application/vnd.ipld.car`
- `format=ipns-record` → `application/vnd.ipfs.ipns-record`

:::note

A Client SHOULD include the `format` query parameter in the request URL, in
addition to the `Accept` header. This provides the best interoperability and
ensures consistent HTTP cache behavior across various gateway implementations.

:::

### :dfn[`dag-scope`] (request query parameter)

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

### :dfn[`entity-bytes`] (request query parameter)

The optional `entity-bytes=from:to` parameter is available only for CAR
requests.

It implies `dag-scope=entity` and serves as a trustless equivalent of an HTTP
Range Request.

When the terminating entity at the end of the specified content path:

- can be interpreted as a continuous array of bytes (such as a UnixFS file), a
  Gateway MUST return only the minimal set of blocks necessary to verify the
  specified byte range of that entity.

  - When dealing with a sharded UnixFS file (`dag-pb`, `0x70`) and a non-zero
  `from` value, the UnixFS data and `blocksizes` determine the
  corresponding starting block for a given `from` offset.

- cannot be interpreted as a continuous array of bytes (such as a DAG-CBOR/JSON
  map or UnixFS directory), the parameter MUST be ignored, and the request is
  equivalent to `dag-scope=entity`.

Allowed values for `from` and `to` follow a subset of section 14.1.2 from
:cite[rfc9110], where they are defined as offset integers that limit the
returned blocks to only those necessary to satisfy the range `[from,to]`:

- `from` value gives the byte-offset of the first byte in a range.
- `to` value gives the byte-offset of the last byte in the range;
  that is, the byte positions specified are inclusive.

The following additional values are supported:

- `*` can be substituted for end-of-file
  - `entity-bytes=0:*` is the entire file (a verifiable version of HTTP request for `Range: 0-`)
- Negative numbers can be used for referring to bytes from the end of a file
  - `entity-bytes=-1024:*` is the last 1024 bytes of a file
    (verifiable version of HTTP request for `Range: -1024`)
  - It is also permissible (unlike with HTTP Range Requests) to ask for the
    range of 500 bytes from the beginning of the file to 1000 bytes from the
    end: `entity-bytes=499:-1000`

A Gateway MUST augment the returned `Etag` based on the passed `entity-bytes`.

A Gateway SHOULD return an HTTP 400 Bad Request error when the requested range
cannot be parsed as valid offset positions.

In more nuanced error scenarios, a Gateway MUST return a valid CAR response
that includes enough blocks for the client to understand why the requested
`entity-bytes` was incorrect or why only a part of the requested byte range was
returned:

- If the requested `entity-bytes` resolves to a range that partially falls
  outside the entity's byte range, the response MUST include the subset of
  blocks within the entity's bytes.
  - This allows clients to request valid ranges of the entity without needing
    to know its total size beforehand, and it does not require the Gateway to
    buffer the entire entity before returning the response.

- If the requested `entity-bytes` resolves to a zero-length range or falls
  fully outside the entity's bytes, the response is equivalent to
  `dag-scope=block`.
  - This allows client to produce a meaningful error (e.g, in case of UnixFS,
    leverage `Data.blocksizes` information present in the root `dag-pb` block).

- In streaming scenarios, if a Gateway is capable of returning the root block
  but lacks prior knowledge of the final component of the requested content
  path being invalid or absent in the DAG, a Gateway SHOULD respond with HTTP 200.
  - This behavior is a consequence of HTTP streaming limitations: blocks are
    not buffered, by the time a related parent block is being parsed and
    returned to the client, the HTTP status code has already been sent to the
    client.

### :dfn[`car-version`] (request query parameter)

Optional, only used on CAR requests.

Serves same purpose as [CAR `version` content type parameter](#car-version-content-type-parameter).

In case both are present in the request, the value from the [`Accept`](#accept-request-header) HTTP Header has priority and a matching [`Content-Location`](#content-location-response-header) SHOULD be returned with the response.

### :dfn[`car-order`] (request query parameter)

Optional, only used on CAR requests.

Serves same purpose as [CAR `order` content type parameter](#car-order-content-type-parameter).

In case both are present in the request, the value from the [`Accept`](#accept-request-header) HTTP Header has priority and a matching [`Content-Location`](#content-location-response-header) SHOULD be returned with the response.

### :dfn[`car-dups`] (request query parameter)

Optional, only used on CAR requests.

Serves same purpose as [CAR `dups` content type parameter](#car-dups-content-type-parameter).

In case both are present in the request, the value from the [`Accept`](#accept-request-header) HTTP Header has priority and a matching [`Content-Location`](#content-location-response-header) SHOULD be returned with the response.

# HTTP Response

Below MUST be implemented **in addition** to "HTTP Response" of :cite[path-gateway].

## Response Headers

### `Content-Type` (response header)

MUST be returned and include additional format-specific parameters when possible.

If a CAR stream was requested:
- the response MUST include the parameter specifying CAR version. For example:
  `Content-Type: application/vnd.ipld.car; version=1`
- the response SHOULD include additional content type parameters, as noted in
  [CAR format signaling in Response](#car-format-signaling-in-response).

### `Content-Disposition` (response header)

MUST be returned and set to `attachment` to ensure requested bytes are not rendered by a web browser.

### `Content-Location` (response header)

Same as in :cite[path-gateway], SHOULD be returned when Trustless Gateway
supports more than a single response format and the `format` query parameter is
missing or does not match well-known format from `Accept` header.

# Block Responses (application/vnd.ipld.raw)

An opaque bytes matching the requested block CID
([application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw)).

The Body hash MUST match the Multihash from the requested CID.

# CAR Responses (application/vnd.ipld.car)

A CAR stream for the requested
[application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car)
content type (with optional `order` and `dups` params), path and optional
`dag-scope` and `entity-bytes` URL parameters.

## CAR `version` (content type parameter)

Value returned in
[`CarV1Header.version`](https://ipld.io/specs/transport/car/carv1/#header)
field MUST match the `version` parameter returned in `Content-Type` header.

## CAR roots

The behavior associated with the
[`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) field
is not currently specified.

The lack of standard here means a client MUST assume different Gateways could return a different value.

A Client SHOULD ignore this field.

:::issue

As of 2023-06-20, the behavior of the `roots`  CAR field remains an [unresolved item within the CARv1 specification](https://web.archive.org/web/20230328013837/https://ipld.io/specs/transport/car/carv1/#unresolved-items).

:::

## CAR `order` (content type parameter)

The `order` parameter allows clients to specify the desired block order in the
response. It supports the following values:

- `dfs`: [Depth-First Search](https://en.wikipedia.org/wiki/Depth-first_search)
  order, enables streaming responses with minimal memory usage.
- `unk` (or missing): Unknown order, which serves as the implicit default when the `order`
  parameter is unspecified. In this case, the client cannot make any assumptions
  about the block order: blocks may arrive in a random order or be a result of
  a custom DAG traversal algorithm.

A Gateway SHOULD always return explicit `order` in CAR's `Content-Type` response header.

A Gateway MAY skip `order` in CAR response if no order was explicitly requested
by the client and the default order is unknown.

A Client MUST assume implicit `order=unk` when `order` is missing, unknown, or empty.

## CAR `dups` (content type parameter)

The `dups` parameter specifies whether duplicate blocks (the same block
occurring multiple times in the requested DAG) will be present in the CAR
response. Useful when a deterministic block order is used.

It accepts two values:
- `y`: Duplicate blocks MUST be sent every time they occur during the DAG walk.
- `n`: Duplicate blocks MUST be sent only once.

When set to `y`, light clients are able to  discard blocks after
reading them, removing the need for caching in-memory or on-disk.

Setting to `n` allows for more efficient data transfer of certain types of
data, but introduces additional resource cost on the receiving end, as each
block needs to be kept around in case its CID appears again.

If the `dups` parameter is absent from the `Accept` request header, the
behavior is unspecified. In such cases, a Gateway should respond with `dups=n`
if it has control over the duplicate status, or without `dups` parameter if it
does not.
Defaulting to the inclusion of duplicate blocks (`dups=y`) SHOULD only be
implemented by Gateway systems that exclusively support `dups=y` and do not
support any other behavior.

A Client MUST not assume any implicit behavior when `dups` is missing.

If the `dups` parameter is absent from the `Content-Type` response header, the
behavior is unspecified, and the CAR response includes an arbitrary list of
blocks. In this unknown state, the client MUST assume duplicates are not sent,
but also MUST ignore duplicates and other unexpected blocks if they are present.

A Gateway MUST always return `dups` in `Content-Type` response header
when the duplicate status is known at the time of processing the request.
A Gateway SHOULD not return `dups` if determining the duplicate status is not
possible at the time of processing the request.

A Gateway MUST NOT include virtual blocks identified by identity CIDs
(multihash with `0x00` code) in CAR responses. This exclusion applies regardless
of their presence in the DAG or the value assigned to the "dups" parameter, as
the raw data is already present in the parent block that links to the identity
CID.

## CAR format parameters and determinism

The default header and block order in a CAR format is not specified by IPLD specifications.

Clients MUST NOT assume that CAR responses are deterministic (byte-for-byte identical) across different gateways.

Clients MUST NOT assume that CAR includes CIDs and their blocks in the same order across different gateways.

Clients MUST assume block order and duplicate status only if `Content-Type` returned with CAR responses includes optional `order` or `dups` parameters, as specified by :cite[ipip-0412].

A Gateway SHOULD support some aspects of determinism by implementing content type negotiation and signaling via `Accept` and `Content-Type` headers.

:::issue

In controlled environments, clients MAY choose to rely on implicit and
undocumented CAR determinism, subject to the agreement of the following
conditions between the client and the gateway:
- CAR version
- content of [`CarV1Header.roots`](https://ipld.io/specs/transport/car/carv1/#header) field
- order of blocks (`order` from :cite[ipip-0412])
- status of duplicate blocks (`dups` from :cite[ipip-0412])

Mind this is undocumented behavior, and MUST NOT be used on public networks.

:::

### CAR format signaling in Request

Content type negotiation is based on section 12.5.1 of :cite[rfc9110].

Clients MAY indicate their preferred block order by sending an `Accept` header in
the HTTP request. The `Accept` header format is as follows:

```
Accept: application/vnd.ipld.car; version=1; order=dfs; dups=y
```

In the future, when more orders or parameters exist, clients will be able to
specify a list of preferences, for example:

```
Accept: application/vnd.ipld.car;order=foo, application/vnd.ipld.car;order=dfs;dups=y;q=0.5
```

The above example is a list of preferences, the client would really like to use
the hypothetical `order=foo` however if this isn't available it would accept
`order=dfs` with `dups=y` instead (lower priority indicated via `q` parameter,
as noted in :cite[rfc9110]).

### CAR format signaling in Response

The Trustless Gateway MUST always respond with a `Content-Type` header that includes
information about all supported and known parameters, even if the client did not
specify them in the request.

The `Content-Type` header format is as follows:

```
Content-Type: application/vnd.ipld.car;version=1;order=dfs;dups=n
```

Gateway implementations SHOULD decide on the implicit default ordering or
other parameters, and use it in responses when client did not explicitly
specify any matching preference.

A Gateway MAY choose to implement only some parameters and return HTTP
400 Bad Request or 406 Not Acceptable when a client requested a response with
unsupported content type variant.

A Client MUST verify `Content-Type` returned with CAR response before
processing the payload, as the legacy gateway may not support optional content
type parameters like `order` an `dups` and return plain
`application/vnd.ipld.car`.

# IPNS Record Responses (application/vnd.ipfs.ipns-record)

An opaque bytes matching the [Signed IPNS Record](https://specs.ipfs.tech/ipns/ipns-record/#ipns-record)
for the requested [IPNS Name](https://specs.ipfs.tech/ipns/ipns-record/#ipns-name)
returned as [application/vnd.ipfs.ipns-record](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record).

A Client MUST confirm the record signature match `libp2p-key` from the requested IPNS Name.

A Client MUST [perform additional record verification according to the IPNS specification](https://specs.ipfs.tech/ipns/ipns-record/#record-verification).
