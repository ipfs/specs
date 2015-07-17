RFC {protocol hash} - Protocol Driven Development
=================================================

# Abstract

# Introduction

Cross compatibility through several implementations and runtimes is historically an hard goal to achieve. Each framework/language offers different testing suits and implement a different flavour of testing (BDD, TDD, RDD, etc). We need a better way to test compatibility across different implementations.

Instead of the common API tests, we can achieve cross implementation testing by leveraging interfaces offered through the network and defined by the Protocol. We call this Protocol Driven Development.

In order for a code artefact to be PDD compatible
- Expose a connection (duplex stream) interface, may be synchronous (online, interactive) or asynchronous.
- Implement a well defined Protocol spec

## Objectives

The objectives for Protocol Driven Development are:
- Well defined process to test Protocol Spec implementations
- Standard definition of implementation requirements to comply with a certain protocol
- Automate cross implementation tests
- Have a general purpose proxy for packet/message capture 

# Process

In order to achieve compliance, we have to follow four main steps:

1 - Define the desired Protocol Spec that is going to be implemented
2 - Design the compliance tests that prove that a certain implementation conforms with the spec
3 - Once an implementation is done, capture the messages traded on the wire using that implementation, so that the behaviour of both participants can be replicated without the agent
4 - Create the Protocol Compliance Tests (consisting on injecting the packets/messages generated in the last step in the other implementations and comparing outputs)

## Protocol Spec

Should define the goals, motivation, messages traded between participants and some use cases. It should not cover language or framework specifics.

## Protocol Compliance Tests Spec

Defines what are the necessary “use stories” in which the Protocol implementation must be tested to assure it complies with the Protocol Spec. For e.g:

```
# Protocol that should always ACK messages of type A and not messages of type B
> A
  {< ACK}
> B
> B
> B
```

**Message Flow DSL:**
- Indentation to communicate a dependency (a ACK of A can only come after A is sent for e.g)
- [ ] for messages that might or not appear (e.g heartbeats should be passed on the wire from time to time, we know we should get some, but not sure how much and specifically when).
- { } for messages that will arrive, we just can't make sure if before of the following messages described

A test would pass if the messages transmitted by an implementation follow the expected format and order, defined by the message flow DSL. The test would fail if format and order are not respected, plus if any extra message is transmitted that is was not defined.

Tests should be deterministic, so that different implementations produce the same results:
```
┌─────────┐     ┌─────────┐    ┌───────────────┐
│input.txt│──┬─▶│go-impl  │───▶│ output.go.txt │
└─────────┘  │  └─────────┘    └───────────────┘
             │  ┌─────────┐    ┌───────────────┐
             └─▶│node-impl├───▶│output.node.txt│
                └─────────┘    └───────────────┘
```

So that a diff between two results should yield 0 results

```
$ diff output.go.txt output.node.txt
$
```

## Interchange Packet/Message Capture

Since most of these protocols define leverage some type of encoded format for messages, we have to replicate the transformations applied to those messages before being sent. The other option is capturing the messages being sent by one of the implementations, which should suffice the majority of the scenarios.

## Protocol Compliance Tests Suite

These tests offer the last step to test different implementations independently. By sending the packets/messages and evaluating their responses and comparing across different implementations, we can infer that in fact they are compatible

#### [Example use case - go-multistream and node-multistream tests](/PDD-multistream.md)
