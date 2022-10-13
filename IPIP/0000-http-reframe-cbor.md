# IPIP 0000: Add DAG-CBOR support to Reframe over HTTP

<!-- IPIP number will be assigned by an editor. When opening a pull request to
submit your IPIP, please use number 0000 and an abbreviated title in the filename,
`0000-draft-title-abbrev.md`. -->

- Start Date: 2022-09-29
- Related Issues:
  - https://github.com/ipld/edelweiss/issues/16#issuecomment-1074161577
  - https://github.com/ipfs/kubo/issues/8823

## Summary

<!--One paragraph explanation of the IPIP.-->
This IPIP adds DAG-CBOR support to Reframe over HTTP.

## Motivation

We've been using Reframe in Kubo for a while and it is clear that Reframe
messages are not designed to be created or read by humans.

The plaintext  DAG-JSON representation of messages does not really bring
anything to the table (because both CIDs and Multiaddrs are in a format that
needs manual encoding/decoding anyway),

## Detailed design

We already support DAG-JSON, with its own content type.
The change here is to add support for requests and responses sent as DAG-CBOR,
with own content type: `application/vnd.ipfs.rpc+dag-cbor`.

For details, see changes made to `reframe/REFRAME_HTTP_TRANSPORT.md`.

## Test fixtures

TODO: add CIDs of sample DAG-CBOR messages after https://github.com/ipfs/go-delegated-routing implements it, and has own tests.

## Design rationale

IPFS stack aims to support both DAG-CBOR and DAG-JSON. Users can store JSON as
CBOR and vice versa. Having consistent support for both in Reframe not only
aligns with user expectations, but also allows us to save some bytes
(bandwidth, response caching requirements) by using a binary CBOR as the
production format.

### User benefit

User will be able to choose between binary and human-readable representation,
just like they do in other parts of IPFS/IPLD stack.

### Compatibility

Explain the upgrade considerations for existing implementations.

This IPIP add DAG-CBOR next to already existing DAG-JSON. Preexisting clients
that only speak DAG-JSON will continue working, no change is required.

### Security

N/A, we will use the same DAG-CBOR encoder/decoder as the rest of the stack.

### Alternatives

Alternative is to do nothing, and end up with:

- inconsistent user experience
- wasted bandwidth and cache storage

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
