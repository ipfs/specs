# Trustless Gateway Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Authors**:

- Marcin Rataj ([@lidel](https://github.com/lidel))

----

**Abstract**

Trustless Gateway is a minimal _subset_ of [PATH_GATEWAY.md](./PATH_GATEWAY.md)
that allows light IPFS clients to retrieve data behind a CID and verify its
integrity without delegating any trust to the gateway itself.

The minimal implementation means:

- data is requested by CID, only supported path is `/ipfs/{cid}`
- no path traversal or recursive resolution, no UnixFS/IPLD decoding server-side
- response type is always fully verifiable: client can decide between a raw block or a CAR stream

# Table of Contents

- [Trustless Gateway Specification](#trustless-gateway-specification)
- [Table of Contents](#table-of-contents)
- [HTTP API](#http-api)
  - [`GET /ipfs/{cid}[?{params}]`](#get-ipfscidparams)
  - [`HEAD /ipfs/{cid}[?{params}]`](#head-ipfscidparams)
- [HTTP Request](#http-request)
  - [HTTP Request Headers](#http-request-headers)
    - [`Accept` (request header)](#accept-request-header)
- [HTTP Response](#http-response)
  - [HTTP Response Headers](#http-response-headers)
    - [`Content-Disposition` (response header)](#content-disposition-response-header)

# HTTP API

A subset of [HTTP API from `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-api).

## `GET /ipfs/{cid}[?{params}]`

Downloads data at specified CID.

## `HEAD /ipfs/{cid}[?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Same as in [PATH_GATEWAY.md](./PATH_GATEWAY.md#http-request), but with limited number of supported response types.

## HTTP Request Headers

### `Accept` (request header)

This HTTP header is required when running in a strict, trustless mode.

Gateway is free to return HTTP 400 Bad Request when running in strict trustless
mode and  `Accept` header is missing

Below response types MUST to be supported:
- [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw) – requests a single, verifiable raw block to be returned
- [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) – disables IPLD/IPFS deserialization, requests a verifiable CAR stream to be returned

# HTTP Response

Below MUST be implemented **in addition** to the [HTTP Response section from `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-response).

## HTTP Response Headers

### `Content-Disposition` (response header)

MUST be returned and set to `attachment` to ensure requested bytes are not rendered by a web browser.
