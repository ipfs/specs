# IPIP 0000: CidV2 - Tagged Pointers

<!-- IPIP number will be assigned by an editor. When opening a pull request to
submit your IPIP, please use number 0000 and an abbreviated title in the filename,
`0000-draft-title-abbrev.md`. -->

- Start Date: 2022-08-05
- Related Issues:
  - https://github.com/multiformats/cid/pull/49
  - [Content Addressing Lurk Data](https://gist.github.com/johnchandlerburnham/d9b1b88d49b1e98af607754c0034f1c7)

## Summary

<!--One paragraph explanation of the IPIP.-->
Create a new [CID](https://github.com/multiformats/cid) version (CidV2, informally "Tagged Content Identifiers") which combines a data Multicodec-Multihash pair (the pointer) and a metadata Multicodec-Multihash pair (the tag) to create content-addresses with expressive contexts.

## Motivation
Currently, CIDv1 data is described by a multicodec content type. However, this is meant to describe the overall format of the serialized data e.g. the `dag-cbor` IPLD encoding, and not more specific information such as a data schema or type. For example, it can be useful to have raw IPLD data contextualized by its [IPLD schema](). Since multicodecs are limited to 9 bytes  by the [unsigned-varint spec](https://github.com/multiformats/unsigned-varint#practical-maximum-of-9-bytes-for-security), the available codec space is generally too small to encode such metadata.

## Detailed design

Our solution is a new CID version which contains two multicodec-multihash pairs, one pair for data and another for metadata. The metadata multicodec would then be able to concisely describe a space of metadata tags where the specific tag would then be further specified by the multihash. This could be implemented as follows in Rust:

```rust
pub struct CidV2<const S: usize, const M: usize> {
    /// The data multicodec
    data_codec: u64,
    /// The data multihash
    data_hash: Multihash<S>,
    /// The metadata codec
    meta_codec: u64,
    /// The metadata multihash
    meta_hash: Multihash<M>
}
```

It would serialize as follows:

```
<cidv2> ::= <multicodec-cidv2><multicodec-data-content-type><multihash-data><multicodec-metadata-content-type><multihash-metadata>
```

with a multibase prefix when represented in text.

For example, suppose you want a CID which points to a piece of IPLD data and its [IPLD schema](https://ipld.io/docs/schemas/). Let's say you have the schema `Trit`, with a particular integer representation 

```
type Trit union {
  | True ("1")
  | False ("2")
  | Unknown ("0")
} representation int
```

which corresponds to the Ipld data: `Ipld::Num(1)`, `Ipld::Num(2)`, `Ipld::Num(0)`.

While you could in principle propose a new multicodec for `Trit`, this might be not suitable if `Trit` is a temporary or ephemeral structure, or if you have a large number of different schemas (For instance, in Lurk-lang's content-addressing we would need to reserve 16-bits of the multicodec table, or 2^16 distinct multicodecs).

However, since IPLD schemas can be represented as JSON (https://ipld.io/specs/schemas/#dsl-vs-dmt) and hashed, with a CIDv2 we could reserve a single IPLD schema multicodec, along with the codec for the data representation (such as dag-cbor)
We could then use the above CIDv2 definiton to create a pointer to any Schema+Data pair:

```
CidV2 { 
  data_codec: 0x71,
  data_hash: <data_multihash>,
  meta_codec : 0x3e7ada7a, 
  meta_hash: <schema-multihash> 
}
```

And thus we could then create an unambiguous hash to `Trit::True` with

```
CidV2 {
  data_codec: 0x71, 
  data_hash: Ipld::Num(1).hash(),
  meta_hash: trit_schema.hash(), 
  meta_codec : 0x3e7ada7a,
}
```
without having to reserve anything new on the multicodec table.

Modified spec file contains the following changes:
- [Added a definition for Cidv2](https://github.com/yatima-inc/cid/blob/master/README.md)
- [Added an implementation for Cidv2 to rust-cid](https://github.com/yatima-inc/rust-cid/tree/cid-v2)

## Test fixtures

| version | data multicodec | data multihash | metadata multicodec | metadata multihash | base32lower CIDv2 |
|-|-|-|-|-|-|
| cidv2   | raw | sha2-256-256-f3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7 | raw | sha2-256-256-fea3bd73e2b506e00527232b3ed743c066da83a8e3066f62a71e75eb9b4aa1db6 | bajkreib2n2yhsdzzvsd4stzyk2zn2lc5cehgqelaejq2tkjd2o5shloiw5kreihkhplt4k2qnyafe4rswpwxipagnwudvdrqm33cu4phl243jkq5wy |
| cidv2 | raw | sha2-256-256-f3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7 | identity | identity-4-6d657461 | bajkreib2n2yhsdzzvsd4stzyk2zn2lc5cehgqelaejq2tkjd2o5shloiw4aaabdnmv2gc |



## Design rationale

This design was motivated by the desire to encode additional metadata into CIDs from a number of projects, such as [Yatima-lang](https://github.com/yatima-inc/yatima-lang), [Lurk-lang](https://github.com/lurk-lang/lurk-rs), DAG House, and IPNS-Link (see https://github.com/multiformats/cid/pull/49)

In the case of Lurk, a tagged hash-pointer called `ScalarPtr` contains a 16-bit tag describing the type of node in the scalar graph of language terms. This tag must be included in the CID somehow in order to retrieve individual nodes without re-traversing the entire graph, so unless Lurk reserves each multicodec table entry beginning with a given 16-bit prefix (e.g. `0xC0DE`) it would be difficult if not impossible to have a CID containing both the Lurk data and its associated tag. If we then think about every other protocol which needs to include similar tags, types, or pointers in addition to their data, the multicodec table quickly becomes saturated with hundreds of entries for each application and runs out of 9-byte space.

### User benefit

Having arbitrary-length CID metadata allows the data to be fully self-describing and abstracts application-specific interpretation away into the metadata CID.

### Compatibility

For backwards compatibility, the existing Cidv2 codec `0x02` could be used to allow interpretation by legacy Cidv1 application logic, e.g.
```
CidV1 { multicodec: 0x02, hash: <identity-multihash-of-cidv2-serialization> }
```

In the canonical Cidv2 form, the data comes before the metadata because a legacy Cidv1 parser can choose to keep only the former and discard the latter.

### Security

There is likely some increased memory overhead from supporting double-wide CIDs, but this should not be significant when comparing CIDv2s of 256 bit multihash versus CIDv1s with a 512 bit multihash. 

The proposal is also designed to be purely opt-in and backwards compatible with existing implementations. That said, some work may be required to ensure that implementations that do not wish to support CIDv2 can either read a CIDv2 as if it were a CIDv1 (and discard the trailing metadata), or to error on the CIDv2 entirely.

### Alternatives

- [Cidv2 with arbitrary-precision multicodec size](
https://gist.github.com/johnchandlerburnham/d9b1b88d49b1e98af607754c0034f1c7#appendix-a-cidv2-and-arbitrary-precision-multicodec)
- Cidv2 with nested hashes

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
