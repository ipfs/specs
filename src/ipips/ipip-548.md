---
title: "IPIP-0548: Sunset X-Ipfs-Path header"
date: 2026-08-18
ipip: ratified
editors:
  - name: Alex Potsides
    github: achingbrain
    url: https://achingbrain.net
    affiliation:
        name: Shipyard
        url: https://ipshipyard.com
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org
    affiliation:
        name: Shipyard
        url: https://ipshipyard.com
relatedIssues:
  - https://github.com/ipfs/specs/issues/548
order: 548
tags: ['ipips']
---

## Summary

Replace `X-Ipfs-Path` header with `Ipfs-Uri` version that can correctly encode
any special characters likely to be found in an IPFS Path.

## Motivation

HTTP header values can only include characters from a limited set.

There is a gap in the existing gateway specification in that it does not say how
characters from outside this set are to be treated.

The spec is implemented and consumed widely so retrospectively adding encoding
rules would be disruptive, and we would have to agree on an encoding format.

URIs already have a well-defined encoding format (percent encoding, defined in
[RFC 3986](https://www.rfc-editor.org/rfc/rfc3986.html#section-2.1)), so
introduce an `Ipfs-Uri` header to be used in preference to `X-Ipfs-Path` which
can handle any and all characters found in an IPFS path, and can be losslessly
converted back into an IPFS Path if the client desires it.

## Detailed design

The `Ipfs-Uri` header should be added which contains the IPFS/IPNS path as a
URI (e.g. `ipfs://...` or `ipns://...`) with any special characters
percent-encoded as per RFC 3986.

It takes precedence over `X-Ipfs-Path` and implementations are free to not
include this header in the future.

## Design rationale

Retroactively adding encoding rules to `X-Ipfs-Path` would be too disruptive to
existing clients so adding a new header and deprecating the old one seems like
the least worst way forward.

### User benefit

`Ipfs-Uri` correctly encodes otherwise illegal characters so users can determine
the original IPFS Path of a resource without data corruption.

### Compatibility

Since we are adding a new header this is a non-breaking change.

### Security

No security implications.

## Test fixtures

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
