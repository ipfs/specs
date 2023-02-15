---
title: Delegated IPNS HTTP API
description: >
  Delegated IPNS is a mechanism for IPFS implementations to offload naming system to another process
  or server. This includes naming resolution as well as publication of new naming records. This
  document describes an HTTP API through which such functionality is facilitated.
date: 2023-03-22
maturity: wip
editors:
  - name: Masih H. Derkani
    github: masih
order: 0
tags: ['routing']
---

Delegated IPNS is a mechanism for IPFS implementations to offload naming system to another process
or server. This includes naming resolution as well as publication of new naming records. This
document describes an HTTP API through which such functionality is facilitated.

## API Specification

The Delegated IPNS HTTP API uses the `application/json` content type by default.

As such, human-readable encodings of types are preferred. This spec may be updated in the future
with a compact `application/cbor` encoding, in which case compact encodings of the various types
would be used.

## Common Data Types

### IPNS Record

The following snippet outlines the JSON schema of IPNS records:

```json
{
  "Signature": "<signature>",
  "Payload": {
    "Value": "<value>",
    "Sequence": 0,
    "Validity": {
      "EOL": {
        "Timestamp": 0,
        "AdvisoryTTL": 0
      }
    },
    "PublicKey": "<optional-public-key>",
    "ExtendedData": {}
  }
}
```

Where:

- `Signature` is the multibase-encoded signature of the sha256 hash of the `Payload` field, signed
  using the private key that corresponds to the `PublicKey` in the `Payload` if present. And
  Otherwise, the private key associcated to the IPNS record key. Signing details for specific key
  types should
  follow [libp2p/peerid specs](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#key-types),
  unless stated otherwise.
- `Payload` is the content of the IPNS record as specified
  by :cite[ipns-record] specification:
- `Value` is the string representation of the IPNS path,
  e.g. `ipns/{ipns-key}`, `/ipns/example.com`, `/ipfs/baf...`, etc.
- `Sequence` represents the current version of the record starting from `0`.
- `Validity` captures the mechanism by which the record is validated. Each validity type reserves a
  field key under this object.
  - `EOL` donates that the validity type is EOL, containing:
    - `Timestamp` represents the time in the future at which the record expires with nanoseconds
       precision represented as an ASCII string that follows notation
       from :cite[rfc3339].
    - `AdvisoryTTL` represents an optional field that hints at how long the record should be
       cached.
- `PublicKey` represents the optional public key used to sign the record. This field is only
  required if it cannot be extracted from the IPNS name, e.g. in the case of legacy RSA keys.
- `ExtendedData` represents the extensible data as arbitrary JSON object.

## Versioning

The path predix `/v1` donates the version number of the HTTP API. Backwards-incompatible change must
increment the version number.

## API

### `GET /naming/v1/records/{ipns-name}`

**Path Parameters**

- `ipns-name` the IPNS name to resolve.

**Response Status Codes**

- `200` (OK): indicates that the response body containing the IPNS record that corresponds to the
  IPNS name.
- `404` (Not Found): indicates that no matching records are found.
- `400` (Bad Request): indicates that the given IPNS name is not valid.
- `429` (Too Many Requests): indicates that the caller is issuing requests too many request and may
  retry after the time specified
  at [Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) response
  header has elapsed.
- `501` (Not Implemented): indicates that the server does not support resolution of IPNS records

**Response Body**

The response body contains the [IPNS record](#ipns-record).

```json
{
  "Signature": "<signature>",
  "Payload": {
    "Value": "<value>",
    "Sequence": 0,
    "Validity": {
      "EOL": {
        "Timestamp": 0,
        "AdvisoryTTL": 0
      }
    },
    "PublicKey": "<optional-public-key>",
    "ExtendedData": {}
  }
}
```

### `PUT /naming/v1/records/{ipns-name}`

**Path Parameters**

- `ipns-name` the IPNS name to publish. The name must match `Value` in request body.

**Request Body**

```json
{
  "Signature": "<signature>",
  "Payload": {
    "Value": "<value>",
    "Sequence": 0,
    "Validity": {
      "EOL": {
        "Timestamp": 0,
        "AdvisoryTTL": 0
      }
    },
    "PublicKey": "<optional-public-key>",
    "ExtendedData": {}
  }
}
```

**Response Status Codes**

- `200` (OK): indicates that the response body containing the IPNS record that corresponds to the
  IPNS name.
- `404` (Not Found): indicates that no matching records are found.
- `400` (Bad Request): indicates that the given IPNS record is not valid.
- `429` (Too Many Requests): indicates that the caller is issuing requests too many request and may
  retry after the time specified
  at [Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) response
  header has elapsed.
- `501` (Not Implemented): indicates that the server does not support publication of IPNS records

## CORS and Web Browsers

Browser interoperability requires implementations to support
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

JavaScript client running on a third-party Origin must be able to send HTTP request to the endpoints
defined in this specification, and read the received values. This means HTTP server implementing
this API must:

1. support [CORS preflight requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request) sent as HTTP OPTIONS, and
2. always respond with headers that remove CORS limits, allowing every site to query the API for results:

```plaintext
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, PUT, OPTIONS
```
