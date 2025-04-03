---
title: Subdomain Gateway Specification
description: >
  Defines how HTTP Gateway can implement support for HTTP Host headers to
  enable isolated website hosting based on root CID-derived Origins. This
  ensures compatibility with native ipfs:// and ipns:// URIs, and aligns with
  the existing Same-origin security model in web browsers, including
  relative URL pathing and permission scopes of Web APIs.
date: 2025-04-03
maturity: reliable
editors:
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
  - name: Adrian Lanzafame
    github: lanzafame
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Vasco Santos
    github: vasco-santos
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Oli Evans
    github: olizilla
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Thibault Meunier
    github: thibmeu
    affiliation:
      name: Cloudflare
      url: https://cloudflare.com/
  - name: Steve Loeppky
    github: BigLep
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
xref:
  - url
  - html
tags: ['httpGateways', 'webHttpGateways']
order: 3
---

Subdomain Gateways extend :cite[path-gateway] with HTTP [Host](#host-request-header)
header support. Below should be read as a delta on top of that spec.

This specification enables isolated website hosting based on root CID-derived
Origins, ensures compatibility with native ipfs:// and ipns:// URIs, and aligns
with the existing Same-origin security model in web browsers,
including relative URL pathing and permission scopes of Web APIs.

Summary:

- Requests carry the CID as a sub-domain in the `Host` header rather than as a URL path prefix
  - Case-insensitive [CIDv1](https://docs.ipfs.io/concepts/glossary/#cid-v1) encoding is used in sub-domain (see [DNS label limits](#dns-label-limits))
  - e.g. `{cidv1}.ipfs.example.net` instead of `example.net/ipfs/{cid}`
- The root CID is used to define the [Resource Origin](https://en.wikipedia.org/wiki/Same-origin_policy), aligning it with the web's security model.
  - Files in a DAG defined by the root CID may request other files within the same DAG as part of the same Origin Sandbox.
- Data is retrieved from IPFS in a way that is compatible with URL-based addressing
  - URL’s path `/` points at the content root identified by the CID

# HTTP API

The API is a superset of :cite[path-gateway], the differences are documented below.

The main one is that Subdomain Gateway expects CID to be present in the `Host` header.

## `GET /[{path}][?{params}]`

Downloads data at specified content path.

- `path` – optional path to a file or a directory under the content root sent in `Host` HTTP header

## `HEAD /[{path}][?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Below MUST be implemented **in addition** to "HTTP Request" of :cite[path-gateway].

## Request Headers

### `Host` (request header)

Defines the root that should be prepended to the `path` before IPFS content
path resolution is performed.

The value in `Host` header must be a valid FQDN with at least three DNS labels:
a case-insensitive content root identifier followed by `ipfs` or `ipns`
namespace, and finally the domain name used by the gateway.

Converting `Host` into a content path depends on the nature of requested resource:

- For content at `/ipfs/{cid}`:
  - `Host: {cid-mbase32}.ipfs.example.net`
    - Example: `Host: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link`
- For content at `/ipns/{libp2p-key}`:
  - `Host: {libp2p-key-mbase36}.ipns.example.net`
    - Example: `Host: k2k4r8jl0yz8qjgqbmc2cdu5hkqek5rj6flgnlkyywynci20j0iuyfuj.ipns.dweb.link`
    - Note: Base36 must be used to ensure CIDv1 with ED25519 fits in a single DNS label (63 characters).
- For content at `/ipns/{dnslink-name}`:
  - `Host: {inlined-dnslink-name}.ipns.example.net`
    - DNSLink names include `.` which means they  MUST be inlined into a single DNS label to provide unique origin and work with wildcard TLS certificates.
      - DNSLink label encoding:
        - Every `-` is replaced with `--`
        - Every `.` is replaced with `-`
      - DNSLink label decoding
        - Every standalone `-` is replaced with `.`
        - Every remaining `--` is replaced with `-`
      - Example:
        - `example.net/ipns/en.wikipedia-on-ipfs.org` → `Host: en-wikipedia--on--ipfs-org.ipns.example.net`
- If `Host` header does not include any subdomain, but the requested path is a
  valid content path, gateway MUST attempt to
  [migrate from Path to Subdomain Gateway](#migrating-from-path-to-subdomain-gateway).
- Finally, if it is impossible to construct a content path from `Host`,
  return HTTP Error `400` Bad Request, as seen in :cite[path-gateway].

### `X-Forwarded-Proto` (request header)

Optional. Allows `http://` gateway implementation to be deployed behind
reverse proxies that provide TLS (`https://`) termination.

Setting `X-Forwarded-Proto: https` on reverse proxy informs gateway
implementation that it MUST:

1. set all absolute redirect URLs to `https://` (not `http://`)
2. inline DNSLink names to fit in a single DNS label, making it compatible with
   a single wildcard TLS certificate:

Example (GET with `X-Forwarded-Proto: https`):

- `GET http://dweb.link/ipfs/{cid}` → HTTP 301 with `Location: https://{cid}.ipfs.dweb.link`
- `GET http://dweb.link/ipns/your-dnslink.site.example.com` → HTTP 301 with `Location: https://your--dnslink-site-example-com.ipfs.dweb.link`

### `X-Forwarded-Host` (request header)

Optional. Enables Path Gateway requests to be redirected to a Subdomain Gateway
on a different domain name.

See also: [migrating from Path to Subdomain Gateway](#migrating-from-path-to-subdomain-gateway).

Example (GET with `X-Forwarded-Host: example.com`):

- `GET https://dweb.link/ipfs/{cid}` → HTTP 301 with `Location: https://{cid}.ipfs.example.com`

## Request Query Parameters

### `uri` (request query parameter)

Optional. When present, passed address should override regular path routing.

See [URI router](#uri-router) section for usage and implementation details.

# HTTP Response

Below MUST be implemented **in addition** to "HTTP Response" of :cite[path-gateway].

## Response Headers

### `Location` (response header)

Below MUST be implemented **in addition** to `Location` requirements defined in :cite[path-gateway].

#### Use in interop with Path Gateway

The `Location` HTTP header is returned with `301` Moved Permanently
(:cite[path-gateway]) when `Host` header does
not follow the subdomain naming convention, but the requested URL path happens
to be a valid `/ipfs/{cid}[/{path}][?{query}]` or `/ipfs/..` content path.

This redirect allows a subdomain gateway to be used as a drop-in replacement
compatible with regular path gateways, as long as the rules below are followed:

- Redirect from a path gateway URL to the corresponding subdomain URL MUST
  preserve the originally requested `{path}` and `{query}` parameters, if
  present.
  - Content path validation before the redirect SHOULD be limited to the
    correctness of the root CID. If the content path includes any subpath or
    query parameters, they SHOULD be preserved and processed after the redirect
    to a subdomain is completed.
    - Namely, additional logic, such as IPLD path traversal or processing the
      `_redirects` file, SHOULD only be executed by the subdomain gateway after
      the redirect.
- Before redirecting, the content root identifier MUST be converted to
  case-insensitive/inlined form if necessary. For example:
  - `https://dweb.link/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`
    returns HTTP 301 redirect to the same CID but in case-insensitive base32:
    - `Location:
      https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/`
  - `https://dweb.link/ipns/en.wikipedia-on-ipfs.org` returns HTTP 301 redirect
    to subdomain with DNSLink name correctly inlined:
    - `Location: https://en-wikipedia--on--ipfs-org.ipns.dweb.link/`

See also: [Migrate from Path to Subdomain Gateway](#migrating-from-path-to-subdomain-gateway).

#### Use in URI router

See: [URI router](#uri-router)

# Appendix: Notes for implementers

## Migrating from Path to Subdomain Gateway

Subdomain Gateway MUST implement a redirect on paths defined in :cite[path-gateway].

HTTP redirect will route path requests to correct subdomains on the same domain
name, unless [`X-Forwarded-Host`](#x-forwarded-host-request-header) is present.

**NOTE:**

During the migration from a path gateway to a subdomain gateway, even though
the [`Location`](#location-response-header) header is present, some clients may
check for HTTP 200, and consider other responses as invalid.

It is up to the gateway operator to clearly communicate when such a transition
is to happen, or use a different domain name for subdomain gateway to avoid
breaking legacy clients that are unable to follow HTTP 301 redirects.

## DNS label limits

DNS labels, must be case-insensitive, and up to a maximum of 63 characters
per label (Section 11 of :cite[rfc2181]). Representing CIDs within these limits
requires some care.

Base32 multibase encoding is used for CIDs to ensure case-insensitive,
URL safe characters are used.

Base36 multibase is used for ED25519 libp2p keys to get the string
representation to safely fit with the 63 character limit.

How to represent CIDs with a string representation greater than 63
characters, such as those for `sha2-512` hashes, remains an
[open question](https://github.com/ipfs/go-ipfs/issues/7318).

Until a solution is found, subdomain gateway implementations
should return HTTP 400 Bad Request for CIDs longer than 63.

## Security considerations

### Wildcard TLS certificates

Wildcard TLS certificates should be set for `*.ipfs.example.net`
and `*.ipns.example.net` if a subdomain gateway is to be exposed on the public
internet.

If TLS termination takes place outside of gateway implementation, then setting
[`X-Forwarded-Proto`](#x-forwarded-proto-request-header) at a reverse HTTP
proxy can be used for preserving `https` protocol.

### Public Suffix List and eTLD enforcement

Subdomain gateways assign each content root a unique origin, yet these origins
share the gateway’s parent domain. Without proper isolation, all subdomains
under the same effective Top-Level Domain (eTLD) face risks: a single
problematic CID could trigger widespread blocking of the entire gateway by
software like Safe Browsing
([incident example](https://web.archive.org/web/20230930054837/https://blog.nft.storage/posts/2022-04-29-gateways-and-gatekeepers)).

To mitigate this and align with the web’s Same-origin security model, operators
should register a wildcard entry like `*.example.net`
with the [Public Suffix List (PSL)](https://publicsuffix.org/).

This will make `ipfs.example.net` and `ipns.example.net` eTLDs, treating each
identifier (e.g., `cid.ipfs.example.net`) as a distinct top-level Origin.
The [public good gateway](https://docs.ipfs.tech/concepts/public-utilities/#public-ipfs-gateways),
listed as `*.dweb.link` and `*.inbrowser.link` on the PSL, exemplifies this approach.

Browsers supporting IPFS natively should detect patterns such as
`https://{content-root-id}.ip[f|n]s.example.net` and dynamically update their
internal PSL, bolstering security and compatibility without relying solely on
operator action.

## URI router

Optional [`uri`](#uri-request-query-parameter) query parameter overrides regular path routing.

Subdomain gateway implementations MUST provide URI router for `ipfs://` and
`ipns://` protocol schemes, allowing external apps to resolve these native
addresses on a gateway.

The `/ipfs/?uri=%s` endpoint MUST be compatible with :ref[registerProtocolHandler(scheme, url)],
present in web browsers. The value passed in `%s` should be :ref[UTF-8 percent-encode].

:::example

Given registration:

```
navigator.registerProtocolHandler('ipfs', 'https://dweb.link/ipfs/?uri=%s', 'IPFS resolver')
navigator.registerProtocolHandler('ipns', 'https://dweb.link/ipns/?uri=%s', 'IPNS resolver')
```

Opening `ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`
should produce an HTTP GET request for
`https://dweb.link/ipfs/?uri=ipfs%3A%2F%2Fbafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`
which in turn should redirect to
`https://dweb.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`.

From there, regular subdomain gateway logic applies.

:::

## Redirects, single-page applications, and custom 404s

Subdomain Gateway implementations SHOULD include `_redirects` file
support defined in :cite[web-redirects-file].
