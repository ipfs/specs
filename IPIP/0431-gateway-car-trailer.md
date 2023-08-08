---
# IPIP number should  match its pull request number. After you open a PR,
# please update title and update the filename to `ipip0000`.
title: "IPIP-0431: CAR metadata trailer in Gateway responses"
date: 2023-08-08
ipip: proposal
editors:
  - name: Miroslav Bajtoš
# relatedIssues:
#   - link to issue
order: 0000
tags: ['ipips', 'httpGateways']
---

## Summary

Define an optional enhancement of the CARv1 stream that allows a Gateway server to provide
additional metadata about the CARv1 response. Introduce a new content type that allows the client
and the server to signal or negotiate the inclusion of extra metadata.

## Motivation

SPARK is a Filecoin Station module that measures the reputation of Storage Providers by periodically
retrieving a random CID. Since both SPs and SPARK nodes are permissionless, and Proof of Retrieval
is an unsolved problem, we need a way to verify that a SPARK node retrieved the given CID from the
given SP. To enable that, we need the Trustless Gateway serving the retrieval request to include a
retrieval attestation after the entire response was sent to the client.

We currently have no mechanism to signal that a CAR file transmission over HTTP completed
successfully. However, we need this in order to be able to use CARs as a way of serving streaming
responses for queries. One way of solving this problem is to append an extra block at the end of the
CAR stream with information that clients can use to check whether all CAR blocks have been received.

## Detailed design

CAR content type
(`[application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car)`)
already supports multiple parameters like `version` and `order`, which allows gateways to indicate
which CAR flavors is returned with the response.

The proposed solution introduces a new parameters for the content type headers in HTTP requests
and responses: `meta`.

When the content type parameter `meta` is set to `eof`, the Gateway will write one additional CAR
block with metadata to the response, after it sent all CAR blocks.

The metadata format is DAG-CBOR and open to extension.

## Design rationale

The proposal introduces a minimal change allowing Gateways and retrieval clients to explicitly opt
into receiving additional metadata block at the end of the CAR response stream.

The metadata block is designed to be very flexible and able to support new use-cases that may arise
in the future.

### User benefit

- Clients of trustless gateways can use the fields from the metadata as an attestation that they
performed the retrieval from the given server.

- The `len` field in the metadata block allows clients to verify whether they received all CAR
bytes.

### Compatibility

The new feature requires clients to explicitly ask the server to include the extra block,
therefore the change is fully backwards-compatible for all existing gateway clients.

Gateways receiving requests for the new content type can ignore the `meta` parameter they don't
support and return back a response with one of the content types they support. This makes the
proposed change backwards-compatible for existing gateways too.


### Security

The proposed specification change does not introduce any negative security implications.

### Alternatives

Instead of adding a new content type argument, we were considering sending the additional metadata
in HTTP response trailers. Unfortunately, HTTP trailers are not widely supported by the ecosystem.
Nginx proxy module discards them, browser `Fetch API` do not allow clients to access trailer
headers, neither does the Rust `reqwest` client.

## Test fixtures

TBD

Using one CID, request the CAR data using various combinations of content type parameters.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
