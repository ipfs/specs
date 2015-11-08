# IPLD -- the "thin-waist" merkle dag format.

There are a variety of systems that use merkle-tree and hash-chain inspired datastructures (e.g. git, bittorrent, ipfs, tahoe-lafs, sfsro). IPLD defines:

- **_merkle-links_**: the core unit of a merkle-graph
- **_merkle-dag_**: any graphs whose edges are _merkle-links_.
- **_merkle-paths_**: unix-style paths for traversing _merkle-dags_ with _named merkle-links**
- **IPLD Data Model**: a flexible, JSON-based data model for representing merkle-dags.
- **IPLD Serialized Formats**: a set of formats in which IPLD objects can be represented, for example JSON, CBOR, CSON, YAML, Protobuf, XML, RDF, etc.
- **IPLD Canonical Format**: a deterministic description on a serialized format that ensures the same _logical_ object is always serialized to _the exact same sequence of bits_. This is critical for merkle-linking, and all cryptographic applications.

In short: JSON documents with named merkle-links that can be traversed.

## Intro

### What is a _merkle-link_?

A _merkle-link_ is a link between two objects which is content-addressed with the _cryptographic hash_ of the target object, and embedded in the source object. Content addressing with merkle-links allows:

- **Cryptographic Integrity Checking**: resolving a link's value can be tested by hashing. In turn, this allows wide, secure, trustless exchanges of data (e.g. git or bittorrent), as others cannot give you any data that does not hash to the link's value.
- **Immutable Datastructures**: data structures with merkle links cannot mutate, which is a nice property for distributed systems. This is useful for versioning, for representing distributed mutable state (eg CRDTs), and for long term archival.

### What is a _merkle-graph_ or a _merkle-dag_?

Objects with merkle-links form a Graph (merkle-graph), which necessarily is both Directed, and which can be counted on to be Acyclic, iff the properties of the cryptographic hash function hold. I.e. a _merkle-dag_. Hence all graphs which use _merkle-linking_ (_merkle-graph_) are necessarily also Directed Acyclic Graphs (DAGs, hence _merkle-dag_).

### What is a _merkle-path_?

A _merkle-path_ is a unix-style path (e.g. `/a/b/c/d`) which initially dereferences through a _merkle-link_ and then follows _named merkle-links_ in the intermediate objects. Following a name means looking into the object, finding the _name_ and resolving the associated _merkle-link_.

For example, suppose we have this _merkle-path_:

```
/ipfs/QmUmg7BZC1YP1ca66rRtWKxpXp77WgVHrnv263JtDuvs2k/a/b/c/d
```
Where:
- `ipfs` is a protocol namespace (to allow the computer to discern what to do)
- `QmUmg7BZC1YP1ca66rRtWKxpXp77WgVHrnv263JtDuvs2k` is a cryptographic hash.
- `a/b/c/d` is a path _traversal_, as in unix.
- this link traverses five objects.

Resolving it involves looking up each object and attaining a hash value, then traversing to the next.

```
      +-------------------+
O_1 = | "a": "QmV76pU..." |  whose hash value is QmUmg7BZC1YP1ca66rRtWKxpXp77WgVHrnv263JtDuvs2k
      +-------------------+
                |
                v
      +-------------------+
O_2 = | "b": "QmV76pU..." |  whose hash value is QmV76pUdAAukxEHt9Wp2xwyTpiCmzJCvjnMxyQBreaUeKT
      +-------------------+
                |
                v
      +-------------------+
O_3 = | "c": "QmV76pU..." |  whose hash value is QmQmkZPNPoRkPd7wj2xUJe5v5DsY6MX33MFaGhZKB2pRSE
      +-------------------+
                |
                v
      +-------------------+
O_4 = | "d": "QmV76pU..." |  whose hash value is QmWkyYNrN5wnHgX5vfs88q7QUaFKq52TVNTFeTzxm73UbT
      +-------------------+
                |
                v
      +-------------------+
O_5 = | "hello": "world"  |  whose hash value is QmR8Bzg59Y4FGWHeu9iTYhwhiP8PHCNFiaGhP1UjywA43j
      +-------------------+
```

This entire _merkle-path_ traversal is a unix-style path traversal over a _merkle-dag_ which uses _merkle-links_ with names.

## What is the IPLD Data Model?

The IPLD Data Model defines a simple JSON-based _structure_ for all merkle-dags, and identifies a set of formats to encode the structure into.

### Constraints and Desires

