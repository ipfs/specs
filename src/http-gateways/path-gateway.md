---
title: Path Gateway Specification
description: >
  The comprehensive low-level HTTP Gateway enables the integration of IPFS
  resources into the HTTP stack through /ipfs and /ipns namespaces, supporting
  both deserialized and verifiable response types.
date: 2024-04-17
maturity: reliable
editors:
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
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
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
xref:
  - url
  - trustless-gateway
  - ipip-0402
  - ipip-0412
tags: ['httpGateways', 'lowLevelHttpGateways']
order: 0
---

The most versatile form of IPFS Gateway is a Path Gateway.

It exposes namespaces like  `/ipfs/` and `/ipns/`  under HTTP server root and
provides basic primitives for integrating IPFS resources within existing HTTP
stack.

**Note:** additional Web Gateways aimed for website hosting and web browsers
extend the below spec and are defined in :cite[subdomain-gateway] and
:cite[dnslink-gateway]. There is also a minimal :cite[trustless-gateway]
specification for use cases where client prefers to perform all validation locally.

# HTTP API

Path Gateway provides HTTP interface for requesting content-addressed data at
specified content path.

## `GET /ipfs/{cid}[/{path}][?{params}]`

Downloads data at specified **immutable** content path.

- `cid` – a valid content identifier  ([CID](https://docs.ipfs.io/concepts/glossary#cid))
- `path` – optional path parameter pointing at a file or a directory under the `cid` content root
- `params` – optional query parameters that adjust response behavior

## `HEAD /ipfs/{cid}[/{path}][?{params}]`

Same as GET, but does not return any payload.

Implementations SHOULD limit the scope of IPFS data transfer triggered by
`HEAD` requests to a minimal DAG subset required for producing response headers
such as
[`X-Ipfs-Roots`](#x-ipfs-roots-response-header),
[`Content-Length`](#content-length-response-header)
and [`Content-Type`](#content-type-response-header).
<!-- TODO add [`X-Ipfs-DataSize`](#x-ipfs-datasize-response-header) -->

### only-if-cached HEAD behavior

HTTP client can send `HEAD` request with
[`Cache-Control: only-if-cached`](#cache-control-request-header)
to disable IPFS data transfer and inexpensively probe if the gateway has the data cached.

Implementation MUST ensure that handling `only-if-cached` `HEAD` response is
fast and does not generate any additional I/O such as IPFS data transfer. This
allows light clients to probe and prioritize gateways which already
have the data.

## `GET /ipns/{name}[/{path}][?{params}]`

Downloads data at specified **mutable** content path.

Implementation must resolve the `name` to a CID, then serve response behind a
`/ipfs/{resolved-cid}[/{path}][?{params}]` content path.

- `name` may refer to:
  - cryptographic [IPNS key hash](https://docs.ipfs.io/concepts/glossary/#ipns)
  - human-readable DNS name with [DNSLink](https://docs.ipfs.io/concepts/glossary/#dnslink) set-up

## `HEAD /ipns/{name}[/{path}][?{params}]`

Same as GET, but does not return any payload.

# HTTP Request

## Request Headers

All request headers are optional.

### `If-None-Match` (request header)

Used for HTTP caching.

Enables advanced cache control based on `Etag`,
allowing client and server to skip data transfer if previously downloaded
payload did not change.

The Gateway MUST compare Etag values sent in `If-None-Match` with `Etag` that
would be sent with response. Positive match MUST return HTTP status code 304
(Not Modified), without any payload.

### `Cache-Control` (request header)

Used for HTTP caching.

#### `only-if-cached`

Client can send `Cache-Control: only-if-cached` to request data only if the
gateway already has the data (e.g. in local datastore) and can return it
immediately.

If data is not cached locally, and the response requires an expensive remote
fetch, a [`412 Precondition Failed`](#412-precondition-failed) HTTP status code
should be returned by the gateway without any payload or specific HTTP headers.

NOTE: when processing a request for a DAG, traversing it and checking every CID
might be too expensive. Implementations SHOULD implement own heuristics to
maximize cache hits while minimizing performance cost of checking if the entire
DAG is locally cached. A good rule of thumb is to at the minimum test if the root
block is in the local cache.

### `Accept` (request header)

Can be used for requesting specific response format, and/or passing optional
content type parameters.

For example:

- [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw) – disables [IPLD codec deserialization](https://ipld.io/docs/codecs/), requests a verifiable raw [block](https://docs.ipfs.io/concepts/glossary/#block) to be returned
- [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) – disables [IPLD codec deserialization](https://ipld.io/docs/codecs/), requests a verifiable [CAR](https://docs.ipfs.io/concepts/glossary/#car) stream to be returned with implicit or explicit [`dag-scope`](https://specs.ipfs.tech/http-gateways/trustless-gateway/#dag-scope-request-query-parameter) for blocks at the terminus of the specified path and the blocks required to traverse path segments from root CID to the terminus.
- [application/x-tar](https://en.wikipedia.org/wiki/Tar_(computing)) – returns UnixFS tree (files and directories) as a [TAR](https://en.wikipedia.org/wiki/Tar_(computing)) stream. Returned tree starts at a DAG which name is the same as the terminus segment. Produces 400 Bad Request for content that is not UnixFS.
- [application/vnd.ipld.dag-json](https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-json) – requests [IPLD Data Model](https://ipld.io/docs/data-model/) representation serialized into [DAG-JSON format](https://ipld.io/docs/codecs/known/dag-json/). If the requested CID already has `dag-json` (0x0129) codec, data is validated as DAG-JSON before being returned as-is. Invalid DAG-JSON produces HTTP Error 500.
- [application/vnd.ipld.dag-cbor](https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-cbor) – requests [IPLD Data Model](https://ipld.io/docs/data-model/) representation serialized into [DAG-CBOR format](https://ipld.io/docs/codecs/known/dag-cbor/). If the requested CID already has `dag-cbor` (0x71) codec,  data is validated as DAG-CBOR before being returned as-is. Invalid DAG-CBOR produces HTTP Error 500.
- [application/json](https://www.iana.org/assignments/media-types/application/json) – same as `application/vnd.ipld.dag-json`, unless the CID's codec already is `json` (0x0200). Then, the raw JSON block can be returned as-is without any conversion.
- [application/cbor](https://www.iana.org/assignments/media-types/application/cbor) – same as `application/vnd.ipld.dag-cbor`, unless the CID's codec already is `cbor` (0x51). Then, the raw CBOR block can be returned as-is without any conversion.
- [application/vnd.ipfs.ipns-record](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) – requests a verifiable :cite[ipns-record] to be returned. Produces 400 Bad Request if the content is not under the IPNS namespace, or contains a path.

:::note

A Client SHOULD include the [`format` query parameter](#format-request-query-parameter)
in the request URL, in addition to the `Accept` header. This provides the best
interoperability and ensures consistent HTTP cache behavior across various
gateway implementations.

:::

### `Range` (request header)

`Range` can be used for requesting specific byte range of UnixFS files and raw
blocks.

Gateway implementations SHOULD be smart enough to require only the minimal DAG subset
necessary for handling the range request.

Gateways SHOULD support single range requests. The support of more than one
range is optional: implementation MAY decide to not support more than one range.

:::note

For more advanced use cases such as partial DAG/CAR streaming, or non-UnixFS
data structures, see `dag-scope` and `entity-bytes` from :cite[ipip-0402] and
ordered CARs from :cite[ipip-0412].

:::

### `Service-Worker` (request header)

Mentioned here for security reasons and should be implemented with care.

This header is sent by web browser attempting to register a service worker
script for a specific scope. Allowing too broad scope can allow a single
content root to take control over gateway endpoint. It is important for
implementations to handle this correctly.

Service Worker should only be allowed under specific to content roots under
`/ipfs/{cid}/` and `/ipns/{name}/` (IMPORTANT: note the trailing slash).

Gateway should refuse attempts to register a service worker for entire
`/ipfs/cid` or `/ipns/name` (IMPORTANT: when trailing slash is missing).

Requests to these paths with `Service-Worker: script` MUST be denied by
returning HTTP 400 Bad Request error.

## Request Query Parameters

All query parameters are optional.

### `filename` (request query parameter)

Optional, can be used for overriding the filename.

When set, gateway will include it in `Content-Disposition` header and may use
it for `Content-Type` calculation.

Example:

```
https://ipfs.io/ipfs/QmfM2r8seH2GiRaC4esTjeraXEachRt8ZsSeGaWTPLyMoG?filename=hello_world.txt
```

### `download` (request query parameter)

Optional, can be used to request specific  `Content-Disposition` to be set on the response.

Response to HTTP request with `download=true` MUST include
`Content-Disposition: attachment[;filename=...]`
to indicate that client should not render the response.

The `attachment` context will force user agents such as web browsers to present
a 'Save as' dialog instead (prefilled with the value of the `filename`
parameter, if present)

### `format` (request query parameter)

Optional, `format=<format>` can be used to request specific response format.

This is a URL-friendly alternative to sending an [`Accept`](#accept-request-header) header.
These are the equivalents:
- `format=raw` → `Accept: application/vnd.ipld.raw`
- `format=car` → `Accept: application/vnd.ipld.car`
- `format=tar` → `Accept: application/x-tar`
- `format=dag-json` → `Accept: application/vnd.ipld.dag-json`
- `format=dag-cbor` → `Accept: application/vnd.ipld.dag-cbor`
- `format=json` → `Accept: application/json`
- `format=cbor` → `Accept: application/cbor`
- `format=ipns-record` → `Accept: application/vnd.ipfs.ipns-record`

When both `Accept` HTTP header  and `format` query parameter are present,
`Accept` SHOULD take precedence.

:::note

A Client SHOULD include the `format` query parameter in the request URL, in
addition to the `Accept` header. This provides the best interoperability and
ensures consistent HTTP cache behavior across various gateway implementations.

:::

A Gateway SHOULD include the
[`Content-Location`](#content-location-response-header) header in the response when:
- the request contains an `Accept` header specifying a well-known response
  format, but the URL does not include the `format` query parameter
- the `format` parameter is present, but does not match the format from `Accept`

### `dag-scope` (request query parameter)

Optional, can be used to limit the scope of verifiable DAG requests such as CAR, same as :ref[dag-scope] from :cite[trustless-gateway].

### `entity-bytes` (request query parameter)

Optional, can be used to limit the scope of verifiable DAG requests such as CAR, same as :ref[entity-bytes] from :cite[trustless-gateway].

### `car-version` (request query parameter)

Optional, specific to CAR requests, same as :ref[car-version] from :cite[trustless-gateway].

### `car-order` (request query parameter)

Optional, specific to CAR requests, same as :ref[car-order] from :cite[trustless-gateway].

### `car-dups` (request query parameter)

Optional, specific to CAR requests, same as :ref[car-dups] from :cite[trustless-gateway].

# HTTP Response

## Response Status Codes

### `200` OK

The request succeeded.

If the HTTP method was `GET`, then data is transmitted in the message body.

If the HTTP method was `HEAD`, then no body should be sent.

### `206` Partial Content

Partial Content: range request succeeded.

Returned when requested range of data described by  [`Range`](#range-request-header) header of the request.

### `301` Moved Permanently

Indicates permanent redirection.

The new, canonical URL is returned in the [`Location`](#location-response-header) header.

### `400` Bad Request

A generic client error returned when it is not possible to return a better
one. For example, this can be used when the CID is malformed or its codec is
unsupported.

### `404` Not Found

Error to indicate that request was formally correct but either:

* traversal of the requested content path was not possible due to a invalid or
missing DAG node, or
* the requested content is not retrievable from this gateway.

Gateways MUST use 404 to signal that content is not available, particularly
when the gateway is [non recursive](#recursive-vs-non-recursive-gateways), and only provides access to a known
dataset, so that it can assess that the requested content is not part of it.

### `410` Gone

Error to indicate that request was formally correct, but this specific Gateway
refuses to return requested data even though it would have normally provided
it.

`410` is particularly useful to implement [deny lists](#denylists), in order to not serve blocked content.
The name of deny list and unique identifier of blocked entries can be provided in the response body.

See: [Denylists](#denylists)

See also: [`451 Unavailable for Legal Reasons`](#451-unavailable-for-legal-reasons).

### `412` Precondition Failed

Error to indicate that request was formally correct, but Gateway is unable to
return requested data under the additional (usually cache-related) conditions
sent by the client.

#### Use with only-if-cached

- Client sends a request with [`Cache-Control: only-if-cached`](#cache-control-request-header)
- Gateway does not have requested CIDs in local datastore, and is unable to
  fetch them from other peers due to `only-if-cached` condition
- Gateway returns status code `412` to the client
  - The code 412 is used instead of 504 because `only-if-cached` is handled by
    the gateway itself, moving the error to client error range and avoiding
    confusing server errors in places like the browser console.

### `429` Too Many Requests

Error to indicate the client has sent too many requests in a given amount of time.

This error response SHOULD include [`Retry-After`](#retry-after-response-header) HTTP header to indicate how long the client should wait before making a follow-up request.

### `451` Unavailable For Legal Reasons

Error to indicate that request was formally correct, but this specific Gateway
is unable to return requested data due to legal reasons. Response SHOULD
include an explanation, as noted in Section 3 of :cite[rfc7725].

See: [Denylists](#denylists)

### `500` Internal Server Error

A generic server error returned when it is not possible to return a better
one. An internal server error signals the general unavailability of the
gateway.

### `502` Bad Gateway

Error that indicates that a Gateway was not able to produce response for a
known reason: for example, in the case of
[recursive gateways](#recursive-vs-non-recursive-gateways), in the event of
failure to find any providers for requested data. `502` indicates that the
request can be retried and is not a permanent failure.

This error response SHOULD include
[`Retry-After`](#retry-after-response-header) HTTP header to indicate how long
the client should wait before retrying.

Gateways SHOULD return `404` instead of `502` when the content is known to be
unretrievable: for example, when the Gateway is
[non-recursive](#recursive-vs-non-recursive-gateways) and the content is known
to not be available.

### `504` Gateway Timeout

Error that indicates that the Gateway was not able to produce response under
set time limits: for example, when gateway failed to retrieve data from a
remote provider. `504` indicates that the request can be retried and is not a
permanent failure.

There is no generic timeout, Gateway implementations SHOULD set timeouts based
on specific use cases.

This error response SHOULD include
[`Retry-After`](#retry-after-response-header) HTTP header to indicate how long
the client should wait before retrying.

Gateways SHOULD return `404` instead of `504` when the content is known to be
unretrievable: for example, when the Gateway is
[non-recursive](#recursive-vs-non-recursive-gateways) and the content is known
to not be available.

## Response Headers

### `Etag` (response header)

Used for HTTP caching.

An opaque identifier for a specific version of the returned payload. The unique
value must be wrapped by double quotes as noted in Section 8.8.3 of :cite[rfc9110].

In many cases it is not enough to base `Etag` value on requested CID.

To ensure `Etag` is unique enough to avoid issues with caching reverse proxies
and CDNs, implementations should base it on both CID and response type:

- By default, etag should be based on requested CID. Example: `Etag: "bafy…foo"`

- If a custom `format` was requested (such as a raw block, CAR), the
  returned etag should be modified to include it. It could be a suffix.
  - Example: `Etag: "bafy…foo.raw"`

- If HTML directory index was generated by the gateway, the etag returned with
  HTTP response should be based on the version of gateway implementation.
  This is to ensure proper cache busting if code responsible for HTML
  generation changes in the future.
  - Example: `Etag: "DirIndex-2B423AF_CID-bafy…foo"`

- When a gateway can’t guarantee byte-for-byte identical responses, a “weak”
  etag should be used.
  - Example: If CAR is streamed, and blocks arrive in non-deterministic order,
    the response should have `Etag: W/"bafy…foo.car"`.
  - Example: If TAR stream is generated by traversing an UnixFS directory in non-deterministic
    order, the response should have `Etag: W/"bafy…foo.x-tar"`.

- When responding to [`Range`](#range-request-header) request, a strong `Etag`
  should be based on requested range in addition to CID and response format:
  `Etag: "bafy..foo.0-42`

### `Cache-Control` (response header)

Used for HTTP caching.

An explicit caching directive for the returned response. Informs HTTP client
and intermediate middleware caches such as CDNs if the response can be stored
in caches.

Returned directive depends on requested content path and format:

- `Cache-Control: public, max-age=29030400, immutable` MUST be returned for
  every immutable resource under `/ipfs/` namespace.

- `Cache-Control: public, max-age=<ttl>` SHOULD be returned for mutable
  resources under `/ipns/{id-with-ttl}/` namespace; `max-age=<ttl>` SHOULD
  indicate remaining TTL of the mutable pointer such as :cite[ipns-record] or DNSLink
  TXT record.
  - Implementations MAY place an upper bound on any TTL received, as
    noted in Section 8 of :cite[rfc2181].
  - If TTL value is unknown, implementations SHOULD not send a `Cache-Control`
  - No matter if TTL value is known or not, implementations SHOULD always
    send a [`Last-Modified`](#last-modified-response-header) header with the timestamp of the record resolution.

### `Last-Modified` (response header)

Optional, used as additional hint for HTTP caching.

Returning this header depends on the information available:

- The header can be returned with `/ipns/` responses when the gateway
  implementation knows the exact time a mutable pointer was updated by the
  publisher.

- When only TTL is known, [`Cache-Control`](#cache-control-response-header)
  should be used instead.

- Legacy implementations set this header to the current timestamp when reading
  TTL on  `/ipns/` content paths was not available. This hint was used by web
  browsers in a process called  "Calculating Heuristic Freshness"
  (Section 4.2.2 of :cite[rfc9111]). Each browser
  uses different heuristic, making this an inferior, non-deterministic caching
  strategy.

- New implementations should not return this header if TTL is not known;
  providing a static expiration window in `Cache-Control` is easier to reason
  about than cache expiration based on the fuzzy “heuristic freshness”.

### `Content-Type` (response header)

Returned with custom response formats such as `application/vnd.ipld.car` or
`application/vnd.ipld.raw`. CAR must be returned with explicit version.
Example: `Content-Type: application/vnd.ipld.car; version=1`

When deserialized responses are enabled,
and no explicit response format is provided with the request, and the
requested data itself has no built-in content type metadata, implementations
SHOULD perform content type sniffing based on file name
(from :ref[url] path, or optional [`filename`](#filename-request-query-parameter) parameter)
and magic bytes to improve the utility of produced responses.

For example:

- detect plain text file
  and return `Content-Type: text/plain` instead of `application/octet-stream`
- detect SVG image
  and return `Content-Type: image/svg+xml` instead of `text/xml`

### `Content-Disposition` (response header)

Returned when `download`, `filename` query parameter, or a custom response
`format` such as `car` or `raw` block are used.

The first parameter passed in this header indicates if content should be
displayed `inline` by the browser, or sent as an `attachment` that opens the
“Save As” dialog:

- `Content-Disposition: inline` is the default, returned when request was made
  with  `download=false`  or a custom `filename` was provided with the request
  without any explicit `download` parameter.
- `Content-Disposition: attachment` is returned only when request was made with
  the explicit  `download=true`

The remainder is an optional `filename` parameter that will be prefilled in the
“Save As” dialog.

NOTE: when the `filename` includes non-ASCII characters, the header must
include both ASCII and UTF-8 representations for compatibility with legacy user
agents and existing web browsers.

To illustrate, `?filename=testтест.pdf` should produce:
`Content-Disposition inline; filename="test____.jpg"; filename*=UTF-8''test%D1%82%D0%B5%D1%81%D1%82.jpg`

- ASCII representation must have non-ASCII characters replaced with `_`
- UTF-8 representation must be wrapped in Percent Encoding (Section 2.1 of :cite[rfc3986]).
  - NOTE: `UTF-8''` is not a typo – see Section 3.2.3 of :cite[rfc8187].

`Content-Disposition` must be also set when a binary response format was requested:

- `Content-Disposition: attachment; filename="<cid>.car"` should be returned
  with `Content-Type: application/vnd.ipld.car` responses to ensure client does
  not attempt to render streamed bytes. CID and `.car` file extension should be
  used if  a custom `filename` was not provided with the request.

- `Content-Disposition: attachment; filename="<cid>.bin"` should be returned
  with `Content-Type: application/vnd.ipld.raw` responses to ensure client does
  not attempt to render raw bytes. CID and `.bin` file extension should be used
  if  a custom `filename` was not provided with the request.

### `Content-Location` (response header)

Returned when a non-default content format has been negotiated with the
[`Accept` header](#accept-request-header) but `format` was missing from the URL.

The value of this field SHOULD include
the URL of the resource with the `format` query parameter included, so that
generic HTTP caches can store deserialized, CAR, and block responses separately.

:::note

For example, a request to `/ipfs/{cid}` with `Accept: application/vnd.ipld.raw`
SHOULD return a `Content-Location: /ipfs/{cid}?format=raw` header in order for
block response to be cached separately from deserialized one.

:::

### `Content-Length` (response header)

Represents the length of returned HTTP payload.

:::warning

<!-- TODO https://github.com/ipfs/specs/issues/461 -->

NOTE: the value may differ from the real size of requested data if compression or chunked `Transfer-Encoding` are used.
See [ipfs/specs#461](https://github.com/ipfs/specs/issues/461).

:::

### `Content-Range` (response header)

Returned only when request was a [`Range`](#range-request-header) request.

See Section 14.4 of :cite[rfc9110].

### `Accept-Ranges` (response header)

Optional, returned to explicitly indicate if gateway supports partial HTTP
[`Range`](#range-request-header) requests for a specific resource.

For example, `Accept-Ranges: none` should be returned with
`application/vnd.ipld.car` responses if the block order in CAR stream is not
deterministic.

### `Location` (response header)

Returned only when response status code is [`301` Moved Permanently](#301-moved-permanently).
The value informs the HTTP client about new URL for requested resource.

#### Use in directory URL normalization

Gateway MUST return a redirect when a valid UnixFS directory was requested
without the trailing `/`, for example:

- response for UnixFS directory at `https://example.com/ipns/en.wikipedia-on-ipfs.org/wiki`
 (no trailing slash) MUST be HTTP 301 redirect with
  `Location: /ipns/en.wikipedia-on-ipfs.org/wiki/`

This normalization is required for directory-based relative links
and security scopes such as Service Worker registrations to work correctly.
It also ensures the same behavior on path gateways (`https://example.com/ipfs/cid/` with trailing `/`)
and origin-isolated HTTP contexts `https://cid.ipfs.dweb.link`
or non-HTTP URLs like `ipfs://cid`, where empty path component is implicit `/`.

#### Use in interop with Subdomain Gateway

See [`Location` section](https://specs.ipfs.tech/http-gateways/subdomain-gateway/#location-response-header) of :cite[subdomain-gateway].

### `X-Ipfs-Path` (response header)

Used for HTTP caching and indicating the IPFS address of the data.

Indicates the original, requested content path before any path resolution and traversal is performed.

Example: `X-Ipfs-Path: /ipns/k2..ul6/subdir/file.txt`

### `X-Ipfs-Roots` (response header)

Used for HTTP caching.

A way to indicate all CIDs required for resolving  logical roots (path
segments) from `X-Ipfs-Path`. The main purpose of this header is allowing HTTP
caches to make smarter decisions about cache invalidation.

Below, an example to illustrate how `X-Ipfs-Roots` is constructed from `X-Ipfs-Path` pointing at a DNSLink.

The traversal of `/ipns/en.wikipedia-on-ipfs.org/wiki/Block_of_Wikipedia_in_Turkey`
includes a HAMT-sharded UnixFS directory `/wiki/`.

This header only cares about logical roots (one per URL path segment):

1. `/ipns/en.wikipedia-on-ipfs.org` → `bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze`
2. `/ipns/en.wikipedia-on-ipfs.org/wiki/` → `bafybeihn2f7lhumh4grizksi2fl233cyszqadkn424ptjajfenykpsaiw4`
3. `/ipns/en.wikipedia-on-ipfs.org/wiki/Block_of_Wikipedia_in_Turkey` → `bafkreibn6euazfvoghepcm4efzqx5l3hieof2frhp254hio5y7n3hv5rma`

Final array of roots:

```
X-Ipfs-Roots: bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze,bafybeihn2f7lhumh4grizksi2fl233cyszqadkn424ptjajfenykpsaiw4,bafkreibn6euazfvoghepcm4efzqx5l3hieof2frhp254hio5y7n3hv5rma
```

NOTE: while the first CID will change every time any article is changed,
the last root (responsible for specific article or a subdirectory) may not
change at all, allowing for smarter caching beyond what standard Etag offers.

### `X-Content-Type-Options` (response header)

Optional, present in certain response types:

- `X-Content-Type-Options: nosniff`  should be returned with
  `application/vnd.ipld.car` and `application/vnd.ipld.raw` responses to
  indicate that the [`Content-Type`](#content-type-response-header) should be
  followed and not be changed. This is a security feature, ensures that
  non-executable binary response types are not used in `<script>` and `<style>`
  HTML tags.

### `Retry-After` (response header)

Gateway SHOULD return this header with error responses such as [`429 Too Many Requests`](#429-too-many-requests), [`504 Gateway Timeout`](#504-gateway-timeout) or `503` (server maintainance).

The "Retry-After" header indicates how long the user agent ought to wait before making a follow-up request. It uses the following syntax:

```
Retry-After: <delay-seconds>
```

See Section 10.2.3 of :cite[rfc9110].

### `Server-Timing` (response header)

Optional. Implementations MAY use this header to communicate one or more
metrics and descriptions for the given request-response cycle.

See `Server-Timing` at [W3C: Server Timing](https://www.w3.org/TR/server-timing/#the-server-timing-header-field).

### `Traceparent` (response header)

Optional. Implementations MAY use this header to return a globally
unique identifier to help in debugging errors and performance issues.

See `Traceparent` at [W3C: Trace Context](https://www.w3.org/TR/trace-context-1/#traceparent-header).

### `Tracestate` (response header)

Optional. Implementations MAY use this header to return a additional
vendor-specific trace identification information across different distributed
tracing systems and is a companion header for the `Traceparent` header.

See `Tracestate` at [W3C: Trace Context](https://www.w3.org/TR/trace-context-1/#tracestate-header).

## Response Payload

Data sent with HTTP response depends on the type of the requested IPFS resource, and the requested response type.

By default, implicit deserialized response type is based on `Accept` header and the codec of the resolved CID:

- UnixFS, either `dag-pb` (0x70) or `raw` (0x55)
  - File or `raw` block
    - Bytes representing file/block contents
    - When `Range` is present, only the requested byte range is returned.
  - Directory
    - Generated HTML with directory index (see [additional notes here](#generated-html-with-directory-index))
    - When `index.html` is present, gateway MUST skip generating directory index and return content from `index.html` instead.
- JSON (0x0200)
  - Bytes representing a JSON file, see [application/json](https://www.iana.org/assignments/media-types/application/json).
  - Works exactly the same as `raw`, but returned `Content-Type` is `application/json`
- CBOR (0x51)
  - Bytes representing a CBOR file, see [application/cbor](https://www.iana.org/assignments/media-types/application/cbor)
  - Works exactly the same as `raw`, but returned `Content-Type` is `application/cbor`
- DAG-JSON (0x0129)
  - If the `Accept` header includes `text/html`, implementation should return a generated HTML with options to download DAG-JSON as-is, or converted to DAG-CBOR.
  - Otherwise, response works exactly the same as `raw` block, but returned `Content-Type` is [application/vnd.ipld.dag-json](https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-json)
- DAG-CBOR (0x71)
  - If the `Accept` header includes `text/html`: implementation should return a generated HTML with options to download DAG-CBOR as-is, or converted to DAG-JSON.
  - Otherwise, response works exactly the same as `raw` block, but returned `Content-Type` is [application/vnd.ipld.dag-cbor](https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-cbor)

The following response types require an explicit opt-in, can only be requested with [`format`](#format-request-query-parameter) query parameter or [`Accept`](#accept-request-header) header:

- Raw Block (`?format=raw`)
  - Opaque bytes, see [application/vnd.ipld.raw](https://www.iana.org/assignments/media-types/application/vnd.ipld.raw).
- CAR (`?format=car`)
  - A CAR file or a stream that contains all blocks required to trustlessly verify the requested content path query, see [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) and Section 5 (CAR Responses) at :cite[trustless-gateway].
- TAR (`?format=tar`)
  - Deserialized UnixFS files and directories as a TAR file or a stream, see :cite[ipip-0288].
- IPNS Record
  - Protobuf bytes representing a verifiable :cite[ipns-record] (multicodec `0x0300`)

# Appendix: notes for implementers

## Content resolution

Content resolution is a process of turning an HTTP request into an IPFS content
path, and then traversing it until the content identifier (CID) is found.

### Finding the content root

Path Gateway decides what content to serve by taking the path from the URL
requested and splitting it into two parts: the *CID*  and the *remainder* of
the path.

The *CID* provides the starting point, often called *content root*. The
*remainder* of the path, if present,  will be used as instructions to traverse
IPLD data, starting from that data which the CID identified.

**Note:** Other types of gateway may allow for passing CID by other means, such
as `Host` header, changing the rules behind path splitting.
(See [SUBDOMAIN_GATEWAY.md](./SUBDOMAIN_GATEWAY.md)
and [DNSLINK_GATEWAY.md](./DNSLINK_GATEWAY.md)).

### Traversing remaining path

After the content root CID is found, the remaining of the path should be traversed
and resolved. Depending on the data type, that may occur through UnixFS pathing,
or DAG-JSON, and DAG-CBOR pathing.

### Traversing through UnixFS

UnixFS is an abstraction over the low level [logical DAG-PB pathing][dag-pb-format]
from IPLD, providing a better user experience:

- Example of UnixFS pathing: `/ipfs/cid/dir-name/file-name.txt`

For more details regarding DAG-PB pathing, please read the "Path Resolution" section
of [this document](https://ipld.io/design/tricky-choices/dag-pb-forms-impl-and-use/#path-resolution).

### Traversing through DAG-JSON and DAG-CBOR

Traversing through [DAG-JSON][dag-json] and [DAG-CBOR][dag-cbor] is possible
through fields that encode a link:

- DAG-JSON: link are represented as a base encoded CID under the `/` reserved
namespace, see [specification](https://ipld.io/specs/codecs/dag-json/spec/#links).
- DAG-CBOR: links are tagged with CBOR tag 42, indicating that they encode a CID,
see [specification](https://ipld.io/specs/codecs/dag-cbor/spec/#links).

Note: pathing into [IPLD Kind](https://ipld.io/docs/data-model/kinds/) other than Link (CID) is not supported at the moment. Implementations should return HTTP 501 Not Implemented when fully resolved content path has any remainder left.  This feature may be specified in a future [IPIP that introduces data onboarding](https://github.com/ipfs/in-web-browsers/issues/189)  and [IPLD Patch](https://ipld.io/specs/patch/) semantics.

### Handling traversal errors

Gateway MUST respond with HTTP error when it is not possible to traverse the requested content path:

- [`404 Not Found`](#404-not-found) should be returned when the root CID is valid and traversable, but
the DAG it represents does not include content path remainder.
  - Error response body should indicate which part of immutable content path (`/ipfs/{cid}/path/to/file`) is missing
- [`400 Bad Request`](#400-bad-request) should be returned when the root CID under the `ipfs` namespace is invalid.
- [`500 Internal Server Error`](#500-internal-server-error) can be used for remaining traversal errors,
such as domains that cannot be resolved, or IPNS keys that cannot be resolved.

## Best practices for HTTP caching

- Following [HTTP Caching](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cache)
  rules around `Etag` , `Cache-Control` , `If-None-Match` and `Last-Modified`
  should be produce acceptable cache hits.

- Advanced caching strategies can be built using additional information in
  `X-Ipfs-Path` and `X-Ipfs-Roots` headers.

- Implement support for requests sent with
  [`Cache-Control: only-if-cached`](#cache-control-request-header).
  It allows IPFS-aware HTTP clients to probe and prioritize gateways that
  already have the data cached, significantly improving retrieval speeds.

## Denylists

Optional, but encouraged.

Implementations are encouraged to support pluggable denylists to allow IPFS
node operators to opt into not hosting previously flagged content.

Gateway MUST respond with HTTP error when requested CID is on any of active denylists:

- [410 Gone](#410-gone) returned when CID is denied for non-legal reasons, or when the exact reason is unknown
- [451 Unavailable For Legal Reasons](#451-unavailable-for-legal-reasons) returned when denylist indicates that content was blocked on legal basis

Gateway implementation MAY apply some denylists by default as long the gateway
operator is able to inspect and modify the list of denylists that are applied.

Examples of public deny lists:

- [The Bad Bits Denylist](https://badbits.dwebops.pub/) – a list of hashed CIDs
  that have been flagged for various reasons (copyright violation, malware,
  etc). Each entry is `sha256()` hashed so that it can easily be checked given
  a plaintext CID, but inconvenient to determine otherwise.

## Generated HTML with directory index

While implementations decide on the way HTML directory listing is
generated and presented to the user, following below suggestions is advised.

Linking to alternative response types such as CAR and dag-json allows clients
to consume directory listings programmatically without the need for parsing HTML.

Directory index response time should not grow with the number of items in a directory.
It should be always fast, even when a directory has 10k of items.

The usual optimizations involve:

- Skipping size and type resolution for child UnixFS items, and using `Tsize`
  from [logical format][dag-pb-format] instead, allows gateway to respond much
  faster, as it no longer need to fetch root nodes of child items.
  - Instead of showing "file size" GUIs should show "IPFS DAG size". This
    remains useful for quick inspection, but does not require fetching child
    blocks, making directory listing fast, even with tens of thousands of
    blocks.  Example with 10k items:
    `bafybeiggvykl7skb2ndlmacg2k5modvudocffxjesexlod2pfvg5yhwrqm`.
  - Additional information about child nodes, such as exact file size without
    DAG overhead, can be fetched lazily with JS, but only for items in the
    browser's viewport.

- Alternative approach is resolving child items, but providing pagination UI.
  - Opening a big directory can return HTTP 302 to the current URL with
    additional query parameters (`?page=0&limit=100`),
    limiting the cost of a single page load.
  - The downside of this approach is that it will always be slower than
    skipping child block resolution.

## Recursive vs non-recursive gateways

A *recursive Gateway* is a gateway which generally attempts to fetch content
from a third party it does not control by triggering lookups and retrievals. A
recursive Gateway may not know in advance whether it can obtain and return a
piece of content as the availability of it is out of its control. It may also
suggest that clients retry failed requests later via `502` and `504` responses
status codes.

A *non-recursive Gateway* is gateway which accesses a known content-set and,
under normal operation conditions, knows with certainty whether content
requested can be obtained or not. Non-recursive gateways SHOULD prevent
unnecessary retries from clients when the content is known to be unavailable
by returning `404`.

[dag-pb-format]: https://ipld.io/specs/codecs/dag-pb/spec/#logical-format
[dag-json]: https://ipld.io/specs/codecs/dag-json/spec/
[dag-cbor]: https://ipld.io/specs/codecs/dag-cbor/spec/
