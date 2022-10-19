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
formats. However, it should be possible to download deserialized  version of  data other than UnixFS
in order to unlock the potential of the [IPLD Data Model][ipld-data-model] beyond files and directories.


The main functional gap in IPFS ecosystem is the lack of support for non-UnixFS DAGs on HTTP Gateways.
Users are able to create custom DAGs based on traversable DAG-CBOR thanks to [CBOR tag 42 being reserved for CIDs](https://github.com/core-wg/yang-cbor/issues/13#issuecomment-524378859), 
but they are unable to load deserialized  DAG-CBOR documents from local gateway, 
which is severely decreasing the utility of non-UnixFS DAGs.

Adding new responses types will also benefit UnixFS.
DAG-PB has a [logical format][dag-pb-format] which makes it possible
to represent a DAG-PB directory as a [DAG-JSON] document. This means that, if we
support DAG-JSON in the gateway, then we would support
[JSON responses for directory listings][ipfs/go-ipfs/issues/7552], which has been
requested by our users in the past.

In addition, this functionality is already present on the current Kubo CLI. By
bringing it to the gateways, we provide users with more power when it comes
to traversing IPLD data.

## Detailed design

The solution is to allow the Gateway to support serializing an IPLD Data Model
representation as [DAG-JSON], [DAG-CBOR], JSON and CBOR by requesting them
using either the `Accept` HTTP header or the `format` URL query.

## Test fixtures

- `bafybeiegxwlgmoh2cny7qlolykdf7aq7g6dlommarldrbm7c4hbckhfcke` is a DAG-PB directory.
- `bafkreidmwhhm6myajxlpu7kofe3aqwf4ezxxn46cp5fko7mb6x74g4k5nm` is the aforementioned
  DAG-PB directory's Logical DAG-JSON representation that is expected to be returned
  when using `?format=dag-json`.
- Traversal Test Fixtures: the following test fixtures contain two levels of nested
  documents of their encoding. Accessing `/ipfs/$CID/foo/bar` should return the JSON
  equivalent of `{"hello":"this is not a link"}`.
  - DAG-CBOR: `bafyreiehxu373cu3v5gyxyxfsfjryscs7sq6fh3unqcqgqhdfn3n43vrgu`
  - DAG-JSON: `baguqeeraoaeabj5hdfcmpkzfeiwtfwb3qbvfwzbiknqn7itcwsb2fdtu7eta`
- `TODO` is a valid JSON but not a valid DAG-JSON
- `TODO` is a valid CBOR but not a valid DAG-CBOR

## Design rationale

The current gateway already supports different response formats via the
`Accept` HTTP header and the `format` URL query. This IPIP proposes adding
one more supported format to that list.

### User benefit

The user benefits from this change as they will now be able to retrieve
content encoded in the traversable DAG-JSON and DAG-CBOR formats. This is
something that has been [requested before][ipfs/go-ipfs/issues/7552].

### Compatibility

This IPIP adds a new response types and does not modify existing ones,
making it a backwards-compatible change.

### Security

TODO

### Alternatives

TODO

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[DAG-PB]: https://ipld.io/docs/codecs/known/dag-pb/
[dag-pb-format]: https://ipld.io/specs/codecs/dag-pb/spec/#logical-format
[DAG-JSON]: https://ipld.io/docs/codecs/known/dag-json/
[DAG-CBOR]: https://ipld.io/docs/codecs/known/dag-cbor/
[CAR]: https://ipld.io/specs/transport/car/
[ipld-data-model]: https://ipld.io/docs/data-model/
[ipfs/in-web-browsers/issues/182]: https://github.com/ipfs/in-web-browsers/issues/182
[ipfs/specs/pull/328]: https://github.com/ipfs/specs/pull/328
[ipfs/kubo/issues/8823]: https://github.com/ipfs/kubo/issues/8823
[ipfs/kubo/pull/9335]: https://github.com/ipfs/kubo/pull/9335
[ipfs/go-ipfs/issues/7552]: https://github.com/ipfs/go-ipfs/issues/7552