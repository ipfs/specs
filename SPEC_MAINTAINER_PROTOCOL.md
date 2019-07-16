# Spec Maintainer Protocol

> We have a protocol to maintain specs of protocols! How meta, but very useful.

## Motivation

The protocol specifications should be treated as the ultimate source of truth for how the protocol works, how to be implemented and what users and builders can expect on how it behaves. However, writing specs for a protocol is not novelty and there has been multiple decades of research on how to do this well, from having a reference implementation, standards bodies and/or formal verification to ensure both code and specs behave the same. It is a hard problem and ultimately one that questions how programming is done as a whole.

Understanding this, we want to make sure to provide a platform in which the Core Developers and the whole IPFS community can collaborate and build specs and code that as much of a pair as possible. This compromises into two main chunks of work:

- Writting the spec and iterating on it to the point that the spec and the code progress smoothly together.
- For mature and more stable specs, have tests (using [Protocol Driven Development](https://github.com/ipfs/pdd), [TLA+](https://lamport.azurewebsites.net/tla/tla.html) or another framework of verification) to ensure that all implementations stand correct.

The very aspirational future is to have a spec language in which we can describe how the program should function and it will automatically create the tests to verify it. The aspiration future ++ is having such spec language that writes the code itself and verifies it 🚀.

The Spec Maintainer Protocol takes a large amount of inspiration from the repo [Lead Maintainer Protocol](https://github.com/ipfs/team-mgmt/blob/master/LEAD_MAINTAINER_PROTOCOL.md).

## Maintaining a Specification

A Specification Maintainer is a contributor that has shown that understand the subsystem of the spec that is maintaining and that is passionate about documenting it well. There is a benefit for this contributor to be actively involved with the development of the subsystem at least in one or more of the languages.

Each spec should be maintained at least by 1 person and up to 3 for efficiency purposes.

The spec maintainer(s) are recognized at the top of the specification document on the list "Maintainers(s)" and these are the people that should be requested to review a PR to that specific spec.

### Responsibilities

As a Spec Maintainer, you are expected to:

- Respect and follow the [IPFS Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).
- Have a great understanding of the subsystem  purpose and how it is used by other parts of the project.
- Review and merge PRs to the Spec
- Respond in a timely manner to Github issues on ipfs/specs repo that are related to the spec being maintained.
- Notify the developers of the subsystem in case there is a new proposal for a change or also request the developers to notify when there is a system change that needs to be reflected on the spec.

### Specification Status

The Specification Status description can be found on the main [README of this repo](https://github.com/ipfs/specs#badges-and-spec-lifecycle).

## Disclaimer as 2019 Q3

As of 2019 Q3, the specs are vastly out of date and should not be relied uppon. We will run an effort to get these up to date and check the boxes here when it is done:

- **IPFS Protocol:**
  - [ ] [Protocol Architecture Overview](./ARCHITECTURE.md) - the top-level spec and the stack
  - [ ] [Other IPFS Overviews](/overviews) - quick overviews of the various parts of IPFS
- **User Interface (aka Public APIs):**
  - [ ] [Core API (aka using IPFS as a package/module)](./API_CORE.md)
    - [x] [JavaScript implementation details](https://github.com/ipfs/interface-js-ipfs-core)
    - [ ] [Golang implementation details](https://github.com/ipfs/interface-go-ipfs-core)
  - [ ] [CLI (the ipfs daemon API)](./API_CLI.md)
  - [ ] [HTTP API](./API_HTTP.md)
  - HTTP Gateway
- **Data Formats:**
  - [ ] [IPLD](https://github.com/ipld/spec) - InterPlanetary Linked Data.
  - [x] [Merkle DAG (Deprecated)](./MERKLE_DAG.md)
  - [x] Self Describing Formats ([multiformats](http://github.com/multiformats/multiformats)):
    - [x] [multihash](https://github.com/multiformats/multihash) - self-describing hash digest format.
    - [x] [multiaddr](https://github.com/multiformats/multiaddr) - self-describing addressing format.
    - [x] [multicodec](https://github.com/multiformats/multicodec) - self-describing protocol/encoding streams (note: a file is a stream).
    - [x] [multistream](https://github.com/multiformats/multistream) - multistream is a format -- or simple protocol -- for disambiguating, and layering streams. It is extremely simple.
- **Files / Mutable File System:**
  - [ ] [UnixFS](./UNIXFS.md)
  - [ ] [Mutable File System (the Files API)](./MUTABLE_FILE_SYSTEM.md) - Virtual File System interface, unix like, on top of the MerkleDAG
- **Storage Layer:**
  - Pinning
  - [ ] [Repo](./REPO.md) - IPFS node local repository spec
    - [ ] [FileSystem Repo](./REPO_FS.md) - IPFS node local repository spec
- **Block Exchanges:**
  - [ ] [Bitswap](./BITSWAP.md) - BitTorrent-inspired exchange
- **Key Management:**
  - [ ] [KeyStore](./KEYSTORE.md) - Key management on IPFS
  - [ ] [KeyChain](./KEYCHAIN.md) - Distribution of cryptographic Artificats
- **Networking layer:**
  - [ ] [libp2p](https://github.com/libp2p/specs) - libp2p is a modular and extensible network stack, built and use by IPFS, but that it can be reused as a standalone project. Covers:
- **Records, Naming and Record Systems:**
  - [ ] [IPNS](./IPNS.md) - InterPlanetary Naming System
  - [ ] [IPRS](https://github.com/libp2p/specs/blob/master/IPRS.md) - InterPlanetary Record System. A generalization of IPNS for other types of mutable data
- **Other/related/included:**
  - [ ] [PDD](https://github.com/ipfs/pdd) - Protocol Driven Development
