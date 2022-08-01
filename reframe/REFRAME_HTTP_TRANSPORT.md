# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Reframe: HTTP Transport

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

# Organization of this document

- [HTTP Transport Design](#http-transport-design)
  - [HTTP Caching Considerations](#http-caching-considerations)
    - [POST vs GET](#post-vs-get)
    - [Avoiding sending the same response messages twice](#avoiding-sending-the-same-response-messages-twice)
    - [Client controls for time-based caching](#client-controls-for-time-based-caching)
    - [Rate-limiting non-cachable POST requests](#rate-limiting-non-cachable-post-requests)
- [Implementations](#implementations)

# HTTP Transport Design

All messages sent in HTTP body MUST be encoded as DAG-JSON and use explicit content type `application/vnd.ipfs.rpc+dag-json; version=1`

Requests MUST be sent as either:
- `GET /reframe/{mbase64url-dag-cbor}`
  - Cachable HTTP `GET` requests with message passed as DAG-CBOR in HTTP path segment, encoded as URL-safe [`base64url` multibase](https://docs.ipfs.io/concepts/glossary/#base64url) string
    - DAG-CBOR in multibase `base64url` is used instead of DAG-JSON because JSON may include characters that are not safe to be used in URLs, and re-encoding JSON in base would take too much space
  - Suitable for sharing links, sending smaller messages, and when a query result MUST benefit from HTTP caching (see _HTTP Caching Considerations_ below).
- `POST /reframe`
  - Ephemeral HTTP `POST` request with message passed as DAG-JSON in HTTP request body
  - Suitable for bigger messages, and when HTTP caching should be skipped for the most fresh results

Servers MUST support `GET` for methods marked as cachable and MUST support `POST` for all methods (both cachable and not-cachable). This allows servers to rate-limit `POST` when cachable `GET` could be used instead, and enables clients to use `POST` as a fallback in case there is a technical problem with bigger Reframe messages not fitting in a `GET` URL. See "Caching Considerations" section.


If a server supports HTTP/1.1, then it MAY send chunked-encoded messages. Clients supporting HTTP/1.1 MUST accept chunked-encoded responses.

Requests and Responses MUST occur over a single HTTP call instead of the server being allowed to dial back the client with a response at a later time.

If a server chooses to respond to a single request message with a group of messages in the response it should do so as a set of `\n` delimited DAG-JSON messages (i.e. `{Response1}\n{Response2}...`).

Requests and responses MUST come with `version=1` as a _Required Parameter_  in the `Accept` and `Content-Type` HTTP headers.

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

### Avoiding sending the same response messages twice

Implementations MUST always return strong
[`Etag`](https://httpwg.org/specs/rfc7232.html#header.etag) HTTP header based
on digest of DAG-JSON response messages. This allows clients to send
inexpensive conditional requests with
[`If-None-Match`](https://httpwg.org/specs/rfc7232.html#header.if-none-match)
header, which will skip when the response message did not change.

### Client controls for time-based caching

Implementations can also return (optional) 
[`Last-Modified`](https://httpwg.org/specs/rfc7232.html#header.last-modified)
HTTP header, allowing clients to send conditional requests with
[`If-Modified-Since`](https://httpwg.org/specs/rfc7232.html#header.if-modified-since)
header to specify their acceptance for stale (cached) responses.

### Rate-limiting non-cachable POST requests

HTTP endpoint can return status code
[429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4)
with `Retry-After` header to throttle the number of `POST` requests a client can send.

The body returned with `429` response should suggest use of HTTP `GET` endpoint
for cachable Reframe methods:

```
HTTP/1.1 429 Too Many Requests
Content-Type: text/plain
Retry-After: 3600

too many POST requests: consider switching to cachable GET or try again later (see Retry-After header)
```


# Implementations

https://github.com/ipfs/go-delegated-routing
