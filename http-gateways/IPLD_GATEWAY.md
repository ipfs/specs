# IPLD Gateway Specification

https://github.com/ipfs/specs/blob/e06249febd4b819149039ad8c8719566a4bc113e/http-gateways/PATH_GATEWAY.md#denylists

**Authors**:

- Mauve Signweaver ([@RangerMauve](https://github.com/RangerMauve))

----

**Abstract**

IPLD Gateway is an extension of [PATH_GATEWAY.md](./PATH_GATEWAY.md) that enables lower level interaction with IPLD data structures under a specific path.

This document describes the delta between [PATH_GATEWAY.md](./PATH_GATEWAY.md) and this gateway type.

Summary:

- Adds a new `/ipld/{cid}[/{segments}][?{params}]` subpath to the gateway
- Defines a specification for parsing out extra parameters for individual path segments.
- Describes how to map to and from `ipld://` URLs

## HTTP API

### `GET /ipld/{cid}[/{segments}][?{params}]`
### `HEAD /ipld/{cid}[/{segments}][?{params}]`
### `POST /ipld/` and `POST /ipld/localhost/`

Upload raw data to IPLD.
The `body` of the request shall be parsed according to the `Content-Type` as IPLD data via standard encodings.
`/localhost/` is used to support `POST ipld://localhost/` for uploading IPLD data to local nodes in web browsers that support it.

The response will contain an `ipld://{cid}/` URL pointing at your data.

<!--
TODO: Only allow `/localhost/`? Get rid of `/localhost` from the spec if light clients with protocol handlers don't matter/
-->

### `PUT /ipld/{cid}[/{segments}][?{params}]`

<!--
TODO: How does adding data work?
TODO: Create intermediate nodes or error?
TODO: Mention interaction with ADLs/Schemeas/Selectors
-->

### `PATCH /ipld/{cid}[/{segments}][?{params}]`

This endpoint enables you to apply a [patch set](https://ipld.io/specs/patch/) to existing IPLD data.

<!--
TODO: Talk about content encoding
TODO: Mention interaction with ADLs/Schemeas/Selectors
-->

The response will be an `ipld://` URL with your updated data.

Note that the CID in the response URL will contain the same `segments` as in the request URL.
e.g. if you patch data at `ipld://{cid1}/some/path/`, you will get back a URL that looks like `ipld://{updated cid}/some/path/`
This enables you to make complex changes to a subtree in a dataset and get back a new root CID to use in your application.

## HTTP Request

### Request Headers

#### `Accept` (request header)

For `/ipld/{cid}/*` paths, the `Accept` header is used to indicate the encoding that should be used to return the data.
This means that data initially encoded as `dag-json` will be transcoded to `dag-cbor` if the `application/vnd.ipld.dag-cbor` Accept header is used.

- `application/json`: Interpret in the same way as `application/vnd.ipld.dag-json`.
- `application/vnd.ipld.dag-json`: Return the block specified by the path encoded in `dag-json`.
- `application/vnd.ipld.dag-cbor`: Return the block specified by the path ecnoded in `dag-cbor`.

If no `Accept` header is present in the request, it will be assumed to be `application/vnd.ipld.dag-json`.

#### `Content-Type` (request header)

This header applies to `PUT/POST/PATCH` requests for `/ipld/*` paths on IPLD gateways which also support the [writable gateways spec](./WRITABLE_GATEWAY.md).
Including it will hint to the writable IPLD gateway which encoding to use to parse the request body into the IPLD Data Model.

- `application/json`: Interpret in the same way as `application/vnd.ipld.dag-json`.
- `application/vnd.ipld.dag-json`: Return the block specified by the path encoded in `dag-json`.
- `application/vnd.ipld.dag-cbor`: Return the block specified by the path ecnoded in `dag-cbor`.

### Path Segments

### Path Segment Parameters

#### ADL (segment parameter)

<--
TODO: Hardcoded list of ADLs we support?
TODO: Eventually link out to some ADL definition?
-->

#### Schema (segment parameter)

<!--
TODO: `ipld://` URLs pointing to schema?
TODO: `data:` URIs for inline JSON?
-->

## Interaction with URLs

`/ipld/` HTTP paths map directly to `ipld://` URLs.
Similarly, `ipld://` URLs can be mapped back to `/ipld/` paths on the gateway.
This gives us an easy way to convert between URLs within applications and paths on gateways running either locally or remotely.
