IPFS Routing Protocol Spec
==========================

Authors: David Dias

Reviewers:

TODOS:

-----------------------

> This spec defines the routing protocol spec. Routing offers an interface for the features exposed by `Peer discovery` and `DHT`. The spec is a **Work In Progress**.

## Supports

- Routing primitives
  - Publish and fetch content (also providing)
- Maintaining partial state of the network
  - DHT
  - kbucket

## Overview

The Routing Protocol is composed by three componenets, these are:
- Interface: Our routing primitives that are offered for the user, such as finding and publishing content, including the storage and lookup of metadata (Providers).
- Peer Discovery: Responsible for filling our kbucket with best candidates.
- Peer-to-peer Structured Overlay Network (DHT): Algorithm for the implicit network organization, based on [Coral](http://iptps03.cs.berkeley.edu/final-papers/coral.pdf) and [mainlineDHT](http://www.bittorrent.org/beps/bep_0005.html)

```
┌──────────────┐
│   routing    │
└──────────────┘
┌─────────┐┌───┐
│discovery││DHT│
└─────────┘└───┘
```

In order for routing to work, we first have to pass the bootstrap state. Bootstrapping happens by connecting to a predefined "railing" peers list, shipped with the go-ipfs release and/or by discovery through mDNS. Once at least one peer is found and added to the kbucket, the routing changes to an active state and our peer becomes able to route and receive messages.

## Routing

For impl reference, check: https://github.com/ipfs/go-ipfs/blob/master/routing/routing.go#L19-L49

### Find a peer

_When searching for a peer, do we fetch the kbucket from a peer and see which peer we want to ping next or do we ask for a given Id to a peer and that peer replies to us with the best candidate (or itself if it is the case)?_

### Ping

Ping mechanism (for heartbeats). Ping a peer and log the time it took to answer.

_what if the Id doesn't exist? Is there any rule for non existing peers? Should we log time for best matches as well?_

### Provide

Providing is the process of storing/updating the metadata (pointers) of where the blocks of a given file are stored/available in the IPFS network. What this means is that the DHT is not used for block discovery, but for the metadata which identifies where they are, instead.
When a node advertises a block available for download, IPFS stores a record in the DHT with its own Peer.ID. This is termed "providing". the node becomes a "provider". Requesters who wish to retrieve the content, query the DHT (or DSHT) and need only to retrieve a subset of providers, not all of them. (this works better with huge DHTs, and latency-aware DHTs like coral).

We provide once per block, because every block (even sub-blocks) are independently addressable by their hash. (yes, this is expensive, but we can mitigate the cost with better DHT + record designs, bloom filters, and more)

There is an optimistic optimization -- which is that if a node is storing a node that is the parent (root/ancestor) of other nodes, then it is much more likely to also be storing the children. So when a requester attempts to pull down a large dag, it first queries the DHT for providers of the root. Once the requester finds some and connects directly to retrieve the blocks, bitswap will optimistically send them the "wantlist", which will usually obviate any more dht queries for that dag. we haven't measured this to be true yet -- we need to -- but in practice it seems to work quite well, else we wouldnt see as quick download speeds. (one way to look at it, is "per-dag swarms that overlap", but it's not a fully correct statement as having a root doesn't necessarily mean a node has any or all children.)

Providing a block happens as it gets added. Reproviding happens periodically, currently 0.5 * dht record timeout ~= 12 hours.

### Get value



### Put value

_not 100% about this happens exactly. From what I understand, the IPFS node that is adding the file, breaks the file into blocks, creates the hashes and provides each single one of them. When do we execute a Put? Replicas are done through "Get", right?_

