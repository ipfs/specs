Block Exchange Spec
===================

> A free market for Content-Addressed data transactions.

# Table of Contents

- Description
- Implementation Details
  - bitswap
  - http-exchange

# Description

The IPFS Block Exchange takes care of negotiating bulk data transfers. Once nodes know each other -- and are connected -- the exchange protocols govern how the transfer of content-addressed blocks occurs.

The Block Exchange is an interface that is satisfied by various kinds of implementations. For example:

- bitswap: our main protocol for exchanging data. It is a generalization of BitTorrent to work with arbitrary (and not known apriori) DAGs.
- http-exchange: a simple exchange can be implemented with HTTP clients and servers.

# Implementations

## bitswap

> bitswap is the primary Block Exchange Protocol available for IPFS, it follows the Block Exchange Specs expectations and interface.

### notes

- Jeromy's Coffee Talks on Bitswap - https://www.youtube.com/watch?v=9UjqJTCg_h4
- in a nutshell:
  - tell other peers what we want
  - types of messages
    - I want a block
    - no longer want a block
    - here is a block
  - drop the want list of a peer if we loose the connection with it
  - attack in every front to get the block (send list to all peers + search the DHT)
  - don’t look for every block in DHT, only for one, because it is assumed for a node that has a block to have the rest of the blocks
  - bloom filters to aid the decision of whom to ask
  - interface (similar to datastore/blockstore interface)
    - getBlock
    - hasBlock
    - putBlock
  - needs to understand serialization (cbor + protobufs)

### architecture

```bash
┌────────────────────────────┐
│         bitswap            │
└────────────────────────────┘
               │
               │
     ┌─────────┴────┬────────────┬─────────────┐
     │              │            │             │
     ▼              ▼            ▼             ▼
┌─────────┐  ┌────────────┐  ┌───────┐ ┌───────────────┐
│  vault  │  │    door    │  │ scout │ │ auction-house │
└─────────┘  └────────────┘  └───────┘ └───────────────┘
     │              ▲            │

     │              │            │

     ▼              │            │
┌─────────┐ ┌───────────────┐
│ipfs-repo│ │ libp2p        │◀ ─ ┘
└─────────┘ └───────────────┘
```

##### bitswap

Implements the interface specified by this spec

##### vault

Simple connector to IPFS repo for the remaining parts bitswap know how to store and get blocks

##### door

Mounts on top of libp2p as `/bitswap/a.b.c`, where `a.b.c` is the major, minor and patch version of the protocol respectively. `door` receives all the incoming messages, parses them depending on tis wire format (see wire messages below for wire format notes) and forwards it the respective entity inside bitswap that will part this message.

##### scout

`scout` is our want manager, it keeps peers informed of what is our want list (and what we don't want anymore), makes sure to inform new peers as we get connected. `scout` is also responsible for making the decision of which peers to contact in the DHT depending on what are the blocks we are looking for at a certain moment.

##### auction house

`auction-house` keeps track of what blocks my peer wants, what others peer wants list are, peers bandwith, reputation and other important metricts that will enable bitswap to become smarter.

### interface

`fn get(Multihash: key) -> (Vec<u8>: block, Err: err)`
`fn put(Multihash: key, Vec<u8>: block) -> Err: err`

Q: bitswap should not expect an already serialized block so that we can pick the serialization format inside when passing it around.

### wire messages

bitswap wire format can vary between protobuf (legacy) and cbor (IPLD).

Types of messages:

- here is my want list
- I have a block
- I no longer want a block

## http-exchange
