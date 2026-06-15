---
title: CID (Content IDentifier)
description: >
    Self-describing content-addressed identifiers for distributed systems
date: 2026-06-15
maturity: permanent
editors:
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
  - name: Robin Berjon
    email: robin@berjon.com
    url: https://berjon.com/
    github: darobin
    twitter: robinberjon
    affiliation:
        name: IPFS Foundation
        url: https://ipfsfoundation.org/
former_editors:
  - name: Juan Benet
    github: jbenet
thanks:
  - name: Steven Allen
    github: Stebalien
  - name: Rod Vagg
    github: rvagg
  - name: bumblefudge
    github: bumblefudge
  - name: Volker Mische
    github: vmx
  - name: Joel Thorstensson
    github: oed
  - name: Oli Evans
    github: olizilla

tags: ['data-formats']
order: 1
---

**CID** is a format for referencing content in distributed information systems, like [IPFS](https://ipfs.tech).
It leverages [content addressing](https://en.wikipedia.org/wiki/Content-addressable_storage),
[cryptographic hashing](https://simple.wikipedia.org/wiki/Cryptographic_hash_function), and
[self-describing formats](https://github.com/multiformats/multiformats).
It is the core identifier used by [IPFS](https://ipfs.tech) and [IPLD](https://ipld.io).
It uses a [multicodec](https://github.com/multiformats/multicodec) to indicate its version, making it fully self describing.

## What is it?

A CID is a self-describing content-addressed identifier.
It uses cryptographic hashes to achieve content addressing. It uses several
[multiformats](https://github.com/multiformats/multiformats) to achieve flexible self-description, namely:

1. [multihash](https://github.com/multiformats/multihash) for content-addressed hashing, and
2. [multicodec](https://github.com/multiformats/multicodec) to type that addressed content,
to form a binary self-contained identifier, and optionally also
3. [multibase](https://github.com/multiformats/multibase) to encode that binary CID as a string.

Concretely, it's a *typed* content address: a tuple of `(content-type, content-address)`.

## How does it work?

Current version: CIDv1.

CIDv1 is a **binary** format composed of [unsigned varints](https://github.com/multiformats/unsigned-varint)
prefixing a hash digest to form a self-describing "content address":

```text
<cidv1> ::= <CIDv1-multicodec><content-type-multicodec><content-multihash>
# or, expanded:
<cidv1> ::= <`0x01`, the code for `CIDv1`><another code from `ipld` entries in multicodec table that signals content type of data being addressed><multihash of addressed data>
```

Where

- `<multicodec-cidv1>` is a [multicodec](https://github.com/multiformats/multicodec) representing the version of CID, here for upgradability purposes.
- `<multicodec-content-type>` is a [multicodec](https://github.com/multiformats/multicodec) code representing the content type or format of the data being addressed.
- `<multihash-content-address>` is a [multihash](https://github.com/multiformats/multihash) value, which uses a registry of hash function abbreviations to prefix a cryptographic hash of the content being addressed, thus making it self-describing.

## Variant - Stringified Form

Since CIDs have many applications outside of binary-only contexts, a given CID may need to be base-encoded for different consumers or transports.
In such applications, CIDs are expressed as a Unicode *string* with a [multibase](https://github.com/multiformats/multibase) prefix.
The multibase prefix identifies the string encoding but is not part of the CID itself -- the same binary CID may be represented in different bases depending on context and needs such as string length and case-sensitivity.
The full string form is:

```text
<cidv1-str> ::= <multibase-prefix><multibase-encoding(<CIDv1-multicodec><multicodec><multihash>)>
```

Where

- `<multibase-prefix>` is a [multibase prefix](https://github.com/multiformats/multibase/blob/master/multibase.csv) (1 Unicode code point) that makes the string self-describing for conversion back to binary.

IPFS implementations SHOULD support at minimum `base58btc` (`z`), `base32` (`b`), `base16` (`f`), and `base36` (`k`, for ed25519 keys in [IPNS Records](https://specs.ipfs.tech/ipns/ipns-record/)).

## Design Considerations

CIDs design takes into account many difficult tradeoffs encountered while building [IPFS](https://ipfs.tech). These are mostly coming from the multiformats project.

- Compactness: CIDs are binary in nature to ensure these are as compact as possible, as they're meant to be part of longer path identifiers or URIs.
- Transport friendliness (or "copy-pastability"): CIDs are encoded with multibase to allow choosing the best base for transporting. For example, CIDs can be encoded into base58btc to yield shorter and easily-copy-pastable hashes.
- Versatility: CIDs are meant to be able to represent values of any format with any cryptographic hash.
- Avoid Lock-in: CIDs prevent lock-in to old, potentially-outdated decisions.
- Upgradability: CIDs encode a version to ensure the CID format itself can evolve.

## Versions

### CIDv0

CIDv0 is a backwards-compatible version, where:
- the `multibase` of the string representation is always `base58btc` and implicit (prefix `z` not present)
- the `multicodec` is always `dag-pb` (`0x70`) and implicit (not written)
- the `cid-version` is always `cidv0` (`0`) and implicit (not written)
- the `multihash` is written as is but is always a full (length 32) `sha2-256` (`0x12`) hash.

```text
cidv0 ::= <multihash-content-address>
```

### CIDv1

See the section: [How does it work?](#how-does-it-work)

```text
<cidv1> ::= <multicodec-cidv1><multicodec-content-type><multihash-content-address>
```

## Decoding Algorithm

The binary fields of a CID are [unsigned varints](https://github.com/multiformats/unsigned-varint).
Two rules hold for every CID:

- each varint MUST be minimally encoded, and a decoder MUST reject any overlong (non-minimal) varint;
- a decoder MUST reject any bytes left over after the multihash.

A binary CID has one of two shapes, told apart by its leading bytes:

| Leading bytes | Shape |
| --- | --- |
| `0x01` | a **CIDv1**, where this first varint is the version field |
| `0x12 0x20` | a bare 34-byte `sha2-256` multihash: a **CIDv0** |
| anything else | not a CID; a decoder MUST reject it |

A CIDv0 is identified by the two-byte prefix `0x12 0x20`, not by the leading byte `0x12` alone: `0x12` is the `sha2-256` multihash code and `0x20` is its digest length, 32. A CIDv0 has no version field.

### Decoding a binary CID

To decode a binary CID `bytes`:

1. If `bytes` is exactly 34 bytes long and begins with `0x12 0x20`, it is a **CIDv0**, a bare `sha2-256` multihash (`cidv0 ::= <multihash-content-address>`):
   1. The 34 bytes are `0x12` (the `sha2-256` code), `0x20` (the digest length, 32), and a 32-byte digest.
   2. The content type is implicitly `dag-pb` (`0x70`) and is not encoded.
2. Otherwise, read the leading varint of `bytes`.
3. If the leading varint is `0x01`, it is a **CIDv1** (`<cidv1> ::= <multicodec-cidv1><multicodec-content-type><multihash-content-address>`):
   1. The `<multicodec-cidv1>` version field is the `0x01` just read.
   2. Read the next varint as the `<multicodec-content-type>`, which types the content.
   3. Read the [`<multihash-content-address>`](https://github.com/multiformats/multihash) that follows, structured as `<hash-code><digest-length><digest>`.
   4. The `<digest-length>` MUST consume the remaining bytes exactly; a decoder MUST reject a truncated digest or any trailing bytes.
4. Otherwise, a decoder MUST reject `bytes`. No other leading value is a CID. In particular, reject a leading `0x12` that is not the `0x12 0x20` prefix of a 34-byte input, and reject `0x00`, `0x02` (reserved for the never-deployed CIDv2), and `0x03` (reserved for the never-deployed CIDv3).

### Decoding a CID string

To decode a CID string (ASCII or UTF-8):

1. If the string is 46 characters long and begins with `Qm`:
   1. Decode it as `base58btc` to get `bytes`.
   2. Decode `bytes` as a binary CID (above) and return the result; it validates as a CIDv0.
2. Otherwise, decode the string by its [multibase](https://github.com/multiformats/multibase) prefix to get `bytes`.
3. If the first byte of `bytes` is `0x12`, a decoder MUST reject the input: a CIDv0 is never multibase-encoded, and `0x12` equals 18, a value reserved so that no CIDv18 can be confused with a base-decoded CIDv0.
4. Decode `bytes` as a binary CID (above) and return the result.

# Appendices

:::warning
These sections provide additional context. This is not part of specification,
and is provided here only for extra context.
:::

<!-- TODO: review each implementation for spec conformance before listing here.
     A spec should not reference implementations that may not follow it.

## Implementations

- [go-cid](https://github.com/ipfs/go-cid)
- [java-cid](https://github.com/ipld/java-cid)
- [js-multiformats](https://github.com/multiformats/js-multiformats)
- [rust-cid](https://github.com/multiformats/rust-cid)
- [py-multiformats-cid](https://github.com/pinnaculum/py-multiformats-cid)
- [elixir-cid](https://github.com/nocursor/ex-cid)
- [dart_cid](https://github.com/dwyl/dart_cid)
- [zig_cid](https://github.com/zen-eth/multiformats-zig)

-->

## FAQ

> **Q. I have questions on multicodec, multibase, multihash, or unsigned-varint.**

Please check their repositories: [multicodec](https://github.com/multiformats/multicodec), [multibase](https://github.com/multiformats/multibase), [multihash](https://github.com/multiformats/multihash), [unsigned-varint](https://github.com/multiformats/unsigned-varint).

> **Q. Why does CID exist?**

IPFS originally used base58btc-encoded multihashes, but the need to support multiple data formats via IPLD revealed limitations of bare multihashes as identifiers.
CIDs were created to provide a self-describing, versioned, typed content address.
The history of this format is documented at: https://github.com/ipfs/specs/issues/130

> **Q. Is the use of multicodec similar to file extensions?**

Yes. Like a file extension, the multicodec in a CID tells consumers how to interpret the bytes.
And just like file extensions, most users will never change it, but it is technically possible to swap the codec to change how the same bytes behind a CID are parsed.

> **Q. What formats (multicodec codes) does CID support?**

CID can reference content of any type registered in the [multicodec table](https://github.com/multiformats/multicodec/blob/master/table.csv).
In practice, IPFS primarily uses [`dag-pb`](https://web.archive.org/web/20260305020653/https://ipld.io/specs/codecs/dag-pb/spec/) (`0x70`), [`raw`](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw) (`0x55`), [`dag-cbor`](https://web.archive.org/web/20260305020653/https://ipld.io/specs/codecs/dag-cbor/spec/) (`0x71`), [`dag-json`](https://web.archive.org/web/20260305020653/https://ipld.io/specs/codecs/dag-json/spec/) (`0x0129`), and [`libp2p-key`](https://github.com/libp2p/specs/blob/4e2c796bc77a2639136b277224468b7c48b9fff1/RFC/0001-text-peerid-cid.md) (`0x72`).

> **Q. What is the process for updating CID specification (e.g., adding a new version)?**

CIDs are a well established standard.
IPFS uses CIDs for content-addressing and IPNS.
Making changes to such key protocol requires a careful review which should include feedback from implementers and stakeholders across ecosystem.

Due to this, changes to CID specification MUST be submitted as an improvement proposal to [ipfs/specs](https://github.com/ipfs/specs/tree/main/IPIP) repository (PR with [IPIP document](https://github.com/ipfs/specs/blob/main/IPIP/0000-template.md)), and follow the IPIP process described there.

## Historical Design Decisions

You can read an [in-depth discussion on why this format was needed in IPFS](https://github.com/ipfs/specs/issues/130) and the [original CIDv1 proposal](https://github.com/multiformats/cid/blob/f638ca68390758f0d4c7f90ac843091d3973cd02/original-rfc.md).

## Human-Readable Form

This is design guidance for tools that present a human-readable CID inspector to a user, such as a debugger, a block explorer, or the diagnostic UI at https://cid.ipfs.tech.
It is not a wire format: nothing produces or parses it, and it carries no information beyond what the CID already encodes.

When such a UI needs to show what a CID contains, it can expand the already self-describing CID into a labelled listing of its parts:

```text
<hr-cid> ::= <hr-mbc> "-" <hr-cid-mc> "-" <hr-mc> "-" <hr-mh>
```

Where each sub-component is the name of its code in the relevant multiformats registry:

- `<hr-mbc>` is the multibase code name (eg `b` -> `base32`)
- `<hr-cid-mc>` is the CID version multicodec name (eg `0x01` -> `cidv1`)
- `<hr-mc>` is the content-type multicodec name (eg `0x55` -> `raw`)
- `<hr-mh>` is the multihash code name and digest length (eg `sha2-256-256`), then a final dash and the hex digest

For example, the CIDv1 for the raw bytes `hello`:

```text
# example CID
bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq
# corresponding human readable CID
base32 - cidv1 - raw - sha2-256-256-2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

These names come from the multiformats registries and are provisional labels for human eyes only; only the numeric codes are stable.
A UI should show the codes next to the names, and no consumer should rely on a name staying the same.
See: https://cid.ipfs.tech/#bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq
