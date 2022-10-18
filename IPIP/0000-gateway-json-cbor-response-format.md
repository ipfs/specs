# IPIP 0000: Gateway JSON and TAR Response Formats

- Start Date: 2022-10-07
- Related Issues:
  - [ipfs/in-web-browsers/issues/182]
  - [ipfs/specs/pull/328]
  - [ipfs/kubo/issues/8823]
  - [ipfs/kubo/pull/9335]
  - [ipfs/go-ipfs/issues/7552]

## Summary

Add [DAG-JSON], [DAG-CBOR], JSON and CBOR response formats to the [HTTP Gateway](../http-gateways/).

## Motivation

Currently, the gateway supports requesting data in the [DAG-PB], RAW, and [CAR]
formats. However, it should be possible to download everything over the gateway
in order to unlock the potentials of the [IPLD Data Model][ipld-data-model].

For example, DAG-PB has a [logical format][dag-pb-format] which makes it possible
to represent a DAG-PB directory as a [DAG-JSON] document. This means that, if we
support DAG-JSON in the gateway, then we would support
[JSON responses for directory listings][ipfs/go-ipfs/issues/7552], which has been
requested by our users in the past.

In addition, this functionality is already present on the current Kubo CLI. By
bringing it to the gateways, we provide users with more power when it comes
to traversing IPLD data.

## Detailed design

The solution is to allow the Gateway to support serializing an IPLD model
representation as [DAG-JSON], [DAG-CBOR], JSON and CBOR by requesting them
using either the `Accept` HTTP header or the `format` URL query.

## Test fixtures

TODO

## Design rationale

TODO

### User benefit

TODO

### Compatibility

This RFC is backwards compatible.

### Security

TODO

### Alternatives

TODO

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[DAG-PB]: https://ipld.io/docs/codecs/known/dag-pb/
[dag-pb-format]: https://ipld.io/specs/codecs/dag-pb/spec/#logical-format
[DAG-JSON]: https://ipld.io/docs/codecs/known/dag-json/
[DAG-CBOR]: https://ipld.io/docs/codecs/known/dag-json/
[CAR]: https://ipld.io/specs/transport/car/
[ipld-data-model]: https://ipld.io/docs/data-model/
[ipfs/in-web-browsers/issues/182]: https://github.com/ipfs/in-web-browsers/issues/182
[ipfs/specs/pull/328]: https://github.com/ipfs/specs/pull/328
[ipfs/kubo/issues/8823]: https://github.com/ipfs/kubo/issues/8823
[ipfs/kubo/pull/9335]: https://github.com/ipfs/kubo/pull/9335
[ipfs/go-ipfs/issues/7552]: https://github.com/ipfs/go-ipfs/issues/7552