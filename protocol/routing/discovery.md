IPFS Peer Discovery Protocol Spec
=================================

Authors: David Dias

Reviewers:

TODOS:

-----------------------

> 

## Supports

- Peer discovery through
  - mdns
  - custom peers list
  - random walking on the network

## Overview


### bootstrap peer list

List with known and trusted peers shipped with IPFS.

- _How is this list updated?_
- _Is this list updated periodically_?

### random walk

IPFS issues random Peer lookups periodically to refresh our kbucket if needed. For impl reference, see: https://github.com/ipfs/go-ipfs/blob/master/routing/dht/dht_bootstrap.go#L88-L109.

### mDNS

In addition to known peers and random lookups, IPFS also performs Peer Discovery through mDNS ([MultiCast DNS](https://tools.ietf.org/html/rfc6762))

-_How offen do we issue this searches?_


