IPFS Routing Protocol Spec
==========================

Authors: David Dias

Reviewers:

TODOS:

-----------------------

> This spec defines the routing protocol spec, covering `Peer discovery`, `Routing` and the `DHT`. The spec is a **Work In Progress**.

## Supports

- Peer discovery through
  - mdns
  - custom peers list
  - random walking on the network
- Routing primitives
  - Publish and fetch content (also providing)
- Maintaining partial state of the network
  - DHT
  - kbucket

### Overview

The Routing Protocol is divided in three major components, these are:
- Peer Discovery: Responsible for filling our kbucket with best candidates.
- Interface: Our routing primitives that are offered for the user, such as finding and publishing content, including the storage and lookup of metadata (Providers).
- Peer-to-peer Structured Overlay Network: Algorithm for the implicit network organization, based on [Coral](http://iptps03.cs.berkeley.edu/final-papers/coral.pdf) and [mainlineDHT](http://www.bittorrent.org/beps/bep_0005.html)

Bootstrapping the routing happens by connecting to a predefined "railing" peers list, shipped with the go-ipfs release and/or by discovery through mDNS. Once at least one peer is found and added to the kbucket, the routing changes to an active state and our peer becomes able to route and receive messages.

### Peer Discovery

#### bootstrap peer list

List with known and trusted peers shipped with IPFS.

- _How is this list updated?_
- _Is this list updated periodically_?

#### random walk

IPFS issues random Peer lookups periodically to refresh our kbucket if needed. For impl reference, see: https://github.com/ipfs/go-ipfs/blob/master/routing/dht/dht_bootstrap.go#L88-L109.

#### mDNS

In addition to known peers and random lookups, IPFS also performs Peer Discovery through mDNS ([MultiCast DNS](https://tools.ietf.org/html/rfc6762))

-_How offen do we issue this searches?_

### Routing

For impl reference, check: https://github.com/ipfs/go-ipfs/blob/master/routing/routing.go#L19-L49

#### Find a peer

_When searching for a peer, do we fetch the kbucket from a peer and see which peer we want to ping next or do we ask for a given Id to a peer and that peer replies to us with the best candidate (or itself if it is the case)?_

#### Ping

#### Provide

#### Get value

#### Put value

1. find peer
2. transfer 
3. provide

### DHT 

explain:
- dht/coral, how the algo works
- kbucket
- each time a contact is made with a new peer, we check to see if it is a better candidate for our kbucket
- xor metric
