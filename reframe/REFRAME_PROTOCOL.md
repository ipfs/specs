# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Reframe

**Author(s)**:
- Adin Schmahmann
- Petar Maymounkov

**Maintainer(s)**:

* * *

**Abstract**

The Reframe protocol is designed for request-response messages that is sufficiently generic and extensible to evolve over time as new needs for it arise. This includes separately defining the transport and message serialization mechanisms from the actual method types and semantics.

The initial use case motivating the protocol's design is to help peers discover various routing hints that enable them to find the content or service they are actually looking for. The extensibility required in this case is that various routing systems could share the protocol so that applications can work on them generically and that recursive routing systems could choose to use the protocol themselves to maximize interoperability.

# Organization of this document

- [Introduction](#introduction)
- [Spec](#spec)
  - [Interaction Pattern](#interaction-pattern)
  - [Cachability](#cachability)
  - [Transports](#transports)
  - [Protocol Message Overview](#protocol-message-overview)
    - [Known Methods](#known-methods)
- [Method Upgrade Paths](#method-upgrade-paths)
- [Implementations](#implementations)

# Introduction

The Reframe protocol is a request-response based protocol. Upon receiving a request a Reframe server should respond to clients with information they have pertaining to the request. It's possible that a Reframe server may not have all of the information necessary for a client to actually get the data they need, but even partial resolution is acceptable. For example, if a peer is looking to download some block of data a Reframe server may only know about some peers that have the data but not their network addresses. That's ok and the client can always choose alternative mechanisms to discover the missing information. 

# Spec

To build an implementation of the protocol it is required to both define a transport for the messages and the method types supported by the given implementation. Over time both the method and transport types may grow and also be included in this specification.

## Interaction Pattern

Given that a client `C` wants to request information from some server `S`:

1. `C` opens sends a request to `S` that is a single message
2. `S` will respond to `C` with either a single message or a group of messages

## Cachability

Some methods are prone to being cachable while others are not. Methods are tagged within the spec as cachable/not cachable. Transports may leverage that information to decide if cachable/not cachable methods should be treated differently.

## Transports

Reframe is designed to be transport-agnostic, multiple transports are expected
to exist in the future.

Available transport specifications:

- [`REFRAME_HTTP_TRANSPORT`](./REFRAME_HTTP_TRANSPORT.md)

## Protocol Message Overview

We can represent each message as an IPLD Schema to denote its abstract representation independent of the serialization scheme. 

To help visualize example messages and illustrate implementation of the first concrete transport (HTTP + DAG-JSON) example messages will be given in DAG-JSON.

The payload sent as a request is a single message. The response is a repeated set of messages until the transport signals that the response is completed (e.g. closing a stream, connection, etc.)

Reception, on the server or client side, of:
1. New or unknown fields in any request or response message are ignored (rather than causing an error)
2. Missing fields or unknown union cases cause a terminal error

### Known Methods

The known Request types are described in:

-  [`REFRAME_KNOWN_METHODS.md`](./REFRAME_KNOWN_METHODS.md)

# Implementations

https://github.com/ipfs/go-delegated-routing
