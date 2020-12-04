# ![](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) The merkledag

**This spec has been deprecated in favor of [IPLD](https://github.com/ipld/specs/).** It offers a clearer description of how to link different kinds of hash-based structures (e.g. linking a file in IPFS to a commit in Git), has a more generalized and flexible format, and uses a JSON-compatible representation, among other improvements.

**Authors(s)**:
- [Juan Benet](https://github.com/jbenet)
- [Jeromy Johnson](https://github.com/whyrusleeping)

* * *

**Abstract**

The _ipfs merkledag_ is a directed acyclic graph whose edges are merkle-links. This means that links to objects can authenticate the objects themselves, and that every object contains a secure representation of its children.

This is a powerful primitive for distributed systems computations. The merkledag simplifies distributed protocols by providing an append-only authenticated datastructure. Parties can communicate and exchange secure references (merkle-links) to objects. The references are enough to verify the correctness of the object at a later time, which allows the objects themselves to be served over untrusted channels. Merkledags also allow the branching of a datastructure and subsequent merging, as in the version control system git. More generally, merkledags simplify the construction of Secure [CRDTs](http://en.wikipedia.org/wiki/Conflict-free_replicated_data_type), which enable distributed, convergent, commutative computation in an authenticated, secure way.

## Table of Contents

TODO

## Definitions

- `hash` - throughout this document, the word `hash` refers specifically to cryptographic hash functions, such as sha3.
- `dag` - directed acyclic graph
- `merkle-link` - a link (graph edge) between two objects, which is (a) represented by the hash of the target object, and (b) embedded in the source object. merkle-links construct graphs (dags) whose links are content-addressed, and authenticated.
- `merkledag` - the merkledag is a directed acyclic graph whose links are merkle-links (hashes of the content). It is a hash tree, and (under a very loose definition) a merkle tree. Alternative names: the merkle-web, the merkle-forest, the merkle-chain.
- `multihash` - the [multihash](https://github.com/jbenet/multihash) format / protocol.
- `ipfs object` - a node in the ipfs merkledag. It represents a singular entity.
- `merkledag format` - the format that ipfs objects are expressed with.
- `link segment` or `link table` - the part of the merkledag format that expresses links to other objects.
- `data segment` - the part of the merkledag format that expresses non-link object data.
- `protobuf` - [protocol buffers](https://developers.google.com/protocol-buffers/), a serialization encoding.
- `multicodec` - a self-describing, generalized serialization format.


## The Format

The IPFS merkledag format is very simple. It serves as a thin waist for more complex applications and data structure transports. Therefore, it aims to be as simple and small as possible.

The format has two parts, the logical format, and the serialized format.

### Logical Format

The merkledag format defines two parts, `Nodes` and `Links` between nodes. `Nodes` embed `Links` in their `Link Segment` (or link table).

A node is divided in two parts:
- a `Link Segment` which contains all the links.
- a `Data Segment` which contains the object data.

Instead of following previous approaches to merkledags, which place data mostly at the edges, the IPFS merkledag adapts the format of the HTTP web: every path endpoint is an object with _both_ links and data. (this is fundamentally different from UNIX files, in which objects have _either_ links (directories) _or_ data (files).).

The logical format -- in protobuf -- looks like this:

```proto3
// An IPFS MerkleDAG Link
message MerkleLink {
  bytes Hash = 1;   // multihash of the target object
  string Name = 2;  // utf string name
  uint64 Tsize = 3; // cumulative size of target object

  // user extensions start at 50
}

// An IPFS MerkleDAG Node
message MerkleNode {
  repeated MerkleLink Links = 2; // refs to other objects
  bytes Data = 1; // opaque user data

  // user extensions start at 50
}
```

### Serialized Format


(TODO remove this? use only protobuf?)
~~The logical representation is serialized into raw bytes using `multicodec`, a self-describing format that abstracts between serialization frameworks. That way, we can use the ipfs merkledag with various marshaling and serialization formats.~~

The logical representation is serialized into raw bytes using _protocol buffers_, a serialization format.

## Discussion

### Real World Examples

Many successful distributed systems employ specialized merkledags at their core:
- merkle trees -- a special case of the merkle dag -- are a well known cryptographic technique used to authenticate large amounts of data. The original use case involved one-time lamport signatures.
- SFS-RO turns a unix filesystem into a merkledag, constructing a secure, distributed filesystem.
- git uses a merkledag to enable distributed version control and source code management. Other DVCSes, such as mercurial and monotone, also feature a merkledag.
- plan9 uses a merkledag to construct its snapshotting filesystems -- Fossil and Venti.
- bittorrent uses a merkledag to provide secure and short infohash links to its downloadable torrents.
- Google Wave -- a distributed communications platform -- used a merkledag to construct its commutative operational transforms, and enable convergent distributed collaboration. This functionality has since been folded into Google Docs.
- bitcoin uses a merkledag to construct the blockchain, a shared append-only ledger with convergent distributed consensus.
- Tahoe-LAFS uses a merkledag to construct a secure, distributed, capability filesystem based on the least-authority principle.

(NOTE: please suggest other systems to reference here.)

### Thin Waist of Data Structures

At its core, IPFS provides the merkledag as a primitive (or "internet layer") to build sophisticated applications easily. It is a "thin-waist" for secure, distributed applications, which -- by agreeing to follow the common format -- can then run across any replication, routing, and transport protocols. To draw an analogy, this is like the "thin-waist" IP provided to connect hosts across medium-specific networks.

![](mdag.waist.png)

![](ip.waist.png)

This kind of modularity enables complicated and powerful applications to be built with little effort on top of a common base. All the complexity of authentication, distribution, replication, routing, and transport can be pulled in from other protocols and tools. This type of modularity is what made the layered internet -- the TCP/IP stack -- so tremendously powerful.

### Web of Data Structures

In a sense, IPFS is a "web of data-structures", with the merkledag as the common denominator. Agreeing upon a format allows linking different authenticated datastructures to each other, enabling sophisticated distributed applications to easily construct, distribute, and link their data.

### Linked Data

The merkledag is a type of Linked-Data. The links do not follow the standard URI format, and instead opt for a more general and flexible UNIX filesystem path format, but the power is all there. One can trivially map formats like JSON-LD directly onto IPFS (IPFS-LD), making IPFS applications capable of using the full-power of the semantic web.

A powerful result of content (and identity) addressing is that linked data definitions can be distributed directly with the content itself, and do not need to be served from the original location. This enables the creation of Linked Data definitions, specs, and applications which can operate faster (no need to fetch it over the network), disconnected, or even completely offline.

## Merkledag Notation

To facilitate the definition of other data structures and protocols, we define a notation to express merkledag datastructures. This defines their logical representation, and also a format specification (when using the ipfs merkledag format).

#### ~~ WIP / TODO ~~

```
tree node {
  links {

  }

  data {

  }
}

commit node {
  "parent" repeated link; // links to the parent commit
  "author" link;          // link to the author of commit
  ""
}
```
