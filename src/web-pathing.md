---
title: Web Pathing Specification
description: >
  Specification defines a subset of possible content paths that ensures
  compatibility with existing HTTP and Web Platform standards.
date: 2023-11-12
maturity: wip
editors:
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
tags: ['architecture', 'httpGateways', 'webHttpGateways']
---

Web Pathing Specification defines a subset of possible content paths
that ensures compatibility with existing HTTP and Web Platform standards.

## Introduction

TODO: Clearly explain why the specification exists, what is the problem solved here.

This document specifies details of pathing for content paths that start with
`/ipfs` and `/ipns` namespaces, and why a logical content root included in a
content path can facilitate security isolation and relative pathing in web
contexts.

Specification includes guidance around aspects such as hash functions,
multibases, CID versions, codecs, and how they impact implementation's ability
to translate pathing into traversal of a DAG.

The goal of this specification is to enable competing and interoperable
implementations, all while ensuring seamless traversal of paths within the web
ecosystem.

## Specification

TODO: Explain things in depth.
The resulting specification should be detailed enough to allow competing,
interoperable implementations.

### TODO: things to cover

- TODO: why it's called "web pathing": ensuring pathing is interoperable with how existing http and web platform works; covers both /ipfs and /ipns namespace semantics; defines logical content root CID that can be mapped to URL / root which enables subdomain/dnslink gateways and ipfs:// and ipns:// protocol handlers to load existing datasets, websites, and assets with relative pathing without the need for modifying them; 

- TODO: how web pathing is applied to CLI Tools; path gateways; and origin contexts: subdomain/dnslink, ipfs:// ipns:// URIs

- TODO: MUSTs, SHOULDs and MAYs in relation to

  - TODO: multihash functions
    - MUSTs
      - `sha2-256` (`0x12`)
      - `blake2b-256` (`0xb220`)
      - `blake3` (`0x1e`)
      - `identity` (`0x00`) (i.e. the data itself inlined in place of a hash)
          - TODO: Identity CIDs MUST NOT generate network I/O such as bitswap, http request, since the data is always available in Multihash itself
    - SHOULDs
      - `sha2-384` (`0x20`, aka SHA-384; as specified by [FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)) TODO: where is this used? why is this on the list?
      - sha3-512 TODO: code for such label does not exist, a typo in prior notes? follow up required

  - TODO: mutlibases
    - MUSTs
      * f - base16
      * b - base32
      * k - base36
      * z - base58btc (case-sensitive!)
      * u - base64url (case-sensitive!)
    - SHOULDs
      * F - base16 (uppercase)
      * B - base32 (uppercase)
      * K - base36 (uppercase)

  - TODO: cid versions
    - MUST:
      - CIDv1 (`0x01`)
      - CIDV0 (Multihash encoded with `base58btc`, with implicit dag-pb `0x70` codec)

  - TODO: multicodecs that are required to facilitate path traversal
    - DAG-PB
    - RAW
    - libp2p-key (for IPNS names)
    - DAG-CBOR
    - DAG-JSON

- TODO: MUST support UnixFS pathing
  - TODO: traversing HAMTs
  - TODO: traversing symlinks
  - TODO: make sure [UnixFS spec draft](https://github.com/ipfs/specs/pull/331) includes relevant descriptions, only refer to them from here, dont duplicate content

- TODO MUST support DAG-CBOR/JSON pathing
  - TODO `/ipfs/cbor-cid/unixfs-file`
  - TODO `/ipfs/unixfs-dir-cid/dag-cbor-file/cbor-field`  (boxo/gateway errors on  this ([spec→traversing-cbor notes](https://specs.ipfs.tech/http-gateways/path-gateway/#traversing-through-dag-json-and-dag-cbor)), but we should specify behavior when someone wants to support this)
  - TODO make it clear if both DAG variants of CBOR and JSON are a MUST, or if JSON is a SHOULD (right now conformance tests require both as a MUST).

- TODO: MUST what happens when we can't traverse part of the path
  - TODO: separate errors for traversal errors due to missing codec vs missing content
    - TODO: `/ipfs/valid-cid-dag-pb/invalid-path` (logical "not found", translates to HTTP 404 to indicate content does not exist, mention implicit http caching of 404 vs 500 – )
    - TODO: `/ipfs/cid/unknown-codec-block/some/path` is requested (logical "path parser error", translates to  HTTP 500 error page due to missing decoder)

- TODO: MUST describe handling of non-ascii characters
  - TODO: dont invent anything new, refer to URL percent-encoding, like we did in [IPIP-383](https://github.com/ipfs/specs/pull/383)
    - TODO: non-ascii characters (percent-encoding of unicode and arbitrary binary data)
    - TODO: MUST: explicitly cover Unicode and that UTF-8 is implicit default
    - TODO: have an answer for non-UTF-8 (e.g. UTF-16) code points (a MAY and error if are not supported? or error since this is web pathing, and web URL encoding uses UTF-8?)
    - TODO: edge case: handling filenames that already look percent-encoded https://github.com/ipfs/gateway-conformance/issues/115
      - TODO/TBD notes for implementers: mixing percent-encoded and raw paths is a very very comon case across the stack, writing down a sane MUST rule of thumb for implementers could improve resiliency across systems (e.g. if path includes `%` and produced 404, retry with percent-decoded value?)

- TODO: path normalization
  - TODO: note that paths are equivalent, but HTTP 301 SHOULD be used in HTTP context to ensure clients always end up on normalized paths
  - TODO: handling redundant slashes  `///`  (301 to resolved URL? `path.Clean`?)
  - TODO: handling `.` and `..` (301 to resolved URL? `path.Clean`?)
  - TODO: trailing slash `/` required for enumerable map-like entities (UnixFS dir, DAG-CBOR document?)
  - TODO: CID normalization (to canonical text respresentation version and multibase)
    - /ipfs to CIDv1 in base32
    - /ipns to CIDV1 with libp2p-key in base36

### Test fixtures

TODO: List relevant CIDs. Describe how implementations can use them to determine
specification compliance.

TODO: [gateway-conformance](https://github.com/ipfs/gateway-conformance) tests for all MUSTs in this spec
This ensure uniform behavior across implementations and contexts such as gateways vs `ipfs://` in browsers

### Security

TODO: Explain the security implications/considerations relevant to the spec.

TODO: length limit for entire path
TODO: length limit for a path segment
TODO: content path normalization should be performed before comparing paths
TODO: mention how arbitrary content paths can be blocked via denylists defined in [IPIP-383](https://github.com/ipfs/specs/pull/383)

### Privacy and User Control

TODO: Note if there are any privacy or user control considerations that should be
taken into account by the implementers.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
