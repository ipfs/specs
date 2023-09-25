# IPFS Specifications

> This repository contains the specs for the IPFS Protocol and associated subsystems.

- [Documentation and Community](#documentation-and-community)
- [Understanding badges](#understanding-the-meaning-of-the-spec-badges-and-their-lifecycle)
- [Index](#index)
- [Contribute](#contribute)
  - [InterPlanetary Improvement Process (IPIP)](#interplanetary-improvement-process-ipip)

## Documentation and Community

Looking for user support?

See [Documentation](https://docs.ipfs.io),
[Discussion Forums](https://discuss.ipfs.io/), and other
[Community Resources](https://docs.ipfs.io/community/) instead.

## Understanding the meaning of the spec badges and their lifecycle

We use the following label system to identify the state of each spec:

- ![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - A work-in-progress, possibly to describe an idea before actually committing to a full draft of the spec.
- ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - A draft that is ready to review. It should be implementable.
- ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - A spec that has been adopted (implemented) and can be used as a reference point to learn how the system works.
- ![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - We consider this spec to close to final, it might be improved but the system it specifies should not change fundamentally.
- ![permanent](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) - This spec will not change.
- ![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) - This spec is no longer in use.

Nothing in this spec repository is `permanent` or even `stable` yet. Most of the subsystems are still a `draft` or in `reliable` state.

## Index

The specs contained in this and related repositories are:

- **IPFS Protocol:**
  - [IPFS Guide](https://docs.ipfs.tech/) - to start your IPFS journey
  - [Protocol Architecture Overview](./ARCHITECTURE.md) - the top-level spec and the stack
- **User Interface (aka Public APIs):**
  - [HTTP Gateways](https://specs.ipfs.tech/http-gateways/) - implementation agnostic interfaces for accessing content-addressed data over HTTP
  - [Routing V1](https://specs.ipfs.tech/routing/http-routing-v1/) - implementation agnostic interfaces for content/peer/IPNS routing over HTTP
  - IPFS implementations may provide additional HTTP interfaces, for example:
    - [Kubo RPC at /api/v0](https://docs.ipfs.tech/reference/kubo/rpc/)
- **Data Formats:**
  - [IPLD](https://ipld.io/specs/) - InterPlanetary Linked Data.
    - [DAG-CBOR](https://ipld.io/docs/codecs/known/dag-cbor/) -  binary format, supporting the complete IPLD Data Model, with excellent performance, and suitable for any job.
    - [DAG-JSON](https://ipld.io/docs/codecs/known/dag-json/) - human-readable format, supporting almost the complete IPLD Data Model, and very convenient for interoperability, development, and debugging.
    - [DAG-PB](https://ipld.io/docs/codecs/known/dag-pb/) - a binary format for specific limited structures of data, which is highly used in IPFS and [UnixFS](./UNIXFS.md).
    - [CAR](https://ipld.io/specs/transport/car/) - transport format used to store content addressable objects in the form of IPLD block data as a sequence of bytes; typically as an [application/vnd.ipld.car](https://www.iana.org/assignments/media-types/application/vnd.ipld.car) file with a `.car` extension
  - Self Describing Formats ([multiformats](http://github.com/multiformats/multiformats)):
    - [multihash](https://github.com/multiformats/multihash) - self-describing hash digest format.
    - [multiaddr](https://github.com/multiformats/multiaddr) - self-describing addressing format.
    - [multicodec](https://github.com/multiformats/multicodec) - self-describing protocol/encoding streams (note: a file is a stream).
    - [multistream](https://github.com/multiformats/multistream) - multistream is a format -- or simple protocol -- for disambiguating, and layering streams. It is extremely simple.
- **Files and Directories:**
  - [UnixFS](./UNIXFS.md)
  - Related userland concepts (external docs):
    - [MFS, Mutable File System, or the Files API](https://docs.ipfs.tech/concepts/file-systems/#mutable-file-system-mfs)
- **Storage Layer:**
  - [Pinning Service API](https://ipfs.github.io/pinning-services-api-spec/)
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
  - [IPNS](https://specs.ipfs.tech/ipns/) - InterPlanetary Naming System
    - [IPNS Record Creation and Verification](https://specs.ipfs.tech/ipns/ipns-pubsub-router/)
    - [IPNS over PubSub](https://specs.ipfs.tech/ipns/ipns-pubsub-router/)
  - [DNSLink](https://dnslink.dev) - mapping DNS names to IPFS content paths
  - [DNSAddr](https://github.com/multiformats/multiaddr/blob/master/protocols/DNSADDR.md) - mapping DNS names to libp2p multiaddrs
- **Other/related/included:**
  - [PDD](https://github.com/ipfs/pdd) - Protocol Driven Development

## Contribute

[![contribute](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.
This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

### InterPlanetary Improvement Process (IPIP)

- Want to propose a change to an existing specification?
- Or add a new protocol?

See:
- [IPIP: Improvement Process for IPFS Specifications](https://specs.ipfs.tech/meta/ipip-process/)
  - List of [ratified IPIPs](https://specs.ipfs.tech/ipips/)
  - List of [open IPIPs](https://github.com/ipfs/specs/pulls?q=is%3Apr+is%3Aopen+ipip+sort%3Aupdated-desc)
