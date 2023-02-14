# IPIP-338: Delegated Content Routing HTTP Provide Records API

- Start Date: 2023-02-14
- Related Issues:
  - https://github.com/ipfs/specs/pull/378

## Summary

This IPIP extends the [IPIP-337 HTTP Delegated Routing API](0337-delegated-routing-http-api.md) to provide records over `PUT` requests.

The work here was originally proposed as part of IPIP-337, and eventually was separated into its own IPIP in order to reduce the scope of original work, while enabling iterative release of the HTTP delegated routing APIs.

## Motivation

The IPFS interaction with DHT includes both read and write operations.
A user can provide records, advertising the presence of content, as well as looking up providers for a given CID.
The specification proposed by [IPIP-337](0337-delegated-routing-http-api.md) offers an idiomatic first-class support for offloading the lookup portion of this interaction onto other processes and/or servers.
Following the same motivations that inspired [IPIP-337](0337-delegated-routing-http-api.md), this document expands the HTTP APIs to also
offload the ability to provide records noto a third-party system.

## Detailed design

The API extensions are added to the [Delegated Content Routing HTTP API spec/`PUT`](../routing/DELEGATED_CONTENT_ROUTING_HTTP.md#put-routingv1providers) section, along with complimentary sections that outline known formats followed by example payload.

## Design rationale

The rationale for the design of `PUT` operations closely follows the reasoning listed in [IPIP-337](0337-delegated-routing-http-api.md#design-rationale).
The design uses a human-readable request/response structure with extensibility in mind.
The specification imposes no restrictions on the schema nor the protocol advertised in provider records.
The hope is that such extensibility will encourage and inspire innovation for better transfer protocols.

### User benefit

Expanding the user benefits listed as part of [IPIP-337](0337-delegated-routing-http-api.md#user-benefit), in the context of content routing write operations are typically more expensive than read operations. They involve book keeping such as TTL, gossip propagation, etc.
Therefore, it is highly desirable to reduce the burden of advertising provider records onto the network by means of delegation through simple to use HTTP APIs.

### Compatibility

#### Backwards Compatibility

##### DHT

The `PUT` APIs proposed here require a new data format for specifying provider records.
Since the records must include a valid signature, records published through HTTP delegated routing must be resigned.

##### Reframe

See [IPIP-337/Backwards Compatibility](0337-delegated-routing-http-api.md#backwards-compatibility).

#### Forwards Compatibility

See [IPIP-337/Forwads Compatibility](0337-delegated-routing-http-api.md#forwards-compatibility).

### Security

See [IPIP-337/Security](0337-delegated-routing-http-api.md#security).

### Alternatives

- Reframe (general-purpose RPC) was evaluated, see "Design rationale" section for rationale why it was not selected.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
