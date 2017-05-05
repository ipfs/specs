# Specifications

![](media-artifacts/ipfs-splash.png)

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> This repository contains the specs for the IPFS Protocol and associated subsystems.

Some day we will hopefully transform these specs into RFCs. For now, they assume a high level of familiarity with the concepts.

## Table of Contents

- [Work In Progress](#work-in-progress)
- [Specs](#specs)
  - [High level Architecture of IPFS](/architecture)
  - [bitswap](/bitswap)
  - [DEX - Importers and Exporters](/dex)
  - [Files API and MFS](/files)
    - [Unixfs](/unixfs)
  - [IPRS](/iprs)
  - [keychain](/keychain)
  - [keystore](/keystore)
  - [MerkleDAG (deprecated, see IPLD)](/merkledag)
  - [Repo](/repo)
  - [Public API (CLI, HTTP and Core)](/public-api)
  - [Protocol Driven Development](/pdd)
  - [IPLD](https://github.com/ipld/specs)
  - [libp2p](https://github.com/libp2p/specs)
- [Contribute](#contribute)
- [License](#license)

## Work In Progress

Warning: this is a work in progress. IPFS is a young system and we want to get it right. We will continue to evaluate and re-think pieces. At this point, the IPFS protocol is solid enough to write this spec and produce interoperable implementations in different languages.

**Specs are not finished yet. We use the following tag system to identify their state:**

- ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - this spec is a work-in-progress, it is likely not even complete.
- ![](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - this spec is a rough draft and will likely change substantially.
- ![](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - this spec is believed to be close to final. Minor changes only.
- ![](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - this spec is likely to improve, but not change fundamentally.
- ![](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) - this spec will not change.

Nothing in this spec repository is `permanent` yet. The most important pieces of IPFS are now `reliable` or `stable`. Many subsystems remain as `draft`.

Note that, as in many IPFS repositories, most of the work is happening in [the issues](https://github.com/ipfs/specs/issues/) or in [active pull requests](https://github.com/ipfs/specs/pulls/). Go take a look!

## Specs

The specs contained in this repository are:

**IPFS Protocol:**
- [protocol](/architecture) - the top-level spec and the stack
- [overviews](/overviews) - quick overviews of the various parts of IPFS

**Networking layer:**
- [libp2p](https://github.com/libp2p/spec) - libp2p is a modular and extensible network stack, built and use by IPFS, but that it can be reused as a standalone project. Covers:
  - network - the network layer spec
  - routing - the routing layer spec
    - kademlia - Kademlia DHT
    - relay - the relay protocol
    - dnssd - mDNS for local area networks
    - snr - supernode delegated routing
    - multirouter - combines multiple others

**Data Structures and formats:**
- [MerkleDAG](/merkledag) - The MerkleDAG layer (pre IPLD).
- [IPLD](https://github.com/ipld/spec) - InterPlanetary Linked Data.
- [unixfs](/unixfs)
- [multihash](https://github.com/multiformats/multihash) - self-describing hash digest format.
- [multiaddr](https://github.com/multiformats/multiaddr) - self-describing addressing format.
- [multicodec](https://github.com/multiformats/multicodec) - self-describing protocol/encoding streams (note: a file is a stream).
- [multistream](https://github.com/multiformats/multistream) - multistream is a format -- or simple protocol -- for disambiguating, and layering streams. It is extremely simple.

**Block Exchanges:**
- [bitswap](/bitswap) - BitTorrent-inspired exchange

**Specific Internal Components:**
- Blocks and Block Service
- DAG and DAG Service
- Data Importing
- [Repo](/repo) - IPFS node local repository spec
  - config - IPFS node configuration
  - fs-repo - the spec of the fs-repo implementation

**Files / Mutable File System:**
- [Files Impl and API](/files) - Virtual File System interface, unix like, on top of the MerkleDAG

**Public APIs:**
- [CLI](/public-api/cli) - Command Line Interface
- [HTTP API](https://github.com/ipfs/http-api-spec) - IPFS HTTP API specification
- [Core API](/public-api/core) - IPFS programatic interface

**Records and Record Systems:**
- [IPRS](/iprs) - InterPlanetary Record System
- IPNS - InterPlanetary Naming System

**Key Management:**
- [KeyStore](/keystore) - Key management on IPFS
- [KeyChain](/keychain) - Distribution of cryptographic Artificats

**Other/related/included:**
- [PDD](/pdd-protocol-driven-development) - Protocol Driven Development

## Contribute

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.

Please be aware that specs are really hard to design by committee. Treat this space like you would the workshop of an artist. Please suggest improvements, but please don't be disappointed if we say no to something. What we leave out is often more important than what we add in.

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/specs/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

TBD. See https://github.com/ipfs/specs/issues/137.
