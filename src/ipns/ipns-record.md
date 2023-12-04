---
title: IPNS Record and Protocol
description: >
  Specifies the IPNS protocol in a language-agnostic manner, allowing everyone to
  create a compatible IPNS Record Publisher or Resolver.
date: 2023-10-03
maturity: reliable
editors:
  - name: Vasco Santos
    github: vasco-santos
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Steve Allen
    github: Stebalien
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Gus Eggert
    github: guseggert
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
tags: ['ipns']
order: 0
---

The InterPlanetary File System (IPFS) is powered by content-addressed data, which by nature is immutable: changing an object would change its hash, and consequently its address, making it a different object altogether. However, there are several use cases where we benefit from having mutable data. This is where the InterPlanetary Naming System (IPNS) gets into the equation. IPNS records provide cryptographically verifiable, mutable pointers to objects.

## Introduction

Each time a file is modified, its content address changes. As a consequence, the address previously used for getting that file needs to be updated by who is using it. As this is not practical, IPNS was created to solve the problem.

:dfn[InterPlanetary Naming System (IPNS)] is based on [Self-certifying File System (SFS)](http://en.wikipedia.org/wiki/Self-certifying_File_System). It consists of a PKI namespace, where a name is simply the hash of a public key. As a result, whoever controls the private key has full control over the name. Accordingly, records are signed by the private key and then distributed across the network (in IPFS, via the routing system). This is an egalitarian way to assign mutable names on the Internet at large, without any centralization whatsoever, or certificate authorities.

## IPNS Keys

### Key Types

Implementations MUST support Ed25519 with signatures defined in :cite[rfc8032].
Ed25519 is the current default key type.

Implementations SHOULD support RSA if they wish to interoperate with legacy
IPNS names (RSA was used before Ed25519).

Implementations MAY support Secp256k1 and ECDSA for private use, but peers
from the public IPFS swarm and DHT may not be able to resolve IPNS records
signed by these optional key types.

When implementing support for key types, follow signature implementation notes
from [PeerID specs](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#key-types).

In all cases, the IPNS implementation MAY allow the user to enable/disable specific key types via configuration. Note that disabling support for compulsory key type will hinder IPNS interop.

### Key Serialization Format

IPNS encodes keys in [protobuf](https://github.com/google/protobuf)
containing a `KeyType` and the encoded key in a `Data` field:

```protobuf
syntax = "proto2";

enum KeyType {
 RSA = 0;
 Ed25519 = 1;
 Secp256k1 = 2;
 ECDSA = 3;
}

// PublicKey
message PublicKey {
 required KeyType Type = 1;
 required bytes Data = 2;
}

// PrivateKey
message PrivateKey {
 required KeyType Type = 1;
 required bytes Data = 2;
}
```

Note:

- `Data` encoding depends on `KeyType` (see [Key Types](#key-types))

- Although private keys are not transmitted over the wire, the `PrivateKey`
  serialization format used to store keys on disk is also included as a
  reference for IPNS implementers who would like to import existing IPNS key
  pairs.

- `PublicKey` and `PrivateKey` structures were originally defined in
  [PeerID specification](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#keys),
  and are currently the same in both libp2p and IPNS. If the PeerID
  specification ever changes in the future, definition from this file takes the
  precedence.

## IPNS Name

:dfn[IPNS Name] is a [Multihash](https://docs.ipfs.io/concepts/glossary/#multihash)
of a serialized `PublicKey`.

If a `PublicKey` is small, it can be inlined inside of a multihash using the `identity` function.
This is the default behavior for Ed25519 keys.

### String Representation

IPNS Name should be represented as a
[CIDv1](https://docs.ipfs.tech/concepts/glossary/#cid) with `libp2p-key`
[multicodec](https://docs.ipfs.tech/concepts/glossary/#multicodec) (code `0x72`),
and encoded using case-insensitive
[Multibase](https://docs.ipfs.io/concepts/glossary/#multibase) such as Base36.

A good practice is to prefix IPNS Name with `/ipns/` namespace,
and refer to IPNS addresses as `/ipns/{ipns-name}` (or `/ipns/{libp2p-key}`).

## IPNS Record

### Record Fields

A logical :dfn[IPNS Record] is a data structure containing the following fields:

#### :dfn[Value]{also="ipns-record-value"} (bytes)

- It can be any content path, such as a `/ipns/{ipns-key}` path to another IPNS record, a [DNSLink](https://dnslink.dev/) path (`/ipns/example.com`) or an immutable IPFS path (`/ipfs/baf...`).
- Implementations MUST include this value inside the DAG-CBOR document in `IpnsEntry.data[Value]`.

#### :dfn[Validity Type]{also="ipns-record-validity-type"} (uint64)

- Defines the conditions under which the record is valid.
- The only supported value is `0`, which indicates the `validity` field contains the expiration date after which the IPNS record becomes invalid.
- Implementations MUST support `ValidityType = 0` and include this value inside the DAG-CBOR document at `IpnsEntry.data[ValidityType]`.

#### :dfn[Validity]{also="ipns-record-validity"} (bytes)

- When `ValidityType = 0`
  - Expiration date of the record with nanoseconds precision.  Expiration time should match the publishing medium's window.
    - For example, IPNS records published on the DHT should have an expiration time set to within 48 hours after publication. Setting the expiration time to longer than 48 hours will not have any effect, as DHT peers only keep records for up to 48 hours.
  - Represented as an ASCII string that follows notation from :cite[rfc3339] (`1970-01-01T00:00:00.000000001Z`).
- Implementations MUST include this value inside the DAG-CBOR document at `IpnsEntry.data[Validity]`.

#### :dfn[Sequence]{also="ipns-record-sequence"} (uint64)

- Represents the current version of the record (starts at 0).
- Implementations MUST include this value in inside the DAG-CBOR document at `IpnsEntry.data[Sequence]`.

#### :dfn[TTL]{also="ipns-record-ttl"} (uint64)

- A hint for how long (in nanoseconds) the record should be cached before going back to, for instance the DHT, in order to check if it has been updated. The function and trade-offs of this value are analogous to the TTL of DNS record.
- Implementations MUST include this value inside the DAG-CBOR document at `IpnsEntry.data[TTL]`.
- Suggested default: 1 hour (3 600 000 000 000 nanoseconds).

#### :dfn[Public Key]{also="ipns-record-public-key"} (bytes)

- Public key used to sign this record.
  - If public key is small enough to fit in IPNS name (e.g., Ed25519 keys inlined using `identity` multihash), `IpnsEntry.pubKey` field is redundant and MAY be skipped to save space.
  - The public key MUST be included if it cannot be extracted from the IPNS name (e.g., legacy RSA keys). Implementers MUST follow key serialization defined in [PeerID specs](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#key-types).
  - List of supported key types listed in [IPNS Keys](#ipns-keys) section.

#### :dfn[Signature]{also="ipns-record-signature"} (bytes)

- Provides the cryptographic proof that the IPNS record was created by the owner of the private key.
- Implementations MUST include this value in `IpnsEntry.signatureV2` and follow signature creation and verification as described in [Record Creation](#record-creation) and [Record Verification](#record-verification).

#### :dfn[Extensible Data]{also="ipns-record-extensible-data"} (DAG-CBOR)

- Extensible record data in [DAG-CBOR](https://ipld.io/specs/codecs/dag-cbor/spec/) format.
- The default set of fields can be augmented with additional information.
  - Implementations MAY leverage this, but otherwise MUST ignore unexpected fields.
  - A good practice is to:
    - prefix custom field names with `_` to avoid collisions with any new
      mandatory fields that may be added in a future version of this
      specification.
    - and/or create own namespace by setting value to DAG-CBOR:
      `IpnsEntry.data[_namespace][customfield]`.

IPNS records are stored locally, as well as spread across the network, in order to be accessible to everyone.

### Record Serialization Format

For storing this structured data at rest and on the wire, we use `IpnsEntry` encoded as [protobuf](https://github.com/google/protobuf), which is a language-neutral, platform neutral extensible mechanism for serializing structured data.
The extensible part of IPNS Record is placed in `IpnsEntry.data` field, which itself is encoded using a strict and deterministic subset of CBOR named [DAG-CBOR](https://ipld.io/specs/codecs/dag-cbor/spec/).

This canonical serialization format uses the [`application/vnd.ipfs.ipns-record`](https://www.iana.org/assignments/media-types/application/vnd.ipfs.ipns-record) content type.

```protobuf
message IpnsEntry {
 enum ValidityType {
  // setting an EOL says "this record is valid until..."
  EOL = 0;
 }

 // legacy V1 copy of data[Value]
 optional bytes value = 1;

 // legacy V1 field, verify 'signatureV2' instead
 optional bytes signatureV1 = 2;

 // legacy V1 copies of data[ValidityType] and data[Validity]
 optional ValidityType validityType = 3;
 optional bytes validity = 4;

 // legacy V1 copy of data[Sequence]
 optional uint64 sequence = 5;

 // legacy V1 copy copy of data[TTL]
 optional uint64 ttl = 6;

 // Optional Public Key to be used for signature verification.
 // Used for big keys such as old RSA keys. Including the public key as part of
 // the record itself makes it verifiable in offline mode, without any additional lookup.
 // For newer Ed25519 keys, the public key is small enough that it can be embedded in the
 // IPNS Name itself, making this field unnecessary.
 optional bytes pubKey = 7;

 // (mandatory V2) signature of the IPNS record
 optional bytes signatureV2 = 8;

 // (mandatory V2) extensible record data in DAG-CBOR format
 optional bytes data = 9;
}
```

:::warning

The `optional` keyword in Protocol Buffers (protobufs) indicates a field isn't
required for message exchange. However, even if a field is marked `optional` in
protobuf `message` syntax, an application such as IPNS may require it, making
it mandatory at the application level.

Thus, despite protobuf rules, developers must heed application-level
requirements present in [Record Creation](#record-creation) section.

:::

#### Record Size Limit

IPNS implementations MUST support sending and receiving a serialized
`IpnsEntry` less than or equal to **10 KiB** in size.

Records over the limit MAY be ignored. Handling records larger than the
limit is not recommended to keep compatibility with implementations and
transports that follow this specification.

### Backward Compatibility

Implementations that want to interop with the public IPFS swarm MUST maintain
backward compatibility for legacy consumers of IPNS records:

- A legacy publisher MUST always be able to update to the latest implementation
  of this specification without breaking record resolution for legacy consumers.
- A legacy consumer MUST always be able to resolve IPNS name, even when publisher
  updated to the latest implementation of this specification.

This means, for example, that changes made to the `IpnsEntry` protobuf, or
validation logic should always be additive.

Future changes to this spec should include design decisions that allow legacy
nodes to gracefully ignore new fields and verify compatible records using
legacy logic.

## Protocol

### Overview

![IPNS overview](/img/ipns-overview.png)

Taking into consideration a p2p network, each peer should be able to publish [IPNS records](#ipns-record) to the network, as well as to resolve the IPNS records published by other peers.

When a node intends to publish a record to the network, an IPNS record needs to be [created](#record-creation) first. The node needs to have a previously generated asymmetric key pair to create the record according to the data structure previously specified. It is important pointing out that the record needs to be uniquely identified in the network. As a result, the record identifier should be a hash of the public key used to sign the record.

As an IPNS record may be updated during its lifetime, a versioning related logic is needed during the publish process. As a consequence, the record must be stored locally, in order to enable the publisher to understand which is the most recent record published. Accordingly, before creating the record, the node must verify if a previous version of the record exists, and update the sequence value for the new record being created.

Once the record is created, it is ready to be spread through the network. This way, a peer can use whatever routing system it supports to make the record accessible to the remaining peers of the network.

The means of distribution are left unspecified. Implementations MAY choose to
publish signed record using multiple routing systems, such as
[libp2p Kademlia DHT](https://github.com/libp2p/specs/tree/master/kad-dht) or :cite[ipns-pubsub-router] (see [Routing record](#routing-record)).

On the other side, each peer must be able to get a record published by another node. It only needs to have the unique identifier used to publish the record to the network. Taking into account the routing system being used, we may obtain a set of occurrences of the record from the network. In this case, records can be compared using the sequence number, in order to obtain the most recent one.

As soon as the node has the most recent record, the signature and the validity must be [verified](#record-verification), in order to conclude that the record is still valid and not compromised.

Finally, the network nodes may also republish their records, so that the records in the network continue to be valid to the other nodes.

### Record Creation

IPNS record MUST be serialized as `IpnsEntry` protobuf, and `IpnsEntry.data`
MUST be signed (`IpnsEntry.signatureV2`) using the private key.

Creating a new IPNS record MUST follow the below steps:

1. Create `IpnsEntry` protobuf

2. Create a DAG-CBOR document with values for `Value`, `Validity`,
   `ValidityType`, `Sequence`, and `TTL`

   - Following [DAG-CBOR specification](https://ipld.io/specs/codecs/dag-cbor/spec/) is paramount.
     The CBOR bytes will be used for signing and the serialized form must be
     deterministic.

   - If you are updating an existing record, remember to increase values in
     `sequence` and `validity`

3. Store DAG-CBOR in `IpnsEntry.data`.

   - If you want to store additional metadata in the record, add it under
     unique keys at `IpnsEntry.data`.

   - The order of fields impacts signature verification. If you are using an
     alternative CBOR implementation, make sure the CBOR field order follows
     :cite[rfc7049] sorting rules: length and then bytewise. The order of
     fields impacts signature verification.

4. If your public key can't be inlined inside the IPNS Name, include a
   serialized copy in `IpnsEntry.pubKey`

   - This step SHOULD be skipped for Ed25519, and any other key types that are
     small enough (32 bytes) to be inlined inside [IPNS Name](#ipns-name) itself.

5. Create `IpnsEntry.signatureV2`

   - Create bytes for signing by concatenating `ipns-signature:` prefix (bytes
     in hex: `69706e732d7369676e61747572653a`) with raw CBOR bytes from
     `IpnsEntry.data`

   - Sign concatenated bytes from the previous step using the private key, and
     store the signature in `IpnsEntry.signatureV2`

6. Confirm that the serialized `IpnsEntry` bytes sum to less than or equal to
   [the size limit](#record-size-limit).

Created `IpnsEntry` protobuf includes signed `data` CBOR and optional public key:

```protobuf
message IpnsEntry {
 optional bytes pubKey = 7;
 optional bytes signatureV2 = 8;
 optional bytes data = 9;
}
```

The `IpnsEntry.data` CBOR document includes key-value pairs for `Value`,
`Validity`, `ValidityType`, `Sequence` and `TTL`.
Keys are sorted and serialized in order that follows
the [DAG-CBOR specification](https://ipld.io/specs/codecs/dag-cbor/spec/):

```json
// IpnsEntry.data
{
  Sequence: …
  TTL: …
  Validity: …
  ValidityType: …
  Value: …
}
```

#### Record Creation with Legacy SignatureV1

:::warning

Fields related to `signatureV1` has been deprecated since 2021.
V1 signatures are no longer used during record validation.

However, it may be necessary to create a V2+V1 record that allows legacy
software to use IPNS to upgrade itself to the latest version which supports V2
signatures. In such case, follow the steps below.

:::

1. Create `IpnsEntry` and set `value`, `validity`, `validityType`, `sequence`, and `ttl`
   - If you are updating an existing record, remember to increase values in `sequence` and `validity`
2. Create a DAG-CBOR document with the same values for `Value`, `Validity`, `ValidityType`, `Sequence`, and `TTL`
   - This is paramount: this CBOR will be used for signing.
3. Store DAG-CBOR in `IpnsEntry.data`.
   - If you want to store additional metadata in the record, add it under unique keys at `IpnsEntry.data`.
   - The order of fields impacts signature verification. If you are using an alternative CBOR implementation, make sure the CBOR field order follows :cite[rfc7049] sorting rules: length and then bytewise. The order of fields impacts signature verification.
4. If your public key can't be inlined inside the IPNS Name, include a serialized copy in `IpnsEntry.pubKey`
   - This step SHOULD be skipped for Ed25519, and any other key types that are inlined inside [IPNS Name](#ipns-name) itself.
5. Create `IpnsEntry.signatureV2`
   - Create bytes for signing by concatenating `ipns-signature:` prefix (bytes in hex: `69706e732d7369676e61747572653a`) with raw CBOR bytes from `IpnsEntry.data`
   - Sign concatenated bytes from the previous step using the private key, and store the signature in `IpnsEntry.signatureV2`
6. Create `IpnsEntry.signatureV1` (backward compatibility, for legacy software)
   - Create bytes for signing by concatenating `IpnsEntry.value` + `IpnsEntry.validity` + `string(IpnsEntry.validityType)`
   - Sign concatenated bytes from the previous step using the private key, and store the legacy signature in `IpnsEntry.signatureV1`
7. Confirm that the serialized `IpnsEntry` bytes sum to less than or equal to [the size limit](#record-size-limit).

### Record Verification

Implementations MUST resolve IPNS Names only using verified records.
Record's data and signature verification MUST be implemented as outlined below, and fail on the first error.

1. Before parsing the protobuf, confirm that the serialized `IpnsEntry` bytes sum to less than or equal to [the size limit](#record-size-limit).
2. Confirm `IpnsEntry.signatureV2` and `IpnsEntry.data` are present and are not empty
3. Extract public key
   - Use `IpnsEntry.pubKey` or a cached entry in the local key store, if present.
   - If public key is missing
     - Assume the public key is inlined in the IPNS Name itself (e.g., Ed25519 inlined using `identity` multihash)
     - Confirm Multihash type is `identity`
     - Unmarshall public key from Multihash digest
4. Deserialize `IpnsEntry.data` as a DAG-CBOR document
5. Create bytes for signature verification by concatenating `ipns-signature:` prefix (bytes in hex: `69706e732d7369676e61747572653a`) with raw CBOR bytes from `IpnsEntry.data`
6. Verify the signature in `IpnsEntry.signatureV2` against the concatenated result from the previous step.
7. If `IpnsEntry.signatureV1` or `IpnsEntry.value` is present, confirm the values in `IpnsEntry` protobuf match deserialized ones from `IpnsEntry.data`:
   - `IpnsEntry.value` must match `IpnsEntry.data[Value]`
   - `IpnsEntry.validity` must match `IpnsEntry.data[Validity]`
   - `IpnsEntry.validityType` must match `IpnsEntry.data[ValidityType]`
   - `IpnsEntry.sequence` must match `IpnsEntry.data[Sequence]`
   - `IpnsEntry.ttl` must match `IpnsEntry.data[TTL]`
8. Check `Validity`
   - If `ValidityType` is `0` (EOL) parse the `Validity` as an ASCII string
     that follows notation from :cite[rfc3339]
     (`1970-01-01T00:00:00.000000001Z`) and confirm it is bigger than the
     current time.

Value from `IpnsEntry.signatureV1` MUST never be used for signature verification.
Implementations MUST ensure `IpnsEntry.signatureV2` is used instead.

Value from `IpnsEntry.value` MUST never be used unless it is the same as signed `IpnsEntry.data[Value]`.

## Appendix: Notes for Implementers

### Test Vectors

Below are test vectors in [Record Serialization Format](#record-serialization-format),
along with the expected verification results. The records are valid for 100
years, making them safe for use in CI tests.

1. [V1-only](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5dm4tm0wt8srkg9h9suud4wuiwjimndrkydqm81cqtlb5ak6p7ku_v1.ipns-record) → record invalid
2. [V1+V2](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5dlkw8pxuw9qmqayfdeh4kfebhmreauqdc6a7c3y7d5i9fi8mk9w_v1-v2.ipns-record) (both signatures valid) → record valid, value points at `/ipfs/bafkqaddwgevxmmraojswg33smq`
3. [V1+V2](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5dlmit2tuwdvnx4sbnyqgmvbxftl0eo3f33wwtb9gr7yozae9kpw_v1-v2-broken-v1-value.ipns-record) (both signatures valid, but 'value' is different in V1 pb vs V2 CBOR) → record invalid
4. [V1+V2](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5diamp7qnnvs1p1gzmku3eijkeijs3418j23j077zrkok63xdm8c_v1-v2-broken-signature-v2.ipns-record) (only signatureV1 valid) → record invalid
5. [V1+V2](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5dilgf7gorsh9vcqqq4myo6jd4zmqkuy9pxyxi5fua3uf7axph4y_v1-v2-broken-signature-v1.ipns-record) (only signatureV2 valid) → record valid, value points at `/ipfs/bafkqahtwgevxmmrao5uxi2bamjzg623fnyqhg2lhnzqxi5lsmuqhmmi`
6. [V2-only](https://dweb.link/ipfs/bafybeifkipmlz2fehxda6y7x752uolfed7bdd46jzdammpfga5zrnkq33u/k51qzi5uqu5dit2ku9mutlfgwyz8u730on38kd10m97m36bjt66my99hb6103f_v2.ipns-record) (no V1 fields) → record valid

:::note

Implementers can either write own tests against the above test vectors, or run
[gateway-conformance](https://github.com/ipfs/gateway-conformance/) test suite,
which includes tests for these vectors since
[gateway-conformance/pull/157](https://github.com/ipfs/gateway-conformance/pull/157).

:::

### Integration with IPFS

Below are additional notes for implementers, documenting how IPNS is integrated within IPFS ecosystem.

#### Local Record

This record is stored in the peer's repo datastore and contains the **latest** version of the IPNS record published by the provided key. This record is useful for republishing, as well as tracking the sequence number.
A legacy convention that implementers MAY want to follow is to store serialized `IpnsEntry` under:

**Key format:** `/ipns/base32(<HASH>)`

Note: Base32 according to the :cite[rfc4648].

#### Routing Record

The routing record is spread across the network according to the available routing systems.
The two routing systems currently available in IPFS are the [libp2p Kademlia DHT](https://github.com/libp2p/specs/tree/master/kad-dht) and :cite[ipns-pubsub-router].

**Key format:** `/ipns/BINARY_ID`

- `/ipns/` is the ASCII prefix (bytes in hex: `2f69706e732f`)
- `BINARY_ID` is the binary representation of [IPNS Name](#ipns-name)

As the `pubsub` topics must be `utf-8` for interoperability among different implementations, IPNS over PubSub topics use additional wrapping `/record/base64url-unpadded(key)`

#### Reference Implementations

When language-specific nuances are not covered by this specification, consider
below reference  implementations as the baseline for making decisions around
interoperability.

- <https://github.com/ipfs/boxo/tree/main/ipns>
- <https://github.com/ipfs/js-ipns>
