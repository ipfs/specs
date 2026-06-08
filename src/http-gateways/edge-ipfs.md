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
