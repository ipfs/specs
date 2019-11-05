# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) HTTP API <!-- omit in toc -->

**Author(s)**:
- Alex Potsides

**Maintainer(s)**:
- Alex Potsides

* * *

## Abstract <!-- omit in toc -->

An IPFS node presents an HTTP API that allows clients to connect and control a running IPFS daemon.

This specification describes the HTTP API - it's resources, arguments, behaviour and conventions.

## Table of Contents <!-- omit in toc -->

- [Description](#description)
  - [Request and response types](#request-and-response-types)
  - [Alternative representations](#alternative-representations)
  - [Streams](#streams)
  - [Batches](#batches)
  - [Errors](#errors)
    - [Data types](#data-types)
  - [HTTP Verbs](#http-verbs)
  - [Resource names](#resource-names)
  - [Response codes](#response-codes)
- [Resources](#resources)
  - [`/api/v1/files`](#apiv1files)
    - [Paths](#paths)
    - [Data types](#data-types-1)
    - [POST `/api/v1/files[/{path}]`](#post-apiv1filespath)
      - [Query string](#query-string)
    - [GET `/api/v1/files/{path}`](#get-apiv1filespath)
      - [Query string](#query-string-1)
    - [PATCH `/api/v1/files/{path}`](#patch-apiv1filespath)
      - [Query string](#query-string-2)
    - [PUT `/api/v1/files/{path}`](#put-apiv1filespath)
    - [DELETE `/api/v1/files/ipfs/{path}`](#delete-apiv1filesipfspath)

## Description

The IPFS HTTP API is made up of several HTTP resources which allow interactions with a remote IPFS node.  We attempt to adhere to [`REST`](https://en.wikipedia.org/wiki/Representational_state_transfer) principals where possible.

Where properties of objects are mandatory, they are indicated by the keywords **must** or **will**.  E.g. 'the response must include the property "foo"'.  Where they are optional they are indicated by the keyword **may**.  E.g. 'the response may include the property "foo"'.

### Request and response types

All requests must specify a `content-type` header which describes the type of request being sent and an `accepts` header which describes the type of response that is expected.

A server implementation must respect these headers wherever possible.  If it is not possible a `406 Not Acceptable` response must be sent.

Example:

```
content-type: application/ipfs-unixfs-v1-file; charset=UTF-8

{ "path": "/foo", "cid": "bafyFile" }
```

Responses will be accompanied by a `200` HTTP status code, unless there is no response body in which case `204` will be returned.

### Alternative representations

The default representation for entities is `json` encoded in `UTF-8`.

Others may be supported and can be chosen by the client by appending a `representation` accept-extension to the `accept` header in accordance with [RFC2616].

If a server implementation does not implement the requested representation a `406 Not Acceptable` response must be sent.

Example:

```
GET /resource HTTP/1.1
accept: application/ipfs-unixfs-v1-file; representation=cbor
```
```
HTTP/1.1 200 OK
content-type: application/ipfs-unixfs-v1-file; representation=cbor

... binary data
```

### Streams

Any request or response can be a stream, in which case the request/response body must be specified as a [multipart](https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html) message.

Example:

```
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-file; charset=UTF-8

{ "path": "/foo", "cid": "bafyfoo" }
--boundary--
```

### Batches

Any request or response type can be a batch, this means the request/response entity will be an array containing one or more entries.  It will be indicated by appending an `enclosure` parameter to the content type in accordance with [RFC1341].

The list type will be specific to the representation.  E.g. `json` objects will be wrapped in an array, `xml` objects will be wrapped in an element, etc.

Example:

```
content-type: application/ipfs-unixfs-v1-file; charset=UTF-8; enclosure=list

[
  { "path": "/foo", "cid": "bafyfoo"' }
]
```

Where Alternative Representations have been requested by the client, a `representation` parameter must be used in the `content-type` header in accordance with [RFC1341].

Example:

```
content-type: application/ipfs-unixfs-v1-file; enclosure=list; representation=xml

<ipfs-files>
  <ipfs-file>
    <path>/foo</path>
    <cid>bafyfoo</cid>
  </ipfs-file>
</ipfs-files>
```

### Errors

Errors must include a `code` property and may include a `message` and a `stack` property.  The `stack` property should not be present in production deployments.  The `message` property may be shown to users, though clients are recommended to do their own translations into the users' locale based on the `code` property.

Where processing a request to a resource has resulted in a failure, the error must be shown to the user in place of the expected response.

The only exception to this is streaming responses where errors may be added to the output stream.

If an error is added to the output stream, a final multipart boundary will be added and then the response will end and no more data will be sent.

Example:

> An error during a non-streaming resource response

```
content-type: application/ipfs-error-v1; charset=UTF-8

{ "message": "An unknown error occured", "code": "ERR_UNKNOWN_ERROR", "stack": [ "line1", "line2", "line3" ] }
```

Example:

> An error during a stream

```
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-file

{ "path": "/foo", "cid": "bafyfoo"' }
--boundary
content-type: application/ipfs-error-v1; charset=UTF-8

{ "message": "An unknown error occured", "code": "ERR_UNKNOWN_ERROR", "stack": [ "line1", "line2", "line3" ] }
--boundary
```

#### Data types

 * `application/ipfs-error-v1`

```
{
  code: String  // an error code
  message: String  // an optional description of the error
  stack: Array[String]  // an optional stack trace of where the error occured
}
```

### HTTP Verbs

Supported HTTP verbs are interpreted to mean the following:

* `GET` Retrieve a resource
* `POST` Create a resource
* `PUT` Replace a resource
* `PATCH` Update a resource by sending a partial resource
* `DELETE` Remove a resource
* `OPTIONS` Retrieve a list of verbs applicable to a given resource
* `HEAD` Retrieve resource metadata

### Resource names

Where a resource is one of many, they are specified using plural names and an identifier (unless creating a new resource).

E.g.

```
POST /files
GET /files/bafyFile
```

Where a resource is a singleton, it is specified using singular names.  Creating new singleton resources is disallowed and a `403 Forbidden` response must be returned.

E.g.

```
GET /config
PATCH /config

POST /config // returns 403 Forbidden
```

### Response codes

If a request cannot be processed an appropriate HTTP status code must be returned.

If the fault is on the part of the client (e.g. parameter validation failed or the request was otherwise invalid, etc), a `4xx` series status should be returned.

If the fault is on the part of the API (e.g. a network failure or an error condition due to misconfiguration, etc) a `5xx` series status should be returned.

In some cases specific status codes will indicate certain request outcomes and must be returned, these will be noted in the `Resources` section below.

## Resources

### `/api/v1/files`

The `files` resource allows interactions with IPFS filesystems.

#### Paths

All `files` operations take a path which can be an IPFS path (e.g. `/ipfs/bafyFile` or `/ipfs/bafyDir/file.txt`) or an [MFS] path (e.g. `/path/to/file`).

Where conflicts arise, the IPFS path takes priority.

Path components are separate by a forward slash `/` character.  Individual components must be URI Encoded in accordance with [RFC3986].

#### Data types

 * `application/ipfs-unixfs-v1-file`

```
{
  path: String  // the path of the file
  cid: CID, // the CID of the file
  size: int // the size of the file
}
```

 * `application/ipfs-unixfs-v1-directory`

```
{
  path: String  // the path of the file
  cid: CID, // the CID of the file
}
```

 * `application/ipfs-unixfs-progress-v1`

```
{
  path: String  // the path of the file
  bytes: int, // How many bytes of this file have been processed
}
```

#### POST `/api/v1/files[/{path}]`

Import a file or directory structure to IPFS or [MFS].

Requests may include a `content-disposition` header that specifies the full path to the file in the directory structure that is being imported.  Path components must be URI Encoded (see [#paths](#paths)).

##### Query string

* progress (boolean, default false)
  * If true, `application/ipfs-progress-v1` entities will be returned in the output stream
* strategy (enum - 'balanced', 'trickle', default 'balanced')
  * What sort of DAG to create
* onlyHash (boolean, default false)
  * If true no blocks will be written to the block store
* wrapWithDirectory (boolean, default false)
  * If true all files sent during this request will be wrapped in a directory
* chunker (string - `size-[bytes]` or `rabin-[min]-[avg]-[max]`, default `size-262144`)
  * The chunking strategy to use when creating the DAG
* pin (boolean, default true)
  * If false, added files will not also be pinned. This means they may be garbage collected in future.
* preload (boolean, default false)
  * If true, added files will be sent to IPFS managed preload nodes
* cidVersion (int, default 1)
  * The version of CID to use
* hashAlg (enum, See [`names`](https://github.com/multiformats/js-multihash/blob/master/src/constants.js) for values, default `sha2-256`)
  * The hashing algorithm to use when creating the CID
* inlineBlocks (boolean default false)
  * If true and the specifed chunker generates exactly one chunk for the file, only one DAGNode will be created and it will contain both the file data and UnixFS metadata
* shard (boolean default false)
  * If true any directories created will be HAMT shards

Example:

> Adding a file to IPFS

```
POST /api/v1/files?progress=true&wrapWithDirectory=true HTTP/1.1
content-type: multipart/mixed; boundary=boundary
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

--boundary
content-type: application/octet-stream

... binary data
--boundary--
```

Example:

> Adding a file to MFS

```
POST /api/v1/files/path/to/file.txt?progress=true&wrapWithDirectory=true HTTP/1.1
content-type: application/octet-stream
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

... binary data
```

Example:

> Adding a directory of files to MFS - file data is sent as `application/octet-stream`s and paths are specified via `content-disposition` headers.  Directory are indicated by `content-type: application/directory`

```
POST /api/v1/files/path/to/dir?progress=true HTTP/1.1
content-type: multipart/mixed; boundary=boundary
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

--boundary
content-type: application/octet-stream
content-disposition: filename="a/file.txt"

... binary data
--boundary

content-type: application/directory
content-disposition: filename="b"

--boundary--
```

Example:

> Adding an IPFS path to MFS

```
POST /api/v1/files/path/to/file.txt HTTP/1.1
content-type: application/ipfs-path
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

/ipfs/bafyFile
```

#### GET `/api/v1/files/{path}`

This resource allows you to retrieve data from IPFS and [MFS] paths.

##### Query string

* offset (int)
  * If set, a byte offset to start reading from a file or position to start reading from a directory
* length (int)
  * If set, how many bytes to read from a file or files from a directory
* recursive (boolean)
  * If true and the resolved path is a directory, list the contents of sub directories

Example:

> Getting the contents of a file - specify `application/octect-stream` as the `accept` header

```
GET /api/vi/files/path/to/file.txt HTTP/1.1
accept: application/octet-stream
```
```
HTTP 1.1 200 OK
content-type: application/octet-stream

...binary data
```

Example:

> You cannot download a directory as an octet-stream

```
GET /api/vi/files/path/to/dir HTTP/1.1
accept: application/octet-stream
```
```
HTTP 1.1 406 NOT ACCEPTIBLE
```

Example:

> Downloading a directory as a single file

```
GET /api/vi/files/path/to/dir HTTP/1.1
accept: application/gzip
```
```
HTTP 1.1 200 OK
content-type: application/gzip

...binary data
```

Example:

> Listing the contents of a directory

```
GET /api/vi/files/path/to/dir HTTP/1.1
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory
```
```
HTTP 1.1 200 OK
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo', cid: 'bafyfoo', size: 10 }
--boundary--
```

Example:

> Listing the contents of a directory recursively

```
GET /api/vi/files/path/to/dir?recursive=true HTTP/1.1
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory
```
```
HTTP 1.1 200 OK
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo', cid: 'bafyfoo', size: 10 }
--boundary
content-type: application/ipfs-unixfs-v1-directory

{ path: '/foo/bar', cid: 'bafybar' }
--boundary
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo/bar/baz.txt', cid: 'bafybaz', size: 10 }
--boundary--
```

#### PATCH `/api/v1/files/{path}`

This resource allows you to send an octet-stream that will overwrite file data at the path specified in the url, optionally starting at the passed offset.

All available data will be read from the octet-stream and spliced into the file.  This may cause the final file to be larger than the original, or smaller if the `truncate` option is used.

Original block data will not be altered.  [CID]s of newly created file root nodes/containing directories will be returned in the response.

##### Query string

* offset (int, default 0)
  * Where in the file to start overwriting bytes
* truncate (boolean, default false)
  * If true, the file will be truncated at the point that the input stream ends

Example:

```
PATCH /api/vi/files/path/to/file?offset=10 HTTP/1.1
content-type: application/octect-stream
accept: application/ipfs-unixfs-v1-file

.. binary data
```
```
HTTP 1.1 200 OK
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo', cid: 'bafyfoo' }
```

Example:

> Patching a deeply nested file

```
PATCH /api/vi/files/path/to/file.txt?offset=10 HTTP/1.1
content-type: application/octect-stream
accept: application/ipfs-unixfs-v1-file

.. binary data
```

> Response includes all parent paths

```
HTTP 1.1 200 OK
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-file

{ path: '/path/to/file.txt', cid: 'bafyUpdatedFile' }
--boundary
content-type: application/ipfs-unixfs-v1-directory

{ path: '/path/to', cid: 'bafyUpdatedDir' }
--boundary
content-type: application/ipfs-unixfs-v1-directory

{ path: '/path', cid: 'bafyUpdatedDir' }
--boundary
content-type: application/ipfs-unixfs-v1-directory

{ path: '/', cid: 'bafyUpdatedDir' }
--boundary--
```

Example:

> You cannot patch a directory

```
PATCH /api/vi/files/path/to/dir HTTP/1.1
accept: application/ipfs-unixfs-v1-directory
content-type: application/octet-stream
```
```
HTTP 1.1 406 NOT ACCEPTIBLE
```

#### PUT `/api/v1/files/{path}`

This resource entirely replaces files at the passed path.

All available data will be read from the octet-stream and used to overwrite the file.  This may cause the final file to be smaller than the original.

Example:

```
PUT /api/vi/files/path/to/file?offset=10 HTTP/1.1
content-type: application/octect-stream
accept: application/ipfs-unixfs-v1-file

.. binary data
```
```
HTTP 1.1 200 OK
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo', cid: 'bafyfoo' }
```

#### DELETE `/api/v1/files/ipfs/{path}`

No blocks are removed as part of this operation.

The [CID]s of newly created DAGNodes are returned in the response.

If the path starts with `/ipfs/`, it's an operation on an IPFS node, otherwise it's an operation on an [MFS] path.

Example:

> Deleting a file

```
DELETE /api/vi/files/ipfs/bafyFile?offset=10 HTTP/1.1
content-type: application/octect-stream
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

.. binary data
```
```
HTTP 1.1 200 OK
content-type: application/ipfs-unixfs-v1-file

{ path: '/foo', cid: 'bafyfoo' }
```

Example:

> Deleting a deeply nested file

```
DELETE /api/vi/files/ipfs/bafyDir/file.txt HTTP/1.1
accept: application/ipfs-unixfs-v1-file; application/ipfs-unixfs-v1-directory

.. binary data
```

> Response includes all parent paths

```
HTTP 1.1 200 OK
content-type: multipart/mixed; boundary=boundary

--boundary
content-type: application/ipfs-unixfs-v1-directory

{ path: '/', cid: 'bafyUpdatedDir' }
--boundary--
```

[MFS]: https://docs.ipfs.io/guides/concepts/mfs/
[CID]: https://docs.ipfs.io/guides/concepts/cid/
[RFC1341]: https://www.w3.org/Protocols/rfc1341/4_Content-Type.html
[RFC2616]: https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
[RFC3986]: https://tools.ietf.org/html/rfc3986
