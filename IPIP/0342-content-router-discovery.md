# IPIP 0342: Content Router Ambient Discovery

- Start Date: 2022-11-11
- Related Issues:
  - https://hackmd.io/bh4-SCWfTBG2vfClG0NUFg
  - https://github.com/ipfs/kubo/issues/9150
  - https://github.com/filecoin-project/storetheindex/issues/823

## Summary

The Interplanetary stack has slowly opened itself to support extensibility of
the content routing subsystem. This extensibility is used today by network
indexers, like https://cid.contact/, to bridge content from large providers
that cannot practically provide all content to the IPFS DHT. A missing piece
of this story is that there is not a process by which IPFS nodes can discover
these alernative content routing systems automatically. This IPIP proposes
a mechanism by which IPFS nodes can discover and make use of content routing
systems.

## Motivation

There is currently not a process by which IPFS nodes can discover alernative
content routing systems automatically. This has led to a reliance on
centralized systems, like the hydra boosters, to fill the gap and offer
content only available in network indexer to current IPFS nodes. This strategy
is also insufficient long term because:
1. It limits speed to the use of a globally distributed kademlia DHT
2. It is insufficient for providing content in applications where content grows
    super-linearly to peers, such that the burden on a traditional DHT would
    become unsustainable.


## Detailed design

### 0. content-router discovery state tracking

Nodes will conceptually track a registry about known content routers.
This registry will be able to understand for a given content router two
properties:
* reliability - how many good vs bad responses has this router responded
with. This statistic should be windowed, such that the client can calculate
it in terms of the last week or month.
* performance - how quickly does this router respond.

This protocol expects nodes to be able to keep reliability (a metric
capturing both availability and correctness) separate from performance
for the purpose of propagating content routing information.

In addtion, nodes may wish to track the most recent time they have learned
content routing information from the other peers they are and have been
connected with.

### 1. content-routing as a libp2p protocol

IPFS nodes will advertise and coordinate discover of content routers using a
new libp2p protocol advertised as "".

The protocol will follow a request-response model.
A node will open a a stream on the protocol when it wants to discover new
content routers it does not already know.
It will send a bloom filter as it's query.
* The size of the bloom filter is chosen by the client, and is sized such
that it receives a greater than 99% certainly that it receives a useful
response. The maximum size of a query may be capped by the server, but can be
effectively considered to be under 10kb.
* The client will hash it's known content routers into the bloom filter
to set bits in the filter at the locations to which these known routers
hash.
* The server will have a parameter for a number of servers it wants to return
to content routing queries. By default this will be 10. (This default is picked
as the result of modeling router propagation). It will iterate through it's
list of known content routers, hashing htem against the bloom filter and
selecting the top routers that are not already known to the client. It will
return this list, along with it's reliability score for each. This response
is structured as an IPLD list lists, conceptually:
```json
[
  ["https://cid.contact/", 0.95],
  ["https://dev.cid.contact/", 0.90],
]
```

### 2. probing of the discovery protocol

A node will probe it's connected peers for content routing updates in two
situations:

1. When it needs to perform a content routing query, and has not
successfully performed a sync in over a day.
2. When it's auto-nat status indicates it is eligible to be a DHT server, and
it has not successfully performed a synce in over a day.

These parameters are also set through modeling.

To perform a probe, the node will consider the set of peers it is currently
connected to. It will order peers. The specific ordering is left to the
node, but it should strive for diversity - an example ordering would be to
rank peers by how recently a content routing discovery query has been make
to that peer, with tie breaking preference for LAN nodes and for boostrap
nodes.

### 3. selection of routers

Nodes are free to make content routing queries across content routing
systems they are aware of as they wish. An example strategy balancing
user experience and discovery is described.

The node maintains two thresholds:
* good (reliability > 99%, performance < 100ms)
* uncertain (queries < 5)

Content routers meeting the good reliability threshold are ordered by
perforamnce. the top one is queried, as is an 'uncertain' router if
one exists.

These threshold values are maintained for a year for the purposes
of local selection.
They are maintained for a month for the purpose of admitting
knowledge of routers to others - so a client will no longer set bits for
routers it is aware of but which do not meet it's threshold for 'good'
after a month. If peers then subseuqently respond with these nodes
on discovery probes, the local node may use that to consider the
node as again 'uncertain' and attempt additional probes against it less than
a year later.

