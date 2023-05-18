---
title: Piece Gateway Specification
description: >
  The Piece Gateway describes an HTTP server namespace for integrating
  Filecoin Piece resources within the existing HTTP stack.
date: 2023-05-18
maturity: WIP
editors:
  - name: Will Scott
    github: willscott
    url: https://wills.co.tt/
  - name: Dirk McCormick
    github: dirkmc
tags: ['httpGateways', 'pieceGateway']
order: 5
---

The most basic retrieval mechanism in filecoin is piece retrieval, an
HTTP endpoint for directly fetching stored pieces.

These pieces are mounted at the  `/piece/` namespace under the HTTP server root.

**Note:** the Piece Gateway is one aspect of filecoin retrieval. The full retrieval
semantics also include CID based retrieval within pieces using an IPFS-compatible gateway,
and availability of IPNI-compatible indexes of the CIDs within each piece for indexing.

# HTTP API

Piece Gateway is an HTTP interface for requesting data at a specified content path.

## `GET /piece/{piece cid}`

Downloads data at the specified **immutable** path.

- `piece cid` – a valid piece identifier ([CID](https://docs.ipfs.io/concepts/glossary#cid))

## `HEAD /piece/{piece cid}`

Same as GET, but does not return any payload.

Implementations are free to limit the scope of work triggered by
`HEAD` requests to only that required for producing response headers
such as
[`Content-Length`](#content-length-response-header)

# HTTP Request

## Request Headers

### `Range` (request header)

`Range` can be used for requesting specific byte ranges of a piece.

Piece Gateway implementations MUST support range requests for piece retrieval.

# HTTP Response

## Response Status Codes

### `200` OK

The request succeeded.

If the HTTP method was `GET`, then data is transmitted in the message body.

### `206` Partial Content

Partial Content: range request succeeded.

Returned when requested range of data described by  [`Range`](#range-request-header) header of the request.

### `400` Bad Request

A generic client error returned when it is not possible to return a better one

### `404` Not Found

Error to indicate that request was formally correct, but returning the
content was not possible as the content was not present on the server.

### `410` Gone

Error to indicate that request was formally correct, but this specific Gateway
refuses to return requested data.

Particularly useful for implementing [deny lists](#denylists), in order to not serve malicious content.
The name of deny list and unique identifier of blocked entries can be provided in the response body.

See: [Denylists](#denylists)

### `429` Too Many Requests

A
[`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
header might be included to this response, indicating how long to wait before
making a new request.

### `451` Unavailable For Legal Reasons

Error to indicate that request was formally correct, but this specific Gateway
is unable to return requested data due to legal reasons. Response SHOULD
include an explanation, as noted in Section 3 of :cite[rfc7725].

See: [Denylists](#denylists)

### `500` Internal Server Error

A generic server error returned when it is not possible to return a better one.

### `504` Gateway Timeout

Returned when Gateway was not able to produce response under set limits.

## Response Headers

### `Etag` (response header)

Used for HTTP caching.

An opaque identifier for a specific version of the returned payload. The unique
value must be wrapped by double quotes as noted in Section 8.8.3 of :cite[rfc9110].

### `Cache-Control` (response header)

Used for HTTP caching.

An explicit caching directive for the returned response. Informs HTTP client
and intermediate middleware caches such as CDNs if the response can be stored
in caches.

- `Cache-Control: public, max-age=29030400, immutable` should be returned for
  every immutable resource under `/piece/` namespace.
- the `max-age` field may be set to the time of deal expiration.

### `Last-Modified` (response header)

Optional, used as additional hint for HTTP caching.

- This may be set to the time of deal start.

### `Content-Type` (response header)

If the piece has been successfully interpreted as a CAR file, the response
SHOULD be `application/vnd.ipld.car`. CAR `content-types` must be returned
with explicit version.
Example: `Content-Type: application/vnd.ipld.car; version=1`

If the implementation does not know if a given piece is a valid CAR, it may return
`Content-Type: application/octet-stream` for all piece data as a fallback.

### `Content-Disposition` (response header)

- `Content-Disposition: attachment; filename="<cid>.car"` should be returned
  with `Content-Type: application/vnd.ipld.car` responses to ensure client does
  not attempt to render streamed bytes.

- `Content-Disposition: attachment; filename="<cid>"` should be returned
  with if `Content-Type: application/octet-stream` responses to ensure client does
  not attempt to render raw bytes.

### `Content-Length` (response header)

Represents the length of returned HTTP payload.

NOTE: the value may differ from the real size of requested data if compression or chunked `Transfer-Encoding` are used.

### `Content-Range` (response header)

Returned only when request was a [`Range`](#range-request-header) request.

See Section 14.4 of :cite[rfc9110].

### `Accept-Ranges` (response header)

Optional, returned to explicitly indicate if gateway supports partial HTTP
[`Range`](#range-request-header) requests for a specific resource.

### `X-Content-Type-Options` (response header)

- `X-Content-Type-Options: nosniff` indicates that the `Content-Type` should be
  followed and not be changed. This is a security feature, ensuring that
  non-executable binary response types are not used in `<script>` and `<style>`
  HTML tags.

### `X-Trace-Id` (response header)

Optional. Implementations are free to use this header to return a globally
unique identifier to help in debugging errors and performance issues.

A good practice is to always return it with HTTP error [status codes](#response-status-codes) >=`400`.
