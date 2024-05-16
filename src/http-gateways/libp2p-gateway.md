---
title: libp2p+HTTP Transport Gateway Specification
description: >
  Describes how HTTP Gateway semantics can be used over libp2p transports.
date: 2024-04-20
maturity: draft
editors:
  - name: Adin Schmahmann
    github: aschmahmann
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
xref:
  - path-gateway
  - trustless-gateway
tags: ['httpGateways', 'lowLevelHttpGateways', 'exchange', 'transport']
order: 3
---

## Introduction

This specification describes how HTTP Gateway semantics
and APIs can be used over [libp2p](https://github.com/libp2p/specs) transports.

## Specification

The [libp2p+HTTP specification](https://github.com/libp2p/specs/pull/508)
describes how to use HTTP semantics over stream transports, as well as how
to do discovery of what protocols are available (and where they are mounted).

### `.well-known/libp2p/protocols`

libp2p application sub-protocols exposed behind `/http/1.1` protocol can be
discovered by the well-known resource (:cite[rfc8615]) at `.well-known/libp2p/protocols`.

#### Protocol identifier

In order for a given HTTP Gateway protocol like the :cite[trustless-gateway] to
work in this environment it requires a protocol identifier to act as a key in
the `.well-known/libp2p/protocols` mapping file.

The `/http/1.1` sub-protocol identifier for the IPFS Gateway when used over libp2p is:

```
/ipfs/gateway
```

#### Protocol mounting

A reference `.well-known/libp2p/protocols` JSON body with mapping that assumes the gateway to be mounted at `/`:

```js
{
  "protocols": {
    "/ipfs/gateway": {"path": "/"},
  }
}
```

## Gateway type detection

The protocol identifier is shared among Gateway specifications.

HTTP server mounted behind the `/ipfs/gateway` identifier MUST expose
:cite[trustless-gateway], but is free to also support other gateway types and
features.

:::note

Signaling Features on HTTP Gateways is wip in [IPIP-425](https://github.com/ipfs/specs/pull/425).

Until the IPIP is finalized, client implementations SHOULD perform feature
detection on their own, or assume only the most basic [block (application/vnd.ipld.raw)](https://specs.ipfs.tech/http-gateways/trustless-gateway/#block-responses-application-vnd-ipld-raw)
response type from :cite[trustless-gateway] is available.

:::
