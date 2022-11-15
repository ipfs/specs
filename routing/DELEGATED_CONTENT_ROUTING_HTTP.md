# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Delegated Content Routing HTTP API

**Author(s)**:
- Gus Eggert

**Maintainer(s)**:

* * *

**Abstract**

"Delegated content routing" is a mechanism for IPFS implementations to use for offloading content routing to another process/server. This spec describes an HTTP API for delegated content routing.

# API Specification
The Delegated Content Routing Routing HTTP API uses the `application/json` content type by default. 

As such, human-readable encodings of types are preferred. This spec may be updated in the future with a compact `application/cbor` encoding, in which case compact encodings of the various types would be used.

## Common Data Types:

- CIDs are always string-encoded using a [multibase](https://github.com/multiformats/multibase)-encoded [CIDv1](https://github.com/multiformats/cid#cidv1).
- Multiaddrs are string-encoded according to the [human-readable multiaddr specification](https://github.com/multiformats/multiaddr#specification)
- Peer IDs are string-encoded according [PeerID string representation specification](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#string-representation)
- Multibase bytes are string-encoded according to [the Multibase spec](https://github.com/multiformats/multibase), and *should* use Base64.
- Timestamps are Unix millisecond epoch timestamps

Until required for business logic, servers should treat these types as opaque strings, and should preserve unknown JSON fields.

### Versioning
This API uses a standard version prefix in the path, such as `/v1/...`. If a backwards-incompatible change must be made, then the version number should be increased.

### Provider Records
A provider record contains information about a content provider, including the transfer protocol and any protocol-specific information useful for fetching the content from the provider.

The information required to write a record to a router (*"write" provider records*) may be different than the information contained when reading provider records (*"read" provider records*).

For example, indexers may require a signature in `bitswap` write records for authentication of the peer contained in the record, but the read records may not include this authentication information.

Both read and write provider records have a minimal required schema as follows:

```json
{
    "Protocol": "<transfer_protocol_name>",
    ...
}
```

where:

- `Protocol` is the name of a transfer protocol
  - these typically map to multicodec codes (such as bitswap => 2304)
  - these don't use multicodec codes directly to allow for versioning of provider records, e.g. to allow for "bitswap-v2" provider records (which would also map to 2304 code but with different schema/semantics)
- `...` denotes opaque JSON, which may contain information specific to the transfer protocol

Specifications for some transfer protocols are provided in the "Transfer Protocols" section.


## API
### `GET /routing/v1/providers/{CID}`
- Response codes
  - `200`: the response body contains 0 or more records
  - `404`: must be returned if no matching records are found
  - `422`: request does not conform to schema or semantic constraints
- Response Body
```json
{
    "Providers": [
        {
            "Protocol": "<protocol_name>",
            ...
        }
    ]
}
```
        
- Default limit: 100 providers
- Optional query parameters
  - `transfer` only return providers who support the passed transfer protocols, expressed as a comma-separated list of transfer protocol names such as `transfer=bitswap,filecoin-graphsync-v1`
  - `transport` for provider records with multiaddrs, only return records with multiaddrs explicitly supporting the passed transport protocols, encoded as decimal multicodec codes such as `transport=460,478` (`/quic` and `/tls/ws` respectively)
- Implements pagination according to the Pagination section

Each object in the `Providers` list is a *read provider record*.

- `PUT /routing/v1/providers`
  - Response Codes
    - `200`: the server processed the full list of provider records (possibly unsuccessfully, depending on the semantics of the particular records)
  - Request Body
```json
{
    "Keys": ["cid1", "cid2"],
    "Providers": [
        {
            "Protocol": "bitswap",
            ...
        }
    ]
}
```

Each object in the `Providers` list is a *write provider record*.

  - Response Body
```json
{
    "ProvideResults": [
        { ... }
    ]
}
```
- `ProvideResults` is a list of results in the same order as the `Providers` in the request, and the schema of each object is determined by the `Protocol` of the corresponding write object (called "Write Provider Records Response" in the Known Transfer Protocols section)
  - This may contain output information such as TTLs, errors, etc.
  - It is undefined whether the server will allow partial results
- The work for processing each provider record should be idempotent so that it can be retried without excessive cost in the case of full or partial failure of the request
- Default limit of 100 keys per request
- Implements pagination according to the Pagination section

## Pagination

APIs that return collections of results should support pagination as follows:

- If there are more results, then a `NextPageToken` field should include an opaque string value, otherwise it should be undefined
- The value of `NextPageToken` can be specified as the value of a `pageToken` query parameter to fetch the next page
  - Character set is restricted to the regex `[a-zA-Z0-9-_.~]+`, since this is intended to be used in URLs
- The client continues this process until `NextPageToken` is undefined or doesn't care to continue
- A `pageLimit` query parameter specifies the maximum size of a single page

### Implementation Notes
Servers are required to return *at most* `pageLimit` results in a page. It is recommended for pages to be as dense as possible, but it is acceptable for them to return any number of items in the closed interval [0, pageLimit]. This is dependent on the capabilities of the backing database implementation. For example, a query specifying a `transfer` filter for a rare transfer protocol should not *require* the server to perform a very expensive database query for a single request. Instead, this is left to the server implementation to decide based on the constraints of the database.

Implementations should encode into the token whatever information is necessary for fetching the next page. This could be a base32-encoded JSON object like `{"offset":3,"limit":10}`, an object ID of the last scanned item, etc.

## Error Codes

- `501`: must be returned if a method/path is not supported
- `429`: may be returned to indicate to the caller that it is issuing requests too quickly
- `400`: must be returned if an unknown path is requested

## Known Transfer Protocols
This section contains a non-exhaustive list of known transfer protocols (by name) that may be supported by clients and servers.

### bitswap
Multicodec code: 0x0900

#### Read Provider Records

```json
{
    "Protocol": "bitswap",
    "ID": "12D3K...",
    "Addrs": ["/ip4/..."]
}
```

- `ID`: the [Peer ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md) to contact
- `Addrs`: a list of known multiaddrs for the peer
  - This list may be incomplete or incorrect and should only be treated as *hints* to improve performance by avoiding extra peer lookups

The server should respect a passed `transport` query parameter by filtering against the `Addrs` list.


#### Write Provider Records

```json
{
    "Protocol": "bitswap",
    "Signature": "<signature>",
    "Payload": "<payload>"
}
```

- `Signature`: a multibase-encoded signature of the sha256 hash of the `Payload` field, signed using the private key of the Peer ID specified in the `Payload` JSON
  - Servers may ignore this field if they do not require signature verification
- `Payload`: a string containing a serialized JSON object which conforms with the following schema:
```json
{
    "Keys": ["cid1", "cid2"],
    "Timestamp": 0,
    "AdvisoryTTL": 0,
    "ID": "12D3K...",
    "Addrs": ["/ip4/..."],
}
```
  - `Keys` is a list of the CIDs being provided
  - `Timestamp` is the current time
  - `AdvisoryTTL` is the time by which the caller expects the server to keep the record available
    - If this value is unknown, the caller may use a value of 0
  - `ID` is the peer ID that was used to sign the record
  - `Addrs` is a list of string-encoded multiaddrs

A 403 response code should be returned if the signature check fails.

Note that this only supports Peer IDs expressed as identity multihashes. Peer IDs with older key types that exceed 42 bytes are not verifiable since they only contain a hash of the key, not the key itself. Normally, if the Peer ID contains only a hash of the key, then the key is obtained out-of-band (e.g. by fetching the block via IPFS). If support for these Peer IDs is needed in the future, this spec can be updated to allow the client to provide the key and key type out-of-band by adding optional `PublicKey` and `PublicKeyType` fields, and if the Peer ID is a CID, then the server can verify the public key's authenticity against the CID, and then proceed with the rest of the verification scheme.

The `Payload` field is a string, not a proper JSON object, to prevent its contents from being accidentally parsed and re-encoded by intermediaries, which may change the order of JSON fields and thus cause the record to fail validation.

#### Write Provider Records Response
```json
{
    "AdvisoryTTL": 0
}
```

- `AdvisoryTTL` is the time at which the server expects itself to drop the record
  - If less than the `AdvisoryTTL` in the request, then the client should re-issue the request by that point
  - If greater than the `AdvisoryTTL` in the request, then the server expects the client to be responsible for the content for up to that amount of time (TODO: this is ambiguous)
  - If 0, the server makes no claims about the lifetime of the record


### filecoin-graphsync-v1
Multicodec code: 0x0910

#### Read Provider Records

```json
{
    "Protocol": "filecoin-graphsync-v1",
    "PieceCID": "<cid>",
    "VerifiedDeal": true,
    "FastRetrieval": true
}
```

- `PieceCID`:
- `VerifiedDeal`:
- `FastRetrieval`:

#### Write Provider Records

There is currently no specified schema.
