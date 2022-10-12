# IPIP 0000: TAR Response Format on Web Gateways

- Start Date: 2022-06-10
- Related Issues:
  - [ipfs/specs/pull/288](https://github.com/ipfs/specs/pull/288)
  - [ipfs/go-ipfs/pull/9029](https://github.com/ipfs/go-ipfs/pull/9029)
  - [ipfs/go-ipfs/pull/9034](https://github.com/ipfs/go-ipfs/pull/9034)

## Summary

Add TAR response format to the [HTTP Gateway](../http-gateways/).

## Motivation

Currently, the HTTP Gateway only allows the download of single files, or
CAR archives. However, CAR files are sometimes not necessary and users may
want to download entire directories.

An example use case is for the IPFS Web UI, which currently allows users to
download directories using a workaround. This workaround works via an API
that only supports `POST` requests and the Web UI has to store the entire
directory in memory before the user can download it. By introducing TAR files
on the HTTP Gateway, we improve the way of downloading entire directories.

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

- [`bafybeibfevfxlvxp5vxobr5oapczpf7resxnleb7tkqmdorc4gl5cdva3y`][inside-dag] is a UnixFS
DAG that contains a file with a relative path that points inside the root directory.
Downloading it as a TAR must work.
- [`bafkreict7qp5aqs52445bk4o7iuymf3davw67tpqqiscglujx3w6r7hwoq`][inside-dag-tar] is an
example TAR file that corresponds to the aforementioned UnixFS DAG. Its structure can be
inspected in order to check if new implementations conform to the specification.
- [`bafybeicaj7kvxpcv4neaqzwhrqqmdstu4dhrwfpknrgebq6nzcecfucvyu`][outside-dag] is a UnixFS
DAG that contains a file with a relative path that points outside the root directory.
Downloading it as a TAR must error.

## Design rationale

The current gateway already supports different response formats via the
`Accept` HTTP header and the `format` URL query. This RFC proposes adding
one more supported format to that list.

### User benefit

Users will be able to directly download UnixFs directories from the gateway. In the Web UI,
for example, we will be able to create a direct link to download the file, instead of using the
API to put the whole file in memory before downloading it, saving resources and avoiding bugs.

CLI users will be able to download a directory with existing tools like `curl` and `tar` without
having to talk to implementation-specific RPC APIs like `/api/v0/get`.

### Compatibility

This RFC is backwards compatible.

### Security

Manually created UnixFS DAGs can be turned into malicious TAR files. For example,
if a UnixFS directory contains a file that points at a relative path outside of
its root, the unpacking of the TAR file may overwrite local files.

In order to prevent this, if the UnixFS directory contains a file whose path
points outside of the root, the TAR file download **must** fail by force-closing
the HTTP connection, leading to a network error.

To test this, we provide some [test fixtures](#test-fixtures). The user should be
suggested to use a CAR file if they want to download the raw files.

### Alternatives

One discussed alternative would be to support uncompressed ZIP files. However, TAR and
TAR-related libraries are already supported and implemented for UnixFS files. Therefore,
the addition of a TAR response format is facilitated.

In addition, we considered supporting [Gzipped TAR](https://github.com/ipfs/go-ipfs/pull/9034).
However, there it may be a vector for DOS attacks since compression requires high CPU power.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[inside-dag]: https://dweb.link/ipfs/bafybeibfevfxlvxp5vxobr5oapczpf7resxnleb7tkqmdorc4gl5cdva3y
[inside-dag-tar]: https://dweb.link/ipfs/bafkreict7qp5aqs52445bk4o7iuymf3davw67tpqqiscglujx3w6r7hwoq
[outside-dag]: https://dweb.link/ipfs/bafybeicaj7kvxpcv4neaqzwhrqqmdstu4dhrwfpknrgebq6nzcecfucvyu
