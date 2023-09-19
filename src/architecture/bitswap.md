# ![Status: WIP](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Bitswap

**Author(s)**:
- Adin Schmahmann
- David Dias
- Jeromy Johnson
- Juan Benet

**Maintainer(s)**:

* * *

**Abstract**

Bitswap is a data exchange protocol for sending and receiving content addressed blocks of data. Bitswap has two primary jobs:
1. Attempt to acquire blocks from the network that have been requested by the client.
2. Send blocks in its possession to other peers who want them.

## Organization of this document

- [Introduction](#introduction)
- [Bitswap Protocol Versions](#bitswap-protocol-versions)
  - [Bitswap 1.0.0](#bitswap-100)
  - [Bitswap 1.1.0](#bitswap-110)
  - [Bitswap 1.2.0](#bitswap-120)
- [Implementations](#implementations)

## Introduction

Bitswap is a message-based protocol, as opposed to request-response. All messages contain wantlists, and/or blocks.
Upon receiving a wantlist, a Bitswap server should eventually process and respond to the requester with either information about the block or the block itself.
Upon receiving blocks, the client should send a `Cancel` notification to peers that have asked for the data, signifying that the client no longer wants the block.

Bitswap aims to be a simple protocol, so that implementations can balance aspects such as throughput, latency, fairness, memory usage, etc. for their specific requirements.

## Bitswap Protocol Versions

There are multiple Bitswap versions and more may evolve over time. We give brief overviews as to the changes behind each protocol version.

- `/ipfs/bitswap/1.0.0` - Initial version
- `/ipfs/bitswap/1.1.0` - Support CIDv1
- `/ipfs/bitswap/1.2.0` - Support Wantlist Have's and Have/DontHave responses

## Block Sizes

Bitswap implementations must support sending and receiving individual blocks of sizes less than or equal to 2MiB. Handling blocks larger than 2MiB is not recommended so as to keep compatibility with implementations which only support up to 2MiB.

## Bitswap 1.0.0

### Bitswap 1.0.0: Interaction Pattern

Given that a client C wants to fetch data from some server S:

1. C sends a message to S for the blocks it wants, via a stream `s_want`
    1. C may either send a complete wantlist, or an update to an outstanding wantlist
    2. C may reuse this stream to send new wants
2. S sends back blocks on a stream `s_receive`. S may reuse this stream to send back subsequent responses.
    1. S should respect the relative priority of wantlist requests from C, with wants that have higher `priority` values being responded to first.
3. When C no longer needs a block it previously asked for, it should send a `Cancel` message for that block to all peers from which it has not received a response about that block

### Bitswap 1.0.0: Message

A single Bitswap message may contain any of the following content:

1. The sender’s wantlist. This wantlist may either be the sender’s complete wantlist or just the changes to the sender’s wantlist that the receiver needs to know.
2. Data blocks. These are meant to be blocks that the receiver has requested (i.e., blocks that are on the receiver’s wantlist as far as the sender is aware at the time of sending).

#### Bitswap 1.0.0: Wire Format

The wire format for Bitswap is simply a stream of Bitswap messages. The following protobuf describes the form of these messages. Note: all protobufs are described using proto3 syntax.

```protobuf
message Message {
  message Wantlist {
    message Entry {
      bytes block = 1; // the block key, i.e. a CIDv0
      int32 priority = 2; // the priority (normalized). default to 1
      bool cancel = 3;  // whether this revokes an entry
    }

    repeated Entry entries = 1; // a list of wantlist entries
    bool full = 2; // whether this is the full wantlist. default to false
  }

  Wantlist wantlist = 1;
  repeated bytes blocks = 2;
```

### Bitswap 1.0.0: Protocol Format

All protocol messages sent over a stream are prefixed with the message length in
bytes, encoded as an unsigned variable length integer as defined by the
[multiformats unsigned-varint spec](https://github.com/multiformats/unsigned-varint).

All protocol messages must be less than or equal to 4MiB in size

## Bitswap 1.1.0

Bitswap 1.1.0 introduces a 'payload' field to the protobuf message and deprecates the
existing 'blocks' field. The 'payload' field is an array of pairs of cid
prefixes and block data. The cid prefixes are used to ensure the correct
codecs and hash functions are used to handle the block on the receiving
end.

It is otherwise identical to 1.0.0

### Bitswap 1.1.0: Wire Format

```protobuf
message Message {
    message Entry {
      bytes block = 1; // CID of the block
      int32 priority = 2; // the priority (normalized). default to 1
      bool cancel = 3; // whether this revokes an entry
    }

    repeated Entry entries = 1; // a list of wantlist entries
    bool full = 2; // whether this is the full wantlist. default to false
  }

  message Block {
    bytes prefix = 1; // CID prefix (all of the CID components except for the digest of the multihash)
    bytes data = 2;
  }

  Wantlist wantlist = 1;
  repeated Block payload = 3; 
}
```

## Bitswap 1.2.0

Bitswap 1.2.0 extends the Bitswap 1.1.0 protocol with the three changes:
1. Being able to ask if a peer has the data, not just to send the data
2. A peer can respond that it does not have some data rather than just not responding
3. Nodes can indicate on messages how much data they have queued to send to the peer they are sending the message to

### Bitswap 1.2.0: Interaction Pattern

Given that a client C wants to fetch data from some server S:

1. C opens a stream `s_want` to S and sends a message for the blocks it wants
    1. C may either send a complete wantlist, or an update to an outstanding wantlist
    2. C may reuse this stream to send new wants
    3. For each of the items in the wantlist C may ask if S has the block (i.e. a Have request) or for S to send the block (i.e. a block request). C may also ask S to send back a DontHave message in the event it doesn't have the block
2. S responds back on a stream `s_receive`. S may reuse this stream to send back subsequent responses
    1. If C sends S a Have request for data S has (and is willing to give to C) it should respond with a Have, although it may instead respond with the block itself (e.g. if the block is very small)
    2. If C sends S a Have request for data S does not have (or has but is not willing to give to C) and C has requested for DontHave responses then S should respond with DontHave
    3. S may choose to include the number of bytes that are pending to be sent to C in the response message
    4. S should respect the relative priority of wantlist requests from C, with wants that have higher `priority` values being responded to first.
3. When C no longer needs a block it previously asked for it should send a Cancel message for that request to any peers that have not already responded about that particular block. It should particularly send Cancel messages for Block requests (as opposed to Have requests) that have not yet been answered.

### Bitswap 1.2.0: Wire Format

```protobuf
message Message {
  message Wantlist {
    enum WantType {
      Block = 0;
      Have = 1;
    }

    message Entry {
      bytes block = 1; // CID of the block
      int32 priority = 2; // the priority (normalized). default to 1
      bool cancel = 3; // whether this revokes an entry
      WantType wantType = 4; // Note: defaults to enum 0, ie Block
      bool sendDontHave = 5; // Note: defaults to false
    }

    repeated Entry entries = 1; // a list of wantlist entries
    bool full = 2; // whether this is the full wantlist. default to false
  }
  message Block {
    bytes prefix = 1; // CID prefix (all of the CID components except for the digest of the multihash)
    bytes data = 2;
  }

  enum BlockPresenceType {
    Have = 0;
    DontHave = 1;
  }
  message BlockPresence {
    bytes cid = 1;
    BlockPresenceType type = 2;
  }

  Wantlist wantlist = 1;
  repeated Block payload = 3;
  repeated BlockPresence blockPresences = 4;
  int32 pendingBytes = 5;
}
```

## Implementations

- <https://github.com/ipfs/go-bitswap>
- <https://github.com/ipfs/js-ipfs-bitswap>
