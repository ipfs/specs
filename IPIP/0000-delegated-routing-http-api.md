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
and implementations of this spec could then be rewritten in the IDL, maintaining backwards compatibility.

## Detailed design

See the [Delegated Routing HTTP API design](../routing/DELEGATED_ROUTING_HTTP.md) included with this IPIP.

## Design rationale
To understand the design rationale, it is important to consider the concrete Reframe limitations that we know about:

- Reframe [method types](../reframe/REFRAME_KNOWN_METHODS.md) are encoded inside messages
    - This prevents URL-based pattern matching on methods, which makes it hard and expensive to do basic HTTP scaling and optimizations:
        - Configuring different caching strategies for different methods
        - Configuring reverse proxies on a per-method basis
            - Routing methods to specific backends
            - Method-specific reverse proxy config such as timeouts
    - Developer UX is poor as a result, e.g. for CDN caching you must encode the entire request message and pass it as a query parameter
        - This was initially done by URL-escaping the raw bytes
          - Not possible to consume correctly using standard JavaScript (see [edelweiss#61](https://github.com/ipld/edelweiss/issues/61))
          - Shipped in Kubo 0.16
        - Packing a CID into a struct, encoding it with DAG-CBOR, multibase-encoding that, percent-encoding that, and then passing it in a URL, rather than merely passing the CID in the URL, is needlessly complex from a user's perspective
        - Added complexity of "Cacheable" methods supporting both POSTs and GETs
- The required streaming support and message groups add a lot of implementation complexity, but streaming does not work for cachable methods sent over HTTP
    - Ex for FindProviders, the response is buffered anyway for ETag calculation
    - There are no limits on response sizes nor ways to impose limits and paginate
    - This is useful for routers that have highly variable resolution time, to send results as soon as possible, but this is not a use case we are focusing on right now and we can add it later
- The Identify method is not implemented because it is not currently useful
    - This is because Reframe's ambition is to be generic catch-all bag of methods across protocols, while delegated routing use case only requires a subset of its methods.
- Client and server implementations are difficult to write correctly, because of the non-standard wire formats and conventions
    - Example: [bug reported by implementer](https://github.com/ipld/edelweiss/issues/62), and [another one](https://github.com/ipld/edelweiss/issues/61)
- The Go implementation is [complex](https://github.com/ipfs/go-delegated-routing/blob/main/gen/proto/proto_edelweiss.go) and [brittle](https://github.com/ipfs/go-delegated-routing/blame/main/client/provide.go#L51-L100), and is currently maintained by IPFS Stewards who are already over-committed with other priorities
- Only the HTTP transport has been designed and implemented, so it's unclear if the existing design will work for other transports, and what their use cases and requirements are
    - This means Reframe can't be trusted to be transport-agnostic until there is at least second transport implemented (e.g. as a reframe-over-libp2p protocol).

So this API proposal makes the following changes:

- The Delegated Routing API is defined using HTTP semantics, and can be implemented without introducing Reframe concepts
- "Method names" and cache-relevant parameters are pushed into the URL path
- Streaming support is removed, and default response size limits are added along with an optional `limit` parameter for clients to specify response sizes
    - We might add streaming support w/ chunked-encoded responses in the future, but it's currently not an important feature for the use cases that an HTTP API will be used for
    - Pagination could be added to this in the future, if needed
- Bodies are encoded using standard JSON or CBOR, instead of using IPLD codecs
- JSON uses human-friendly string encodings of common data types
    - CIDs are encoded as CIDv1 strings with a multibase prefix (e.g. base32), for consistency with CLIs, browsers, and [gateway URLs](https://docs.ipfs.io/how-to/address-ipfs-on-web/)
    - Multiaddrs use the [human-readable format](https://github.com/multiformats/multiaddr#specification) that is used in existing tools and Kubo CLI commands such as `ipfs id` or `ipfs swarm peers`
    - Byte array values, such as signatures, are multibase-encoded strings (with an `m` prefix indicating Base64)
- The "Identify" method and "message groups" are removed

### User benefit

The cost of building and operating content routing services will be much lower, as developers will be able to reuse existing industry-standard tooling.
They no longer need to learn Reframe-specific concepts to consume or expose the API.
This will result in more content routing providers, each providing a better experience for users, driving down content routing latency across the IPFS netowrk
and increasing data availability.

### Compatibility

#### Backwards Compatibility
IPFS Stewards will implement this API in [go-delegated-routing](https://github.com/ipfs/go-delegated-routing), using breaking changes in a new minor version.
Because the existing Reframe spec can't be safely used in JavaScript and we won't be investing time and resources into changing the wire format implemented in edelweiss to fix it, 
the experimental support for Reframe in Kubo will be removed in the next release and delegated routing will subsequently use this HTTP API. 
We may decide to re-add Reframe support in the future once these issues have been resolved.

#### Forwards Compatibility
Standard HTTP mechanisms for forward compatibility are used:
- The API is versioned using a version number in the path
- The `Accept` and `Content-Type` headers are used for content type negotiation
- New methods will result in new paths
- Parameters can be added using either new query parameters or new fields in the request/response body.

Certain parts of bodies are labeled as "{ ... }", which are opaque JSON values passed through by the implementation, with no schema enforcement.

### Security

None

### Alternatives

This *is* an alternative.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
