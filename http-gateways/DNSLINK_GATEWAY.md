# DNSLink Gateway Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Authors**:

- Marcin Rataj ([@lidel](https://github.com/lidel))

----

**Abstract**

DNSLink Gateway is an extension of
[PATH_GATEWAY.md](./PATH_GATEWAY.md)
that enables hosting a specific content path under a specific DNS name.

This document describes the delta between [PATH_GATEWAY.md](./PATH_GATEWAY.md) and this gateway type.

In short:

- HTTP request includes a valid [DNSLink](https://dnslink.dev/) name in `Host` header
- gateway decides if DNSlink name is allowed
- gateway resolves DNSLink to an immutable content root identified by a CID
- HTTP response includes the data for the CID

# Table of Contents

- [DNSLink Gateway Specification](#dnslink-gateway-specification)
- [Table of Contents](#table-of-contents)
- [HTTP API](#http-api)
  - [`GET /[{path}][?{params}]`](#get-pathparams)
  - [`HEAD /[{path}][?{params}]`](#head-pathparams)
- [HTTP Request](#http-request)
  - [Request headers](#request-headers)
    - [`Host` (request header)](#host-request-header)
- [HTTP Response](#http-response)
- [Appendix: notes for implementers](#appendix-notes-for-implementers)
  - [Leveraging DNS for content routing](#leveraging-dns-for-content-routing)

# HTTP API

## `GET /[{path}][?{params}]`

Downloads data at specified path under the content path for DNSLink name provided in `Host` header. 

- `path` – optional path to a file or a directory under the content root sent in `Host` HTTP header
    - Example: if `Host: example.com` then the content path to resolve is `/ipns/example.com/{path}`

## `HEAD /[{path}][?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Below MUST be implemented **in addition** to the [HTTP Request section from `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-request).

## Request headers

### `Host` (request header)

Defines the [DNSLink](https://docs.ipfs.io/concepts/glossary/#dnslink) name
to RECURSIVELY resolve into an immutable `/ipfs/{cid}/` prefix that should
be prepended to the `path` before the final IPFS content path resolution
is performed.

Implementations MUST ensure DNSLink resolution is safe and correct:
- each DNSLink may include an additional path segment, which MUST be preserved
- each DNSLink may point at other DNSLink, which means there MUST be a hard
  recursion limit (e.g. 32) and HTTP 400 Bad Request error MUST be returned
  when the limit is reached.

**Example: resolving an advanced DNSLink chain**

To illustrate, given DNSLink records:

- `_dnslink.a.example.com` TXT record: `dnslink=/ipns/b.example.net/path-b`
- `_dnslink.b.example.net` TXT record: `dnslink=/ipfs/bafy…qy3k/path-c`

HTTP client sends `GET /path-a` request with  `Host: a.example.com` header
which recursively resolves all DNSLinks and produces the final immutable
content path:

1. `Host` header + `/path-a` → `/ipns/a.example.net/path-a`
2. Resolving DNSlink at `a.example.net` replaces `/ipns/a.example.net` with `/ipns/b.example.net/path-b`
3. Resolving DNSlink at `b.example.net` replaces `/ipns/b.example.net` with `/ipfs/bafy…qy3k/path-c`
4. The immutable content path is `/ipfs/bafy…qy3k/path-c/path-b/path-a`

# HTTP Response

Same as [HTTP Response section in `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-response).

# Appendix: notes for implementers

## Leveraging DNS for content routing

- It is a good idea to publish
  [DNSAddr](https://github.com/multiformats/multiaddr/blob/master/protocols/DNSADDR.md)
  TXT records with known content providers for the data behind a DNSLink. IPFS
  clients will be able to detect DNSAddr and preconnect to known content
  providers, removing the need for expensive DHT lookup.
