---
title: IPNS URI (ipns://)
description: >
  The ipns:// URI scheme for addressing mutable pointers, cryptographic IPNS
  names and DNSLink names, defined for interoperability with web browsers.
date: 2026-08-03
maturity: draft
editors:
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
thanks:
  - name: Frédéric Wang
    github: fred-wang
    affiliation:
      name: Igalia
      url: https://igalia.com/
  - name: Jonny Crunch
    github: jonnycrunch
  - name: Dietrich Ayala
    github: autonome
  - name: bumblefudge
    github: bumblefudge
xref:
  - ipns-record
tags: ['ipns']
order: 2
---

The `ipns://` URI scheme names **mutable** pointers. It is the mutable sibling of the
[`ipfs://`](https://specs.ipfs.tech/ipfs-uri/) scheme, and shares its structure, syntax, origin
model, and its deferral of path, query, and fragment handling to the WHATWG URL parser. This
document defines only what is specific to `ipns://`: what its content root may contain, and how
that root is resolved.

Read [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/) first: it defines everything the two
schemes share, including the authority form and why `//` is required, the origin model, path,
query, and fragment behavior, the ban on endpoint information, and the shape of the IANA
registration. This document does not repeat it.

## What is it?

An `ipns://` URI places a mutable content root in the authority and an optional path after it:

```text
ipns://{ipns-name}/{path}?{query}#{fragment}
```

For example:

```text
ipns://k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8/
ipns://dnslink.example.net/wiki/
```

`ipns://{ipns-name}/{path}` maps to the content path `/ipns/{ipns-name}/{path}`.

Because the target of an IPNS name can be republished to point at different content over time,
an `ipns://` URI is a **mutable** pointer. `ipns://` MUST NOT be used as a namespace for a bare
CID that directly names immutable bytes: such a CID belongs under
[`ipfs://`](https://specs.ipfs.tech/ipfs-uri/). The only CIDs valid under `ipns://` are those that
name a public key, `libp2p-key` CIDv1s today: a key is a mutable pointer to content, where a bare
content CID is not (see [The content root](#the-content-root)).

## The content root

`ipns://` supports two kinds of content root, and every implementation MUST accept both:

- an :ref[IPNS Name], a cryptographic key defined in :cite[ipns-record], and
- a DNS name resolved via DNSLink.

They are told apart by trying the first and falling back to the second: an implementation attempts
to parse the authority as a CIDv1, and only if that fails does it treat the authority as a DNSLink
domain. [Parsing the authority](#parsing-the-authority) gives the exact steps.

```abnf
ipns-URI       = "ipns://" ipns-authority path-abempty
                 [ "?" query ] [ "#" fragment ]

ipns-authority = ipns-key / dnslink-name

; (a) IPNS Name: a CIDv1 naming a public key, multibase base36
;     (libp2p-key, 0x72, is the codec in use today)
ipns-key       = "k" 1*base36char   ; canonical form; see "Cryptographic key form"
                                    ; for other case-insensitive encodings
                                    ; a single DNS label, no "."
                                    ; SHOULD NOT exceed 63 characters total
base36char     = %x30-39 / %x61-7A  ; "0"-"9" / "a"-"z"

; (b) DNSLink name: an ICANN-compatible DNS name, at least one "." on the public internet
dnslink-name   = label 1*( "." label )
label          = let-dig [ *61( let-dig / "-" ) let-dig ]  ; RFC 1123: max 63 characters,
                                                           ; no leading or trailing "-"
let-dig        = %x61-7A / %x30-39                         ; lowercase; DNS comparison
                                                           ; is case-insensitive
```

As in [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#syntax), the ABNF describes the **canonical**
form only: a `base36` key. A key in another case-insensitive multibase does not match `ipns-key`
but can still appear as input;
[Cryptographic key form](#cryptographic-key-form) says how to handle it.

`path-abempty`, `query`, and `fragment` are as in [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#syntax).
The same WHATWG-URL-governs tie-breaker applies.

### Cryptographic key form

- When the content root is a cryptographic key, it MUST be an :ref[IPNS Name]: a CIDv1
  (:cite[cid]) that names a public key, as defined by :cite[ipns-record].
- The key MUST be encoded in a case-insensitive multibase and SHOULD use **base36** (multibase
  prefix `k`). base36 is to `ipns://` what `base32` is to
  [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#origin): the canonical
  [origin](https://specs.ipfs.tech/ipfs-uri/#origin) string, so producers SHOULD normalize to it
  and keep one key in one sandbox for storage and permissions. Wherever the authority also has to
  work as a DNS label, an Ed25519 key MUST use base36: its `base32` encoding exceeds the
  63-character limit below (see [Why base36 for Ed25519](#why-base36-for-ed25519)).
- The authority SHOULD NOT exceed **63 characters**: the DNS label limit that lets an IPNS name
  serve as a Subdomain Gateway (:cite[subdomain-gateway]) label and its origin. As with
  [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#what-the-authority-may-contain), a local resolver
  or native implementation MAY support a longer name for internal use, for example via a
  localhost subdomain; an implementation that cannot SHOULD reject it.
- A case-sensitive `base58btc` identifier, whether a CIDv0 (`Qm...`) or a legacy peer-id string
  (`12D3Koo...`), MUST NOT appear in the authority, for the same reason it is unsafe in an
  [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#why-the-authority-must-be-case-insensitive)
  authority: it is lowercased and destroyed when parsed into the authority.
- The CID's multicodec says how the public key is wrapped. This specification does not fix the set
  of acceptable codecs: an implementation decides which key types and which key container codecs,
  `libp2p-key` (`0x72`) among them, it accepts, so a new key type can be deployed without revising
  this document (see [Room for new key types](#room-for-new-key-types)). An implementation SHOULD
  document the set it supports, and SHOULD support `libp2p-key`, the only codec in wide use today.
- An implementation given a codec it does not support MUST NOT resolve the name as though the codec
  were one it does. It either rejects the authority, per
  [Parsing the authority](#parsing-the-authority), or normalizes it to a codec it does support and
  redirects to the corrected URI. Falling back to `libp2p-key` over the same multihash is a
  reasonable last resort when nothing else matches.

### DNSLink name form

- When the content root is a DNS name, it MUST be resolved via DNSLink
  (:cite[dnslink-gateway]), and for the public internet it MUST be an ICANN-compatible DNS name:
  lowercase LDH labels (ASCII letters, digits, hyphens, with no leading or trailing hyphen) joined
  by at least one dot (`.`). The dot both reflects public DNS structure and keeps the DNS name
  distinct from a single-label cryptographic key.
- An internationalized name MUST be converted to its ASCII form (`xn--...` punycode labels) via
  [domain to ASCII](https://url.spec.whatwg.org/#concept-domain-to-ascii) before it is placed in
  the authority; the authority itself carries only LDH labels.
- DNSLink resolution MUST enforce a hard recursion limit (for example 32) and fail when it is
  exceeded, as required by :cite[dnslink-gateway].

### Parsing the authority

The key form is tried first and the DNSLink form is the fallback. The order is what makes the two
unambiguous in the one place they could collide, a dot-less authority: a canonical `ipns-key` is a
single label with no dot, and a public DNSLink name always has at least one. A resolver MUST apply
these steps in order.

1. **Try the key form.** Parse the authority as a CIDv1. If it decodes to a CID that satisfies
   [Cryptographic key form](#cryptographic-key-form), it is an :ref[IPNS Name]: resolve it as a key
   and stop. If it decodes to a CID whose codec the implementation does not support, reject or
   redirect per that section, and stop.
2. **Fall back to DNSLink.** If the CIDv1 parse failed and the authority contains a `.`, treat it
   as a DNSLink name and resolve it per [DNSLink name form](#dnslink-name-form), then stop.
3. **Try the inlined label.** Otherwise the authority is a single label that is not a key. A
   resolver SHOULD decode it with the Subdomain Gateway's DNSLink label encoding and retry step 2
   with the result, which is what lets an inlined label round-trip back into a dotted name (see
   [Resolution](#resolution)).
4. **Otherwise reject** the authority as unresolvable, as in
   [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#what-the-authority-may-contain). Implementations
   SHOULD present an error explaining why, rather than forwarding the name to a resolver that can
   only fail.

A DNSLink name is never mistaken for a key, because a dotted name cannot decode as a CIDv1 and a
key never contains a dot. Trying the key form first also means a name that would decode as a CID is
always read as a key, which is what keeps one identifier from resolving two different ways in two
different implementations.

Step 3 is also where a local-resolver extension for dot-less names would sit. Such names are out of
scope for public-internet `ipns://` URIs, because they are network-relative: the same origin string
can name different content on different networks. Origin-scoped state (storage, permissions)
sandboxed under such a name can therefore leak between unrelated sites, so an implementation
offering the extension SHOULD account for the instability, for example by not persisting that
state.

## Resolution

Resolution has one step that `ipfs://` does not. The content root is mutable, so it MUST first be
resolved to an immutable CID: an :ref[IPNS Name] through its signed record, a DNSLink name through
DNS, which may itself point at another DNSLink name or at an :ref[IPNS Name] before it bottoms out.
Everything after that is identical to `ipfs://`. The CID that comes out is the content root for the
rest of the operation, and its multicodec is what says how to decode the root block and how to walk
`{path}` out of it, exactly as in
[`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#how-the-content-root-drives-traversal). Only the step
that produces the CID differs; the traversal does not.

Otherwise resolution follows [`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#resolution), with the
IPNS namespace in place of the IPFS one: `ipns://{ipns-name}/{path}` is retrieved as the content
path `/ipns/{ipns-name}/{path}`, for example through a Subdomain Gateway request to
`https://{ipns-name}.ipns.example.net/{path}` when an isolated origin is required.

A DNSLink name cannot appear in a subdomain as-is: its dots would create extra DNS levels and
break wildcard TLS, so the Subdomain Gateway inlines the name into a single label, turning
`ipns://dnslink.example.net` into `https://dnslink-example-net.ipns.example.net`. Each `.` becomes
a `-`, and any `-` already in the name is doubled, so `ipns://my-site.example.net` inlines to
`my--site-example-net`.
Step 3 of [Parsing the authority](#parsing-the-authority) is what lets that inlined label come back
the other way. The canonical `ipns://` URI always uses the original dotted name, never the inlined
label, so an implementation SHOULD normalize an inlined label back to its dotted form before
rendering the URI or deriving its origin.

When the content root is a cryptographic key, a resolver MUST validate the IPNS record's
signature as defined by :cite[ipns-record]. When it is a DNS name, DNSLink resolution applies,
including its recursion bound (see [DNSLink name form](#dnslink-name-form)).

## Notes for implementers

This section is non-normative.

### Why base36 for Ed25519

A single DNS label is capped at 63 characters, and an authority that should double as a
subdomain-gateway label inherits that cap. Because an Ed25519 key is inlined rather than hashed
(see [Keys too big to inline](#keys-too-big-to-inline)), its `libp2p-key` CIDv1 is 40 bytes, the
largest an IPNS name gets in practice. That is 65 characters in `base32`, two over the limit, and
63 in `base36` (`k51...`), which just fits. base32 remains fine for the shorter, hashed names, but
base36 is what keeps an Ed25519 IPNS name usable as an authority and as a Subdomain Gateway label.

### Room for new key types

In practice an IPNS name today is a `libp2p-key` (`0x72`), which wraps the public key in a libp2p
protobuf. Post-quantum signature schemes are expected to change that, either as new key types
carried inside that same wrapper, which leaves the authority untouched, or under self-describing
key container codecs that drop the libp2p wrapper altogether. Both directions are tracked in
[ipfs/kubo#11281](https://github.com/ipfs/kubo/issues/11281).

The codec rule in [Cryptographic key form](#cryptographic-key-form) is written to survive that: it
names no fixed set and leaves each implementation to say which codecs it accepts. What does not
change is the shape of the authority, a case-insensitive CIDv1 that fits a DNS label. Post-quantum
public keys are far too large to inline, so their names will be digests rather than keys, with the
consequences described in [Keys too big to inline](#keys-too-big-to-inline).

### Keep the whole resolution chain

An `ipns://` address resolves through layers: a DNSLink name points at an :ref[IPNS Name] or
directly at a CID, and an :ref[IPNS Name] resolves to a CID. An application that saves an
address, as a bookmark or before pinning, benefits from recording every layer it resolved
through: the DNS name, the :ref[IPNS Name] behind it, and the CID at save time. Each layer
answers a different question later: the DNS name is the human-readable origin, the
:ref[IPNS Name] fetches the latest content from the same publisher even if the domain lapses,
and the CID retrieves the exact saved version for as long as anyone keeps it available.

### Keys too big to inline

An :ref[IPNS Name] is a multihash of the serialized public key, so how big that key is decides
what the name actually carries.

- A small key is hashed with `identity`, which stores the key verbatim inside the multihash. The
  name *is* the key, and a resolver can recover it by decoding the authority. Ed25519 is the case
  that matters: its serialized form is 36 bytes, inside the 42-byte inlining threshold.
- A larger key, RSA or ECDSA today, is hashed with `sha2-256` instead. The name commits to the key
  without carrying it, so the authority is a 32-byte digest no matter how big the key was.

The second case produces the *shorter* name, not the longer one: about 57 characters in base36
against 63 for an inlined Ed25519 key. The 63-character DNS label limit is a constraint on inlined
keys, and it does not bite here.

What does bite is that the key cannot be recovered from the name, so a resolver has to obtain it
some other way before it can check a signature. Records for such keys carry a serialized copy of
the public key alongside the signature, and a resolver MUST confirm that the copy hashes back to
the authority before trusting it (:cite[ipns-record]). Because the authority is exactly the hash of
those key bytes, the key is itself content-addressed: it can be stored and fetched as immutable
data under the same multihash rather than travelling in every record.

## IANA considerations

`ipns` is registered as a provisional URI scheme under the procedure of :cite[rfc7595]:
[IANA provisional registration for `ipns`](https://www.iana.org/assignments/uri-schemes/prov/ipns).
That registration is the authoritative record of the scheme name, status, applications, and
change controller; this document does not repeat them. The considerations are as for
[`ipfs://`](https://specs.ipfs.tech/ipfs-uri/#iana-considerations), with these additions:

- **Scheme syntax:** the authority forms in [The content root](#the-content-root).
- **Security considerations:** resolving an `ipns://` URI dereferences a mutable pointer, so the
  content it names can change between retrievals. Record signature validation and the DNSLink
  recursion bound are defined in [Resolution](#resolution) and
  [DNSLink name form](#dnslink-name-form).
