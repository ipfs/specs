# Subdomain Gateway Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Authors**:

- Marcin Rataj ([@lidel](https://github.com/lidel))

----

**Abstract**

Subdomain Gateway is an extension of  [PATH_GATEWAY.md](./PATH_GATEWAY.md) that
enables website hosting isolated per CID/name, while remaining compatible with
web browsers relative pathing and security model of the web.
Below should be read as a delta on top of that spec.

Summary:

- Requests carry the CID as a sub-domain in the `Host` header rather than as a URL path prefix
  - Case-insensitive [CIDv1](https://docs.ipfs.io/concepts/glossary/#cid-v1) encoding is used in sub-domain (see [DNS label limits](#dns-label-limits))
  - e.g. `{cidv1}.ipfs.example.net` instead of `example.net/ipfs/{cid}`
- The root CID is used to define the [Resource Origin](https://en.wikipedia.org/wiki/Same-origin_policy), aligning it with the web's security model.
  - Files in a DAG defined by the root CID may request other files within the same DAG as part of the same Origin Sandbox.
- Data is retrieved from IPFS in a way that is compatible with URL-based addressing
    - URL’s path `/` points at the content root identified by the CID


# Table of Contents

- [Subdomain Gateway Specification](#subdomain-gateway-specification)
- [Table of Contents](#table-of-contents)
- [HTTP API](#http-api)
  - [`GET /[{path}][?{params}]`](#get-pathparams)
  - [`HEAD /[{path}][?{params}]`](#head-pathparams)
- [HTTP Request](#http-request)
  - [Request Headers](#request-headers)
    - [`Host` (request header)](#host-request-header)
    - [`X-Forwarded-Proto` (request header)](#x-forwarded-proto-request-header)
    - [`X-Forwarded-Host` (request header)](#x-forwarded-host-request-header)
  - [Request Query Parameters](#request-query-parameters)
    - [`uri` (request query parameter)](#uri-request-query-parameter)
- [HTTP Response](#http-response)
  - [Response Headers](#response-headers)
    - [`Location` (response header)](#location-response-header)
      - [Use in interop with Path Gateway](#use-in-interop-with-path-gateway)
      - [Use in URI router](#use-in-uri-router)
- [Appendix: notes for implementers](#appendix-notes-for-implementers)
  - [Migrating from Path to Subdomain Gateway](#migrating-from-path-to-subdomain-gateway)
  - [DNS label limits](#dns-label-limits)
  - [Security considerations](#security-considerations)
  - [URI router](#uri-router)

# HTTP API

The API is a superset of [PATH_GATEWAY.md](./PATH_GATEWAY.md), the differences
are documented below.

The main one is that Subdomain Gateway expects CID to be present in the `Host` header.

## `GET /[{path}][?{params}]`

Downloads data at specified content path.

- `path` – optional path to a file or a directory under the content root sent in `Host` HTTP header

## `HEAD /[{path}][?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

Below MUST be implemented **in addition** to the [HTTP Request section from `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-request).

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
  return HTTP Error [`400` Bad Request](./PATH_GATEWAY.md#400-bad-request).


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

Below MUST be implemented **in addition** to the [HTTP Response section from `PATH_GATEWAY.md`](./PATH_GATEWAY.md#http-response).

## Response Headers

### `Location` (response header)

Below MUST be implemented **in addition** to
[`Location` reqirements defined in `PATH_GATEWAY.md`](./PATH_GATEWAY.md#location-response-header).

#### Use in interop with Path Gateway

Returned with [`301` Moved Permanently](./PATH_GATEWAY.md#301-moved-permanently) when `Host` header does
not follow the subdomain naming convention, but the requested URL path happens
to be a valid `/ipfs/{cid}` or `/ipfs/{name}` content path.

This redirect allows subdomain gateway to be used as a drop-in
replacement compatible with regular path gateways.

NOTE: the content root identifier must be converted to case-insensitive/inlined
form if necessary. For example:
- `https://dweb.link/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR`
  returns HTTP 301 redirect to the same CID but in case-insensitive base32:
  - `Location: https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/`
- `https://dweb.link/ipns/en.wikipedia-on-ipfs.org` returns HTTP 301 redirect
  to subdomain with DNSLink name correctly inlined:
  - `Location: https://en-wikipedia--on--ipfs-org.ipns.dweb.link/`

See also: [Migrate from Path to Subdomain Gateway](#migrating-from-path-to-subdomain-gateway).

#### Use in URI router

See: [URI router](#uri-router)

# Appendix: notes for implementers

## Migrating from Path to Subdomain Gateway

Subdomain Gateway MUST implement a redirect on paths defined in [`PATH_GATEWAY.md`](./PATH_GATEWAY.md).

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
[per label](https://datatracker.ietf.org/doc/html/rfc2181#section-11).
Representing CIDs within these limits requires some care.

Base32 multibase encoding is used for CIDs to ensure case-insensitve,
URL safe characters are used.

Base36 multibase is used for ED25519 libp2p keys to get the string
representation to safely fit with the 63 character limit.

How to represent CIDs with a string representation greater than 63
characters, such as those for `sha2-512` hashes, remains an
[open question](https://github.com/ipfs/go-ipfs/issues/7318). 

Until a solution is found, subdomain gateway implementations
should return HTTP 400 Bad Request for CIDs longer than 63.

## Security considerations

- Wildcard TLS certificates should be set for `*.ipfs.example.net` and
  `*.ipns.example.net` if a subdomain gateway is to be exposed on the public
  internet.
  - If TLS termination takes place outside of gateway implementation, then
    setting [`X-Forwarded-Proto`](#x-forwarded-proto-request-header) at a
    reverse HTTP proxy can be used for preserving `https` protocol.

- Subdomain gateways provide unique origin per content root, however the
  origins still share the parent domain name used by the gateway. To fully
  isolate websites from each other:

    - The gateway operator should add a wildcard entry
      to the [Public Suffix List](https://publicsuffix.org/) (PSL).
        - Example: `dweb.link` gateway [is listed on PSL](https://publicsuffix.org/list/public_suffix_list.dat) as `*.dweb.link`
    - Web browsers with IPFS support should detect subdomain gateway (URL
      pattern `https://{content-root-id}.ip[f|n]s.example.net`) and dynamically
      add it to PSL.

## URI router

Optional [`uri`](#uri-request-query-parameter) query parameter overrides regular path routing.

Subdomain gateway implementations MUST provide URI router for `ipfs://` and
`ipns://` protocol schemes, allowing external apps to resolve these native
addresses on a gateway.

The `/ipfs/?uri=%s` endpoint MUST be compatible with
[`registerProtocolHandler`](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers),
present in web browsers. The value passed in `%s` should be
[percent-encoded](https://url.spec.whatwg.org/#string-utf-8-percent-encode).

**Example**

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

