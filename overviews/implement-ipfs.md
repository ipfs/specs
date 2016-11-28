# IPFS Implementation Doc

This short document aims to be a quick guide for anyone implementing IPFS -- it is modelled after go-ipfs, and serves as a template for js-ipfs and py-ipfs.

Sections:
- IPFS Types
- API Transports
- API Commands
- Implementing bindings for the HTTP API

## Libraries First

There are a number of non-ipfs specific things that have been built for ipfs, that ipfs depends on. Implement these first.

### The Multis

There are a number of self-describing protocols/formats in use all over ipfs.

- [multiaddr](https://github.com/multiformats/multiaddr)
- [multihash](https://github.com/multiformats/multihash)
- [multicodec](https://github.com/multiformats/multicodec)
- [multistream](https://github.com/multiformats/multistream)

### libp2p

All the complex peer-to-peer protocols for IPFS have been abstracted out into a separate library called `libp2p`. `libp2p` is a thin veneer over a wealth of modules that interface well with each other.

Implementations:
- [go-libp2p](https://github.com/libp2p/go-libp2p)
- [js-libp2p](https://github.com/libp2p/js-libp2p)

`libp2p` may in fact be _the bulk_ of an ipfs implementation. The rest is very simple.

## Core Pieces

### IPLD

IPLD is the format for IPFS objects, but it can be used outside of ipfs (hence a module). It's layered on top of `multihash` and `multicodec`, and provides the heart of ipfs: the merkledag.

Implementations:
- [go-ipld](https://github.com/ipfs/go-ipld)
- [js-ipld](https://github.com/ipld/js-ipld-dag-cbor)

### IPRS

IPRS is the record system for IPFS, but it can be used outside of ipfs (hence a module). This deals with p2p system records -- it is also used by `libp2p`.

Implementations:
- [go-iprs](https://github.com/ipfs/go-iprs)
- js-iprs _Forthcoming_

### IPNS

IPNS provides name resolution on top of IPRS -- and a choice of record routing system.

### IPFS-Repo

The IPFS-Repo is an IPFS Node's "local storage" or "database", though the storage may not be in a database nor local at all (e.g. `s3-repo`). There are common formats so that multiple implementations can read and write to the same repos. Though today we only have one repo format, more are easy to add so that we can create IPFS nodes on top of other storage solutions.

Implementations:
- [go-ipfs-repo](https://github.com/ipfs/go-ipfs/tree/master/repo)
- [js-ipfs-repo](https://github.com/ipfs/js-ipfs-repo)

## IPFS Core

The Core of IPFS is an interface of functions layered over all the other pieces.

### IPFS Node

The IPFS Node is an entity that bundles all the other pieces together, and implements the interface (described below). In its most basic sense, an IPFS node is really just:

```go
type ipfs.Node struct {

    Config      // has a configuration
    repo.Repo   // has a Repo for storing all the local data
    libp2p.Node // has an embedded libp2p.Node, and thus a peer.ID, and keys
    dag.Store   // has a DAG Store (over the repo + network)

}
```

IPFS itself is very, very simple. The complexity lies within `libp2p.Node` and how the different IPFS commands should run depending on the `libp2p.Node` configuration.

### IPFS Node Config

IPFS Nodes can be configured. The basic configuration format is a JSON file, and so naturally converters to other formats can be made. Eventually, the configuration will be an ipfs object itself.

The config is stored in the IPFS Repo, but is separate because some implementations may give it knowledge of other packages (like routing, http, etc).

### IPFS Interface or API

The IPFS Interface or API (not to be confused with the IPFS HTTP API) is the set of functions that IPFS Nodes must support. These are classified into sections, like _node, network, data, util_ etc.

The IPFS Interface can be implemented:
- as a library - first and foremost
- as a commandline toolchain, so users can use it directly
- as RPC API, so that other programs could use it
 - over HTTP (the IPFS HTTP API)
 - over unix domain sockets
 - over IPC

One goal for the core interface libraries is to produce an interface that could operate on a local or a remote node. This means that, for example:

```go
func Cat(n ipfs.Node, p ipfs.Path) io.Reader { ... }
```
should be able to work whether `n` represents a local node (in-process, local storage), or a remote node (over an RPC API, say HTTP).

_**For now, i list these from the commandline, but the goal is to produce a proper typed function interface/API that we can all agree on.**_

#### Node Commands

These are the for the node itself.

- ipfs init
- ipfs config
- ipfs repo
- ipfs repo gc
- ipfs stats
- ipfs diag

#### Data Commands

- ipfs block
- ipfs object
- ipfs {cat, ls, refs}
- ipfs pin
- ipfs files
- ipfs tar
- ipfs resolve

#### Network Commands

These are carried over from libp2p, so ideally the libp2p implementations do the heavy lifting here.

- ipfs id
- ipfs ping
- ipfs swarm
- ipfs exchange
- ipfs routing
- ipfs bitswap
- ipfs bootstrap

#### Naming commands

These are carried over from IPNS (can make that its own tool/lib).

- ipfs dns
- ipfs name

#### Tool Commands

- ipfs log
- ipfs update
- ipfs version
- ipfs tour
- ipfs daemon

## IPFS Datastructures and Data Handling

There are many useful datastructures on top of IPFS. Things like `unixfs`, `tar`, `keychain`, etc. And there are a number of ways of importing data -- whether posix files or not.

### IPLD Data Importing

Importing data into IPFS can be done in a variety of ways. These are use-case specific, produce different datastructures, produce different graph topologies, and so on. These are not _strictly_ needed in an IPFS implementation, but definitely make it more useful. They are really tools on top of IPLD though, so these can be generic and separate from IPFS itself.

- graph topologies - shape of the graphs
  - balanced - dumb, dead simple
  - trickledag - optimized for seeking
  - live stream
  - database indices
- file chunking - how to split a continuous stream/file
  - fixed size
  - rabin fingerprinting
  - format chunking (use knowledge of formats, e.g. audio, video, etc)
- special format datastructures
  - tar
  - document formats - pdf, doc, etc
  - audio and video formats - ogg, mpeg, etc
  - container and vm images
  - and many more

### `unixfs` datastructure

It's worth mentioning the `unixfs` datastructure, as it provides support for representing unix (posix) files in ipfs. It's simple, but powerful. And it is first class, in that several basic commands make use of it.

### Interesting Data Structure questions

**interfacing with a variety of data structures**

We are still figuring out good ways to make all the different data structures play well with various commands -- there is some complexity when it comes to implementing things like `ipfs cat` -- it currently outputs the data of a `unixfs.File`, but it could do something for other graph objects too. Ideally, we could figure out common ways of making this work, If you have ideas, please discuss.

**graph mapping**

Sometimes one graph maps to another, for example a unixfs graph shards big files and big directories into smaller units and transparently presents them to the user for commands such as `ipfs cat` and `ipfs ls`.

**mixing data structures**

Some data structures are meant to be interspersed with others, meaning that they provide meaning to arbitrary things. One example is a `keychain.Signature`, which provides a cryptographic signature on any other object. Another example is a `versioning.Commit` which represents a specific revision in a version history over any other object. It is still not entirely clear how to build nice tooling that handles these transparently.