Some Constraints:
- IPLD paths MUST be unambiguous. A given path string MUST always deterministically traverse to the same object. (e.g. avoid duplicating link names)
- IPLD paths MUST be universal and avoid opressing non-english societies (e.g. use UTF-8, not ASCII).
- IPLD paths MUST layer cleanly over UNIX and The Web (use `/`, have deterministic transforms for ASCII systems).
- Given the wide success of JSON, a huge number of systems present JSON interfaces. IPLD MUST be able to import and export to JSON trivially.
- The JSON data model is also very simple and easy to use. IPLD MUST be just as easy to use.
- Definining new datastructures MUST be trivially easy. It should not be cumbersome -- or require much knowledge -- to experiment with new definitions on top of IPLD.
- IPLD MUST be compatible with RDF and the proper W3C Semantic Web / Linked Data standards. We can achieve this easily through JSON-LD.
- IPLD Serialized Formats (on disk and on the wire) MUST be fast and space efficient. (should not use JSON as the storage format, and instead use CBOR or similar formats)
- IPLD cryptographic hashes MUST be upgradeable (use [multihash](https://github.com/jbenet/multihash))

Some nice-to-haves:
- IPLD SHOULD NOT carry over mistakes, e.g. the lack of integers in JSON.
- IPLD SHOULD be upgradable, e.g. if a better on-disk format emerges, systems should be able to migrate to it and minimize costs of doing so.
- IPLD objects SHOULD be able to resolve properties too as paths, not just merkle links.
- IPLD Canonical Format SHOULD be easy to write a parser for.
- IPLD Canonical Format SHOULD enable seeking without parsing full objects. (CBOR and Protobuf allow this).


### Format Definition

(**NOTE:** Here we will use both JSON and YML to show what formats look like. We explicitly use both to show equivalence of the object across two different formats.)

At its core, IPLD Data Model "is just JSON" in that it (a) is also tree based documents with a few primitive types, (b) maps 1:1 to json, (c) users can use it through JSON itself. It "is not JSON" in that (a) it improves on some mistakes, (b) has an efficient serialized representation, and (c) does not actually specify a single on-wire format, as the world is known to improve.

#### Basic Node

Here is an example IPLD object in JSON:

```json
{
  "name": "Vannevar Bush"
}
```

Suppose it hashes to the multihash value `QmAAA...AAA`. Note that it has no links at all, just a string name value. But we are still be able to "resolve" the key `name` under it:

```sh
> ipld cat --json QmAAA...AAA
{
  "name": "Vannevar Bush"
}

> ipld cat --json QmAAA...AAA/name
"Vannevar Bush"
```

And -- of course -- we are able to view it in other formats

```sh
> ipld cat --yml QmAAA...AAA
---
name: Vannevar Bush

> ipld cat --xml QmAAA...AAA
<!xml> <!-- todo -->
<node>
  <name>Vannevar Bush</name>
</node>
```

#### Linking Between Nodes

Merkle-Linking between nodes is the reason for IPLD to exist. A Link in IPLD is just an embedded node with a special format:

```js
{
  "title": "As We May Think",
  "author": {
    "mlink": "QmAAA...AAA" // links to the node above.
  }
}
```

Suppose this hashes to the multihash value `QmBBB...BBB`. This node links the _subpath `author` to `QmAAA...AAA`, the node in the section above. So we can now do:

```sh
> ipld cat --json QmBBB...BBB
{
  "title": "As We May Think",
  "author": {
    "mlink": "QmAAA...AAA" // links to the node above.
  }
}

> ipld cat --json QmBBB...BBB/author
{
  "title": "As We May Think",
  "author": {
    "mlink": "QmAAA...AAA" // links to the node above.
  }
}

> ipld cat --yml QmBBB...BBB/author
---
title: As We May Think
author:
  mlink: QmAAA...AAA

> ipld cat --json QmBBB...BBB/author/name
"Vannevar Bush"
```

#### Link Properties

IPLD allows for links to have other properties themselves. This is useful to encode other invormation into a link, such as the kind of relationship, or ancilliary data required in the link. This is _different from_ "Link Objects", discussed below, which are very useful in their own right. But sometimes, you just want to add a bit of data on the link and not have to make another object. IPLD doesn't get in your way.

For example, supposed you have a file system, and want to assign metadata like permissions, or owners in the link between objects. Suppose you have a `directory` object with hash `QmCCC...CCC` like this:

```js
{
  "foo": {
    "mlink": "QmCCC...111"
    "mode": "0755",
    "owner": "jbenet"
  },
  "cat.jpg": {
    "mlink": "QmCCC...222"
    "mode": "0644",
    "owner": "jbenet"
  },
  "doge.jpg": {
    "mlink": "QmCCC...333",
    "mode": "0644",
    "owner": "jbenet"
  }
}
```

or in YML

```yml
---
foo:
  mlink: QmCCC...111
  mode: 0755
  owner: jbenet
cat.jpg:
  mlink: QmCCC...222
  mode: 0644
  owner: jbenet
doge.jpg:
  mlink: QmCCC...333
  mode: 0644
  owner: jbenet
```

Though we have new properties in the links that are _specific to this datastructure_, we can still resolve links just fine:

```js
> ipld cat --json QmCCC...CCC/cat.jpg
{
  "data": "\u0008\u0002\u0012��\u0008����\u0000\u0010JFIF\u0000\u0001\u0001\u0001\u0000H\u0000H..."
}

> ipld cat --json QmCCC...CCC/doge.jpg
{
  "subfiles": [
    {
      "mlink": "QmPHPs1P3JaWi53q5qqiNauPhiTqa3S1mbszcVPHKGNWRh"
    },
    {
      "mlink": "QmPCuqUTNb21VDqtp5b8VsNzKEMtUsZCCVsEUBrjhERRSR"
    },
    {
      "mlink": "QmS7zrNSHEt5GpcaKrwdbnv1nckBreUxWnLaV4qivjaNr3"
    }
  ]
}

> ipld cat --yml QmCCC...CCC/doge.jpg
---
subfiles:
  - mlink: QmPHPs1P3JaWi53q5qqiNauPhiTqa3S1mbszcVPHKGNWRh
  - mlink: QmPCuqUTNb21VDqtp5b8VsNzKEMtUsZCCVsEUBrjhERRSR
  - mlink: QmS7zrNSHEt5GpcaKrwdbnv1nckBreUxWnLaV4qivjaNr3

> ipld cat --json QmCCC...CCC/doge.jpg/subfiles/1
{
  "data": "\u0008\u0002\u0012��\u0008����\u0000\u0010JFIF\u0000\u0001\u0001\u0001\u0000H\u0000H..."
}
```

But we can't extract the link as nicely as other properties, as links are meant to _resolve through_.

#### Duplicate property keys

Note that having two properties with _the same_ name IS NOT ALLOWED, but actually impossible to prevent (someone will do it and feed it to parsers), so to be safe, we define the value of the path traversal to be _the first_ entry in the serialized representation. For example, suppose we have the object:

```json
{
  "name": "J.C.R. Licklider",
  "name": "Hans Moravec"
}
```

Suppose _this_ was the _exact order_ in the _Canonical Format_ (not json, but cbor), and it hashes to `QmDDD...DDD`. We would _ALWAYS_ get:

```sh
> ipld cat --json QmDDD...DDD
{
  "name": "J.C.R. Licklider",
  "name": "Hans Moravec"
}
> ipld cat --json QmDDD...DDD/name
"J.C.R. Licklider"
```


#### Path Restrictions

There are some important problems that come about with path descriptions in Unix and the web. For a discussion see (TODO link to path issue in go-ipfs or go-ipld). In order to be compatible with the models and expectations of unix and the web, IPLD explicitly disallows paths with certain path components. **Note that the data itself _may_ still contain these properties (someone will do it, and there are legitimate uses for it). So it is only _Path Resolvers_ that MUST NOT resolve through those paths.** The restrictions are the same as typical unix and UTF-8 path systems:


TODO:
- [ ] list path resolving restrictions
- [ ] show examples

#### Integers in JSON

IPLD is _directly compatible_ with JSON, to take advantage of JSON's successes, but it need not be _held back_ by JSON's mistakes. This is where we can afford to follow format idiomatic choices, though care MUST be given to ensure there is always a well-defined 1:1 mapping.

On the subject of integers, there exist a variety of formats which represent integers as strings in JSON, for example, [EJSON](https://www.meteor.com/ejson). These can be used and conversion to and from other formats should happen naturally-- that is, when converting JSON to CBOR, an EJSON integer should be transformed naturally to a proper CBOR integer, instead of representing it as a map with string values.


## Serialized Data Formats

IPLD supports a variety of serialized data formats trough [multicodec](https://github.com/jbenet/multicodec). These can be used however is idiomatic to the format, for example in `CBOR`, we can use `CBOR` type tags to represent the merkle-link, and avoid writing out the full string key `mlink`. Users are encouraged to use the formats to their fullest, and to store and transmit IPLD data in whatever format makes the most sense. The only requirement **is that there MUST be a well-defined one-to-one mapping with the IPLD Canonical format.** This is so that data can be transformed from one format to another, and back, without changing its meaning nor its cryptographic hashes.

### Canonical Format

In order to preserve merkle-linking's power, we muste ensure that there is a single **_canonical_** serialized representation of an IPLD document. This ensures that applications arrive at the same cryptographic hashes. It should be noted --though-- that this is a system-wide parameter. Future systems might change it to evolve representations. However we estimate this would need to be done no more than once per decade.

**The IPLD Canonical format is _canonicalized CBOR_.**


## Datastructure Examples

It is important that IPLD be a simple, nimble, and flexible format that does not get in the way of users defining new or importing old datastractures. For this purpose, below I will show a few example data structures.


### Unix Filesystem


#### A small File

```js
{
  "data": "hello world",
  "size": "11"
}
```

#### A Chunked File

Split into multiple independent sub-Files.

```js
{
  "size": "1424119",
  "subfiles": [
    {
      "mlink": "QmAAA...",
      "size": "100324"
    },
    {
      "mlink": "QmAA1...",
      "size": "120345",
      "repeat": "10"
    },
    {
      "mlink": "QmAA1...",
      "size": "120345"
    },
  ]
}
```

#### A Directory

```js
{
  "foo": {
    "mlink": "QmCCC...111"
    "mode": "0755",
    "owner": "jbenet"
  },
  "cat.jpg": {
    "mlink": "QmCCC...222"
    "mode": "0644",
    "owner": "jbenet"
  },
  "doge.jpg": {
    "mlink": "QmCCC...333",
    "mode": "0644",
    "owner": "jbenet"
  }
}
```

### git

#### git blob

```js
{
  "data": "hello world"
}
```

#### git tree

```js
{
  "foo": {
    "mlink": "QmCCC...111"
    "mode": "0755"
  },
  "cat.jpg": {
    "mlink": "QmCCC...222"
    "mode": "0644"
  },
  "doge.jpg": {
    "mlink": "QmCCC...333",
    "mode": "0644"
  }
}
```

#### git commit

```js
{
  "tree": {"mlink": "e4647147e940e2fab134e7f3d8a40c2022cb36f3"},
  "parents": [
    {"mlink": "b7d3ead1d80086940409206f5bd1a7a858ab6c95"},
    {"mlink": "ba8fbf7bc07818fa2892bd1a302081214b452afb"}
  ],
  "author": {
    "name": "Juan Batiz-Benet",
    "email": "juan@benet.ai",
    "time": "1435398707 -0700"
  },
  "committer": {
    "name": "Juan Batiz-Benet",
    "email": "juan@benet.ai",
    "time": "1435398707 -0700"
  },
  "message": "Merge pull request #7 from ipfs/iprs\n\n(WIP) records + merkledag specs"
}
```

### Bitcoin

#### Bitcoin Block

```js
{
  "parent": {"mlink": "Qm000000002CPGAzmfdYPghgrFtYFB6pf1BqMvqfiPDam8"},
  "transactions": {"mlink": "QmTgzctfxxE8ZwBNGn744rL5R826EtZWzKvv2TF2dAcd9n"},
  "nonce": "UJPTFZnR2CPGAzmfdYPghgrFtYFB6pf1BqMvqfiPDam8"
}
```

#### Bitcoin Transaction

This time, im YML. TODO: make this a real txn

```yml
---
inputs:
  - input: {mlink: Qmes5e1x9YEku2Y4kDgT6pjf91TPGsE2nJAaAKgwnUqR82}
    amount: 100
outputs:
  - output: {mlink: Qmes5e1x9YEku2Y4kDgT6pjf91TPGsE2nJAaAKgwnUqR82}
    amount: 50
  - output: {mlink: QmbcfRVZqMNVRcarRN3JjEJCHhQBcUeqzZfa3zoWMaSrTW}
    amount: 30
  - output: {mlink: QmV9PkR2gXcmUgNH7s7zMg9dsk7Hy7bLS18S9SHK96m7zV}
    amount: 15
  - output: {mlink: QmP8r8fLUnEywGnRRUrHB28nnBKwmshMLiYeg8udzYg7TK}
    amount: 5
script: OP_VERIFY
```



