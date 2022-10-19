# ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) Reframe: HTTP Transport

**Author(s)**:

- Adin Schmahmann
- Petar Maymounkov
- Marcin Rataj

**Maintainer(s)**:

* * *

**Abstract**

The Reframe over HTTP protocol is defining the transport and message
serialization mechanisms for sending Reframe messages over HTTP `POST` and
`GET`, and provides guidance for implementers around HTTP caching.

## Organization of this document

- [HTTP Endpoint](#http-endpoint)
  - [Content type](#content-type)
  - [HTTP methods](#http-methods)
  - [Other notes](#other-notes)
- [HTTP Caching Considerations](#http-caching-considerations)
  - [POST vs GET](#post-vs-get)
  - [Etag](#etag)
  - [Last-Modified](#last-modified)
  - [Cache-Control](#cache-control)
  - [Rate-limiting non-cachable POST requests](#rate-limiting-non-cachable-post-requests)
- [Implementations](#implementations)

## HTTP Endpoint

```
https://rpc-service.example.net/reframe
```

URL of a Reframe endpoint must end with `/reframe` path.

### Content type

Requests SHOULD be sent with explicit `Accept` and `Content-Type` HTTP headers specifying the body format.

All messages sent in HTTP body MUST be encoded as either:

- [DAG-CBOR](https://ipld.io/specs/codecs/dag-cbor/spec/), and use explicit content type `application/vnd.ipfs.rpc+dag-cbor; version=2`
  - **This is a CBOR (binary) format for use in production.**
  - CBOR request MUST include HTTP header: `Accept: application/vnd.ipfs.rpc+dag-cbor; version=2`
  - CBOR request AND response MUST include header: `Content-Type: application/vnd.ipfs.rpc+dag-cbor; version=2`
- [DAG-JSON](https://ipld.io/specs/codecs/dag-json/spec/), and use explicit content type `application/vnd.ipfs.rpc+dag-json; version=2`
  - **This is a human-readable plain text format for use in testing and debugging.**
  - JSON request MUST include header: `Accept: application/vnd.ipfs.rpc+dag-json; version=2`
  - JSON request AND response MUST include header: `Content-Type: application/vnd.ipfs.rpc+dag-json; version=2`

Implementations SHOULD error when an explicit content type is missing, but MAY decide to implement some defaults instead.
The rules around implicit content type are as follows:

- Requests without a matching `Content-Type` header MAY be interpreted as DAG-JSON.
- Requests without a matching `Accept` header MAY produce a DAG-JSON response.
- Responses without a matching `Content-Type` header MAY be interpreted as DAG-JSON.

### HTTP methods

Requests MUST be sent as either:

- `GET /reframe/{method}/{request-as-mbase64url-dag-cbor}`
  - Cachable HTTP `GET` requests with message passed as DAG-CBOR in HTTP path segment, encoded as URL-safe [`base64url` multibase](https://docs.ipfs.io/concepts/glossary/#base64url) string
    - Cachable `method` name is placed on the URL path, allowing for different caching strategies per `method`, and custom routing/scaling per `method`, if needed.
    - DAG-CBOR in multibase `base64url` is used (even when request body is DAG-JSON) because JSON may include characters that are not safe to be used in URLs, and percent-encoding or base-encoding a big JSON query may take too much space.
  - Suitable for sharing links, sending bigger messages, and when a query result MUST benefit from HTTP caching (see _HTTP Caching Considerations_ below).
  - DAG-CBOR response is the implicit default, unless explicit `Accept` header is passed
- `GET /reframe/{method}?q={percent-encoded-request-as-dag-json}`
  - DAG-JSON is supported via a `?q` query parameter, and the value MUST be [percent-encoded](https://en.wikipedia.org/wiki/Percent-encoding)
  - Suitable for sharing links, sending smaller messages, testing and debugging.
  - DAG-JSON response is the implicit default, unless explicit `Accept` header is passed
- `POST /reframe/{method}`
  - Ephemeral HTTP `POST` request with DAG-JSON or DAG-CBOR message passed in HTTP request body and a mandatory `Content-Type` header informing endpoint how to parse the body
  - Suitable for bigger messages, and when HTTP caching should be skipped for the most fresh results
  - Response type is the same as `Content-Type` of the request, unless explicit `Accept` header is passed

Servers MUST support `GET` for methods marked as cachable and MUST support `POST` for all methods (both cachable and not-cachable). This allows servers to rate-limit `POST` when cachable `GET` could be used instead, and enables clients to use `POST` as a fallback in case there is a technical problem with bigger Reframe messages not fitting in a `GET` URL. See "Caching Considerations" section.

### Other notes

If a server supports HTTP/1.1, then it MAY send chunked-encoded messages. Clients supporting HTTP/1.1 MUST accept chunked-encoded responses.

Requests and Responses MUST occur over a single HTTP call instead of the server being allowed to dial back the client with a response at a later time. The response status code MUST be 200 if the RPC transaction succeeds, even when there's an error at the application layer, and a non-200 status code if the RPC transaction fails.

If a server chooses to respond to a single request message with a group of DAG-JSON messages in the response it should do so as a set of `\n` delimited DAG-JSON messages (i.e. `{Response1}\n{Response2}...`).
DAG-CBOR responses require no special handling, as they are already self-delimiting due to the nature of the CBOR encoding.

Requests and responses MUST come with `version=2` as a _Required Parameter_  in the `Accept` and `Content-Type` HTTP headers.

Note: This version header is what allows the transport to more easily evolve over time (e.g. if it was desired to change the transport to support other encodings than DAG-JSON, utilize headers differently, move the request data from the body, etc.). Not including the version number is may lead to incompatibility with future versions of the transport.

## HTTP Caching Considerations

### POST vs GET

HTTP `POST` requests do not benefit from any preexisting HTTP caching because
every `POST` response will overwrite the cached resource.

While it is possible to write custom middleware to cache `POST` responses based on
request body, this is not a standard behavior and is discouraged.

Use of `GET` endpoint is not mandatory, but suggested if a Reframe deployment
expects to handle the same message query multiple times, and want to leverage
existing HTTP tooling to maximize HTTP cache hits.

### Etag

For small responses.

Implementations MAY return
[`Etag`](https://httpwg.org/specs/rfc7232.html#header.etag) HTTP header based
on a digest of response messages ONLY when `Etag` generation does not require
buffering bigger response in memory before sending it to the client.

In other words, do not use `Etag` if it will block a big, streaming response.
Streaming responses should use `Last-Modified` instead.

`Etag` allows clients to send inexpensive conditional requests with
[`If-None-Match`](https://httpwg.org/specs/rfc7232.html#header.if-none-match)
header, which will skip when the response message did not change.

### Last-Modified

For streaming responses.

Implementations SHOULD return
[`Last-Modified`](https://httpwg.org/specs/rfc7232.html#header.last-modified)
HTTP header with bigger, streaming responses.

This allows clients to send conditional requests with
[`If-Modified-Since`](https://httpwg.org/specs/rfc7232.html#header.if-modified-since)
header to specify their acceptance for stale (cached) responses.

### Cache-Control

Implementations MAY return custom `Cache-Control` per Reframe method,
when a specific cache window makes sense in the context of specific method.

It is also acceptable to leave it out and let reverse HTTP provies / CDNs to
set it. Value will depend on use case, and expected load.

### Rate-limiting non-cachable POST requests

HTTP endpoint can return status code
[429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4)
with `Retry-After` header to throttle the number of `POST` requests a client can send.

The body returned with `429` response should suggest use of HTTP `GET` endpoint
for cachable Reframe methods:

```plaintext
HTTP/1.1 429 Too Many Requests
Content-Type: text/plain
Retry-After: 3600

too many POST requests: consider switching to cachable GET or try again later (see Retry-After header)
```

## Implementations

https://github.com/ipfs/go-delegated-routing
