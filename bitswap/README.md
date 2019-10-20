bitswap
=======

Authors:

- David Dias
- Jeromy Johnson
- Juan Benet

Reviewers:

> tl;dr;

* * *

# Abstract

Bitswap is the data trading module for ipfs, it manages requesting and sending blocks to and from other peers in the network. Bitswap has two main jobs, the first is to acquire blocks requested by the client from the network. The second is to judiciously send blocks in its posession to other peers who want them.


# Status of this spec

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

# Organization of this document

This spec is organized by chapters described on the *Table of contents* section. Each of the chapters can be found in its own file.

# Table of contents

- [1]()
- [2]()
- [...]()

# Introduction

Bitswap is IPFS' main block exchange protocol. It handles the requests made by a IPFS user, human or an application, to fetch data blocks from the network. It interacts with other Bitswap agents present in other IPFS nodes, exchanging (fetching + serving) blocks as it needs.

Bitswap is a message based protocol, as opposed to response-reply. All messages contain wantlists, or blocks. Upon receiving a wantlist, an IPFS node should consider sending out wanted blocks if it has them. Upon receiving blocks, the node should send out a notification called a 'Cancel' signifying that they no longer want the block. At a protocol level, bitswap is very simple.

Bitswap is a simple protocol overall. However, to make it fast and low on memory footprint, there are several implementation details that are important to get right. We document these details to our best capability on this document, so that other implementers can learn from the knowledge gather over the several iterations of bitswap.

# Bitswap flows

Inside bitswap, there are two main flows: requesting blocks and serving blocks to other peers.

## Requesting blocks

Client requests for new blocks are handled by the want manager, for every new block (or set of blocks) wanted, the 'WantBlocks' method is invoked. The want manager then ensures that connected peers are notified of the new block that we want by sending the new entries to a message queue for each peer. The message queue will loop while there is work available and do the following: 

- a) Ensure it has a connection to its peer
- b) Grab the message to be sent
- c) Send it. 

If new messages are added while the loop is in steps 1 or 3, the messages are combined into one to avoid having to keep an actual queue and send multiple messages. The same process occurs when the client receives a block and sends a cancel message for it.

## Serving blocks

Internally, when a message with a wantlist is received, it is sent to the decision engine to be considered, and blocks that we have that are wanted are placed into the peer request queue. Any block we possess that is wanted by another peer has a task in the peer request queue created for it. 

The peer request queue is a priority queue that sorts available tasks by some metric, currently, that metric is very simple and aims to fairly address the tasks of each other peer. More advanced decision logic will be implemented in the future. 

Task workers pull tasks to be done off of the queue, retreive the block to be sent, and send it off. The number of task workers is limited by a constant factor.

# Wire Format

Streams of ["bitswap messages" according to this protobuf](https://github.com/ipfs/go-ipfs/blob/master/exchange/bitswap/message/pb/message.proto):

```
message Message {
  message Wantlist {
    message Entry {
      optional string block = 1; // the block key
      optional int32 priority = 2; // the priority (normalized). default to 1
      optional bool cancel = 3;  // whether this revokes an entry
    }

    repeated Entry entries = 1; // a list of wantlist entries
    optional bool full = 2;     // whether this is the full wantlist. default to false
  }

  optional Wantlist wantlist = 1;
  repeated bytes blocks = 2;
}
```

# Implementation details

Also, make sure to read - https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap#go-ipfs-implementation

Implementation suggestions:
- maintain a peer set of "live partners"
- protocol listener accept streams for partners to receive messages
- protocol sender opens streams to partners to send messages
- separate out a decision engine that selects which blocks to send to which partners, and at what time.
  (this is a bit tricky, but it's super easy to make as a whole if the engine is separated out)

Sender:

1. open a bitswap stream
2. send one or more bitswap messages
3. close bistwap stream

Listener:

1. accept a bitswap stream
2. receive one or more bitswap messages
3. close bitswap stream

Events:

bitswap.addedBlock(block)
- see if any peers want this block, and send it
bitswap.getBlock(key, cb)
- add to wantlist
- maybe send wantlist updates to peers
bitswap.cancelGet(key)
- so that can send wantlist cancels
bitswap.receivedMessage(msg)
- process the wantlist changes
- process the blocks
bitswap.peerConnected(peer)
- add peer to peer set + send them wantlist (maybe)
bitswap.peerDisconnected(peer)
- remove peer from peer set

Tricky Bits:
- clients to bitswap may call "getBlock" then "cancelBlock"
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
    // 2.1) bitswap will cb() once the block is back, once. bitswap will write to the repo as well. 
})
```

# API Spec

> **Will be written once it gets stable, by now, it still requires a ton of experimentation**

# Implementations

- [Go](https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap)
