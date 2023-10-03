---
title: libp2p Transport Gateway Specification
description: >
  The libp2p Transport Gateway specification describes how Gateway APIs can be used over libp2p transports.
date: 2023-08-29
maturity: reliable
editors:
  - name: Adin Schmahmann
    github: aschmahmann
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
xref:
  - path-gateway
  - trustless-gateway
tags: ['httpGateways', 'lowLevelHttpGateways']
order: 1
---

The libp2p Transport Gateway specification describes how Gateway APIs can be used over [libp2p](https://github.com/libp2p/specs) transports.

libp2p has a [http+libp2p specification](https://github.com/libp2p/specs/pull/508) that describes how to use HTTP semantics over stream transports, as well as how to do discovery of what protocols are available (and where they are mounted), on a given endpoint. In order for a given HTTP protocol like the IPFS Gateway API to work in this environment it requires a protocol identifier.

The protocol identifier for the IPFS Gateway when used over libp2p is `/ipfs/gateway`. This protocol identifier is shared among Gateway specifications (e.g. whether an endpoint only supports :cite[trustless-gateway], supports more of :cite[path-gateway], etc. is not considered here).