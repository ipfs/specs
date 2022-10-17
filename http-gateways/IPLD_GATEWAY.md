# IPLD Gateway Specification

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

Resolve IPLD paths to some data.

The path segments will be traversed with any parameters used to transform data along the way.

The `format` query string parameter, or the `Accept` request header can be used to control the format which will be used to return the data.

By default, data will be returned as `dag-json`

<!--
TODO: Cache control semantics?
TODO: Add more details on how the traversal works?
-->

### `HEAD /ipld/{cid}[/{segments}][?{params}]`

Resolves IPLD paths, and yields the same status code and headers as `GET`.

### `POST /ipld/` and `POST /ipld/localhost/`

Upload raw data to IPLD.
The `body` of the request shall be parsed according to the `Content-Type` as IPLD data via standard encodings.
`/localhost/` is used to support `POST ipld://localhost/` for uploading IPLD data to local nodes in web browsers that support it.

The response will contain an `ipld://{cid}/` URL pointing at your data.

<!--
TODO: Only allow `/localhost/`? Get rid of `/localhost` from the spec if light clients with protocol handlers don't matter/
-->

### `PATCH /ipld/{cid}[/{segments}][?{params}]`

This endpoint enables you to apply an [IPLD Patch](https://ipld.io/specs/patch/) to existing IPLD data.

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

### Request Query Parameters

#### `format` (request query parameter)

Optional, `format=<format>` can be used to request specific encodings.

This is a URL-friendly alternative to sending `Accept: application/vnd.ipld.<format>` header, see [Accept](#accept-request-header) for more details.

### Path Segments and Path Segment Parameters

Path segments are used for IPLD data model [traversal](https://ipld.io/docs/data-model/traversal/).
Each segment is separated by a `/` and contains a utf8 `name` followed by an optional set of parameters using the [Matrix URI format](https://www.w3.org/DesignIssues/MatrixURIs.html).

Example:

```
/ipld/bafywhatever/foo/bar;extra=thing;whatever=here/
```

Path segments can have additional parameters added to them by separating them using semicolons (`;`) and having key-value pairs separated by an `=`.
This format is based on the [Matrix URI proposal from the w3c](https://www.w3.org/DesignIssues/MatrixURIs.html).
Note that these parameters are stripped from the segment name when passed to any underlying traversal code.

This spec only perscribes two reserved parameter names: `ADL` for specifying [Advanced Data Layouts](https://ipld.io/docs/advanced-data-layouts/) to process the data with, and `schema` to specify an [IPLD schema](https://ipld.io/docs/schemas/intro/) to use to interpret the data.
Other names may be specified in future specs that build upon this one.

#### ADL (segment parameter)

Segments may contain an `adl` key which points to a name of an [Advanced Data Layout](https://ipld.io/docs/advanced-data-layouts/intro/) to process the node with.

The supported ADL names will vary based on gateway.

An example value would be `;adl=hamt` to specify the [HAMT](https://ipld.io/specs/advanced-data-layouts/hamt/) ADL that's used to represent large maps.

For example `/ipld/bafyreic672jz6huur4c2yekd3uycswe2xfqhjlmtmm5dorb6yoytgflova;adl=hamt/yes` (taken from the HAMT examples), should resolve to the following:

```
[
  {
    "line": 9,
    "column": 501
  }
]
```

#### Schema (segment parameter)

Segments may contain a `schema` key which points to the `CID` of an [IPLD Schema](https://ipld.io/docs/schemas/) in its [DMT](https://ipld.io/specs/schemas/#dsl-vs-dmt) form.
If a `schema` key is provided, there must also be a `type` parameter which references one of the named Types within the IPLD Schema.

The node at that point in the traversal will then be transformed by the schema, and any typed nodes it links to will also be transformed by their respective schemas.

For example, given the following schema (note it is written in DSL form, but must be converted to the DMT in order to be refernced):

```ipldschema
type Example struct {
  Hello String
  Goodbye &NestedExample
} representation tuple

type NestedExample struct {
  region String
} representation tuple
```

The CID for the DMT of this schema is `bafyreibvheoym4avfsjfw63yhsymovm7o54ftcnxwxovqf5xxcbjddanze`

A raw node of type `NestedExample`, whose CID is `bafyreia5mssvef4owvyols2bduwxl6csvlb35oigyj4gc7wm6wzg44udtq`:

```json
['Cyberspace']
```

A raw node of type `Example` which references the first node and whose CID is `bafyreifuyjaq3u3izc7qaf4shh76lk6565e72njgjxtava7q4s7bxheyxa`:

```json
['Hello', {'/': 'bafyreia5mssvef4owvyols2bduwxl6csvlb35oigyj4gc7wm6wzg44udtq'}]
```

We can construct the path `/ipld/bafyreifuyjaq3u3izc7qaf4shh76lk6565e72njgjxtava7q4s7bxheyxa/Goodbye?schema=bafyreibvheoym4avfsjfw63yhsymovm7o54ftcnxwxovqf5xxcbjddanze&type=Example`, or more succinctly `ipld://${cid2}/Goodbye?schema=${schemaCID}&type=Example`.

The resolved node should look like:

```JSON
{
	"region": "Cyberspace"
}
```

#### Escaping / Encoding

IPLD path segments and path segment keys/values may use [escape sequences that follow RFC1738](https://www.rfc-editor.org/rfc/rfc1738) to represent raw values like `/` which would otherwise be interpreted by URL parsers as being structurally significant.

Specifically, any values in path segments that are part of the "reserved" list of characters `";" | "/" | "?" | ":" | "@" | "&" | "="`, or are non-ascii characters, must be escaped when encoding to the path.

For example, path segment name `escape;this` should be escaped to `escape%3Bthis` so that `this` doesn't get accidentally parsed as a parameter.

Similarly, the path segment name `😁` should be escaped to `%F0%9F%98%81`.

## Interaction with URLs

`/ipld/` HTTP paths map directly to `ipld://` URLs.
Similarly, `ipld://` URLs can be mapped back to `/ipld/` paths on the gateway.
This gives us an easy way to convert between URLs within applications and paths on gateways running either locally or remotely.
