IPFS Protocol Network Spec = libp2p RFC
===================================

Authors: 
- [Juan Benet](https://github.com/jbenet)
- [David Dias](https://github.com/diasdavid)

Reviewers:


> tl;dr; This document presents libp2p, a modularized and extensible network stack to overcome the networking challenges faced when doing Peer-to-Peer applications. libp2p is used by IPFS as its networking library.

* * *

# Abstract

This describes the IPFS network protocol. The network layer provides point-to-point transports (reliable and unreliable) between any two IPFS nodes in the network.

This document defines the spec implemented in libp2p.

# Status of this spec

> **This spec is a Work In Progress (WIP).**

# Organization of this document

This RFC is organized by chapters described on the `Table of Contents` section. Each of the chapters can be found in each own file.

# Table of Contents

- [1 Introduction](1-introduction.md)
  - [1.1 Motivation]()
  - [1.2 Goals]()
- [2 Overview of current Network Stack](2-current-network-stack.md)
  - [2.1 Current Shortcommings]()
- [3 Requirements](3-requirements.md)
  - [3.1 NAT traversal] ()
  - [3.2 Relay]()
  - [3.3 Encryption]()
  - [3.4 Transport Agnostic]()
  - [3.5 Multi-Multiplexing]()
- [4 Architecture](4-arquitecture.md)
  - [4.1 Peer Routing]()
  - [4.2 Swarm]()
  - [4.3 Distributed Record Store]()
- [5 Datastructures](5-datastructures.md)
- [6 Interfaces](6-interfaces.md)
  - [6.1 libp2p]()
  - [6.2 Peer Routing]()
  - [6.3 Swarm]()
  - [6.4 Distributed Record Store]()
- [7 Properties](7-properties.md)
  - [7.1 Communication Model - Streams]()
  - [7.2 Ports - Constrained Entrypoints]()
  - [7.3 Transport Protocol]()
  - [7.4 Non-IP Networks]()
  - [7.5 On the wire]()
    - [7.5.1 Protocol-Multiplexing]()
    - [7.5.2 multistream - self-describing protocol stream]()
    - [7.5.3 multistream-selector - self-describing protocol stream selector]()
    - [7.5.4 Stream Multiplexing]()
    - [7.5.5 Portable Encodings]()
- [8 Implementations](8-implementations.md)
- [9 References](9-references.md)
