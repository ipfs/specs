# IPIP 0000: Streaming Error Handling in HTTP Gateways

- Start Date: 2022-10-12
- Related Issues:
  - [ipfs/kubo/pull/9333](https://github.com/ipfs/kubo/pull/9333)
  - [mdn/browser-compat-data/issues/14703](https://github.com/mdn/browser-compat-data/issues/14703)

## Summary

Ensure streaming error handling in web gateways is clear and consistent.

## Motivation

Web gateways provide different functionalities where users can download files.
The download of this files is streamed from the server to the client using HTTP.
However, there is no good way of presenting to the client an error that happens
during the stream.

For example, if during the download of a TAR file, the server detects some error
and is not able to continue, the user can get a valid, yet incomplete TAR. However,
the user will not know that the TAR is incomplete. By introducing consistent error
handling, the server attempts to notify the user.

## Detailed design

If the server encounters an error before streaming the contents to the client,
the server must fail with the respective `4xx`  or `5xx` HTTP status code (no change).

If the server encounters an error while streaming the contents, the server must
force-close the HTTP stream to the user. This way, the user will receive a
network error, making it clear that the downloaded file is not valid.

## Test fixtures

There are no relevant test fixures for this IPIP.

## Design rationale

Before starting to stream the body of the response, the server is able to set
an HTTP status code for the error. However, after the HTTP headers are set
and the body started being streamed, there are no clear ways in the HTTP
specification to show an error. Since the gateway is browser-first, it is
important to show an error and avoid users receiving an incomplete file.
Therefore, the server can force-close the HTTP stream, leading to a network
error. This tells the user that an error happened.

### User benefit

The user will know that an error happened while receiving the file. Otherwise,
the user might receive incomplete, but still valid, files that could be mistaken
but the real file.

### Compatibility

This RFC is backwards compatible.

### Alternatives

Using [`Trailer`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer) HTTP headers
was considered. However, trailer headers are [not supported in browsers](https://github.com/mdn/browser-compat-data/issues/14703).
In addition, even if trailer headers were supported in browsers, there is no clear
standard for which header would be used to indicate errors.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
