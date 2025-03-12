---
title: Kademlia DHT
description: >
  The IPFS Distributed Hash Table (DHT) specification defines a structured
  overlay network used for peer routing and content routing in the
  InterPlanetary File System (IPFS). It extends the libp2p Kademlia DHT
  specification, adapting and adding features to support IPFS-specific
  requirements.
date: 2022-08-26
maturity: reliable
editors:
  - name: Guillaume Michel
    github: guillaumemichel
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
tags: ['routing']
order: 1
---

The IPFS Distributed Hash Table (DHT) specification defines a structured
overlay network used for peer routing and content routing in the
InterPlanetary File System (IPFS). It extends the libp2p Kademlia DHT
specification, adapting and adding features to support IPFS-specific
requirements.

## Introduction

FIXME:

### Relation to [libp2p kad-dht](https://github.com/libp2p/specs/tree/master/kad-dht)

The IPFS Kademlia DHT specification is a specialization of the libp2p Kademlia DHT.

It is possible to use an alternative DHT specification alongside an IPFS
implementation, rather than the one detailed here. This document specifically
outlines all protocol customizations and adaptations required for participation
in the [Amino DHT](#relation-to-the-amino-dht). If you're designing a new
Kademlia-based DHT for use with IPFS, some details in this specification may
appear overly specific or prescriptive.

### Relation to the [Amino DHT](https://blog.ipfs.tech/2023-09-amino-refactoring/#why-amino)

The Amino DHT is the swarm of peers also referred to as the _Public IPFS DHT_.
It implements the IPFS Kademlia DHT specification and uses the protocol
identifier `/ipfs/kad/1.0.0`. The Amino DHT can be joined by using the [Amino
DHT
Bootstrappers](https://docs.ipfs.tech/concepts/public-utilities/#amino-dht-bootstrappers).

The Amino DHT is utilized by multiple IPFS implementations, including
[`kubo`](https://github.com/ipfs/kubo) and
[`helia`](https://github.com/ipfs/helia). Multiple DHT swarms can coexist and
nodes MAY participate in multiple DHT swarms. DHT swarms can be either public
or private.

Note that there could be multiple distinct DHT swarms using the same protocol
identifier as long as they don't have any common peers. This practice is
discouraged as networks will immediately merge if they enter in contact. Each
DHT swarm SHOULD have a dedicated protocol identifier.

## Protocol Parameters

FIXME: move parameters to appropriate sections

The IPFS Kademlia DHT defines a number of Client and Server parameters that
need to be set to ensure the DHT operates correctly as a system.

### Protocol Identifier

All nodes participating in the same DHT swarm MUST use the same protocol
identifier. The protocol identifier uniquely identifies a DHT swarm. It follows
the format `/<swarm-prefix>/kad/<version>`, e.g `/ipfs/kad/1.0.0` for the Amino
DHT protocol version `1.0.0`, or `/ipfs/lan/kad/1.0.0` for a local DHT swarm.

### Routing Table Bucket Size

DHT Servers MUST have a routing table bucket size of `20` (see [Routing
Table](#routing-table)). This corresponds to the `k` value as defined in the
original Kademlia paper [0]. The `k` value is also used as a replication factor
and defines how many peers are returned to a lookup request.

While DHT Client technically don't need to store a routing table, DHT Clients
MUST nonetheless use a replication factor of `20`. If Client implementations
decide to include a routing table, they SHOULD use a bucket size of `20`.

### Provide Validity

Provide Validity defines the time-to-live (TTL) of a Provider Record on a DHT
Server. DHT Servers MUST implement a Provide Validity of `48h`.

### Provider Record Republish Interval

Because of the churn in the network, Provider Records need to be republished
more often than their validity period. DHT Clients SHOULD republish Provider
Records every `22h`
([rationale](https://github.com/probe-lab/network-measurements/blob/master/results/rfm17-provider-record-liveness.md#42-alternative-k-values-and-their-performance-comparison)).

### Provider Addresses TTL

DHT Servers SHOULD persist the multiaddresses of providers for `24h` after the
`PROVIDE` operation. This allows DHT Servers to serve the multiaddresses of the
content provider alongside the provide record, avoiding an additional DHT walk
for the Client
([rationale](https://github.com/probe-lab/network-measurements/blob/master/results/rfm17.1-sharing-prs-with-multiaddresses.md)).

### Concurrency

Implementation specific. Recommendation is `10`

### Resiliency

Implementation specific. Recommendation is `3`

### Routing Table Refresh Interval

SHOULD `10min`. Only peers that have been seen in the last 10 minutes should remain in the routing table. If peer hasn't been seen recently, try to ping it to see if it's still alive.

## DHT Swarm

## Routing Table

### Routing Table Refresh

### Public addresses

### IP Diversity Filter

SHOULD implement.

## Lookup Process

### Lookup termination

This is hard

## Peer Routing

DHT Clients that want to be routable must make sure they are in the peerstore of the closest DHT servers to their own PeerID.

When performing a `FIND_NODE` lookup, the client will converge to the closest nodes in XOR distance to the requested PeerID. These nodes are expected to know the multiaddrs of the target peer. The

### Signed Peer Records

## Content Routing

### Provider Records

### IPNS

### Validators

## Wire format

Currently same as libp2p kad-dht

Profobuf

## Backpressure

TBD

## Client Optimizations

### Checking peer behaviour before adding to routing table

Make a `FIND_NODE` request and inspect response before adding node to RT. Followed https://blog.ipfs.tech/2023-ipfs-unresponsive-nodes/

## libp2p Kademlia DHT Implementations

* Go: [`libp2p/go-libp2p-kad-dht`](https://github.com/libp2p/go-libp2p-kad-dht)
* JS: [libp2p/kad-dht](https://github.com/libp2p/js-libp2p/tree/main/packages/kad-dht)
* Rust: [libp2p-kad](https://github.com/libp2p/rust-libp2p/tree/master/protocols/kad)

## References

[0]: Maymounkov, P., & Mazières, D. (2002). Kademlia: A Peer-to-Peer Information System Based on the XOR Metric. In P. Druschel, F. Kaashoek, & A. Rowstron (Eds.), Peer-to-Peer Systems (pp. 53–65). Berlin, Heidelberg: Springer Berlin Heidelberg. [DOI](https://doi.org/10.1007/3-540-45748-8_5) [pdf](https://www.scs.stanford.edu/~dm/home/papers/kpos.pdf)
