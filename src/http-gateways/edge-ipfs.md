---
title: Edge IPFS
description: >
  This is a lightweight approach to getting the benefits of IPFS — sharing verifiable
  content – without having to run a long-lived node or taking part in complex,
  stateful interactions.
date: 2026-06-08
maturity: wip
editors:
  - name: Robin Berjon
    email: robin@berjon.com
    url: https://berjon.com/
    github: darobin
    bluesky: "robin.berjon.com"
    affiliation:
        name: Supramundane Agency
        url: https://supramundane.agency/
tags: ['httpGateways', 'lowLevelHttpGateways']
---

Edge IPFS is a lightweight approach to getting the benefits of IPFS — sharing verifiable content –
without having to run a long-lived node or taking part in complex, stateful interactions.
It is intended to provide a smooth, simple path to adoption.

The target use case is providers who want their content both addressable and discoverable
on IPFS, but only need to serve it (not coordinate with the network in real time). For
these users, simplicity and low resource overhead matter more than full IPFS feature parity.
This solution also works well for people who want to retrieve content from such providers
with a very lightweight client implementation (doing very little more than HTTP).

## Extension To Delegated Routing

Making content discoverable can be achieved by offering a delegated routing endpoint
([[http-routing-v1]]). An Edge IPFS server responds to routing requests for CIDs
that it knows about with a peer routing response the `Protocols` array of which
must have a `rasl` entry.

Correspondingly, there must then be a `rasl` field in the peer response object,
the value of which must be an array of domains (if not, it is ignored).

## Retrieval Using RASL

Once the RASL array of domains has been obtained, retrieval is performed as
described in the [RASL specification](https://dasl.ing/rasl.html), under the
[steps to fetch a RASL URL](https://dasl.ing/rasl.html#dfn-fetch-a-rasl-url) algorithm
starting at step 2, with:

- the CID being fetched as the `cid` parameter, and
- the domains obtained from the delegated routing request as the `hints` parameter.

**NOTE**: to avoid pervasive problems with serving arbitrary content that may not
be attached to proper HTTP headers, RASL provides all content as
`application/octet-stream`. If you wish to access reproducible and verifiable metadata
for a resource retrived using RASL, you must provide that information separately,
typically using [MASL](https://dasl.ing/masl.html).
