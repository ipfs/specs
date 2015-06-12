# PDD for multistream (example/use case)

## Protocol

The motivation and base of the protocol can be found here:

- https://github.com/ipfs/specs/blob/wire/protocol/network/wire.md#multistream---self-describing-protocol-stream
- https://github.com/ipfs/specs/blob/wire/protocol/network/wire.md#multistream-selector---self-describing-protocol-stream-selector

The multistream protocol does not cover:

- discovering participants, selecting transports, and establishing connections
- managing the state of the connection

multistream enables several types of streams to be used over one single stream, like an intelligent message broker that offers the ability to negotiate the protocol and version that is going to be used. To simplify, a visual representation can be:

```
┌ ─ ─ ─ ─ ─ ─ ┌ ─ ─ ─ ─ ─ ─ ┐┌ ─ ┐
 dht-id/1.0.1│ bitswap/1.2.3  ...
└ ─ ─ ─ ─ ─ ─ └ ─ ─ ─ ─ ─ ─ ┘└ ─ ┘
┌────────────────────────────────┐
│ multistream-select             │
└────────────────────────────────┘
┌────────────────────────────────┐
│transport                       │
│  [TCP, UDP, uTP, ...]          │
└────────────────────────────────┘
```

multistream doesn't cover stream multiplexing over the same connection, however, we can achieve this by leveraging functionality offered by SPDY or HTTP/2.

```
┌─── ───┐┌─── ───┐┌ ┌─── ───┐┌─── ───┐┌┐
 a/1.0.0  b/1.0.0  │ a/1.0.0  b/1.0.0 ││
└─── ───┘└─── ───┘└ └─── ───┘└─── ───┘ ┘
┌─── ──── ──── ──── ┌─── ──── ──── ──── ┌───
│multistream-select││multistream-select││...│
└ ──── ──── ──── ──┘└ ──── ──── ──── ──┘└ ──┘
┌─── ──── ──── ──── ──── ──── ──── ──── ──── ┌───
│stream multiplexing                        ││...│
│ [HTTP/2, SPDY]                            ││   │
└─ ──── ──── ──── ──── ──── ──── ──── ──── ─┘└─ ─┘
┌────────────────────────────────────────────────┐
│ multistream-select                             │
└────────────────────────────────────────────────┘
┌────────────────────────────────────────────────┐
│transport                                       │
│  [TCP, UDP, uTP, ...]                          │
└────────────────────────────────────────────────┘
```

multistream messages have the following structure:

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 ┌───────────────┐┌───────┐│
││varint with    ││message│
 │ message length││       ││
│└───────────────┘└───────┘
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

However, for readability reasons, we will omit the `varint` part on the Compliance Spec.


Other reference material and discussion:
- https://github.com/ipfs/node-ipfs/issues/13#issuecomment-109802818

## Protocol Compliance Tests Spec

Given the protocol spec, an implementation of the multistream-select protocol has to comply with the following scenarios:

#### 1 - push-stream

In a push-stream example (one-way stream), we have two agents:

- 'broadcast' - where messages are emited 
- 'silent' - listener to the messages emited by the broadcast counterparty

Compliance test 1 (human readable format, without varint):
```
# With a connection established between silent - broadcast
< /multistream/1.0.0       # multistream header
  < /bird/3.2.1              # Protocol header
    < hey, how is it going?    # First protocol message
```

#### 2 - duplex-stream

In a duplex-stream example (interactive conversation), we have two agents:

- 'select' - waiting for connections, hosts several protocols from where a client can pick from
- 'interactive' - connects to a select agent and queries that agent for a specific protocol

Compliance test 2 (human readable format):
```
# With a connection established between interactive - select
< /multistream/1.0.0
  > /multistream/1.0.0
  > ls
    < ["/dogs/0.1.0","/cats/1.2.11"]
  > /mouse/1.1.0
    < na
  > /dogs/0.1.0
    < /dogs/0.1.0
      > hey
```

## Wire out

Since this protocol is not fully plaintext, we have to capture the messages/packets that transmited by one of the agents to make sure we get the transformations right (and therefore doing development driven by what is going on in the wire, which is defined by the Protocol (PDD ftw!))

With a first implementation written, we can capture the messages switched on the wire, so that later, we can require other implementations to conform. For the multistream scenario, tests are organized by the following:

```
tests
├── comp                      # Where compliance tests live
│   ├── compliance-test.js
├── impl                      # Where specific implementation tests live, where we can get code coverage and all that good stuff
│   ├── interactive-test.js
│   └── one-way-test.js
└── spec                      # Spec tests are the tests were what is passed on the wire is captured, so it can be used in the compliance tests for all the implementations
    ├── capture.js
    ├── interactive-test.js
    ├── one-way-test.js
    └── pristine              # The pristine folder were those captures live
        ├── broadcast.in
        ├── broadcast.out     # A broadcast.out is the same as a silent.in, since there are only two agents in this exchange,
        ├── interactive.in    # the reason both files exist is to avoid mind bending when it is time to use the "in/out", it could get confusing
        ├── interactive.out
        ├── select.in
        ├── select.out
        ├── silent.in
        └── silent.out
```

## Protocol Compliance Test Suite

The protocol compliance test suit for multistream-select can be found on `tests/comp/compliance-test.js`, each agent is tested alone with the input we have prepared on the previous step for it, once that agent replies to all the messages, we compare (diff) both the output generated and its "pristine" counterpart, expecting to get 0 differences.
