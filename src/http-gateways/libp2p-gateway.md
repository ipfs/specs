---
title: libp2p+HTTP Transport Gateway Specification
description: >
  Describes how HTTP Gateway semantics can be used over libp2p transports and how libp2p can coexist with other HTTP services on the same host.
date: 2025-03-06
maturity: draft
editors:
  - name: Adin Schmahmann
    github: aschmahmann
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
xref:
  - http-routing-v1
  - path-gateway
  - trustless-gateway
tags: ['httpGateways', 'lowLevelHttpGateways', 'exchange', 'transport']
order: 3
---

This specification describes how HTTP Gateway semantics
and APIs can be used over [libp2p](https://github.com/libp2p/specs) transports,
and how libp2p can coexist with other HTTP services on the same host.

# libp2p HTTP Protocols Manifest

The [libp2p+HTTP specification](https://github.com/libp2p/specs/blob/master/http/README.md)
describes how to use libp2p with HTTP semantics over stream transports, as well as how
to do discovery of what protocols are available (and where they are mounted).

## `.well-known/libp2p/protocols`

Any libp2p application sub-protocols exposed behind `/http/1.1` protocol can be
discovered by the well-known resource (:cite[rfc8615]) at `.well-known/libp2p/protocols`.

### Protocol Identifier

In order for a pure HTTP Gateway protocol like the :cite[trustless-gateway] to
coexist with libp2p in this environment it requires a protocol identifier to act as a key in
the `.well-known/libp2p/protocols` mapping file.

The `/http/1.1` sub-protocol identifier for the IPFS Gateway when used over libp2p is:

```
/ipfs/gateway
```

### Protocol Mounting

A reference `.well-known/libp2p/protocols` JSON body with mapping that assumes the gateway to be mounted at `/`:

```js
{
  "protocols": {
    "/ipfs/gateway": {"path": "/"},
  }
}
```

# Peer ID Authentication

[Peer ID Authentication over HTTP](https://github.com/libp2p/specs/blob/master/http/peer-id-auth.md) is optional and SHOULD NOT be required by [Trustless Gateway](https://specs.ipfs.tech/http-gateways/trustless-gateway/)  HTTP endpoint defined for `/ipfs/gateway` handler.

Clients following the Trustless Gateway specification MUST verify each CID individually, without being concerned with peer identity.
PeerID authentication is not required for trustless retrieval and HTTP-only clients SHOULD work without it.

# Gateway Type Detection

The `/ipfs/gateway` protocol identifier is shared among all Gateway specifications.

An HTTP server mounted behind the `/ipfs/gateway` identifier MUST expose the most basic [block (application/vnd.ipld.raw)](https://specs.ipfs.tech/http-gateways/trustless-gateway/#block-responses-application-vnd-ipld-raw)
responses from :cite[trustless-gateway], but MAY also support other gateway types and features.

Client implementations SHOULD [perform feature detection](https://specs.ipfs.tech/http-gateways/trustless-gateway/#dedicated-probe-paths) on their own,
or assume only the most basic [block (application/vnd.ipld.raw)](https://specs.ipfs.tech/http-gateways/trustless-gateway/#block-responses-application-vnd-ipld-raw)
response type from :cite[trustless-gateway] is available.
