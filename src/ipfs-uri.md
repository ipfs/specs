---
title: IPFS URI (ipfs://)
description: >
  The ipfs:// URI scheme for addressing immutable, content-addressed data by
  CID, defined for interoperability with web browsers.
date: 2026-08-03
maturity: draft
editors:
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
thanks:
  - name: Jonny Crunch
    github: jonnycrunch
  - name: Dietrich Ayala
    github: autonome
  - name: Frédéric Wang
    github: fred-wang
    affiliation:
      name: Igalia
      url: https://igalia.com/
  - name: bumblefudge
    github: bumblefudge
tags: ['routing']
order: 4
---

The `ipfs://` URI scheme names **immutable** content by its CID (:cite[cid]).
An `ipfs://` URI is a native address that a browser-like application can open directly,
without hard-coding an HTTP gateway. It is one half of native IPFS addressing;
the mutable half is the [`ipns://`](https://specs.ipfs.tech/ipns-uri/) scheme.

## What is it?

An `ipfs://` URI places a content root in the URI **authority** and an optional path after it:

```text
ipfs://{cid}/{path}?{query}#{fragment}
```

For example:

```text
ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/Vincent_van_Gogh.html#some-fragment
ipfs://bafybeietjm63oynimmv5yyqay33nui4y4wx6u3peezwetxgiwvfmelutzu/subdir/hello.txt?filename=index.html
```

The authority (`{cid}`) is a self-describing content address. Because a CID is derived from
the bytes it names, the data behind an `ipfs://` URI can never change: the same URI always
resolves to the same content, and any resolver can verify it received exactly those bytes.

For this reason, an `ipfs://` URI MUST address only immutable, content-addressed data.
A pointer whose target its owner can update later (a cryptographic IPNS name or a DNSLink
name) is mutable and MUST NOT be placed under `ipfs://`; it belongs under
[`ipns://`](https://specs.ipfs.tech/ipns-uri/) instead.

## Syntax

An `ipfs://` URI always uses the **authority form**: the `//` is required. The ABNF below
describes it; rules named but not defined here (`pct-encoded`, `segment`, `query`, `fragment`)
come from :cite[rfc3986].

```abnf
ipfs-URI       = "ipfs://" ipfs-authority path-abempty
                 [ "?" query ] [ "#" fragment ]

ipfs-authority = cidv1-base32       ; canonical authority form; see "What the authority
                                    ; may contain" for other case-insensitive encodings

cidv1-base32   = "b" 1*base32char   ; multibase 'b': RFC4648 base32, lowercase, no padding
                                    ; MUST decode to a valid CIDv1
base32char     = %x32-37 / %x61-7A  ; "2"-"7" / "a"-"z"

path-abempty   = *( "/" segment )   ; RFC 3986, Section 3.3
```

The ABNF describes the **canonical** form only: an authority that is a `base32` CIDv1. A URI
whose authority uses another case-insensitive multibase does not match this grammar but can
still appear as input; [What the authority may contain](#what-the-authority-may-contain) says
how to handle it: normalize to `base32`, or reject.

An `ipfs://` URI is a URL as defined by the
[WHATWG URL Standard](https://url.spec.whatwg.org/). The ABNF above is descriptive; when it and
the WHATWG parser disagree, **the WHATWG parser wins**, because this scheme exists to behave
well in browsers. This tie-breaker applies throughout this document.

## Authority

In the [WHATWG URL Standard](https://url.spec.whatwg.org/), the component after `//` is the
URL's authority. An `ipfs://` URI is read the same way: its authority is the content root, a
single CID. Reading `ipfs://{cid}/{path}` as a URL is what lets
the CID define an [Origin](#origin) and anchor a relative path.

The `//` is required. Neither `ipfs` nor `ipns` is a
[special scheme](https://url.spec.whatwg.org/#special-scheme), so without `//` there is no
authority, and without an authority there is nothing to attach a stable origin to. The opaque
`ipfs:{cid}` form has neither; producers MUST NOT emit it.
[Reading `ipfs://` as a WHATWG URL](#reading-ipfs-as-a-whatwg-url) shows how the two forms parse.

### What the authority may contain

- The authority is a single content root and nothing else: userinfo and port MUST NOT appear.
  A CID identifies content no matter where or how it is retrieved, so a gateway host or any
  other endpoint information does not belong in the URI. There is no `ipfs://host:port/{cid}`
  form.
- The content root MUST decode to a valid CIDv1.
- It MUST be encoded in a **case-insensitive** multibase, so it survives being
  parsed into the authority (see
  [Why the authority must be case-insensitive](#why-the-authority-must-be-case-insensitive)).
- It SHOULD be encoded as **`base32`** (multibase prefix `b`). base32 is the canonical form:
  the string browsers and other agents use as the [origin](#origin) when they sandbox the
  content. Implementations MUST accept `base32`, and producers SHOULD emit it.
- Another case-insensitive multibase (for example `base36`, prefix `k`) MAY appear in the
  authority, but it is a different string and therefore a different origin. An implementation
  encountering one MUST either normalize it to `base32` before computing any origin or issuing
  any request, or reject the URI; resolving the non-canonical form in place would split one
  content root into several origins.
- The content root SHOULD NOT exceed **63 characters**. The limit is DNS-specific: a single DNS
  label caps at 63 characters, and staying within it is what lets the root serve as a
  Subdomain Gateway (:cite[subdomain-gateway]) label and its
  origin. A local resolver or a native `ipfs://` implementation is not bound by DNS and MAY
  support a longer root, for example by mapping it to a localhost subdomain that public DNS
  never sees. Such roots cripple interoperability, though, and SHOULD be kept to internal use.
  An implementation that cannot rely on such a mapping SHOULD reject a root longer than 63
  characters.
- The content root MUST NOT contain any code point that the WHATWG URL Standard lists as a
  [forbidden host code point](https://url.spec.whatwg.org/#forbidden-host-code-point) or
  [forbidden domain code point](https://url.spec.whatwg.org/#forbidden-domain-code-point)
  (notably `%`).
- A producer MUST NOT emit a case-sensitive encoding: a **CIDv0** (`base58btc` `Qm...`) or a
  `base58btc` CIDv1 (`z...`) is corrupted once the authority is case-folded (see
  [Why the authority must be case-insensitive](#why-the-authority-must-be-case-insensitive)).
- A consumer that receives such an authority with its case still intact, such as a `base64url`
  CIDv1 (`u...`) or a CIDv0 (`Qm...`), SHOULD normalize it rather than reject it: decode the CID
  and re-encode it as canonical `base32` before rendering the URI, computing an origin, or issuing
  a request. Every recoverable case decodes to the same CID, so normalizing loses nothing.

An authority that neither satisfies these rules nor can be normalized to canonical `base32` under
them MUST be rejected as unresolvable. Implementations SHOULD show an error explaining why the
address cannot work instead of forwarding the URI to a resolver or gateway that can only fail.

### Origin

The content root defines the security context of the content it names, mirroring the Subdomain
Gateway origin model: `ipfs://{cid}/{path}` and `https://{cid}.ipfs.example.net/{path}` name the
same content under the same origin model, where the CID is the origin-defining label.

On its own, the WHATWG URL Standard gives every non-special URL, `ipfs://` included, a
[new opaque origin](https://url.spec.whatwg.org/#concept-url-origin) on each parse. That alone
does not give the property this scheme needs: same CID, same origin; different CID, different
origin. To get it, an implementation SHOULD derive the origin from the scheme and the content root
alone, so that the content root is the only thing the origin depends on.

How that origin is serialized is left to the implementation, because it depends on what the host
environment can be made to express. Two forms are known to work:

- `ipfs://{cid}` as a tuple origin in its own right. This is the form to prefer, and the only one
  available to an implementation with a native `ipfs://` handler.
- `http://{cid}.ipfs.localhost:{port}` where a native scheme is not possible, for example when the
  content is served through a gateway on loopback. `*.localhost` names resolve locally rather than
  through public DNS, and browsers treat them as a secure context without a TLS certificate, so
  each content root still lands in its own origin.

Either way the origin is keyed on the authority string, which browsers and other agents use to
sandbox JavaScript storage (`localStorage`, IndexedDB, Cache Storage) and to scope API permissions.
Two encodings of the same CID are two different strings, and therefore two different origins with
separate storage and permissions. Normalizing the authority to canonical `base32` keeps each
content root in a single security context under either serialization.

## Path, query, and fragment

- **Path.** `ipfs://{cid}/{path}` maps to the content path `/ipfs/{cid}/{path}` by
  concatenation of the authority and the path segments. The URI path MUST NOT repeat the `/ipfs/`
  namespace prefix, which the scheme already implies; a path segment that happens to be named
  `ipfs` further down the DAG is ordinary content and is left alone. An empty path and a path of
  `/` both address the content root itself. The path is passed as-is: this specification adds no
  encoding or decoding beyond what the WHATWG URL parser already does. What the segments mean is
  decided by the content root, as described below.
- **Query.** A query, if present, is carried through to the resolver unchanged, with no
  encoding or decoding beyond what the WHATWG URL parser already does.
- **Fragment.** A fragment is a client-side component of the URL and is passed through: when the
  URI is mapped to a gateway URL, the fragment is carried onto that URL unchanged. It MUST NOT be
  sent in retrieval requests, and it plays no part in resolution.

### How the content root drives traversal

A CID is self-describing, and its multicodec is what tells a resolver both how to decode the block
the CID addresses and how to walk `{path}` out of that block. Nothing in the URI selects this
behavior, and nothing needs to: the codec in the content root does.

- `dag-pb` is read as UnixFS (:cite[unixfs]), so path segments are directory and file names.
- `dag-cbor` holds structured data, and a path segment names a field within it. A field whose value
  is a CID carried under
  [CBOR tag 42](https://datatracker.ietf.org/doc/draft-caballero-cbor-cbor42/) is a link, and
  following it moves the traversal into a different document.
- `raw` is opaque bytes with no links to follow, so a non-empty path has nowhere to go.

Other codecs follow the same rule: a resolver walks `{path}` only as far as the codec defines
links, so a codec with no links, or one the resolver does not recognize, leaves a non-empty path
unresolvable.

This applies at every step, not only the first. Each link the traversal follows carries its own CID
with its own codec, so the rules can change partway down a path: a `dag-cbor` root can link to a
`dag-pb` node, after which the remaining segments are UnixFS names. Path Gateway
(:cite[path-gateway]) defines the traversal itself, including how an unresolvable path is reported.

## Resolution

To resolve an `ipfs://` URI, an implementation builds the content path
`/ipfs/{cid}/{path}` and retrieves it through any IPFS retrieval mechanism: for example, a
Path Gateway request to `https://example.net/ipfs/{cid}/{path}`, or a Subdomain Gateway request to
`https://{cid}.ipfs.example.net/{path}` when an isolated origin is needed. The query is
carried through; the fragment stays client-side.

A resolver that retrieves blocks itself, over a Trustless Gateway (:cite[trustless-gateway]) or a
peer-to-peer transport, MUST verify them: hash every block it receives and walk the DAG from the
content root, so that each block on the path is accounted for. Verification is what lets an
`ipfs://` URI be trusted regardless of where the bytes came from.

Retrieval through a trusted Path or Subdomain Gateway is the exception: the gateway performs that
verification and the client takes its word for it. An implementation that resolves `ipfs://` this
way SHOULD make the gateway it trusts visible to the user, because the immutability guarantee then
rests on that gateway rather than on the URI.

A native `ipfs://` implementation SHOULD resolve content paths with the same semantics as a
Path Gateway, so that the same URI resolves consistently whether it is opened by a native handler
or handed to a gateway. In a browser-like context, a native implementation SHOULD also mirror the
origin isolation that a Subdomain Gateway provides, giving each content root its own origin,
derived from the scheme and that root alone. [Origin](#origin) describes the two serializations
known to work.

## Notes for implementers

This section is non-normative: it explains the reasoning behind the rules above and adds no
new requirements.

### Reading `ipfs://` as a WHATWG URL

The `//` is what makes the content root an authority. Neither `ipfs` nor `ipns` is a
[special scheme](https://url.spec.whatwg.org/#special-scheme), and the two forms (with and
without the `//`) parse very differently:

- `ipfs://{cid}/{path}` has `//`, so the parser reads `{cid}` as the authority and `{path}` as a
  segmented, relative-resolvable path. The result is a URL that can be a base for relative
  references: a document at `ipfs://{cid}/a/` that links to `b` resolves cleanly to
  `ipfs://{cid}/a/b`.
- `ipfs:{cid}` has no `//`, so the parser reads the whole remainder as an
  [opaque path](https://url.spec.whatwg.org/#url-opaque-path): there is no authority, the path is
  a single opaque string that is not segmented, and the URL cannot be a base for relative
  references.

Only a form with an authority can be given a stable origin, which is why the authority form is
required and the opaque `ipfs:{cid}` form is not used to address content.

### Why the authority must be case-insensitive

A CIDv0 is `base58btc`, whose alphabet is case-sensitive and contains uppercase letters. An
authority is not a safe place for it, for two independent reasons:

1. Any engine that treats `ipfs` as a
   [special scheme](https://url.spec.whatwg.org/#special-scheme) parses the authority as a domain
   via [domain to ASCII](https://url.spec.whatwg.org/#concept-domain-to-ascii), which case-folds
   ASCII uppercase to lowercase. A lowercased `base58btc` string is a different, invalid CID.
   Percent-encoding cannot rescue it, because `%` is itself a forbidden domain code point.
2. Even when they do not, deployed browsers and other user agents force-lowercase URL
   authorities before any resolver sees them.

`base32` avoids both: its alphabet is all-lowercase and contains no forbidden code point, so it
survives every parse unchanged. The same case-folding applies to a Subdomain Gateway label
(`{cid}.ipfs.example.net`), which additionally caps the root at 63 characters (the DNS label
limit), so only a case-insensitive CIDv1 that fits a label can serve as both an authority and a
stable origin on the public web. This is why case-insensitivity is a correctness and security
property, not a stylistic preference.

CIDv0 stays safe in any position that is not an authority, such as a path segment.

### Normalizing the authority

The rules in [What the authority may contain](#what-the-authority-may-contain) describe two
normalization paths that end in the same place, canonical `base32`, for two different reasons:

- A **case-sensitive** encoding (a CIDv0 `Qm...`, or a CIDv1 in `base58btc` or `base64url`)
  cannot be relied on to survive parsing: engines and user agents case-fold authorities, and a
  folded string no longer decodes. Catching such input while its case is intact and converting
  it (decode, then re-encode as a `base32` CIDv1) rescues it losslessly.
- A **case-insensitive** but non-canonical encoding (for example `base36`) survives parsing
  fine, but it is a different authority string and would become a different origin. Normalizing
  it is canonicalization rather than rescue: one content root keeps one origin and one storage
  sandbox.

In both cases, normalize (or redirect to the normalized URI) before computing an origin or
issuing a request.

### Roots longer than 63 characters

A CIDv1 with a large multihash, `sha2-512` being the common case, produces a `base32` string
longer than 63 characters. Such a root cannot become a DNS label, so Subdomain Gateway deployments
that rely on public DNS and wildcard TLS certificates cannot serve it and respond with HTTP 400;
representing such CIDs there remains an
[open question](https://github.com/ipfs/kubo/issues/7318).

The limit is specific to those PKI/TLS deployments. A localhost subdomain gateway
(`{cid}.ipfs.localhost`) or a native `ipfs://` implementation is not bound by it: `*.localhost`
subdomains are resolved locally rather than through public DNS, and browsers treat them as a
secure context without TLS certificates. Per
[What the authority may contain](#what-the-authority-may-contain), long roots are best kept to
internal use; on the public web, `sha2-256` remains the safe default.

## IANA considerations

`ipfs` is registered as a provisional URI scheme under the procedure of :cite[rfc7595]:
[IANA provisional registration for `ipfs`](https://www.iana.org/assignments/uri-schemes/prov/ipfs).
That registration is the authoritative record of the scheme name, status, applications, and
change controller; this document does not repeat them.

This specification supplies what the provisional registration leaves open:

- **Scheme syntax:** the authority form in [Syntax](#syntax).
- **Encoding considerations:** the content root is canonically a `base32` CIDv1 (see
  [what the authority may contain](#what-the-authority-may-contain)); path, query, and fragment
  follow the WHATWG URL Standard, as described in
  [Path, query, and fragment](#path-query-and-fragment).
- **Interoperability considerations:** `ipfs` is a non-special scheme in the WHATWG URL
  Standard. The required authority form and the case-insensitive `base32` CIDv1 authority (see
  [what the authority may contain](#what-the-authority-may-contain) and [Origin](#origin)) exist
  so the URI parses consistently across engines and can define a stable origin.
- **Security considerations:** the security context derives from the content root (see
  [Origin](#origin)), retrieved bytes are verified against the CID (see
  [Resolution](#resolution)), and the authority's case-insensitivity is a security property.
  Case-folding a case-sensitive root corrupts the CID itself: the multihash digest can no longer
  be decoded, nothing can be verified against it, and two distinct security contexts could also
  collide into one. Only case-insensitive bases such as `base32` are safe in URIs.