Nodes which participate as DHT servers should also consider if they
are being used only in an infrastructural capacity. If they are
receiving content routing requests from other peers, but there have been
no direct requests from the node itself that can be used to move
known content routers past the 'uncertain' threshold, the node may
choose to issue content routing queries for a fraction of the DHT
lookup queries it receives as a way to maintain a more accurate
table of content  routers.

## Test fixtures

TK is a CID currently only available through the content routing system,
and not through the IPFS DHT. This is a piece of content that can be queried
to validate the presence of alternative content routing systems.

## Design rationale

As expressed in the motivation section, we need to design a system through
which nodes can discover content routers without a centralized point of
failure, and can use these routers to improve user performance for content
routing to levels faster than the current DHT.

This design is self-contained - it does not require standing up additional
infrastructure or making additional connections for discovery but rather
gossips routers over existing peer connections.

The design limits the ability of an adversary to impact user experience:
1. it does not propose at this stage to replace DHT queries, but only to
supplement them with content routing queries, which minimized user
noticable impact.
2. nodes will only propogate content routers they believe to work,
limiting the spread of spam / unavailable content routers to the directly
connected peers of an adversary.

With the exception of LAN tables, the other connections made by IPFS
nodes do not have geographic locality. As a result, performance is
separated in the tracking of content routers because it will not be
effective as a ranking factor in the non-geographically-aware
gossip system described here. As an optimization, nodes may choose to
prioritize 'fast' content routers when responding to queries from peers
where sharded latency observations may be relevant. For example:
* Peers on the local LAN
* Peers in the local /16 IPv4 subnet
* Peers with observed latency less than 25ms

### User benefit

Users will benefit from faster discovery of content providers.
Users will also benefit from access to more CIDs than they currently do through
queries limited to the IPFS DHT

### Compatibility

Nodes which do not upgrade to support this IPIP will be limited to the sub-set of
content available in the DHT. this will potentially degrade over time as more
large providers limit their publishing per the IPNI ingestion protocol.

Nodes may limit their complexity through a hard-coded list of known content
routers, essentially limiting their implementation to design section 3 of this
IPIP. In doing so, they may limit their risk of exposure to malicious parties.
They risk being out of date and to offer sub-optimal performance through their
failure to discover additional near-by content routing instances.

### Security

TODO: this section provides a rough sketch of arguments, but has not been fully
developed into prose at this time. At present, it is most useful for
comments and suggestions of other security considerations that should be
included as this draft develops.

#### 1. Malicious Content Routers
##### a. Providing Bad Content Routing Records

* records under double hashing are signed, so can't provide a record for a real peer
* if you provide non-working records, you are down-ranked

##### b. Availability Attacks / failing to provide records

* if list of records insufficient, client will get more from other providers in subsequent queries, leading to downranking

#### 2. Exposure of IPFS Clients (enumeration of network participants)

* a new provider is only visible to directly connected peers. they only forward it to peers asking them if it meets their bar
for reliability.  This means propogation through the network is only posisble for routers that behave correctly.
* because clients only propogate their 'top' routers, latency is also relevant, and with sufficient number of routers, the would only
propogate in their local geographic area before becoming uncompetitive on latencyk

### Alternatives

#### Ambient discovery in the style of circuit relays

Circuit relays are discovered ambiently by nodes during protocol enumeration.
When connecting with another libp2p node, IPFS nodes will probe
supported protocols. If they notice circut relay support at this time, they
make use of such aggregated knowledge when making connections needing the
support of relays.

This is not considered sufficient for content routing, because most content
routers will not act as general peers within the IPFS mesh, so they would
not be directly discovered. Instead, the gossip discovery protocol is
ambiently discovered in much the same way as circuit relays.

#### Advertisement in the DHT

This suffers from one of two problems depending on tuning: Either it results in
a global list that all clients see new providers, or it takes an inordinant
amount of querying before a client happens to run into a provider, leading to
degraded experiences for most clients. The single global list that a provider
can automatically add itself to leads to issues for how to mitigate an
enumeration of all network participants by a malicious content router.

#### Static list of known routers distributed with IPFS clients

This has worked for the current IPFS bootstrap node, but leads to the need for
policies around how to decide which content routers will be included in such a
list, and fails to evolve efficiently as new content routers are added to the
system.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
