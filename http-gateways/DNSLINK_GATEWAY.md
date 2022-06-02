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

- HTTP request includes a valid DNSLink name in `Host` header
- gateway resolves DNSLink to an immutable content root identified by a CID
- HTTP response includes the data for the CID
- No third-party CIDs can be loaded

# Table of Contents

- [DNSLink Gateway Specification](#dnslink-gateway-specification)
- [Table of Contents](#table-of-contents)
- [HTTP API](#http-api)
  - [`GET /[{path}][?{params}]`](#get-pathparams)
  - [`HEAD /[{path}][?{params}]`](#head-pathparams)
- [HTTP Request](#http-request)
  - [Request headers](#request-headers)
    - [`Host` (request header)](#host-request-header)
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

## Request headers

### `Host` (request header)


Defines the DNSLink name to resolve into `/ipfs/{cid}/` prefix that should be
prepended to the `path` before the final IPFS content path resolution is
performed.

Example: if client sent HTTP GET request for `/sub-path` path and  `Host:
example.com` header, and DNS at `_dnslink.example.com` has TXT record with
value  `dnslink=/ipfs/cid1`, then the final content path is
`/ipfs/cid1/sub-path`

# Appendix: notes for implementers

## Leveraging DNS for content routing

- It is a good idea to publish
  [DNSAddr](https://github.com/multiformats/multiaddr/blob/master/protocols/DNSADDR.md)
  TXT records with known content providers for the data behind a DNSLink. IPFS
  clients will be able to detect DNSAddr and preconnect to known content
  providers, removing the need for expensive DHT lookup.
