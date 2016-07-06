# Multigram -- protocol negotiation and multiplexing over datagrams

For multiplexing different protocols on the same datagram connection, multigram prepends a 1-byte header to every packet. This header represents an index in a table of protocols shared between both endpoints. This protocol table is negotiated by exchanging the intersection of the endpoint's supported protocols. The protocol table's size of 256 tuples can be increased by nesting multiple multigram headers.

TODO: analyze the properties vs. other approaches (e.g. an identifier on every packet).

# Packet layout

```
                  1               2               3               4
   0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
0 |  Table Index  |                                               |
  +-+-+-+-+-+-+-+-+             Variable-length data              +
4 |                                                               |
  +
```

## Protocol table

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
