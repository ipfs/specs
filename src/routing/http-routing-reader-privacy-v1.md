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
 - `SALT_NONCE = bytes("CR_NONCE\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")`

### Glossary

- **`enc`** is [AESGCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) encryption. The following notation will be used for the rest of the specification `enc(passphrase, nonce, payload)`.
- **`hash`** is [SHA256](https://en.wikipedia.org/wiki/SHA-2) hashing.
- **`||`** is concatenation of two values.
- **`deriveKey`** is deriving a 32-byte encryption key from a passphrase that is done as `hash(SALT_ENCRYPTIONKEY || passphrase)`.
- **`Nonce`** is a 12-byte nonce used as Initialization Vector (IV) for the AESGCM encryption. IPNI expects an explicit instruction to delete a record (comparing to the DHT where records expire).
Hence the IPNI server needs to be able to compare encrypted values without having to decrypt them as that would require a key that it is unaware of.
That means that the nonce has to be deterministically chosen so that `enc(passphrase, nonce, payload)` produces the same output for the same 
`passpharase` + `payload` pair. Nonce must be calculated as `hash(SALT_NONCE || passphrase || len(payload) || payload)[:12]`, where `len(payload)` is 
an 8-byte length of the `payload` encoded in Little Endian format. Choice of nonce is not enforced by the IPNI specification. The described approach will 
be used while IPNI encrypts Advertisements on behaf of Publishers. However once Writer Privacy is implemented, the choice of nonce will be left up to the Publisher. 
- **`CID`** is the [Content IDentifier](https://github.com/multiformats/cid).
- **`MH`** is the [Multihash](https://github.com/multiformats/multihash) contained in a `CID`. It corresponds to the 
digest of a hash function over some content. `MH` is represented as a 32-byte array.
- **`HASH2`** is a second hash over the multihash. Second Hashes must be of `Multihash` format with `DBL_SHA_256` codec. 
The digest must be calculated as `hash(SALT_DOUBLEHASH || MH)`.
- **`ProviderRecord`** is a Provider Record as described in the [HTTP Delegated Routing Specification](http-routing-v1.md).
- **`ProviderRecordKey`** is a concatentation of `peerID || contextID`. There is no need for explicitly encoding lengths as they are
already encoded as a part of the multihash format. 
- **`EncProviderRecordKey`** is `Nonce || enc(deriveKey(multihash), Nonce, ProviderRecordKey)`.
- **`HashProviderRecordKey`**  is a hash over `ProviderRecordKey` that must be calculated as `hash(SALT_DOUBLEHASH || ProviderRecordKey)`.
- **`Metadata`** is free form bytes that can represent such information such as IPNI metadata.
- **`EncMetadata`** is `Nonce || enc(deriveKey(ProviderRecordKey), Nonce, Metadata)`.

### API

Assembling a full `ProviderRecord` from the encrypted data will require multiple roundtrips to the server. The first one to fetch a list of `EncProviderRecordKey`s and then one per  
`EncProviderRecordKey` to fetch `EncMetadata`. In order to reduce the number of roundtrips to one the client implementation should use the local libp2p peerstore for multiaddress discovery
and [libp2p multistream select](https://github.com/multiformats/multistream-select) for protocol negotiation.

#### `GET /routing/v1/encrypted/providers/{HASH2}`

##### Response codes

- `200` (OK): the response body contains 0 or more records
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

- `EncProviderRecordKeys` a list of base58 encoded `EncProviderRecordKey`;

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

- `EncMetadatas` is base58 encoded `EncMetadata`;

