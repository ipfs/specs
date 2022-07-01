# IPFS Specifications

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![Matrix](https://img.shields.io/badge/matrix-%23ipfs%3Amatrix.org-blue.svg?style=flat-square)](https://matrix.to/#/#ipfs:matrix.org)
[![IRC](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discord](https://img.shields.io/discord/475789330380488707?color=blueviolet&label=discord&style=flat-square)](https://discord.gg/24fmuwR)

> This repository contains the specs for the IPFS Protocol and associated subsystems.

## Understanding the meaning of the spec badges and their lifecycle

We use the following label system to identify the state of each spec:

- ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - A work-in-progress, possibly to describe an idea before actually committing to a full draft of the spec.
- ![](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - A draft that is ready to review. It should be implementable.
- ![](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - A spec that has been adopted (implemented) and can be used as a reference point to learn how the system works.
- ![](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - We consider this spec to close to final, it might be improved but the system it specifies should not change fundamentally.
- ![](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) - This spec will not change.
- ![](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) - This spec is no longer in use.

Nothing in this spec repository is `permanent` or even `stable` yet. Most of the subsystems are still a `draft` or in `reliable` state.

## Index

The specs contained in this repository are:

- **IPFS Protocol:**
  - [Protocol Architecture Overview](./ARCHITECTURE.md) - the top-level spec and the stack
  - [Other IPFS Overviews](/overviews) - quick overviews of the various parts of IPFS
- **User Interface (aka Public APIs):**
  - [HTTP Gateways](./http-gateways/README.md) - implementation agnostic interfaces for accessing content-addressed data over HTTP
  - IPFS implementations may provide additional interfaces, for example:
    - [HTTP RPC API exposed by go-ipfs](https://docs.ipfs.io/reference/http/api/)
    - [Programmatic Core API for JavaScript](https://github.com/ipfs/js-ipfs/tree/master/docs/core-api#readme)
- **Data Formats:**
  - [IPLD](https://ipld.io/specs/) - InterPlanetary Linked Data.
  - [Merkle DAG (Deprecated)](./MERKLE_DAG.md)
  - Self Describing Formats ([multiformats](http://github.com/multiformats/multiformats)):
    - [multihash](https://github.com/multiformats/multihash) - self-describing hash digest format.
    - [multiaddr](https://github.com/multiformats/multiaddr) - self-describing addressing format.
    - [multicodec](https://github.com/multiformats/multicodec) - self-describing protocol/encoding streams (note: a file is a stream).
    - [multistream](https://github.com/multiformats/multistream) - multistream is a format -- or simple protocol -- for disambiguating, and layering streams. It is extremely simple.
- **Files / Mutable File System:**
  - [UnixFS](./UNIXFS.md)
  - [Mutable File System (the Files API)](./MUTABLE_FILE_SYSTEM.md) - Virtual File System interface, unix like, on top of the MerkleDAG
- **Storage Layer:**
  - Pinning
  - [Repo](./REPO.md) - IPFS node local repository spec
    - [FileSystem Repo](./REPO_FS.md) - IPFS node local repository spec
- **Block Exchanges:**
  - [Bitswap](./BITSWAP.md) - BitTorrent-inspired exchange
- **Key Management:**
  - [KeyStore](./KEYSTORE.md) - Key management on IPFS
  - [KeyChain](./KEYCHAIN.md) - Distribution of cryptographic Artifacts
- **Networking layer:**
  - [libp2p](https://github.com/libp2p/specs) - libp2p is a modular and extensible network stack, built and use by IPFS, but that it can be reused as a standalone project. Covers:
- **Records, Naming and Record Systems:**
  - [IPNS](./IPNS.md) - InterPlanetary Naming System
- **Other/related/included:**
  - [PDD](https://github.com/ipfs/pdd) - Protocol Driven Development

## Contribute

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.
This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).
