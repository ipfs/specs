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

- [`bafybeiegxwlgmoh2cny7qlolykdf7aq7g6dlommarldrbm7c4hbckhfcke`][f-dag-pb] is a
  DAG-PB directory.
- [`bafkreidmwhhm6myajxlpu7kofe3aqwf4ezxxn46cp5fko7mb6x74g4k5nm`][f-dag-pb-json]
  is the aforementioned DAG-PB directory's Logical DAG-JSON representation that
  is expected to be returned when using `?format=dag-json`.
- Traversal Test Fixtures: the following test fixtures contain two levels of nested
  documents of their encoding. Accessing `/ipfs/$CID/foo/bar` should return the JSON
  equivalent of `{"hello":"this is not a link"}`.
  - DAG-CBOR: [`bafyreiehxu373cu3v5gyxyxfsfjryscs7sq6fh3unqcqgqhdfn3n43vrgu`][f-dag-cbor-traversal]
  - DAG-JSON: [`baguqeeraoaeabj5hdfcmpkzfeiwtfwb3qbvfwzbiknqn7itcwsb2fdtu7eta`][f-dag-json-traversal]
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

Serializers and deserializers for the JSON and CBOR must follow the security
considerations of the original specifications, found in:

- [RFC 8259 (JSON), Section 12][rfc8259-sec12]
- [RFC 8949 (CBOR), Section 10][rfc8949-sec10]

DAG-JSON and DAG-CBOR follow the same security considerations as JSON and CBOR.
Note that DAG-JSON and DAG-CBOR are stricter variants of JSON and CBOR, respectively.
Therefore they must follow their IPLD specification and error if the payload
is not strict enough:

- [DAG-JSON Spec][dag-json-spec]
- [DAG-CBOR Spec][dag-cbor-spec]

### Alternatives

Introducing DAG-JSON, DAG-CBOR, JSON and CBOR in the HTTP Gateway allows for
a broader usage of the IPLD Data Model. If we do not introduce more IPLD
response formats in the gateway, the usage of IPFS is constricted to files
and directories represented by UnixFS (DAG-PB) codec. Therefore, it would keep
the IPLD potential locked due to an artificial barrier created by the gateways.

In addition, we could introduce only DAG-JSON and DAG-CBOR. However, not
supporting the generic variants, JSON and CBOR, would lead to poor UX. The
ability to retrieve DAG-JSON as `application/json` is an important step
for the interoperability of the HTTP Gateway with web browsers and other tools
that expect specific Content Types.

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
[f-dag-pb]: https://dweb.link/ipfs/bafybeiegxwlgmoh2cny7qlolykdf7aq7g6dlommarldrbm7c4hbckhfcke
[f-dag-pb-json]: https://dweb.link/ipfs/bafkreidmwhhm6myajxlpu7kofe3aqwf4ezxxn46cp5fko7mb6x74g4k5nm
[f-dag-cbor-traversal]: https://dweb.link/ipfs/bafyreiehxu373cu3v5gyxyxfsfjryscs7sq6fh3unqcqgqhdfn3n43vrgu
[f-dag-json-traversal]: https://dweb.link/ipfs/baguqeeraoaeabj5hdfcmpkzfeiwtfwb3qbvfwzbiknqn7itcwsb2fdtu7eta
[rfc8259-sec12]: https://datatracker.ietf.org/doc/html/rfc8259#section-12
[rfc8949-sec10]: https://datatracker.ietf.org/doc/html/rfc8949#section-10
[dag-json-spec]: https://ipld.io/specs/codecs/dag-json/spec/
[dag-cbor-spec]: https://ipld.io/specs/codecs/dag-cbor/spec/
