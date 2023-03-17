# IPIP-288: TAR Response Format on HTTP Gateways

- Start Date: 2022-06-10
- Related Issues:
  - [ipfs/specs/pull/288](https://github.com/ipfs/specs/pull/288)
  - [ipfs/go-ipfs/pull/9029](https://github.com/ipfs/go-ipfs/pull/9029)
  - [ipfs/go-ipfs/pull/9034](https://github.com/ipfs/go-ipfs/pull/9034)

## Summary

Add TAR response format to the [HTTP Gateway](../http-gateways/).

## Motivation

Currently, the HTTP Gateway only allows for UnixFS deserialization of a single
UnixFS file. Directories have to be downloaded one file at a time, using
multiple requests, or as a CAR, which requires deserialization in userland,
via additional tools like [ipfs-car](https://www.npmjs.com/package/ipfs-car).

This is to illustrate we have a functional gap where user is currently unable
to leverage trusted HTTP gateway for deserializing UnixFS directory tree. We
would like to remove the need for dealing with CARs when a gateway is trusted
(e.g., a localhost gateway).

An example use case is for the IPFS Web UI, which currently allows users to
download directories using a workaround. This workaround works via a proprietary
Kubo RPC API that only supports `POST` requests and the Web UI has to store the entire
directory in memory before the user can download it.

By introducing TAR responses on the HTTP Gateway, we provide vendor-agnosic way
of downloading entire directories in deserialized form, which increases utility
and interop provided by HTTP gateways.

## Detailed design

The solution is to allow the Gateway to support producing TAR archives
by requesting them using either the `Accept` HTTP header or the `format`
URL query.

## Test fixtures

Existing `curl` and `tar` tools can be used by implementers for testing.

Providing static test vectors has little value here, as different TAR libraries
may produce different byte-to-byte files due to unspecified ordering of files and
directories inside.

However, there are certain behaviors, detailed in the [security section](#security)
that should be handled. To test such behaviors, the following fixtures can be used:

- [`bafybeibfevfxlvxp5vxobr5oapczpf7resxnleb7tkqmdorc4gl5cdva3y`][inside-dag]
  is a UnixFS DAG that contains a file with a name that looks like a relative
  path that points inside the root directory. Downloading it as a TAR must
  work.

- [`bafkreict7qp5aqs52445bk4o7iuymf3davw67tpqqiscglujx3w6r7hwoq`][inside-dag-tar]
  is an example TAR file that corresponds to the aforementioned UnixFS DAG. Its
  structure can be inspected in order to check if new implementations conform
  to the specification.

- [`bafybeicaj7kvxpcv4neaqzwhrqqmdstu4dhrwfpknrgebq6nzcecfucvyu`][outside-dag]
  is a UnixFS DAG that contains a file with a name that looks like a relative
  path that points outside the root directory. Downloading it as a TAR must
  error.

## Design rationale

The current gateway already supports different response formats via the
`Accept` HTTP header and the `format` URL query. This IPIP proposes adding
one more supported format to that list.

### User benefit

Users will be able to directly download deserialized UnixFS directories from
the gateway. Having a single TAR stream is saving resources on both client and
HTTP server, and removes complexity related to redundant buffering or CAR
deserialization when gateway is trusted.

In the Web UI, for example, we will be able to create a direct link to download
a directory, instead of using the API to put the whole file in memory before
downloading it.

CLI users will be able to download a directory with existing tools like `curl` and `tar` without
having to talk to implementation-specific RPC APIs like `/api/v0/get` from Kubo.

Fetching a directory from a local gateway will be as simple as:

```console
$ export DIR_CID=bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq
$ curl "http://127.0.0.1:8080/ipfs/$DIR_CID?format=tar" | tar xv
bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq
bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt
bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - transcript.txt
bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1.png
```

### Compatibility

This IPIP is backwards compatible: adds a new opt-in response type, does not
modify preexisting behaviors.

Existing content type `application/x-tar` is used when request is made with an `Accept` header.

### Security

Third-party UnixFS file names may include unexpected values, such as `../`.

Manually created UnixFS DAGs can be turned into malicious TAR files. For example,
if a UnixFS directory contains a file that points at a relative path outside
its root, the unpacking of the TAR file may overwrite local files outside the expected
destination.

In order to prevent this, the specification requires implementations to do
basic sanitization of paths returned inside a TAR response.

If the UnixFS directory contains a file whose path
points outside the root, the TAR file download **should** fail by force-closing
the HTTP connection, leading to a network error.

To test this, we provide some [test fixtures](#test-fixtures). The user should be
suggested to use a CAR file if they want to download the raw files.

### Alternatives

One discussed alternative would be to support uncompressed ZIP files. However,
TAR and TAR-related libraries are already supported by some IPFS
implementations, and are easier to work with in CLI. TAR provides simpler
abstraction, and layering compression on top of TAR stream allows for greater
flexibility than alternative options that come with own, opinionated approaches
to compression.

In addition, we considered supporting [Gzipped TAR](https://github.com/ipfs/go-ipfs/pull/9034) out of the box,
but decided against it as gzip or alternative compression may be introduced on the HTTP transport layer.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[inside-dag]: https://dweb.link/ipfs/bafybeibfevfxlvxp5vxobr5oapczpf7resxnleb7tkqmdorc4gl5cdva3y?format=car
[inside-dag-tar]: https://dweb.link/ipfs/bafkreict7qp5aqs52445bk4o7iuymf3davw67tpqqiscglujx3w6r7hwoq?format=car
[outside-dag]: https://dweb.link/ipfs/bafybeicaj7kvxpcv4neaqzwhrqqmdstu4dhrwfpknrgebq6nzcecfucvyu?format=car
