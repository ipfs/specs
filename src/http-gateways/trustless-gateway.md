---
title: Trustless Gateway Specification
description: >
  Trustless Gateways are a minimal subset of Path Gateways that allow light IPFS
  clients to retrieve data behind a CID and verify its integrity without delegating any
  trust to the gateway itself.
date: 2023-03-30
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

Trustless Gateway is a minimal _subset_ of :cite[path-gateway]
that allows light IPFS clients to retrieve data behind a CID and verify its
integrity without delegating any trust to the gateway itself.

The minimal implementation means:

- data is requested by CID, only supported path is `/ipfs/{cid}`
- no path traversal or recursive resolution, no UnixFS/IPLD decoding server-side
- response type is always fully verifiable: client can decide between a raw block or a CAR stream

# HTTP API

A subset of "HTTP API" of :cite[path-gateway].

## `GET /ipfs/{cid}[?{params}]`

Downloads data at specified CID.

## `HEAD /ipfs/{cid}[?{params}]`

Same as GET, but does not return any payload.

## `GET /ipns/{key}[?{params}]`

Downloads data at specified IPNS Key. Verifiable :cite[ipns-record] can be requested via `?format=ipns-record`

## `HEAD /ipns/{key}[?{params}]`

same as GET, but does not return any payload.

# HTTP Request

Same as in :cite[path-gateway], but with limited number of supported response types.

## HTTP Request Headers

### `Accept` (request header)

This HTTP header is required when running in a strict, trustless mode.

Gateway is free to return HTTP 400 Bad Request when running in strict trustless
mode and  `Accept` header is missing

Below response types MUST to be supported:

- [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw) – requests a single, verifiable raw block to be returned
- [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) – disables IPLD/IPFS deserialization, requests a verifiable CAR stream to be returned
- [application/vnd.ipfs.ipns-record](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) – requests a verifiable :cite[ipns-record] (multicodec `0x0300`).

# HTTP Response

Below MUST be implemented **in addition** to "HTTP Response" of :cite[path-gateway].

## HTTP Response Headers

### `Content-Disposition` (response header)

MUST be returned and set to `attachment` to ensure requested bytes are not rendered by a web browser.
