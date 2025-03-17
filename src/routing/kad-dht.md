---
title: Kademlia DHT
description: >
  The IPFS Distributed Hash Table (DHT) specification defines a structured
  overlay network used for peer routing and content routing in the
  InterPlanetary File System (IPFS). It extends the libp2p Kademlia DHT
  specification, adapting and adding features to support IPFS-specific
  requirements.
date: FIXME
maturity: reliable
editors:
  - name: Guillaume Michel
    url: https://guillaume.michel.id
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

`FIXME:`

Distributed Key-Value Store

Goal of DHT is to find the closest peers to some key (in a specific geometry). Once this routing to the closest nodes is possible, nodes can interact with these nodes in various ways, including in asking them to store and serve data.

### DHT Operations

* Peer Routing
* Value storage and retrieval
* Content provider advertisement and dsicovery

### Relation to [libp2p kad-dht](https://github.com/libp2p/specs/tree/master/kad-dht)

The IPFS Kademlia DHT specification is a specialization of the libp2p Kademlia DHT.

It is possible to use an alternative DHT specification alongside an IPFS
implementation, rather than the one detailed here. This document specifically
outlines all protocol customizations and adaptations required for participation
in the [Amino DHT](#relation-to-the-amino-dht). If you're designing a new
Kademlia-based DHT for use with IPFS, some details in this specification may
appear overly specific or prescriptive.

### Relation to the [Amino DHT](#amino-dht)

Nodes participating in the [Amino DHT Swarm](#amino-dht) MUST implement the
IPFS Kademlia DHT specification. The IPFS Kademlia DHT specification MAY be
used in other DHT swarms as well.

## DHT Swarms

A DHT swarm is a group of interconnected nodes running the IPFS Kademlia DHT protocol, collectively identified by a unique protocol identifier. IPFS nodes MAY participate in multiple DHT swarms simultaneously. DHT swarms can be either public or private.

### Protocol Identifier

All nodes participating in the same DHT swarm MUST use the same libp2p protocol
identifier. The libp2p protocol identifier uniquely identifies a DHT swarm. It
follows the format `/<swarm-prefix>/kad/<version>`, e.g `/ipfs/kad/1.0.0` for
the Amino DHT protocol version `1.0.0`, or `/ipfs/lan/kad/1.0.0` for a local
DHT swarm.

Note that there could be multiple distinct DHT swarms using the same libp2p
protocol identifier as long as they don't have any common peers. This practice
is discouraged as networks will immediately merge if they enter in contact.
Each DHT swarm SHOULD have a dedicated protocol identifier.

### Amino DHT

The [Amino DHT](https://blog.ipfs.tech/2023-09-amino-refactoring/#why-amino) is
the swarm of peers also referred to as the _Public IPFS DHT_. It implements the
IPFS Kademlia DHT specification and uses the protocol identifier
`/ipfs/kad/1.0.0`. The Amino DHT can be joined by using the [Amino DHT
Bootstrappers](https://docs.ipfs.tech/concepts/public-utilities/#amino-dht-bootstrappers).

The Amino DHT is utilized by multiple IPFS implementations, including
[`kubo`](https://github.com/ipfs/kubo) and
[`helia`](https://github.com/ipfs/helia).

### Client and Server Mode

A node operating in Server Mode (or DHT Server) is responsible for responding
to lookup queries from other nodes and storing records. It stores a share of
the global DHT state, and needs to ensure that this state is up-to-date.

A node operating in Client Mode (or DHT Client) is simply a client able to make
requests to DHT Servers. DHT Client don't answer to queries and don't store
records.

Having a large number of reliable DHT servers benefits the network by
distributing the load of handling queries and storing records. Nodes SHOULD
operate in Server Mode if they are publicly reachable and have sufficient
resources. Conversely, nodes behind NATs or firewalls, or with intermittent
availability, low bandwidth, or limited CPU, RAM, or storage resources, SHOULD
operate in Client Mode. Operating a DHT server without the capacity to respond
quickly to queries negatively impacts network performance.

DHT Servers advertise the libp2p Kademlia protocol identifier via the [libp2p
identify
protocol](https://github.com/libp2p/specs/blob/master/identify/README.md). In
addition DHT Servers accept incoming streams using the Kademlia protocol
identifier. DHT Clients do not advertise support for the libp2p Kademlia
protocol identifier. In addition they do not offer the Kademlia protocol
identifier for incoming streams.

## Kademlia Keyspace

Kademlia [0] operates on a binary keyspace defined as $\lbrace 0,1 \rbrace^m$. In
particular, the IPFS Kademlia DHT uses a keyspace of length $m=256$, containing
all bitstrings of 256 bits. The distance between any pair of keys is defined as
the bitwise XOR of the two keys, resulting in a new key representing the
distance between the two keys. This keyspace is used for indexing both nodes
and content.

The Kademlia node identifier is derived from the node's [Peer
ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md). The
Kademlia node identifier is computed as the digest of the SHA256 hash function
of the binary representation of the Peer ID. The Kademlia identifier is a
256-bit number, which is used as the node's identifier in the Kademlia
keyspace.

Example:

```sh
PeerID b58 representation: 12D3KooWKudojFn6pff7Kah2Mkem3jtFfcntpG9X3QBNiggsYxK2
PeerID hex representation: 0024080112209e3b433cbd31c2b8a6ebbdca998bd0f4c2141c9c9af5422e976051b1e63af14d
Kademlia identifier (hex): e43d28f0996557c0d5571d75c62a57a59d7ac1d30a51ecedcdb9d5e4afa56100
```

## Routing Table

The Kademlia Routing Table maintains contact information about other DHT
Servers in the network. It has knowledge about all nearby nodes and
progressively fewer nodes as the XOR distance increases. This structure allows
efficient and rapid navigation of the network during lookups.

The Routing Table MUST contain information about at least `k` DHT Servers whose
Kademlia Identifier shares a common prefix of length `l` with the local node,
for every `l` in `[0, 255]`, provided such nodes exist. The set of `k` peers
sharing a common prefix of length `l` with the local node is called the
_bucket_ `l`.

In practice, buckets with smaller indices will typically be full, as many nodes
in the network share shorter prefix lengths with the local node. Conversely,
buckets beyond a certain index usually remain empty, since it's statistically
unlikely that any node will have an identifier sharing a very long common
prefix with the local node. For more information see [bucket population
measurements](https://github.com/probe-lab/network-measurements/blob/master/results/rfm19-dht-routing-table-health.md#peers-distribution-in-the-k-buckets).

The IPFS Kademlia DHT uses a bucket size of `k = 20`. This corresponds to the
`k` value as defined in the original Kademlia paper [0]. The `k` value is also
used as a replication factor and defines how many peers are returned to a
lookup request.

Note that DHT Clients are never included in a Routing Table.

Each DHT Server MUST store the public
[multiaddresses](https://github.com/libp2p/specs/blob/master/addressing/README.md)
for every node in its Routing Table. DHT Servers MUST discard nodes with only
private and/or relay multiaddresses. Additionally, DHT Servers must verify that
these nodes are reachable and replace any nodes that are no longer accessible.

### Replacement Policy

Nodes MUST NOT be removed from the Routing Table as long as they remain online.
Therefore, the bucket replacement policy is based on seniority, ensuring that
the most stable peers are eventually retained in the Routing Table.

#### IP Diversity Filter

`FIXME:` DHT Servers SHOULD implement an [IP Diversity Filter](https://github.com/libp2p/go-libp2p-kbucket/blob/ddb36fa029a18ea0fd5a2b61eeb7235913749615/peerdiversity/filter.go#L45).

### Routing Table Refresh

There are several strategies a DHT Server can use to verify that nodes in its
Routing Table remain reachable. Implementations may choose their own methods,
provided they avoid serving unresponsive nodes. One recommended strategy is to
periodically refresh the Routing Table.

DHT Servers SHOULD perform a Routing Table Refresh every `10` minutes. During
this process, the server sends a ping request to all nodes it hasn’t heard from
recently (e.g in the last 5 minutes). Any peer that fails to respond MUST be
removed from the Routing Table.

After removing unresponsive peers, any buckets that are not full MUST be
replenished with fresh, online peers. This can be accomplished by either adding
recently connected peers or by executing a `FIND_NODE` request with a randomly
generated Peer ID matching the bucket. `FIND_NODE` requests should only be run
for buckets up to the last non-empty bucket.

Finally, the refresh process concludes by executing a `FIND_NODE` request for
the local node's Peer ID, ensuring the DHT Server maintains up-to-date
information on its closest peers.

## Lookup Process

When performing a lookup for a Kademlia Identifier in the DHT, a node begins by
sending requests to known DHT servers whose identifiers are close to the
target. Each response provides information on peers that are even closer to the
target identifier, and the process continues iteratively until the absolute
closest peers are discovered.

### Iterative vs Recursive Lookup

In an iterative lookup, the querying node sends requests to several known DHT
servers. Each server returns a list of peers that are closer to the target
Kademlia Identifier, but does not continue the lookup process. The querying
node then directly contacts these closer peers, repeating the process until the
closest nodes are found.

In a recursive lookup, the querying node delegates the task to a peer that is
closer to the target. That peer then queries its own closer peers on behalf of
the original node, and this delegation continues recursively until the target
is reached.

The IPFS Kademlia DHT uses an iterative lookup approach because recursive
lookups can enable [amplification
attacks](https://en.wikipedia.org/wiki/Denial-of-service_attack#Amplification)
and make error handling more complex.

### Server behavior

Upon receiving a lookup request for a Kademlia Identifier, a DHT Server MUST
return the Peer ID and multiaddresses of the `k` closest nodes to the requested
Kademlia Identifier that are stored in its Routing Table. DHT Servers SHOULD
NOT return any information about unresponsive nodes.

In public DHT swarms, DHT Servers MUST filter out private and loopback
multiaddresses, and MUST NOT include peers whose only addresses are private or
loopback.

`FIXME:` Define whether DHT Server should return information about itself and
about requester.

### Client behavior

When a client initiates a lookup for a Kademlia Identifier `kid` (DHT Servers
can initiate lookups as clients), it starts by selecting the closest nodes to
`kid` in XOR distance, and put them in a list/set. Then it sends requests for
`kid` to the closest nodes (see [concurrency](#concurrency)) to `kid` from the
list.

Upon receiving a response, the client adds freshly received peers to the list
of closest peers. It sends a request to the closest peer to `kid` that hasn't
been queried yet. The client ignores timeouts and invalid responses.

When a client (or a DHT server acting as a client) initiates a lookup for a
Kademlia Identifier `kid`, it begins by selecting the known nodes closest to
`kid` in terms of XOR distance, and adds them to a candidate list. It then
sends lookup requests to the closest nodes from that list.

As responses are received, any newly discovered peers are added to the
candidate list. The client proceeds by sending a request to the nearest peer to
`kid` that has not yet been queried. Invalid responses and timeouts are simply
discarded.

#### Termination

The lookup process continues until the `k` closest reachable peers to `kid`
have been successfully queried. The process may also be terminated early if the
request-specific success criteria are met. Additionally, if every candidate
peer has been queried without discovering any new ones, the lookup will
terminate.

#### Concurrency

A client MAY have multiple concurrent in-flight queries to distinct nodes for
the same lookup. This behavior is specific to the client and does not affect
how DHT servers operate.

It is recommended that the maximum number of in-flight requests (denoted by
`α`) be set to `10`.

## Peer Routing

DHT Clients that want to be routable must make sure they are in the peerstore of the closest DHT servers to their own PeerID.

When performing a `FIND_NODE` lookup, the client will converge to the closest nodes in XOR distance to the requested PeerID. These nodes are expected to know the multiaddrs of the target peer. The

### `FIND_NODE` Termination

### Routing to non-DHT Servers

### Signed Peer Records

## Content Routing

### Content Kademlia Identifier

sha256

### Lookup Termination and Resiliency

Resiliency: Implementation specific. Recommendation is `3`

### Provider Records

#### Provide Validity

Provide Validity defines the time-to-live (TTL) of a Provider Record on a DHT
Server. DHT Servers MUST implement a Provide Validity of `48h`.

#### Provider Record Republish Interval

Because of the churn in the network, Provider Records need to be republished
more often than their validity period. DHT Clients SHOULD republish Provider
Records every `22h`
([rationale](https://github.com/probe-lab/network-measurements/blob/master/results/rfm17-provider-record-liveness.md#42-alternative-k-values-and-their-performance-comparison)).

#### Provider Addresses TTL

DHT Servers SHOULD persist the multiaddresses of providers for `24h` after the
`PROVIDE` operation. This allows DHT Servers to serve the multiaddresses of the
content provider alongside the provide record, avoiding an additional DHT walk
for the Client
([rationale](https://github.com/probe-lab/network-measurements/blob/master/results/rfm17.1-sharing-prs-with-multiaddresses.md)).

### IPNS

### Validators

## RPC Messages

Remote procedure calls are performed by:

1. Opening a new stream.
2. Sending the RPC request message.
3. Listening for the RPC response message.
4. Closing the stream.

On any error, the stream is reset.

Implementations MAY re-use streams by sending one or more RPC request messages
on a single outgoing stream before closing it. Implementations MUST handle
additional RPC request messages on an incoming stream.

All RPC messages sent over a stream are prefixed with the message length in
bytes, encoded as an unsigned variable length integer as defined by the
[multiformats unsigned-varint
spec](https://github.com/multiformats/unsigned-varint).

All RPC messages conform to the following protobuf:

```protobuf
syntax = "proto3";

// Record represents a dht record that contains a value
// for a key value pair
message Record {
    // The key that references this record
    bytes key = 1;

    // The actual value this record is storing
    bytes value = 2;

    // Note: These fields were removed from the Record message
    //
    // Hash of the authors public key
    // optional string author = 3;
    // A PKI signature for the key+value+author
    // optional bytes signature = 4;

    // Time the record was received, set by receiver
    // Formatted according to https://datatracker.ietf.org/doc/html/rfc3339
    string timeReceived = 5;
};

message Message {
    enum MessageType {
        PUT_VALUE = 0;
        GET_VALUE = 1;
        ADD_PROVIDER = 2;
        GET_PROVIDERS = 3;
        FIND_NODE = 4;
        PING = 5;
    }

    enum ConnectionType {
        // sender does not have a connection to peer, and no extra information (default)
        NOT_CONNECTED = 0;

        // sender has a live connection to peer
        CONNECTED = 1;

        // sender recently connected to peer
        CAN_CONNECT = 2;

        // sender recently tried to connect to peer repeatedly but failed to connect
        // ("try" here is loose, but this should signal "made strong effort, failed")
        CANNOT_CONNECT = 3;
    }

    message Peer {
        // ID of a given peer.
        bytes id = 1;

        // multiaddrs for a given peer
        repeated bytes addrs = 2;

        // used to signal the sender's connection capabilities to the peer
        ConnectionType connection = 3;
    }

    // defines what type of message it is.
    MessageType type = 1;

    // defines what coral cluster level this query/response belongs to.
    // in case we want to implement coral's cluster rings in the future.
    int32 clusterLevelRaw = 10; // NOT USED

    // Used to specify the key associated with this message.
    // PUT_VALUE, GET_VALUE, ADD_PROVIDER, GET_PROVIDERS
    bytes key = 2;

    // Used to return a value
    // PUT_VALUE, GET_VALUE
    Record record = 3;

    // Used to return peers closer to a key in a query
    // GET_VALUE, GET_PROVIDERS, FIND_NODE
    repeated Peer closerPeers = 8;

    // Used to return Providers
    // GET_VALUE, ADD_PROVIDER, GET_PROVIDERS
    repeated Peer providerPeers = 9;
}
```

These are the requirements for each `MessageType`:

* `FIND_NODE`: In the request `key` must be set to the binary `PeerId` of the
node to be found. In the response `closerPeers` is set to the DHT Server's `k`
closest `Peer`s.

* `GET_VALUE`: In the request `key` is an unstructured array of bytes.
`closerPeers` is set to the `k` closest peers. If `key` is found in the
datastore `record` is set to the value for the given key.

* `PUT_VALUE`: In the request `record` is set to the record to be stored and
`key` on `Message` is set to equal `key` of the `Record`. The target node
validates `record`, and if it is valid, it stores it in the datastore and as a
response echoes the request.

* `GET_PROVIDERS`: In the request `key` is set to the multihash contained in
the target CID. The target node returns the known `providerPeers` (if any) and
the `k` closest known `closerPeers`.

* `ADD_PROVIDER`: In the request `key` is set to the multihash contained in the
target CID. The target node verifies `key` is a valid multihash, all
`providerPeers` matching the RPC sender's PeerID are recorded as providers.

* `PING`: Deprecated message type replaced by the dedicated [ping
protocol](https://github.com/libp2p/specs/blob/master/ping/ping.md).

If a DHT server receives an invalid request, it simply closes the libp2p stream
without responding.

## Backpressure

TBD

## Client Optimizations

### LAN DHT Swarms

Fine to store private multiaddresses in the routing table and serve them to other nodes in the same LAN DHT swarm.

### Checking peer behaviour before adding to routing table

Make a `FIND_NODE` request and inspect response before adding node to RT. Followed https://blog.ipfs.tech/2023-ipfs-unresponsive-nodes/

## libp2p Kademlia DHT Implementations

* Go: [`libp2p/go-libp2p-kad-dht`](https://github.com/libp2p/go-libp2p-kad-dht)
* JS: [libp2p/kad-dht](https://github.com/libp2p/js-libp2p/tree/main/packages/kad-dht)
* Rust: [libp2p-kad](https://github.com/libp2p/rust-libp2p/tree/master/protocols/kad)

## References

[0]: Maymounkov, P., & Mazières, D. (2002). Kademlia: A Peer-to-Peer Information System Based on the XOR Metric. In P. Druschel, F. Kaashoek, & A. Rowstron (Eds.), Peer-to-Peer Systems (pp. 53–65). Berlin, Heidelberg: Springer Berlin Heidelberg. [DOI](https://doi.org/10.1007/3-540-45748-8_5) [pdf](https://www.scs.stanford.edu/~dm/home/papers/kpos.pdf)
