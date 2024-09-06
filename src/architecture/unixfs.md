---
title: UnixFS
description: >
  UnixFS is a Protocol Buffers-based format for describing files, directories,
  and symlinks as DAGs in IPFS.
date: 2022-10-10
maturity: reliable
editors:
  - name: David Dias
    github: daviddias
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Jeromy Johnson
    github: whyrusleeping
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Alex Potsides
    github: achingbrain
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Peter Rabbitson
    github: ribasushi
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
  - name: Hugo Valtier
    github: jorropo
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/

tags: ['architecture']
order: 1
---

UnixFS is a [protocol-buffers][protobuf]-based format for describing files,
directories and symlinks as Directed Acyclic Graphs (DAGs) in IPFS.

## Nodes

A :dfn[Node] is the smallest unit present in a graph, and it comes from graph
theory. In UnixFS, there is a 1-to-1 mapping between nodes and blocks. Therefore,
they are used interchangeably in this document.

A node is addressed by a [CID]. In order to be able to read a node, its [CID] is
required. A [CID] includes two important pieces of information:

1. A [multicodec], simply known as a codec.
2. A [multihash] used to specify the hashing algorithm, the hash parameters and
   the hash digest.

Thus, the block must be retrieved; that is, the bytes which ,when hashed using the
hash function specified in the multihash, gives us the same multihash value back.

In UnixFS, a node can be encoded using two different multicodecs, listed below. More details are provided in the following sections:

- `raw` (`0x55`), which are single block :ref[Files].
- `dag-pb` (`0x70`), which can be of any other type.

## `Raw` Nodes

The simplest nodes use `raw` encoding and are implicitly a :ref[File]. They can
be recognized because their CIDs are encoded using the `raw` codec:

- The file content is purely the block body.
- They never have any children nodes, and thus are also known as single block files.
- Their size (both `dagsize` and `blocksize`) is the length of the block body.

## `dag-pb` Nodes

More complex nodes use the `dag-pb` encoding. These nodes require two steps of
decoding. The first step is to decode the outer container of the block. This is encoded using the IPLD [`dag-pb`][ipld-dag-pb] specification, which can be
summarized as follows:

```protobuf
message PBLink {
  // binary CID (with no multibase prefix) of the target object
  optional bytes Hash = 1;

  // UTF-8 string name
  optional string Name = 2;

  // cumulative size of target object
  optional uint64 Tsize = 3;
}

message PBNode {
  // refs to other objects
  repeated PBLink Links = 2;

  // opaque user data
  optional bytes Data = 1;
}
```

After decoding the node, we obtain a `PBNode`. This `PBNode` contains a field
`Data` that contains the bytes that require the second decoding. These are also
a protobuf message specified in the UnixFSV1 format:

```protobuf
message Data {
  enum DataType {
    Raw = 0;
    Directory = 1;
    File = 2;
    Metadata = 3;
    Symlink = 4;
    HAMTShard = 5;
  }

  required DataType Type = 1;
  optional bytes Data = 2;
  optional uint64 filesize = 3;
  repeated uint64 blocksizes = 4;
  optional uint64 hashType = 5;
  optional uint64 fanout = 6;
  optional uint32 mode = 7;
  optional UnixTime mtime = 8;
}

message Metadata {
  optional string MimeType = 1;
}

message UnixTime {
  required int64 Seconds = 1;
  optional fixed32 FractionalNanoseconds = 2;
}
```

Summarizing, a `dag-pb` UnixFS node is an IPLD [`dag-pb`][ipld-dag-pb] protobuf,
whose `Data` field is a UnixFSV1 Protobuf message. For clarity, the specification
document may represent these nested Protobufs as one object. In this representation,
it is implied that the `PBNode.Data` field is encoded in a protobuf.

### Data Types

A `dag-pb` UnixFS node supports different types, which are defined in
`decode(PBNode.Data).Type`. Every type is handled differently.

#### `File` type

