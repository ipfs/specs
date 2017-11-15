# Bitswap

Authors:

  - David Dias
  - Jeromy Johnson
  - Juan Benet

Reviewers:

> tl;dr;

-----

# Abstract

Bitswap is the data trading module for IPFS. Its purpose is to request blocks from and send blocks to other peers in the network. Bitswap has two primary jobs:

1.  Attempt to acquire blocks from the network that have been requested by the client.
2.  Judiciously (though strategically) send blocks in its possession to other peers who want them.

# Status of this spec

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

# Organization of this document

TODO

# Introduction

Bitswap is IPFS's central block exchange protocol. It handles the requests made by an IPFS user, human, or application to fetch data blocks from the network. It interacts with other Bitswap agents present in other IPFS nodes, exchanging (fetching + serving) blocks as it needs.

Bitswap is a message based protocol, as opposed to response-reply. All messages contain wantlists, or blocks. Upon receiving a wantlist, an IPFS node should consider sending out wanted blocks if it has them. Upon receiving blocks, the node should send out a notification called a 'Cancel' signifying that they no longer want the block. At the protocol level, Bitswap is very simple.

While Bitswap is a relatively simple protocol, a time- and memory- performant implementation requires that many details be carefully thought out. We aim to document these details here so that future implementers may build upon the knowledge gathered over the several iterations of Bitswap.

# Systems

![](https://cloud.githubusercontent.com/assets/1211152/21071077/4620387a-be4a-11e6-895c-aa8f2b06aa4e.png)

## Wantlist Manager

TODO

## Decision Engine

TODO

### Strategies

TODO: Link to strategy impl docs

## Message Queue

TODO

## Network

TODO

# Bitswap Flows

There are two primary flows that Bitswap manages: requesting blocks from and serving blocks to peers.

## Requesting Blocks

**TODO**: continue editing from here

Client requests for new blocks are handled by the wantlist manager. For every new block (or set of blocks) wanted, the `WantBlocks` method is invoked. The want manager then ensures that connected peers are notified of the new block that we want by sending the new entries to a message queue for each peer. The message queue will loop while there is work available and do the following:

1.  Ensure it has a connection to its peer
2.  Grab the message to be sent
3.  Send it

If new messages are added while the loop is in steps 1 or 3, the messages are combined into one to avoid having to keep an actual queue and send multiple messages. The same process occurs when the client receives a block and sends a cancel message for it.

## Serving Blocks

Internally, when a message with a wantlist is received, it is sent to the decision engine to be considered, and blocks that we have that are wanted are placed into the peer request queue. Any block we possess that is wanted by another peer has a task in the peer request queue created for it.

The peer request queue is a priority queue that sorts available tasks by some metric, currently, that metric is very simple and aims to fairly address the tasks of each other peer. More advanced decision logic will be implemented in the future.

Task workers pull tasks to be done off of the queue, retreive the block to be sent, and send it off. The number of task workers is limited by a constant factor.

# Wire Format

Streams of [Bitswap messages, according to this protobuf](https://github.com/ipfs/go-ipfs/blob/master/exchange/bitswap/message/pb/message.proto):

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

# Implementation Details

Also, make sure to read - <https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap#go-ipfs-implementation>

Implementation suggestions:

  - maintain a peer set of "live partners"
  - protocol listener accept streams for partners to receive messages
  - protocol sender opens streams to partners to send messages
  - separate out a decision engine that selects which blocks to send to which partners, and at what time. (this is a bit tricky, but it's super easy to make as a whole if the engine is separated out)

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

> **Will be written once it gets stable, by now, it still requires a ton of experimentation**

# Implementations

  - <https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap>
  - <https://github.com/ipfs/js-ipfs-bitswap>
