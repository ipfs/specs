---
title: IPFS Kademlia DHT
description: >
  The IPFS Distributed Hash Table (DHT) specification defines a structured
  overlay network used for peer and content routing in the InterPlanetary File
  System (IPFS). It extends the libp2p Kademlia DHT specification, adapting and
  adding features to support IPFS-specific requirements.
date: 2025-03-24
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
overlay network used for peer and content routing in the InterPlanetary File
System (IPFS). It extends the libp2p Kademlia DHT specification, adapting and
adding features to support IPFS-specific requirements.

## Introduction

The Kademlia Distributed Hash Table (DHT) is a decentralized key-value store
designed to enable efficient and scalable peer-to-peer routing. It provides a
structured overlay network that allows nodes to locate peers and content in a
distributed system without relying on centralized servers.

The primary goal of the Kademlia routing algorithm is to progressively discover
and interact with nodes that are closest to a given key based on the network's
distance metric. Once a node has identified the closest peers, it can either:

* **Locate a specific peer** in the network
* **Find content providers** serving content associated with a CID
* **Store and retrieve values** directly within the DHT, such as IPNS names

### Relation to libp2p kad-dht

The IPFS Kademlia DHT specification extends the [libp2p Kademlia
DHT](https://github.com/libp2p/specs/tree/master/kad-dht), with practical
details related to CID, IPNS, and content providing.

It is possible to use an alternative DHT specification alongside an IPFS
implementation, rather than the one detailed here. This document specifically
outlines all protocol customizations and adaptations required for participation
in the [Amino DHT](#relation-to-the-amino-dht). If you're designing a new
Kademlia-based DHT for use with IPFS, some details in this specification may
appear overly specific or prescriptive.

### Relation to the Amino DHT

Nodes participating in the public [Amino DHT Swarm](#amino-dht) MUST implement the
IPFS Kademlia DHT specification. The IPFS Kademlia DHT specification MAY be
used in other DHT swarms as well.

## DHT Swarms

A DHT swarm is a group of interconnected nodes running the IPFS Kademlia DHT
protocol, collectively identified by a unique libp2p protocol identifier. IPFS
nodes MAY participate in multiple DHT swarms simultaneously. DHT swarms can be
either public or private.

### Identifiers & Existing Swarms

Every DHT swarm is associated with a specific libp2p protocol identifier, and
all nodes within that swarm must use it. Public DHT swarms MUST use a unique
libp2p protocol identifier, whereas private swarms SHOULD use a distinct
identifier. Although private swarms may reuse an identifier if their networks
remain isolated, they will merge upon interaction. Therefore, unique
identifiers SHOULD be used.

#### Amino DHT

[_Amino DHT_]((https://blog.ipfs.tech/2023-09-amino-refactoring/#why-amino)) is
a public instance of the _IPFS Kademlia DHT_ spec mounted under
`/ipfs/kad/1.0.0` libp2p protocol, it is also referred to as the _Public IPFS
DHT_.

:::note
The Amino DHT is utilized by multiple IPFS implementations, including
[`kubo`](https://github.com/ipfs/kubo) and
[`helia`](https://github.com/ipfs/helia)
and can be joined by using the [public good Amino DHT Bootstrappers](https://docs.ipfs.tech/concepts/public-utilities/#amino-dht-bootstrappers).
:::

#### IPFS LAN DHTs

_IPFS LAN DHTs_ are DHT swarms operating exclusively within a local network.
Thy are accessible only to nodes within the same network and are identified by
the libp2p protocol `/ipfs/lan/kad/1.0.0`.

In a LAN DHT:
* Only hosts on the local network MAY be added to the routing table.
* By default, all hosts operate in [server mode](#client-and-server-mode).

Although many IPFS LAN DHTs use the same protocol identifier, each swarm is
distinct because its scope is limited to its own local network.

Nodes MAY participate in LAN DHTs, enabling fast peer and content discovery in
their local network.

#### Creating a Custom DHT Swarm

Custom DHT swarms can be created to serve specific use cases by meeting these
requirements:
* **Unique libp2p Protocol Identifier**: All nodes in a DHT swarm MUST use the
same libp2p protocol identifier. A suggested format is
`/<swarm-prefix>/kad/<version>`. Note that if two public swarms share the same
protocol identifier and encounter each other, they will merge.
* **Consistent Protocol Implementation**: All nodes participating in the swarm
MUST implement the same DHT protocol, including support for all defined RPC
messages and behaviors.
* **Bootstrapper Nodes**: To join a swarm, a new node MUST know the
multiaddresses of at least one existing node participating in the swarm.
Dedicated bootstrapper nodes MAY be used to facilitate this process. They
SHOULD be publicly reachable, maintain high availability and possess sufficient
resources to support the network.

### Client and Server Mode

A node operating in Server Mode (or DHT Server) is responsible for responding
to lookup queries from other nodes and storing records. It stores a share of
the global DHT state, and needs to ensure that this state is up-to-date.

A node operating in Client Mode (or DHT Client) is simply a client able to make
requests to DHT Servers. DHT Clients don't answer to queries and don't store
records.

Having a large number of reliable DHT Servers benefits the network by
distributing the load of handling queries and storing records. Nodes SHOULD
operate in Server Mode if they are publicly reachable and have sufficient
resources. Conversely, nodes behind NATs or firewalls, or with intermittent
availability, low bandwidth, or limited CPU, RAM, or storage resources, SHOULD
operate in Client Mode. Operating a DHT server without the capacity to respond
quickly to queries negatively impacts network performance and SHOULD be avoided.

DHT Servers MUST advertise the libp2p Kademlia protocol identifier via the [libp2p
identify
protocol](https://github.com/libp2p/specs/blob/master/identify/README.md). In
addition DHT Servers MUST accept incoming streams using the libp2p Kademlia protocol
identifier.

DHT Clients MUST NOT advertise support for the libp2p Kademlia protocol
identifier nor offer the libp2p Kademlia protocol identifier for incoming
streams.

DHT Clients MAY Provide [Content](#provider-record-routing) and
[Records](#value-storage-and-retrieval) to the network, content providing is
not exclusive to DHT Servers.

### Networking

All nodes MUST run the libp2p network stack.

DHT Servers MUST support the [libp2p ping
protocol](https://github.com/libp2p/specs/blob/master/ping/ping.md) to allow
probing by other DHT nodes.

DHT Servers MUST support `TCP` with [`Yamux`](https://github.com/libp2p/specs/blob/master/yamux/README.md) multiplexing
and SHOULD support [`QUIC`](https://github.com/libp2p/specs/blob/master/quic/README.md) over UDP as a modern alternative to TCP.
For secure communication, DHT Servers MUST support both
[`TLS`](https://github.com/libp2p/specs/blob/master/tls/tls.md) and
[`Noise`](https://github.com/libp2p/specs/blob/master/noise/README.md).
It is essential that all DHT Servers are able to open a connection to each
other. Additionally, DHT Servers SHOULD support [`WebRTC
direct`](https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md),
[Secure
`WebSockets`](https://github.com/libp2p/specs/blob/master/websockets/README.md)
and
[`WebTransport`](https://github.com/libp2p/specs/blob/master/webtransport/README.md).
DHT Servers adoption of browser-based transports is encouraged to allow for
browser-based DHT Clients to interact with the DHT.

DHT Clients SHOULD support `TCP` with [`Yamux`](https://github.com/libp2p/specs/blob/master/yamux/README.md) multiplexing
and [`QUIC`](https://github.com/libp2p/specs/blob/master/quic/README.md) over UDP whenever possible. For secure communication, clients SHOULD support both
[`TLS`](https://github.com/libp2p/specs/blob/master/tls/tls.md) and
[`Noise`](https://github.com/libp2p/specs/blob/master/noise/README.md).
They MAY also support additional libp2p transports. However,
to guarantee discovery of existing records in the DHT, a client MUST implement
at least one transport (`QUIC` or `TCP`+`Yamux`) with at least one security
protocol (`TLS` or `Noise`).

Clients that cannot support the required transports and security protocols (e.g.,
browser-based nodes) MAY still act as DHT Clients, but their ability to find
records in the DHT will be limited.

## Kademlia Keyspace

<!-- TODO: add LaTeX or MathML support and fix below paragraph -->
Kademlia [`[0]`](#bibliography) operates on a binary keyspace defined as $\lbrace 0,1 \rbrace^m$. In
particular, the IPFS Kademlia DHT uses a keyspace of length $m=256$, containing
all bitstrings of 256 bits. The distance between any pair of keys is defined as
the bitwise XOR of the two keys, resulting in a new key representing the
distance between the two keys. This keyspace is used for indexing both nodes
and content.

The Kademlia node identifier is derived from the libp2p node's [Peer
ID](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md). The
Kademlia node identifier is computed as the digest of the SHA2-256 hash
function of the binary representation of the Peer ID. The Kademlia identifier
is a 256-bit number, which is used as the node's identifier in the Kademlia
keyspace.

Example:

```sh
PeerID b58 representation: 12D3KooWKudojFn6pff7Kah2Mkem3jtFfcntpG9X3QBNiggsYxK2
PeerID CID representation: k51qzi5uqu5djx47o56x8r9lvy85co0sdf1yfbzxlukdq4irr8ssn3o7dpfasp
PeerID hex representation: 0024080112209e3b433cbd31c2b8a6ebbdca998bd0f4c2141c9c9af5422e976051b1e63af14d
Kademlia identifier (hex): e43d28f0996557c0d5571d75c62a57a59d7ac1d30a51ecedcdb9d5e4afa56100
```

## Routing Table

The Kademlia Routing Table maintains contact information about other DHT
Servers in the network. It has knowledge about all nearby nodes and
progressively fewer nodes as the XOR distance increases. This structure allows
efficient and rapid navigation of the network during lookups.

### Bucket Size

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
`k` value as defined in the original Kademlia paper [`[0]`](#bibliography). The `k` value is also
used as a replication factor and defines how many peers are returned to a
lookup request.

Note that DHT Clients are never included in a Routing Table.

Each DHT Server MUST store the public
[multiaddresses](https://github.com/libp2p/specs/blob/master/addressing/README.md)
for every node in its Routing Table. DHT Servers MUST discard nodes with only
private and/or relay multiaddresses. Additionally, DHT Servers MUST verify that
these nodes are reachable and replace any nodes that are no longer accessible.

### Replacement Policy

Nodes MUST NOT be removed from the Routing Table as long as they remain online.
Therefore, the bucket replacement policy is based on seniority, ensuring that
the most stable peers are eventually retained in the Routing Table.

#### IP Diversity Filter

DHT servers SHOULD implement an IP Diversity Filter to ensure that nodes in
their routing table originate from a diverse set of Autonomous System Numbers
(ASNs). This measure helps mitigate Sybil attacks and enhances the network’s
resilience.

Implementations SHOULD impose the following limits:

* **Globally**, a maximum of `3` nodes sharing the same IP grouping should be
allowed in the routing table.
* **Per routing table bucket**, a maximum of `2` nodes from the same IP
grouping should be permitted.

For IP grouping:

* **IPv6 addresses** are grouped by ASN.
* **IPv4 addresses** are grouped by `/16` prefixes, except for [legacy Class A
blocks](https://en.wikipedia.org/wiki/List_of_assigned_/8_IPv4_address_blocks),
which are grouped by `/8` prefixes.

Since a single node can advertise multiple addresses, a peer MUST NOT be added
to the routing table if any of its addresses already exceed the allowed
representation within the table.

### Routing Table Refresh

There are several strategies a DHT Server can use to verify that nodes in its
Routing Table remain reachable. Implementations may choose their own methods,
provided they avoid serving unresponsive nodes. The recommended strategy is to
periodically refresh the Routing Table.

When using periodic refresh, DHT Servers SHOULD perform a Routing Table Refresh
every `10` minutes. During this process, the server sends a ping request to all
nodes it hasn't heard from recently (e.g in the last 5 minutes). Any peer that
fails to respond MUST be removed from the Routing Table.

After removing unresponsive peers, any buckets that are not full MUST be
replenished with fresh, online peers. This can be accomplished by either adding
recently connected peers or by executing a `FIND_NODE` [RPC
message](#rpc-messages) with a randomly generated Peer ID matching the bucket.
`FIND_NODE` requests should only be run for buckets up to the last non-empty
bucket.

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

Upon receiving a lookup request for a Kademlia Identifier `kid`, a DHT Server
MUST return the Peer ID and multiaddresses of the `k` closest DHT Servers to
`kid` that are stored in its Routing Table. It SHOULD NOT include itself, nor
the requester in the response. If itself or the requester's Peer ID are among
the `k` closest DHT Servers, it SHOULD return the next closest nodes instead,
to return a total of `k` DHT Servers. DHT Servers SHOULD NOT return any
information about unresponsive nodes.

In public DHT swarms, DHT Servers MUST filter out private and loopback
multiaddresses, and MUST NOT include DHT Servers whose only addresses are
private or loopback.

A DHT Server SHOULD always return information about the `k` closest DHT Servers
to `kid` (excluding self and the requester), provided its routing table
contains enough DHT Servers, even if these DHT Servers are not closer to `kid`
than self or the requester.

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

The resilience parameter (`β`) defines the number of closest reachable peers
that must be successfully queried before a lookup is considered complete.
Implementations SHOULD set `β` to `3`, ensuring that multiple nodes confirm the
lookup result for increased reliability.

The lookup process continues until the `β` closest reachable peers to `kid`
have been queried. However, the process MAY terminate earlier if the
request-specific success criteria are met. Additionally, if all candidate peers
have been queried without discovering any new ones, the lookup MUST terminate.

#### Concurrency

A client MAY have multiple concurrent in-flight queries to distinct nodes for
the same lookup. This behavior is specific to the client and does not affect
how DHT servers operate.

The maximum number of in-flight requests (denoted by `α`) SHOULD be set to `10`.

## Peer Routing

Implementations typically provide two interfaces for peer routing using the
`FIND_NODE` RPC:
- [`FindPeer`](#findpeer), which locates a specific Peer ID, and
- [`GetClosestPeers`](#getclosestpeers), which finds the `k` closest peers to a given key.

### `FindPeer`

`FindPeer` is the process of discovering the multiaddresses of a given Peer ID.
The requester uses the `FIND_NODE` RPC, including the bytes representation of
the target Peer ID in the `key` field. The lookup eventually converges on the
target Peer ID. The lookup process terminates early if the requester has
established a connection to the target Peer ID.

#### Discovering non-DHT Servers

DHT clients that want to remain routable MUST ensure their multiaddresses are
stored in the peerstore of the DHT Servers closest to them in XOR distance.
Since peerstore entries expire over time, DHT Clients SHOULD periodically
reconnect to their closest DHT servers to prevent their information from being
removed. Implementations SHOULD perform this reconnection every 10 minutes.

When receiving a `FIND_NODE` request for a given Peer ID, DHT Servers MUST
always respond with the information of that Peer ID, if it is included in their
peerstore, even if the target node isn't a DHT Server or only advertises
private addresses. Moreover, if the target Peer ID is self, or the requester's
Peer ID, the corresponding peer information should be included in addition to
the `k` closest DHT Servers.

### `GetClosestPeers`

`GetClosestPeers` also makes use of the `FIND_NODE` RPC, but allows the sender
to look for the `k` closest peers to any key. The `key` provided to `FIND_NODE`
corresponds to the preimage of the Kademlia Identifier, as described
[below](#content-kademlia-identifier).

`GetClosestPeers` is used for the purpose of Content Routing
([Provider Record Routing](#provider-record-routing)).

## Provider Record Routing

Provider Record Routing is IPFS-specific process of locating peers that provide a
specific piece of content, identified by its CID. This is achieved by storing
and retrieving Provider Records in the DHT.

### Provider Records

A Provider Record is an entry stored in the DHT associating a CID with one or
more Peer IDs providing the corresponding content. Instead of storing the
content itself, the DHT stores provider records pointing to the peers hosting
the content.

A Provider Record is identified by the [multihash] contained by the [CID]. It
functions as an append-only list, where multiple providers can add themselves
as content hosts. Since strict consistency across the network is not required,
different DHT servers MAY store slightly different sets of providers, but the
lookup mechanism ensures that clients can still discover multiple sources
efficiently.

### Content Kademlia Identifier

The Kademlia Identifier associated with a CID is derived from the multihash
contained by the CID, by hashing it with the SHA2-256 hash function. The
resulting 256-bit digest is used as the Kademlia Identifier for the content.

Example:

```sh
CIDv1 (base32)           : bafybeihfg3d7rdltd43u3tfvncx7n5loqofbsobojcadtmokrljfthuc7y
Multihash from CID (hex) : 1220e536c7f88d731f374dccb568aff6f56e838a19382e488039b1ca8ad2599e82fe
Kademlia Identifier (hex): d623250f3f660ab4c3a53d3c97b3f6a0194c548053488d093520206248253bcb
```

### Content Provider Advertisement

When a node wants to indicate that it provides the content associated with a
given CID, it first finds the `k` closest DHT Servers to the Kademlia
Identifier associated with the CID using [`GetClosestPeers`](#getclosestpeers).
The `key` in the `FIND_NODE` payload is set to the multihash contained in the
CID.

Once the `k` closest DHT Servers are found, the node sends each of them an
`ADD_PROVIDER` RPC, using the same `key` and setting its own Peer ID as
`providerPeers`. Providers MUST indicate their listen multiaddresses to be
cached and served with the provider record.

The DHT Servers MUST make 2 checks before adding the provided `record` to their
datastore:
1. Verify that `key` is set, and doesn't exceed `80` bytes in size
2. Discard `providerPeers` whose Peer ID is not matching the sender's Peer ID

Upon successful verification, the DHT Server stores the Provider Record in its
datastore, and caches the provided public multiaddresses. It responds by
echoing the request to confirm success. If verification fails, the server MUST
close the stream without sending a response.

#### Provide Validity

Provide Validity defines the time-to-live (TTL) of a Provider Record on a DHT
Server. DHT Servers MUST implement a Provide Validity of `48h`, and discard the
record after expiration.

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

### Content Provider Lookup

To find providers for a given CID, a node initiates a lookup using the
`GET_PROVIDERS` RPC. This process follows the same approach as a `FIND_NODE`
lookup, but with one key difference: if a DHT server holds a matching provider
record, it MUST include it in the response.

Clients MAY terminate the lookup early if they are satisfied with the returned
providers. If a node does not find any provider records and is unable to
discover closer DHT servers after querying the `β` closest reachable servers,
the request is considered a failure.

## Value Storage and Retrieval

The IPFS Kademlia DHT allows users to store and retrieve records directly
within the DHT. These records serve as key-value mappings, where the key and
value are defined as arrays of bytes. Each record belongs to a specific
keyspace, which defines its type and structure.

The IPFS Kademlia DHT supports two types of records, each stored in its own
keyspace:

1. **Public Key Records** (`/pk/`) – Used to store public keys that cannot be
   derived from Peer IDs.
2. **IPNS Records** (`/ipns/`) – Used for decentralized naming and content
   resolution. See
   [IPNS Routing Record](https://specs.ipfs.tech/ipns/ipns-record/#routing-record)
   and [IPNS Record Verification](https://specs.ipfs.tech/ipns/ipns-record/#record-verification).

Records with the above prefixes MUST meet validity criteria specific to their
record type before being stored or updated. DHT Servers MUST verify the
validity of each record before accepting it. Records with other prefixes are
not supported by the IPFS Kademlia DHT and MUST be rejected.

### Record Routing

The Kademlia Identifier of a record is derived by applying the SHA2-256 hash
function to the record’s key and using the resulting digest in binary format.

To store a value in the DHT, a client first finds the `k` closest peers to the
record’s Kademlia Identifier using `GetClosestPeers`. The client then sends a
`PUT_VALUE` RPC to each of these peers, including the `key` and the `record`.
DHT servers MUST validate the record based on its type before accepting it.

Retrieving values from the DHT follows a process similar to provider record
lookups. Clients send a `GET_VALUE` RPC, which directs the search toward the
`k` closest nodes to the target `key`. If a DHT Server holds a matching
`record`, it MUST include it in its response. The conditions for terminating
the lookup depend on the specific record type.

### Public Keys

Some public keys are too large to be embedded within libp2p Peer IDs ([keys
larger than 42
bytes](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md#peer-ids)).
In such cases, the Peer ID is derived from the hash of the public key, but the
full key still needs to be accessible. To facilitate retrieval, public keys MAY
be stored directly in the DHT under the `/pk/` keyspace.

1. Key: `/pk/<PeerID>` (binary Peer ID format).
2. Value: The full public key (in binary format).

#### Validation

DHT servers MUST verify that the Peer ID derived from the full public key
matches the Peer ID encoded in the key. If the derived Peer ID does not match,
the record MUST be rejected.

### IPNS

IPNS (InterPlanetary Naming System) allows peers to publish mutable records
that point to content in IPFS. These records MAY be stored in the DHT under the
`/ipns/` namespace.

Record format and validation is documented in the [IPNS
specification](https://specs.ipfs.tech/ipns/ipns-record/).

IPNS implementations MUST follow [IPNS Routing Record](https://specs.ipfs.tech/ipns/ipns-record/#routing-record),
[IPNS Record Verification](https://specs.ipfs.tech/ipns/ipns-record/#record-verification),
and [IPNS Record Size Limit](https://specs.ipfs.tech/ipns/ipns-record/#record-size-limit).

#### Quorum

A quorum is the minimum number of distinct responses a client must collect from
DHT Servers to determine a valid result. Since different DHT Servers may store
different versions of an IPNS record, a client fetches the record from multiple
DHT Servers to increase the likelihood of retrieving the most recent version.

For IPNS lookups, the default quorum value is `16`, meaning the client attempts
to collect responses from at least `16` DHT Servers out of `20` before
determining the best available record.

#### Entry Correction

Because some DHT servers may store outdated versions of a record, clients need
to ensure that the latest valid version is propagated. After obtaining a
quorum, the client MUST send the most recent valid record to any of the `k`
closest DHT Servers to the record’s Kademlia Identifier that did not return the
latest version.

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
        PING = 5; // DEPRECATED
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

# Appendix: Notes for Implementers

## Client Optimizations

### Dual DHTs

Implementations MAY join multiple DHT swarms simultaneously—for example, both a
local and a public swarm. Typically, write operations are executed on both
swarms, while read operations are performed in parallel, returning the result
from whichever responds first.

Using a local DHT alongside a global one enables faster discovery of peers and
content within the same network.

### Verifying DHT Server

Implementations MAY perform additional checks to ensure that DHT servers behave
correctly before adding them to the routing table. In the past, misconfigured
nodes have been added to routing tables, leading to [network
slowdowns](https://blog.ipfs.tech/2023-ipfs-unresponsive-nodes/).

For example, kubo verifies a DHT server by sending a FIND_NODE request for its
own Peer ID before adding it to the routing table
([reference](https://github.com/libp2p/go-libp2p-kad-dht/blob/master/optimizations.md#checking-before-adding)).
The server is only added if its response contains at least one peer. This check
is skipped during the initial routing table setup.

## libp2p Kademlia DHT Implementations

* Go: [`libp2p/go-libp2p-kad-dht`](https://github.com/libp2p/go-libp2p-kad-dht)
* JS:
[libp2p/kad-dht](https://github.com/libp2p/js-libp2p/tree/main/packages/kad-dht)
* Rust:
[libp2p-kad](https://github.com/libp2p/rust-libp2p/tree/master/protocols/kad)

# Bibliography <!-- TODO: handle citations better - xref is not enough, does not support DOI papers -->

[CID]: https://github.com/multiformats/cid/
[multihash]: https://github.com/multiformats/multihash

[0]: Maymounkov, P., & Mazières, D. (2002). Kademlia: A Peer-to-Peer
Information System Based on the XOR Metric. In P. Druschel, F. Kaashoek, & A.
Rowstron (Eds.), Peer-to-Peer Systems (pp. 53–65). Berlin, Heidelberg: Springer
Berlin Heidelberg. [DOI](https://doi.org/10.1007/3-540-45748-8_5)
[PDF](https://www.scs.stanford.edu/~dm/home/papers/kpos.pdf)