A :dfn[File] is a container over an arbitrary sized amount of bytes. Files are either
single block or multi-block. A multi-block file is a concatenation of multiple child files.

##### The _sister-lists_ `PBNode.Links` and `decode(PBNode.Data).blocksizes`

The _sister-lists_ are the key point of why IPLD `dag-pb` is important for files. They
allow us to concatenate smaller files together.

Linked files would be loaded recursively with the same process following a DFS
(Depth-First-Search) order.

Child nodes must be of type File; either a `dag-pb`:ref[File], or a
[`raw` block](#raw-blocks).

For example, consider this pseudo-json block:

```json
{
  "Links": [{"Hash":"Qmfoo"}, {"Hash":"Qmbar"}],
  "Data": {
    "Type": "File",
    "blocksizes": [20, 30]
  }
}
```

This indicates that this file is the concatenation of the `Qmfoo` and `Qmbar` files.

When reading a file represented with `dag-pb`, the `blocksizes` array gives us the
size in bytes of the partial file content present in children DAGs. Each index in
`PBNode.Links` MUST have a corresponding chunk size stored at the same index
in `decode(PBNode.Data).blocksizes`.

Implementers need to be extra careful to ensure the values in `Data.blocksizes`
are calculated by following the definition from [`Blocksize`](#decodepbnodedatablocksize).

This allows for fast indexing into the file. For example, if someone is trying
to read bytes 25 to 35, we can compute an offset list by summing all previous
indexes in `blocksizes`, then do a search to find which indexes contain the
range we are interested in.

In the example above, the offset list would be `[0, 20]`. Thus, we know we only need to download `Qmbar` to get the range we are interested in.

UnixFS parser MUST error if `blocksizes` or `Links` are not of the same length.

##### `decode(PBNode.Data).Data`

An array of bytes that is the file content and is appended before
the links. This must be taken into account when doing offset calculations; that is,
the length of `decode(PBNode.Data).Data` defines the value of the zeroth element
of the offset list when computing offsets.

##### `PBNode.Links[].Name`

This field makes sense only in :ref[Directories] contexts and MUST be absent
when creating a new file. For historical reasons, implementations parsing
third-party data SHOULD accept empty values here.

If this field is present and non-empty, the file is invalid and the parser MUST
error.

##### `decode(PBNode.Data).Blocksize`

This field is not directly present in the block, but rather a computable property
of a `dag-pb`, which would be used in the parent node in `decode(PBNode.Data).blocksizes`.
It is the sum of the length of `decode(PBNode.Data).Data` field plus the sum
of all link's `blocksizes`.

##### `decode(PBNode.Data).filesize`

If present, this field MUST be equal to the `Blocksize` computation above.
Otherwise, this file is invalid.

##### Path Resolution

A file terminates a UnixFS content path. Any attempt to resolve a path past a
file MUST error.

#### `Directory` Type

A :dfn[Directory], also known as folder, is a named collection of child :ref[Nodes]:

- Every link in `PBNode.Links` is an entry (child) of the directory, and
  `PBNode.Links[].Name` gives you the name of that child.
- Duplicate names are not allowed. Therefore, two elements of `PBNode.Link` CANNOT
  have the same `Name`. If two identical names are present in a directory, the
  decoder MUST fail.

The minimum valid `PBNode.Data` field for a directory is as follows:

```json
{
  "Type": "Directory"
}
```

The remaining relevant values are covered in [Metadata](#metadata).

##### Link Ordering

The canonical sorting order is lexicographical over the names.

In theory, there is no reason an encoder couldn't use an other ordering. However,
this loses some of its meaning when mapped into most file systems today, as most file
systems consider directories to be unordered key-value objects.

A decoder SHOULD, if it can, preserve the order of the original files in the same way
it consumed those names. However, when some implementations decode, modify and then
re-encode, the original link order loses it's original meaning, given that there
is no way to indicate which sorting was used originally.

##### Path Resolution

Pop the left-most component of the path, and try to match it to the `Name` of
a child under `PBNode.Links`. If you find a match, you can then remember the CID.
You MUST continue the search. If you find another match, you MUST error since
duplicate names are not allowed. <!--TODO: check Kubo does this-->

Assuming no errors were raised, you can continue to the path resolution on the 
remaining components and on the CID you popped.


#### `Symlink` type

A :dfn[Symlink] represents a POSIX [symbolic link](https://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html).
A symlink MUST NOT have children. <!--TODO: check that this is true-->

The `PBNode.Data.Data` field is a POSIX path that MAY be appended in front of the
currently remaining path component stack.

##### Path Resolution

There is no current consensus on how pathing over symlinks should behave. Some
implementations return symlink objects and fail if a consumer tries to follow them
through.

Following the POSIX specification over the current UnixFS path context is probably fine.

#### `HAMTDirectory`

A :dfn[HAMT Directory] is a [Hashed-Array-Mapped-Trie](https://en.wikipedia.org/wiki/Hash_array_mapped_trie)
data structure representing a :ref[Directory]. It is generally used to represent
directories that cannot fit inside a single block. These are also known as "sharded
directories:, since they allow you to split large directories into multiple blocks, known as "shards".

- `decode(PBNode.Data).hashType` indicates the [multihash] function to use to digest
  the path components used for sharding. It MUST be `murmur3-x64-64` (`0x22`).
- `decode(PBNode.Data).Data.Data` is a bit field, which indicates whether or not
  links are part of this HAMT, or its leaves. The usage of this field is unknown, given
  that you can deduce the same information from the link names.
- `decode(PBNode.Data).Data.fanout` MUST be a power of two. This encodes the number
  of hash permutations that will be used on each resolution step. The log base 2
  of the `fanout` indicate how wide the bitmask will be on the hash at for that step.
  `fanout` MUST be between 8 and probably 65536. <!-- 65536 is a totally arbitrary choice I made, FIXME: get consensus on an upper bound. -->.

The field `Name` of an element of `PBNode.Links` for a HAMT starts with an
uppercase hex-encoded prefix, which is `log2(fanout)` bits wide.

##### Path Resolution

To resolve the path inside a HAMT:

1. Take the current path component, then hash it using the [multihash] represented
   by the value of `decode(PBNode.Data).hashType`.
2. Pop the `log2(fanout)` lowest bits from the path component hash digest, then
   hex encode (using 0-F) those bits using little endian. Find the link that starts
   with this hex encoded path.
3. If the link `Name` is exactly as long as the hex encoded representation, follow
   the link and repeat step 2 with the child node and the remaining bit stack.
   The child node MUST be a HAMT directory, or else the directory is invalid. Otherwise, continue.
4. Compare the remaining part of the last name you found. If it matches the original
   name you were trying to resolve, you have successfully resolved a path component.
   Everything past the hex encoded prefix is the name of that element, which is useful when listing children of this directory.

### `TSize` (child DAG size hint)

`Tsize` is an optional field in `PBNode.Links[]` which represents the precomputed size of the specific child DAG. It provides a performance optimization: a hint about the total size of child DAG can be read without having to fetch any child nodes.

To compute the `Tsize` of a child DAG, sum the length of the `dag-pb` outside message binary length and the `blocksizes` of all nodes in the child DAG.

:::note

Examples of where `Tsize` is useful:

- User interfaces, where total size of a DAG needs to be displayed immediately, without having to do the full DAG walk.
- Smart download clients, downloading a file concurrently from two sources that have radically different speeds. It may be more efficient to parallelize and download bigger
links from the fastest source, and smaller ones from the slower sources.

:::

:::warning

An implementation SHOULD NOT assume the `TSize` values are correct. The value is only a hint that provides performance optimization for better UX.

Following the [Robustness Principle](https://specs.ipfs.tech/architecture/principles/#robustness), implementation SHOULD be
able to decode nodes where the `Tsize` field is wrong (not matching the sizes of  sub-DAGs), or 
partially or completely missing.

When total data size is needed for important purposes such as accounting, billing, and cost estimation, the `Tsize` SHOULD NOT be used, and instead a full DAG walk SHOULD to be performed.

:::

### Metadata

UnixFS currently supports two optional metadata fields.

#### `mode`

The `mode` is for persisting the file permissions in [numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation)
\[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].

- If unspecified, this defaults to
  - `0755` for directories/HAMT shards
  - `0644` for all other types where applicable
- The nine least significant bits represent  `ugo-rwx`
- The next three least significant bits represent `setuid`, `setgid` and the `sticky bit`
- The remaining 20 bits are reserved for future use, and are subject to change. Spec implementations **MUST** handle bits they do not expect as follows:
  - For future-proofing, the (de)serialization layer must preserve the entire uint32 value during clone/copy operations, modifying only bit values that have a well defined meaning: `clonedValue = ( modifiedBits & 07777 ) | ( originalValue & 0xFFFFF000 )`
  - Implementations of this spec must proactively mask off bits without a defined meaning in the implemented version of the spec: `interpretedValue = originalValue & 07777`

#### `mtime`

A two-element structure ( `Seconds`, `FractionalNanoseconds` ) representing the
modification time in seconds relative to the unix epoch `1970-01-01T00:00:00Z`.
The two fields are:

1. `Seconds` ( always present, signed 64bit integer ): represents the amount of seconds after **or before** the epoch.
2. `FractionalNanoseconds` ( optional, 32bit unsigned integer ): when specified, represents the fractional part of the `mtime` as the amount of nanoseconds. The valid range for this value are the integers `[1, 999999999]`.

Implementations encoding or decoding wire-representations MUST observe the following:

- An `mtime` structure with `FractionalNanoseconds` outside of the on-wire range
  `[1, 999999999]` is **not** valid. This includes a fractional value of `0`.
  Implementations encountering such values should consider the entire enclosing
  metadata block malformed and abort the processing of the corresponding DAG.
- The `mtime` structure is optional. Its absence implies `unspecified` rather
  than `0`.
- For ergonomic reasons, a surface API of an encoder MUST allow fractional `0` as
  input, while at the same time MUST ensure it is stripped from the final structure
  before encoding, satisfying the above constraints.

Implementations interpreting the `mtime` metadata in order to apply it within a
non-IPFS target MUST observe the following:

- If the target supports a distinction between `unspecified` and `0`/`1970-01-01T00:00:00Z`,
  the distinction must be preserved within the target. For example, if no `mtime` structure
  is available, a web gateway must **not** render a `Last-Modified:` header.
- If the target requires an `mtime` ( e.g. a FUSE interface ) and no `mtime` is 
  supplied OR the supplied `mtime` falls outside of the targets accepted range:
  - When no `mtime` is specified or the resulting `UnixTime` is negative:
    implementations must assume `0`/`1970-01-01T00:00:00Z` (note that such values
    are not merely academic: e.g. the OpenVMS epoch is `1858-11-17T00:00:00Z`)
  - When the resulting `UnixTime` is larger than the targets range ( e.g. 32bit
    vs 64bit mismatch), implementations must assume the highest possible value
    in the targets range. In most cases, this would be `2038-01-19T03:14:07Z`.

## Paths

Paths begin with a `<CID>/` or `/ipfs/<CID>/`, where `<CID>` is a [multibase]
encoded [CID]. The CID encoding MUST NOT use a multibase alphabet that contains
`/` (`0x2f`) unicode codepoints. However, CIDs may use a multibase encoding with
a `/` in the alphabet if the encoded CID does not contain `/` once encoded.

Everything following the CID is a collection of path components (some bytes)
separated by `/` (`0x2F`). UnixFS paths read from left to right, and are
inspired by POSIX paths.

- Components MUST NOT contain `/` unicode codepoints because it would break
  the path into two components.
- Components SHOULD be UTF8 unicode.
- Components are case-sensitive.

### Escaping

The `\` may be used to trigger an escape sequence. However, it is currently
broken and inconsistent across implementations. Until we agree on a specification
for this, you SHOULD NOT use any escape sequences and/or non-ASCII characters.

### Relative Path Components

Relative path components MUST be resolved before trying to work on the path:

- `.` points to the current node and  MUST be removed.
- `..` points to the parent node and MUST be removed left to right. When removing
  a `..`, the path component on the left MUST also be removed. If there is no path
  component on the left, you MUST error to avoid out-of-bounds
  path resolution.

### Restricted Names

The following names SHOULD NOT be used:

- The `.` string, as it represents the self node in POSIX pathing.
- The `..` string, as it represents the parent node in POSIX pathing.
- The empty string. <!--TODO: check that this is true-->
- Any string containing a `NULL` (`0x00`) byte, as this is often used to signify string
  terminations in some systems, such as C-compatible systems. Many unix
  file systems do not accept this character in path components.

## Design Decision Rationale

### `mtime` and `mode` Metadata Support in UnixFSv1.5

Metadata support in UnixFSv1.5 has been expanded to increase the number of possible
use cases. These include `rsync` and filesystem-based package managers.

Several metadata systems were evaluated, as discussed in the following sections.

#### Separate Metadata Node

In this scheme, the existing `Metadata` message is expanded to include additional
metadata types (`mtime`, `mode`, etc). It contains links to the actual file data,
but never the file data itself.

This was ultimately rejected for a number of reasons:

1. You would always need to retrieve an additional node to access file data, which
  limits the kind of optimizations that are possible. For example, many files are
  under the 256 KiB block size limit, so we tend to inline them into the describing
  UnixFS `File` node. This would not be possible with an intermediate `Metadata` node.
2. The `File` node already contains some metadata (e.g. the file size), so metadata
  would be stored in multiple places. This complicates forwards compatibility with
  UnixFSv2, as mapping between metadata formats potentially requires multiple fetch
  operations.

#### Metadata in the Directory

Repeated `Metadata` messages are added to UnixFS `Directory` and `HAMTShard` nodes,
the index of which indicates which entry they are to be applied to. Where entries are
`HAMTShard`s, an empty message is added.

One advantage of this method is that, if we expand stored metadata to include entry
types and sizes, we can perform directory listings without needing to fetch further
entry nodes (excepting `HAMTShard` nodes). However, without removing the storage of
these datums elsewhere in the spec, we run the risk of having non-canonical data
locations and perhaps conflicting data as we traverse through trees containing
both UnixFS v1 and v1.5 nodes.

This was rejected for the following reasons:

1. When creating a UnixFS node, there's no way to record metadata without wrapping
  it in a directory.
2. If you access any UnixFS node directly by its [CID], there is no way of recreating
   the metadata which limits flexibility.
3. In order to list the contents of a directory including entry types and sizes,
   you have to fetch the root node of each entry, so the performance benefit
   of including some metadata in the containing directory is negligible in this
   use case.

#### Metadata in the File

This adds new fields to the UnixFS `Data` message to represent the various metadata fields.

It has the advantage of being simple to implement. Metadata is maintained whether
the file is accessed directly via its [CID] or via an IPFS path that includes a
containing directory. In addition, metadata is kept small enough that we can inline root
UnixFS nodes into their CIDs so that we can end up fetching the same number of nodes if
we decide to keep file data in a leaf node for deduplication reasons.

Downsides to this approach are:

1. Two users adding the same file to IPFS at different times will have different
  [CID]s due to the `mtime`s being different. If the content is stored in another
  node, its [CID] will be constant between the two users, but you can't navigate 
  to it unless you have the parent node, which will be less available due to the 
  proliferation of [CID]s.
1. Metadata is also impossible to remove without changing the [CID], so 
  metadata becomes part of the content.
2. Performance may be impacted as well as if we don't inline UnixFS root nodes
  into [CID]s, so additional fetches will be required to load a given UnixFS entry.

#### Side Trees

With this approach, we would maintain a separate data structure outside of the
UnixFS tree to hold metadata.

This was rejected due to concerns about added complexity, recovery after system
crashes while writing, and having to make extra requests to fetch metadata nodes
when resolving [CID]s from peers.

#### Side Database

This scheme would see metadata stored in an external database.

The downsides to this are that metadata would not be transferred from one node
to another when syncing, as [Bitswap] is not aware of the database and in-tree
metadata.

### UnixTime Protobuf Datatype Rationale

#### Seconds

The integer portion of UnixTime is represented on the wire using a `varint` encoding.
While this is inefficient for negative values, it avoids introducing zig-zag encoding.
Values before the year `1970` are exceedingly rare, and it would be handy having
such cases stand out, while ensuring that the "usual" positive values are easily readable. The `varint` representing the time of writing this text is 5 bytes
long. It will remain so until October 26, 3058 (34,359,738,367).

#### FractionalNanoseconds

Fractional values are effectively a random number in the range 1 to 999,999,999.
In most cases, such values will exceed 2^28 (268,435,456) nanoseconds. Therefore,
the fractional part is represented as a 4-byte `fixed32`,
[as per Google's recommendation](https://developers.google.com/protocol-buffers/docs/proto#scalar).

# Notes for Implementers

This section and included subsections are not authoritative.

## Implementations

- JavaScript
  - Data Formats - [unixfs](https://github.com/ipfs/js-ipfs-unixfs)
  - Importer - [unixfs-importer](https://github.com/ipfs/js-ipfs-unixfs-importer)
  - Exporter - [unixfs-exporter](https://github.com/ipfs/js-ipfs-unixfs-exporter)
- Go
  - Protocol Buffer Definitions - [`ipfs/go-unixfs/pb`](https://github.com/ipfs/go-unixfs/blob/707110f05dac4309bdcf581450881fb00f5bc578/pb/unixfs.proto)
  - [`ipfs/go-unixfs`](https://github.com/ipfs/go-unixfs/)
  - `go-ipld-prime` implementation [`ipfs/go-unixfsnode`](https://github.com/ipfs/go-unixfsnode)
- Rust
  - [`iroh-unixfs`](https://github.com/n0-computer/iroh/tree/b7a4dd2b01dbc665435659951e3e06d900966f5f/iroh-unixfs)
  - [`unixfs-v1`](https://github.com/ipfs-rust/unixfsv1)

## Simple `Raw` Example

In this example, we will build a `Raw` file with the string `test` as its content.

1. First, hash the data:

```console
$ echo -n "test" | sha256sum
9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08  -
```

2. Add the CID prefix:

```
f this is the multibase prefix, we need it because we are working with a hex CID, this is omitted for binary CIDs
 01 the CID version, here one
   55 the codec, here we MUST use Raw because this is a Raw file
     12 the hashing function used, here sha256
       20 the digest length 32 bytes
         9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 the digest we computed earlier
```

3. Profit! Assuming we stored this block in some implementation of our choice, which makes it accessible to our client, we can try to decode it.

```console
$ ipfs cat f015512209f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
test
```

## Offset List

The offset list isn't the only way to use blocksizes and reach a correct implementation,
it is a simple canonical one, python pseudo code to compute it looks like this:

```python
def offsetlist(node):
  unixfs = decodeDataField(node.Data)
  if len(node.Links) != len(unixfs.Blocksizes):
    raise "unmatched sister-lists" # error messages are implementation details

  cursor = len(unixfs.Data) if unixfs.Data else 0
  return [cursor] + [cursor := cursor + size for size in unixfs.Blocksizes[:-1]]
```

This will tell you which offset inside this node the children at the corresponding index starts to cover. (using `[x,y)` ranging)

[protobuf]: https://developers.google.com/protocol-buffers/
[CID]: https://github.com/multiformats/cid/
[multicodec]: https://github.com/multiformats/multicodec
[multihash]: https://github.com/multiformats/multihash
[Bitswap]: https://github.com/ipfs/specs/blob/master/BITSWAP.md
[ipld-dag-pb]: https://ipld.io/specs/codecs/dag-pb/spec/