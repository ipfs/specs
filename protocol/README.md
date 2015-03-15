# IPFS Protocol Spec

Authors: [@jbenet](http://github.com/jbenet)

Reviewers:

* * *

This [spec](../) document defines the IPFS protocol stack, the subsystems, the
interfaces, and how it all fits together. It delegates non-interface details
to other specs as much as possible. This is meant as a top-level view of the
protocol and how the system fits together.


Note, this document is not meant to be an introduction of the concepts in IPFS
and is not recommended as a first pass to understanding how IPFS works. For
that, please refer to the [IPFS paper](http://static.benet.ai/t/ipfs.pdf).

## IPFS and the Merkle DAG

At the heart of IPFS is the MerkleDAG, a directed acyclic graph whose links
are hashes. This gives all objects in IPFS useful properties:

- authenticated: content can be hashed and verified against the link
- permanent: once fetched, objects can be cached forever
- universal: any datastructure can be represented as a merkledag
- decentralized: objects can be created by anyone, without centralized writers

These yield many useful properties for the system as a whole:

- links are content addressed
- objects can be served by untrusted agents
- objects can be cached permenently
- objects can be created and used offline
- networks can be partitioned and merged
- any datastructure can be modelled and distributed
- (todo: list more)

IPFS is a stack of network protocols that organize agent networks
that create, publish, distribute, serve, and download merkledags.
It is the authenticated, decentralized, permanent web.


## Nodes and Network Model

The IPFS network uses PKI based identity. An "ipfs node" is a program that
can find, publish, and replicate merkledag objects. Its identity is defined
by a private key. Specifically:

```
privateKey, publicKey := keygen()
nodeID := multihash(publicKey)
```

TODO: constraints on keygen.

### multihash and upgradeable hashing

All hashes in ipfs are encoded with
[multihash](https://github.com/jbenet/multihash/), a self-describing hash
format. The actual hash function used depends on security requirements.
The cryptosystem of IPFS is upgradeable, meaning that as hash functions are
broken, networks can shift to stronger hashes. There is no free lunch, as
objects may need to be rehashed, or links duplicated. But ensuring that tools
built do not assume a pre-defined length of hash digest means tools that
work with today's hash functions will also work with tomorrows longer hash
functions too.

As of this writing, IPFS nodes _must_ support:

```
sha2-256
sha2-512
sha3
```


## The Stack

IPFS has a stack of modular protocols. Each layer may have multiple
implementations. This spec will only address the interfaces between the
layers, and mention possible implementations. Details are left to other specs.

IPFS has five layers:

- naming - a self-certifying PKI namespace (IPNS)
- merkledag - datastructure format (thin waist)
- exchange - block transport and replication
- routing - locating peers and objects
- network - establishing connections between peers

These are briefly described bottom-up.

## network

The network provides point-to-point transports (reliable and unreliable)
between any two IPFS nodes in the network. It handles:
- NAT traversal - hole punching, port mapping, and relay
- supports multiple transports - TCP, SCTP, UTP, ...
- supports encryption, signing, or clear communcations
- multi-multiplexes -multiplexes connections, streams, protocols, peers, ...

See more in the [network spec](network).
