# IPIP 0000: Delegated Routing HTTP API

- Start Date: 2022-10-18
- Related Issues:
  - (add links here)

## Summary

This IPIP specifies an HTTP API for delegated routing.

## Motivation

Idiomatic and first-class HTTP support for delegated routing is an important requirement for large content routing providers,
and supporting large content providers is a key strategy for driving down IPFS latency.
These providers must handle high volumes of traffic and support many users, so leveraging industry-standard tools and services
such as HTTP load balancers, CDNs, reverse proxies, etc. is a requirement.
To maximize compatibility with standard tools, IPFS needs an HTTP API specification that uses standard HTTP idioms and payload encoding.
The [Reframe spec](https://github.com/ipfs/specs/blob/main/reframe/REFRAME_PROTOCOL.md) for delegated content routing was an experimental attempt at this, 
but it has resulted in a very unidiomatic HTTP API which is difficult to implement and is incompatible with many existing tools.
The cost of a proper redesign, implementation, and maintenance of Reframe and its implementation is too high relative to the urgency of having a delegated routing HTTP API.

Note that this does not supplant nor deprecate Reframe. Ideally in the future, Reframe and its implementation would receive the resources needed to map the IDL to idiomatic HTTP,
and this spec could then be rewritten in the IDL, maintaining backwards compatibility.

## Detailed design

See the [API design](../routing/DELEGATED_ROUTING_HTTP.md) included with this IPIP.

## Design rationale
To understand the design rationale, it is important to consider the concrete Reframe limitations that we know about:

- Reframe methods are encoded inside messages
    - This prevents URL-based pattern matching on methods
        - Configuring different caching strategies for different methods
        - Configuring reverse proxies on a per-method basis
            - Routing methods to specific backends
            - Method-specific reverse proxy config such as timeouts
    - Developer UX is poor as a result, e.g. for CDN caching you must encode the entire request message and pass it as a query parameter
        - This was initially done by URL-escaping the raw bytes
          - Not possible to consume correctly using standard JavaScript
          - Shipped in Kubo 0.16
        - Packing a CID into a struct, encoding it with DAG-CBOR, multibase-encoding that, percent-encoding that, and then passing it in a URL, rather than merely passing the CID in the URL, is needlessly complex from a user's perspective
        - Added complexity of "Cacheable" methods supporting both POSTs and GETs
- The required streaming support and message groups add a lot of implementation complexity but isn’t very useful
    - Ex for FindProviders, the response is buffered anyway for ETag calculation
    - There are no limits on response sizes nor ways to impose limits and paginate
    - This is useful for routers that have highly variable resolution time, to send results as soon as possible, but this is not a use case we are focusing on right now and we can add it later
- The Identify method is not implemented because it is not currently useful
- Client and server implementations are difficult to write correctly, because of the non-standard wire formats and conventions
- The Go implementation is [complex](https://github.com/ipfs/go-delegated-routing/blob/main/gen/proto/proto_edelweiss.go) and [brittle](https://github.com/ipfs/go-delegated-routing/blame/main/client/provide.go#L51), and is currently maintained by IPFS Stewards who are already over-committed with other priorities
- Only the HTTP transport has been designed and implemented, so it's unclear if the existing design will work for other transports, and what their use cases and requirements are

So this API proposal makes the following changes:

- The API is defined in HTTP directly
- "Methods" and cache-relevant parameters are pushed into the URL path
- Streaming support is removed, and optional pagination is added, which limits the response size and provides a scalable mechanism for iterating over arbitrarily-large collections
    - We might add streaming support w/ chunked-encoded responses in the future, but it's currently not an important feature for the use cases that an HTTP API will be used for
- Bodies are encoded using standard JSON or CBOR, instead of using IPLD codecs
- The "Identify" method and "message groups" are removed

### User benefit

The cost of building and operating content routing services will be much lower, as developers will be able to reuse existing industry-standard tooling.
This will result in more content routing providers, each providing a better experience for users, driving down content routing latency across the IPFS netowrk
and increasing data availability.

### Compatibility

#### Backwards Compatibility
IPFS Stewards will implement this API in [go-delegated-routing](https://github.com/ipfs/go-delegated-routing), using breaking changes in a new minor version.
Because the existing Reframe spec can't be safely used in JavaScript, the experimental support for Reframe in Kubo will be removed in the next release,
and delegated routing will subsequently use this HTTP API. We may decide to re-add Reframe support in the future once these issues have been resolved.

#### Forwards Compatibility
Standard HTTP mechanisms for forward compatibility are used--the API is versioned using a version number in the path. The `Accept` and `Content-Type` headers are used for content type negotiation. new methods will result in new paths, and parameters can be added using either new query parameters or new fields in the request/response body. Certain parts of bodies are labeled as "opaque bytes", which are passed through by the implementation, with no schema enforcement.

### Security

None

### Alternatives

This *is* an alternative.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
