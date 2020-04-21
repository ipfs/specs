# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Bitswap

**Authors(s)**:
- David Dias
- Jeromy Johnson
- Juan Benet

**Maintainers(s)**:

* * *

**Abstract**

Bitswap is the data trading module for IPFS. Its purpose is to request blocks from and send blocks to other peers in the network. Bitswap has two primary jobs:
1. Attempt to acquire blocks from the network that have been requested by the client.
2. Judiciously (though strategically) send blocks in its possession to other peers who want them.

# Organization of this document

- [Introduction](#introduction)
- [Subsystems](#subsystems)
- [Implementation Details](#implementation-details)
- [API Spec](#api-spec)
- [Implementations](#implementations)

# Introduction

Bitswap is IPFS’s central block exchange protocol. It handles the requests made by an IPFS user, human, or application to fetch data blocks from the network. It interacts with other Bitswap agents present in other IPFS nodes, exchanging (fetching + serving) blocks as it needs.

Bitswap is a message based protocol, as opposed to response-reply. All messages contain wantlists, or blocks. Upon receiving a wantlist, an IPFS node should consider sending out wanted blocks if it has them. Upon receiving blocks, the node should send out a notification called a `Cancel` signifying that they no longer want the block. At the protocol level, Bitswap is very simple.

While Bitswap is a relatively simple protocol, a time- and memory- performant implementation requires that many details be carefully thought out. We aim to document these details here so that future implementers may build upon the knowledge gathered over the several iterations of Bitswap.

# Subsystems

There are two primary flows that Bitswap manages: requesting blocks from and serving blocks to peers. Block requests are primarily mediated by the want-manager, which tells our peers whenever we want a new block. Serving blocks is primarily handled by the decision engine, which decides how resources should be allocated among our peers.

The subsystems involved in these flows are detailed in the following subsections.

**TODO**: Update graphic

![](https://cloud.githubusercontent.com/assets/1211152/21071077/4620387a-be4a-11e6-895c-aa8f2b06aa4e.png)

## Types

The following types are used in the descriptions of the Bitswap subsystems.

  - `CID`: A [content-addressed identifier](https://github.com/ipld/cid) that refers to a particular `Block`.
  - `Peer`: Another Bitswap instance that we are connected to.
  - `Block`: A binary blob.
  - `Message`: A Bitswap message.
  - `Entry`: A wantlist entry that may be included in a Message when adding/removing a particular `CID` from our wantlist. Contains:
      - `CID` referring to a particular block.
      - `Priority` relative priority with which the user wants `CID` (relevant only if `Cancel` is not true.
      - `Cancel` is a boolean representing whether this `Entry` is meant to remove `CID` from our wantlist.
  - `Ledger`: A record of the aggregate data exchanged between two peers. Each peer stores one `Ledger` for each of their peers.

### Bitswap Message

A single Bitswap message may contain any of the following content:

1.  The sender’s wantlist. This wantlist may either be the sender’s complete wantlist or just the changes to the sender’s wantlist that the receiver needs to know.
2.  Data blocks. These are meant to be blocks that the receiver has requested (i.e., blocks on that are on the receiver’s wantlist as far as the sender is aware at the time of sending).

#### Wire Format

The wire format for Bitswap is simply a stream of Bitswap messages. The following protobuf describes the form of these messages.

```
message Message {
  message Wantlist {
    message Entry {
      optional bytes block = 1; // the block key
      optional int32 priority = 2; // the priority (normalized). default to 1
      optional bool cancel = 3;  // whether this revokes an entry
    }

    repeated Entry entries = 1; // a list of wantlist entries
    optional bool full = 2;     // whether this is the full wantlist. default to false
  }

  message Block {
    bytes prefix = 1;		// CID prefix (cid version, multicodec and multihash prefix (type + length)
    bytes data = 2;
  }

  Wantlist wantlist = 1;
  optional repeated bytes blocks = 2; 	// used to send Blocks in bitswap 1.0.0
  repeated Block payload = 3; // used to send Blocks in bitswap 1.1.0
}
```

## Want-Manager

The want-manager handles requests for blocks. For a requested block, identified by `cid`, the `Bitswap.GetBlock(cid)` method is invoked. `Bitswap.GetBlock(cid)` requests `cid` from the network and, if the corresponding `Block` is received, returns it. More concretely, `Bitswap.GetBlock(cid)` adds `cid` to our wantlist. The want-manager then updates all peers with this addition by adding a new `Entry` to each peer’s message queue, who then may or may not respond with the desired block.

## Decision Engine

The decision engine decides how to allocate resources to peers. When a `Message` with a wantlist from a peer is received, the `Message` is sent to the decision engine. For every `CID` in the wantlist that we have the corresponding `Block` for, the block has a `Task` added to the peer’s `TaskQueue`. A `Task` is considered complete once the corresponding `Block` has been sent to the message queue for that peer.

The primary data structure in the decision engine is the peer request queue (`PRQ`). The `PRQ` adds peers to a weighted round-robin queue, where the weights are based on one or more peer-specific metrics. This is where Bitswap *strategies* come in. Currently, a `Strategy` is a function whose input is a peer’s `Ledger` and output is a weight for that peer. The peers are then served the `Task`s in their respective `TaskQueue`s. The amount of data each peer is served in a given round-robin round is determined by their relative weight in the queue. The in-progress Bitswap strategy implementation can be found [here](https://github.com/ipfs/research-bitswap/tree/docs/strategy_impl/strategy-impl). Further Bitswap strategy metrics and configuration interfaces are planned for the near future.

*Note: The Bitswap strategy implementations in the current releases of* `go-ipfs` *and* `js-ipfs` *do not conform to the description here as of the time of this writing.*

## Message Queue

Each active peer has an associated message queue. The message queue holds the next message to be sent to that peer. The message queues receive updates from two other subsystems:

1.  Wantlist manager: When a `CID` is added or removed from our wantlist, we must update our peers – these wantlist updates are sent to all relevant peers’ message queues.
2.  Decision engine: When we have a block that a peer wants and the decision engine decides to send the block, we propagate the block to that peer’s message queue.

Task workers watch the message queues, dequeue a waiting message, and send it to the recipient.

## Network

The network is the abstraction representing all Bitswap peers that are connected to us by one or more hops. Bitswap messages flow in and out of the network. This is where a game-theoretical analysis of Bitswap becomes relevant – in an arbitrary network we must assume that all of our peers are rational and self-interested, and we act accordingly. Work along these lines can be found in the [research-bitswap repository](https://github.com/ipfs/research-bitswap), with a preliminary game-theoretical analysis currently in-progress [here](https://github.com/ipfs/research-bitswap/blob/docs/strategy_analysis/analysis/prelim_strategy_analysis.pdf).

# Implementation Details

## Coalescing Messages

When a message queue that already contains a Bitswap message receives another, the new message should be coalesced with the original to reduce the overhead of sending separate packets.

## Bitswap Sessions

Bitswap sessions are an attempt to optimize the block requests sent to other Bitswap clients. When requesting a graph of blocks from the network, we send a wantlist update containing the graph’s root block to all of our peers. Then, for each peer who sends the root block back, we add that peer to the graph’s *active set*. We then send all requests for other nodes in the graph only to the peers in the active set. The idea is that peers who have the root node of a graph are likely to have its children as well, while those who do not have the root are unlikely to have its children.

**TODO**: Everything below must either be updated/integrated above, or removed

Also, make sure to read - <https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap#go-ipfs-implementation>

Implementation suggestions:

  - maintain a peer set of “live partners”
  - protocol listener accept streams for partners to receive messages
  - protocol sender opens streams to partners to send messages
  - separate out a decision engine that selects which blocks to send to which partners, and at what time. (this is a bit tricky, but it’s super easy to make as a whole if the engine is separated out)

Sender:

1.  open a bitswap stream
2.  send one or more bitswap messages
3.  close bistwap stream

Listener:

1.  accept a bitswap stream
2.  receive one or more bitswap messages
3.  close bitswap stream

Events:

  - bitswap.addedBlock(block)
      - see if any peers want this block, and send it
  - bitswap.getBlock(key, cb)
      - add to wantlist
      - maybe send wantlist updates to peers
  - bitswap.cancelGet(key)
      - so that can send wantlist cancels
  - bitswap.receivedMessage(msg)
      - process the wantlist changes
      - process the blocks
  - bitswap.peerConnected(peer)
      - add peer to peer set + send them wantlist (maybe)
  - bitswap.peerDisconnected(peer)
      - remove peer from peer set

Tricky Bits:

  - clients to bitswap may call `getBlock` then `cancelBlock`
  - partners may spam wantlists
  - normalize priorities only per-peer

Modules:

  - bitswap-decision-engine
  - bitswap-message
  - bitswap-net
  - bitswap-wantlist

Notes:

```
var bs = new BlockService(repo, bitswap)
bs.getBlock(multihash, (err, block) => {
  // 1) try to fetch from repo
  // 2) if not -> ask bitswap
    // 2.1) bitswap will cb() once the block is back, once.
    //      bitswap will write to the repo as well.
})
```

# API Spec

**TODO**: Fill this in, may need some input from @diasdavid, @whyrusleeping

> **Will be written once it gets stable, by now, it still requires a ton of experimentation**

# Implementations

  - <https://github.com/ipfs/go-bitswap>
  - <https://github.com/ipfs/js-ipfs-bitswap>
