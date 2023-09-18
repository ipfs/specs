---
title: Data Onboarding with HTTP Semantics
description: >
  Reusing HTTP Semantics for onboarding data into IPFS via the HTTP gateways. It exposes a POST endpoint
  that supports multiple input types, then ingests the data into IPFS, returning its final location.
date: 2023-04-17
editors:
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
---

# Writable Gateway Specification

Writable Gateway is an extension of :cite[path-gateway], which allows data onboarding
to IPFS via HTTP endpoints. This allows for more interoperability with the remaining
of the web, and allows for more ways of adding data to IPFS.

# HTTP API

This API is a superset of the HTTP API of :cite[path-gateway]. The differences are
documented below. The main difference is the introduction of a `POST` endpoint.

## `POST /ipfs`

Onboards new data to the IPFS node behind the gateway. The onboarded data can be
of any of the following types and be specified via the `Content-Type` header:

- [`application/vnd.ipld.raw`] - adds raw [blocks] to the gateway. The data in
the request body is assumed to be pure blocks of data, with no specific structure.
- [`application/vnd.ipld.car`] - adds a [CAR] to the gateway. The data in the request
body is assumed to be a CAR file.
- [`application/x-tar`] - adds a [TAR] archive to the gateway. The data in the request
body is assumed to be a TAR archive containing a directory tree that will be added
as a UnixFS directory to IPFS.

In case of success, the request will return a `201 Created` status code, as
well as a `Content-Location` header containing the content path of the newly added
resource.

[`application/vnd.ipld.raw`]: https://www.iana.org/assignments/media-types/application/vnd.ipld.raw
[`application/vnd.ipld.car`]: https://www.iana.org/assignments/media-types/application/vnd.ipld.car
[`application/x-tar`]: https://en.wikipedia.org/wiki/Tar_(computing)
[blocks]: https://docs.ipfs.io/concepts/glossary/#block
[CAR]: https://docs.ipfs.io/concepts/glossary/#car
[TAR]: https://en.wikipedia.org/wiki/Tar_(computing)
