---
title: Routing V1 HTTP Delegated Routing Reader Privacy Upgrade
description: >
  This specification outlines the Delegated Routing Reader Privacy Upgrade, representing an incremental enhancement to the HTTP Delegated Routing API. It seamlessly integrates with the existing API, adopting its formats and design principles, to ensure continuity and coherence while offering improved privacy protections.
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
order: 1
tags: [ 'routing', 'double hashing', 'privacy' ]
---

This specification details the implementation of a new HTTP API for Privacy Preserving Delegated Content Routing provider lookups. It represents an expansion of the HTTP Delegated Routing API, embracing its formats and design principles.

## API Specification

### Magic Values

All salts below are 64-bytes long and represent a string padded with `\x00`.

- `SALT_DOUBLEHASH`: The string value `CR_DOUBLEHASH`, where each if the 13 characters are represented by their byte value. The remainder of the 64 bytes is filled with null bytes represented by `\x00`. This results in 51 null bytes after the `CR_DOUBLEHASH` string. The following illustrates its corresponding byte frame diagram:

  ```
  +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
  | C | R | _ | D | O | U | B | L | E | H | A | S | H | \x00...\x00 |
  +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
  <---------------------------- 64 Bytes --------------------------->
  ```
  For reference, the following snippet represents the hex dump of the above, where each character of `CR_DOUBLEHASH` is represented by its ASCII hexadecimal equivalent, and the null bytes are represented by "00":

  ```
  43 52 5F 44 4F 55 42 4C 45 48 41 53 48 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  ```

- `SALT_ENCRYPTIONKEY`: The string value `CR_ENCRYPTIONKEY`, where each if the 15 characters are represented by their byte value. The remainder of the 64 bytes is filled with null bytes represented by `\x00`. This results in 49 null bytes after the `CR_ENCRYPTIONKEY` string. The following illustrates its corresponding byte frame diagram:

  ```
  +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
  | C | R | _ | E | N | C | R | Y | P | T | I | O | N | K | E | Y |
  +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
  | \x00...\x00 |
  +---+---+---+
  <---------------------------- 64 Bytes --------------------------->
  ```
  For reference, the following snippet represents the hex dump of the above, where each character of `CR_ENCRYPTIONKEY` is represented by its ASCII hexadecimal equivalent, and the null bytes are represented by "00":

  ```
  43 52 5F 45 4E 43 52 59 50 54 49 4F 4E 4B 45 59 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  ```

These magic values are utilized to compute distinct digests from identical values for varying purposes. For instance, a hash of a Multihash employed for lookups should differ from the one used for key derivation, despite originating from the same value. To achieve this, the Multihash is concatenated with different magic values before applying the hash function: `SALT_DOUBLEHASH` for lookups and `SALT_ENCRYPTIONKEY` for key derivation as elaborated in the `Glossary`.

### Glossary

- **`enc`** refers to [AESGCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) encryption. The notation `enc(passphrase, nonce, payload)` will be used henceforth in this specification.
- **`hash`** denotes [SHA256](https://en.wikipedia.org/wiki/SHA-2) hashing.
- **`||`** signifies concatenation of two values.
- **`deriveKey`** pertains to the derivation of a 32-byte encryption key from a passphrase, performed as `hash(SALT_ENCRYPTIONKEY || passphrase)`.
- **`CID`** stands for [Content IDentifier](https://github.com/multiformats/cid).
- **`MH`** refers to the [Multihash](https://github.com/multiformats/multihash) contained in a `CID`. It corresponds to the hash function's digest over certain content.
- **`HASH2`** is a second hash over the multihash. Second Hashes must follow the `Multihash` format with `SHA2_256` codec. The digest must be calculated as `hash(SALT_DOUBLEHASH || MH)`.
- **`ProviderRecord`** is a JSON with Provider Record as described in the [HTTP Delegated Routing Specification](http-routing-v1.md).
- **`ProviderRecordKey`** is a concatenation of `peerID || contextID`. Explicit encoding lengths are unnecessary as they are inherently encoded as part of the multihash format. Max `contextID` length is 64 bytes.
- **`EncProviderRecordKey`** is `Nonce || enc(deriveKey(multihash), Nonce, ProviderRecordKey)`. Max `EncProviderRecordKey` is 200 bytes.
- **`HashProviderRecordKey`**  is a hash over `ProviderRecordKey`, calculated as `hash(SALT_DOUBLEHASH || ProviderRecordKey)`.
- **`Metadata`** are free-form bytes that can represent such information such as IPNI metadata. Max `Metadata` length is 1024 bytes.
- **`EncMetadata`** is `Nonce || enc(deriveKey(ProviderRecordKey), Nonce, Metadata)`. Max `EncMetadata` length is 2000 bytes.

:::note
Maximum allowed lengths may change without incrementing the API version. Such fields as `contextID` or `Metadata` are free-form bytes and their maximum lengths can be altered in the underlying protocols.
:::

### API
#### `GET /routing/v1/encrypted/providers/{HASH2}`

##### Response codes

- `200` (OK): the response body contains one or more records
- `404` (Not Found): must be returned if no matching records are found
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints

##### Response Body

```json
{
    "EncProviderRecordKeys": [
        "EBxdYDhd.....",
        "IOknr9DK....."
    ]
}


```

Where:

- `EncProviderRecordKeys` is a list of base64 encoded `EncProviderRecordKey`;

#### `GET /routing/v1/encrypted/metadata/{HashProviderRecordKey}`

##### Response codes

- `200` (OK): the response body contains one record
- `404` (Not Found): must be returned if no matching records are found
- `422` (Unprocessable Entity): request does not conform to schema or semantic constraints

##### Response Body

```json
{
    "EncMetadata": "EBxdYDhd....."
}
```

Where:

- `EncMetadata` is a base64 encoded `EncMetadata`;

### Notes

Assembling a full `ProviderRecord` from the encrypted data requires multiple server roundtrips. The first fetches a list of `EncProviderRecordKey`s, followed by one for each `EncProviderRecordKey` to retrieve `EncMetadata`. To minimize the number of roundtrips to one, the client implementation should use the local libp2p peerstore for multiaddress discovery and [libp2p multistream select](https://github.com/multiformats/multistream-select) for protocol negotiation.
