Protocol Driven Development
===========================

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

# Abstract

# Introduction

Cross compatibility between several implementations and runtimes is historically a hard goal to achieve. Each framework/language offers different testing suites and encourages a different flavour of testing (BDD, TDD, RDD, etc). We need a better way to test compatibility across different implementations.

Instead of typical API tests, we can achieve cross-implementation testing by leveraging interfaces offered through the network and defined by the Protocol. We call this Protocol Driven Development.

In order for a code artefact to be PDD compatible, it must:
- Expose a connection (duplex stream) interface; the interface may be synchronous (online, interactive) or asynchronous
- Implement a well-defined Protocol spec

## Objectives

The objectives for Protocol Driven Development are:
- Provide a well-defined process to test Protocol Spec implementations
- Define a standard set of implementation requirements to comply with a certain protocol
- Automate cross-implementation tests
- Create a general purpose proxy for packet/message capture

# Process

In order to achieve compliance, we have to follow four main steps:

1. Define the desired Protocol Spec that is going to be implemented.
2. Design the compliance tests that prove that a certain implementation conforms with the spec.
3. Once an implementation is done, capture the messages traded on the wire using that implementation, so that the behaviour of both participants can be replicated without the agent.
4. Create the Protocol Compliance Tests (consisting of injecting the packets/messages generated in the last step into the other implementations and comparing the outputs).

## Protocol Spec

A Protocol Spec should define the goals & motivation for the protocol, the messages traded between participants in it, and some use cases. It should not cover language or framework specifics.

## Protocol Compliance Tests Spec

A Protocol Compliance Tests Spec should define what the necessary “use stories” are for which the Protocol implementation must be tested to assure it complies with the Protocol Spec. For example:

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

So that a diff between two output files should show not differences.

```
$ diff output.go.txt output.node.txt
$
```

## Interchange Packet/Message Capture

Since most of these protocols leverage some type of encoded format for messages, we have to replicate the transformations applied to those messages before being sent. The other option is capturing the messages being sent by one of the implementations, which should suffice for the majority of the scenarios.

## Protocol Compliance Tests Suite

These tests offer the last step to test different implementations independently. By sending the packets/messages and evaluating their responses and comparing across different implementations, we can infer that in fact they are compatible.

#### [Example use case - go-multistream and node-multistream tests](/PDD-multistream.md)
