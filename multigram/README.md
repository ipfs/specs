# Multigram -- protocol negotiation and multiplexing over datagrams

This document describes:
- Multigram, a self-describing packet format for multiplexing different protocols on the same datagram connection.
- Multigram-Setup, a protocol for negotiating a shared table of protocol identifiers for use with Multigram.

Multigram is part of the [Multiformats family][multiformats].

- Introduction
- Protocol table
- Multigram-Setup
- Implementations

Note: this document makes use of the [Multiaddr format][multiaddr] whenever it mentions network addresses.

[multiformats]: https://github.com/multiformats
[multiaddr]: https://github.com/multiformats/multiaddr


## Introduction

Multigram operates on datagrams, which can be UDP packets, Ethernet frames, etc. and which are unreliable and unordered.
All it does is prepend a field to the packet, which signifies the protocol of this packet.
The endpoints of the connection can then use different packet handlers per protocol.

If you're looking for similar functionality on top of reliable streams, check out the [Multistream format][multistream].

[multistream]: https://github.com/multistream


## Packet layout

```
                  1               2               3               4
   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
0 |  Table Index  |                                               |
  +-+-+-+-+-+-+-+-+                Packet Payload                 +
4 |                                                               |
  +
```

- **Table Index:**
  - Type: `varint`
  - The numerical identifier signifying the protocol of this packet, as per the protocol table.
- **Packet Payload:**
  - Type: `[]byte`
  - The raw data of this packet. This is what the packet handler gets to see.






For multiplexing different protocols on the same datagram connection, multigram prepends a 1-byte header to every packet. This header represents an index in a table of protocols shared between both endpoints. This protocol table is negotiated by exchanging the intersection of the endpoint's supported protocols. The protocol table's size of 256 tuples can be increased by nesting multiple multigram headers.

TODO: analyze the properties vs. other approaches (e.g. an identifier on every packet).

- whyrusleeping
  - setup packets and data packets are always separate (proto =0 vs. proto >0)
  - just start sending data packets
    - the other end will respond with error packets
    - the other end MAY buffer packets with a proto it doesn't know yet
    - until you get an ack, send a setup packet for every packet of the given protocol
  - dont do table exchange, setup protocols as needed
- jbenet
  - include checksum
    - so we can work on raw ip
    - udp checksums suck
    - would be great to fit in 3/7/11/15 bytes, to fit 4-byte word length
    - out of scope, should be another format: multisum
      - we'll have multiple mutligrams per packet, one checksum for each is a MUST NOT


## Protocol table

Multigram assumes an independent protocol table for each remote address.
For example, datagrams from/to `/ip4/1.2.3.4/udp/4737` will build up their own protocol table
independent from datagrams from/to `/ip4/5.6.7.8/udp/4737`.

The protocol table MUST be append-only and immutable. It MUST initially contain exactly one tuple:

```
0x00,/multigram-setup/0.1.0
```

The `/multigram-setup` protocol is used for appending to the shared protocol table.

```
                  1               2               3               4
   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
0 |     0x00      |                                               |
  +-+-+-+-+-+-+-+-+           Operation as Multicodec             +
4 |                                                               |
  +
```

- Note how the Table Index field is set to `0x00`, selecting the `/multigram-setup` protocol.
- The Operation field MUST support at least the `/cbor/` multicodec format. It SHOULD support the `/protobuf/` and `/json/` formats.
- In the future, an `/ipfs/` format can be used to resolve code and specification for supporting the format.

## Protocol table operations / multigram-setup

Either endpoint can send `append` proposals, and the other endpoint will reply with the result, based on their own supported protocols.

(1) Endpoint A sends a proposal to Endpoint B. A doesn't commit this proposal to its own view of the protocol table. It dismisses it right away and waits for B's reply.
```
0x00
/json/
{"0x01":"/foo/1.0.0","0x02":"/bar/1.0.0","0x03":"/baz/1.0.0"}
```

(2) Endpoint B forms the intersection of this proposal and its own supported protocols, appends to its own view of the protocol table, and replies.
```
0x00
/json/
{"0x01":"/foo/1.0.0","0x02":"/bar/1.0.0"}
```

(3) We can list the table by sending the other endpoint an empty proposal.
```
0x00
/json/
{}
```

(4) The protocol table now contains `0x00`, `0x01`, and `0x02`.
```
0x00
/json/
{"0x01":"/foo/1.0.0","0x02":"/bar/1.0.0"}
```

Any field in the operation data starting in `0x` is considered for being appended.
Any other field names can be used e.g. for checksums, detecting packet loss, or communicating errors.
This is subject to updates of the multigram-setup protocol.

## Nested multigrams

The protocol tables of nested multigrams can be set up within one packet.
This works because any trailing data will be processed after the table operation.

```
0x00
/json/
{"0x01":"/multigram/0.1.0"}
0x0100
/json/
{"0x01":"/multigram/0.1.0"}
0x010100
/json
{"0x01":"/ipfs/identify/1.0.0","0x02":"/fc00/iptunnel/0.1.0","0x03":"/fc00/pathfinder/0.1.0"}
```

Packets starting in `0x010103` would belong to `/fc00/pathfinder`.
