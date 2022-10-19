# ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) IPNS PubSub Router

Authors:

  - Adin Schmahmann ([@aschmahmann](https://github.com/aschmahmann))
  
Reviewers:

-----
  
# Abstract

[Inter-Planetary Naming System (IPNS)](./IPNS.md) is a naming system responsible for the creating, reading and updating of mutable pointers to data.
IPNS consists of a public/private asymmetric cryptographic key pair, a record type and a protocol.
Part of the protocol involves a routing layer that is used for the distribution and discovery of new or updated IPNS records.

The IPNS PubSub router uses [libp2p PubSub](https://github.com/libp2p/specs/tree/master/pubsub) as a base, and adds persistence on top of it to ensure IPNS updates are always available to a connected network.
An inherent property of the IPNS PubSub Router is that IPNS records are republishable by peers other than the peer that originated the record.
This implies that as long as a peer on the network has an IPNS record it can be made available to other peers (although the records may be ignored if they are received after the IPNS record's End-of-Life/EOL).

# Organization of this document

  - [Introduction](#introduction)
  - [Protocol Overview](#pubsub-protocol-overview)
  - [Protocol](#protocol)
  - [Implementations](#implementations)

# Introduction

Each time a node publishes an updated IPNS record for a particular key it is propagated by the router into the network where network nodes can choose to accept or reject the new record.
When a node attempts to retrieve an IPNS record from the network it uses the router to query for the IPNS record(s) associated with the IPNS key; the node then validates the received records.

In this spec we address building a router based on a PubSub system, particularly focusing on libp2p PubSub.

# PubSub Protocol Overview

The protocol has four components:
- [IPNS Records and Validation](./IPNS.md)
- [libp2p PubSub](https://github.com/libp2p/specs/tree/master/pubsub)
- Translating an IPNS record name to/from a PubSub topic
- Layering persistence onto libp2p PubSub

# Translating an IPNS record name to/from a PubSub topic

For a given IPNS local record key described in the IPNS Specification the PubSub topic is:

**Topic format:** `/record/base64url-unpadded(key)`

where base64url-unpadded is an unpadded base64url as specified in [IETF RFC 4648](https://tools.ietf.org/html/rfc4648)

# Layering persistence onto libp2p PubSub

libp2p PubSub does not have any notion of persistent data built into it. However, we can layer persistence on top of PubSub by utilizing [libp2p Fetch](https://github.com/libp2p/specs/tree/master/fetch).

The protocol has the following steps:
1. Start State: Node `A` subscribes to the PubSub topic `t` corresponding to the local IPNS record key `k`
2. `A` notices that a node `B` has connected to it and subscribed to `t`
3. Some time passes (might be 0 seconds, or could use a more complex system to determine the duration)
4. `A` sends `B` a Fetch request for `k`
5. If Fetch returns a record that supersedes `A`'s current record then `A` updates its record and Publishes it to the network

Note: PubSub does not guarantee that a message sent by a peer `A` will be received by a peer `B` and it's possible
(e.g. in systems like [gossipsub](https://github.com/libp2p/specs/tree/master/pubsub/gossipsub))
that this is true even if `A` and `B` are already connected. Therefore, whenever `A` notices **any** node that has
connected to it and subscribed to `t` it should run the Fetch protocol as described above. However, developers may have routers
with properties that allow the amount of time in step 3 to increase arbitrarily large (including infinite) amounts.

# Protocol

A node `A` putting and getting updates to an IPNS key `k`, with computed PubSub topic `t`

1. PubSub subscribe to `t`
2. Run the persistence protocol, both to fetch data and return data to those that request it
3. When updating a record do a PubSub Publish and keep the record locally
4. When receiving a record if it's better than the current record keep it and republish the message
5. (Optional) Periodically republish the best record available

Note: 5 is optional because it is not necessary. However, receiving duplicate records are already handled efficiently
by the above logic and properly running the persistence protocol can be difficult (as in the example below). Periodic
republishing can then act as a fall-back plan in the event of errors in the persistence protocol.

Persistence Error Example:
1. `B` connects to `A`
2. `A` gets the latest record (`R1`) from `B`
3. `B` then disconnects from `A`
4. `B` publishes `R2`
5. `B` reconnects to `A`

If `A`'s checking of when `B` reconnects has problems it could miss `R2` (e.g. if it polled subscribed peers
every 10 seconds)

# Implementations

- Kubo
  - <https://github.com/ipfs/go-namesys>
  - <https://github.com/libp2p/go-libp2p-pubsub-router>
  - <https://github.com/ipfs/kubo/blob/master/docs/experimental-features.md#ipns-pubsub>
  - <https://github.com/ipfs/kubo/issues/8591>
