---
title: Routing V1 HTTP Delegated Routing Reader Privacy Upgrade
description: >
  This specification describes Delegated Routing Reader Privacy Upgrade. It's an
  incremental improvement to HTTP Delegated Routing API and inherits all of its 
  formats and design rationale. 
date: 2023-05-31
maturity: reliable
editors:
  - name: Andrew Gillis
    github: gammazero
  - name: Ivan Schasny
    github: ischasny 
  - name: Masih Derkani
    github: masih
  - name: Will Scott
    github: willscott
order: 0
tags: ['routing', 'double hashing', 'privacy']
---

This specification describes a new HTTP API for Privacy Preserving Delegated Content Routing provider lookups. It's an extension to HTTP Delegated Routing API and inherits all of its formats and design rationale. 

## API Specification

### Magic Values

 All salts below are 64-bytes long, and represent a string padded with `\x00`.

 - `SALT_DOUBLEHASH = bytes("CR_DOUBLEHASH\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")`
 - `SALT_ENCRYPTIONKEY = bytes("CR_ENCRYPTIONKEY\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")`

 Magic values are needed to calculate different digests from the same value for different purposes. For example a hash of a Multihash that is used for lookups should be different from the one that is used for
 key derivation, even though both are calculated from the same original value. In order to do that the Multihash is concatenated with different magic values before applying the hash funciton - `SALT_DOUBLEHASH`
 for lookups and `SALT_ENCRYPTIONKEY` for key derivation as described in the `Glossary`.

### Glossary

- **`enc`** is [AESGCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) encryption. The following notation will be used for the rest of the specification `enc(passphrase, nonce, payload)`.
- **`hash`** is [SHA256](https://en.wikipedia.org/wiki/SHA-2) hashing.
- **`||`** is concatenation of two values.
- **`deriveKey`** is deriving a 32-byte encryption key from a passphrase that is done as `hash(SALT_ENCRYPTIONKEY || passphrase)`.
- **`CID`** is the [Content IDentifier](https://github.com/multiformats/cid).
- **`MH`** is the [Multihash](https://github.com/multiformats/multihash) contained in a `CID`. It corresponds to the 
digest of a hash function over some content.
- **`HASH2`** is a second hash over the multihash. Second Hashes must be of `Multihash` format with `DBL_SHA_256` codec. 
The digest must be calculated as `hash(SALT_DOUBLEHASH || MH)`.
- **`ProviderRecord`** is a JSON with Provider Record as described in the [HTTP Delegated Routing Specification](http-routing-v1.md).
- **`ProviderRecordKey`** is a concatentation of `peerID || contextID`. There is no need for explicitly encoding lengths as they are
already encoded as a part of the multihash format. Max `contextID` length is 64 bytes.
- **`EncProviderRecordKey`** is `Nonce || enc(deriveKey(multihash), Nonce, ProviderRecordKey)`. Max `EncProviderRecordKey` is 200 bytes. 
- **`HashProviderRecordKey`**  is a hash over `ProviderRecordKey` that must be calculated as `hash(SALT_DOUBLEHASH || ProviderRecordKey)`.
- **`Metadata`** is free form bytes that can represent such information such as IPNI metadata. Max `Metadata` length is 1024 bytes. 
- **`EncMetadata`** is `Nonce || enc(deriveKey(ProviderRecordKey), Nonce, Metadata)`. Max `EncMetadata` length is 2000 bytes.

:::note

Maximum allowed lengths might change without incrementing the API version. Such fields as `contextID` or `Metadata` are free-form bytes and
their maximum lengths can be changed in the underlying protocols. 

:::

### API
#### `GET /routing/v1/encrypted/providers/{HASH2}`

##### Response codes

- `200` (OK): the response body contains 1 or more records
- `404` (Not Found): must be returned if no matching records are found
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints

##### Response Body

```json
{
    "EncProviderRecordKeys": [
        "EBxdYDhd.....",
        "IOknr9DK.....",
    ]
}
```

Where:

- `EncProviderRecordKeys` a list of base64 encoded `EncProviderRecordKey`;

#### `GET /routing/v1/encrypted/metadata/{HashProviderRecordKey}`

##### Response codes

- `200` (OK): the response body contains 1 record
- `404` (Not Found): must be returned if no matching records are found
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints

##### Response Body

```json
{
    "EncMetadata": "EBxdYDhd....."
}
```

Where:

- `EncMetadatas` is base64 encoded `EncMetadata`;

### Notes

Assembling a full `ProviderRecord` from the encrypted data will require multiple roundtrips to the server. The first one to fetch a list of `EncProviderRecordKey`s and then one per  
`EncProviderRecordKey` to fetch `EncMetadata`. In order to reduce the number of roundtrips to one the client implementation should use the local libp2p peerstore for multiaddress discovery
and [libp2p multistream select](https://github.com/multiformats/multistream-select) for protocol negotiation.