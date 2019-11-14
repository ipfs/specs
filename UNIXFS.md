# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) UnixFS

**Author(s)**:
- NA

* * *

**Abstract**

UnixFS is a [protocol-buffers](https://developers.google.com/protocol-buffers/) based format for describing files, directories, and symlinks in IPFS. The current implementation of UnixFS has grown organically and does not have a clear specification document. See [“implementations”](#implementations) below for reference implementations you can examine to understand the format.

Draft work and discussion on a specification for the upcoming version 2 of the UnixFS format is happening in the [`ipfs/unixfs-v2` repo](https://github.com/ipfs/unixfs-v2). Please see the issues there for discussion and PRs for drafts. When the specification is completed there, it will be copied back to this repo and replace this document.

## Table of Contents

TODO

## Implementations

- JavaScript
  - Data Formats - [unixfs](https://github.com/ipfs/js-ipfs-unixfs)
  - Importers and Exporters - [unixfs-engine](https://github.com/ipfs/js-ipfs-unixfs-engine)
- Go
  - [`ipfs/go-ipfs/unixfs`](https://github.com/ipfs/go-ipfs/tree/b3faaad1310bcc32dc3dd24e1919e9edf51edba8/unixfs)
  - Protocol Buffer Definitions - [`ipfs/go-ipfs/unixfs/pb`](https://github.com/ipfs/go-ipfs/blob/b3faaad1310bcc32dc3dd24e1919e9edf51edba8/unixfs/pb/unixfs.proto)

## Data Format

The UnixfsV1 data format is represented by this protobuf:

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
	optional int64 mtime = 8;
}

message Metadata {
	optional string MimeType = 1;
}
```

This `Data` object is used for all non-leaf nodes in Unixfs.

For files that are comprised of more than a single block, the 'Type' field will be set to 'File', the 'filesize' field will be set to the total number of bytes in the file (not the graph structure) represented by this node, and 'blocksizes' will contain a list of the filesizes of each child node.

This data is serialized and placed inside the 'Data' field of the outer merkledag protobuf, which also contains the actual links to the child nodes of this object.

For files comprised of a single block, the 'Type' field will be set to 'File', 'filesize' will be set to the total number of bytes in the file and the file data will be stored in the 'Data' field.

The serialized size of a UnixFS node must not exceed 256KiB in order to work will with the [Bitswap] protocol.

## Metadata

UnixFS currently supports three optional metadata fields:

* `mode` -- The `mode` is for persisting the [file permissions in numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation) \[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\]. If unspecified this defaults to `0755` for directories/HAMT shards and `0644` for all other types where applicable.
* `mtime` -- The modification time in seconds since the epoch. This defaults to the unix epoch if unspecified.
* `MimeType` -- The mime type of the file. This field is deprecated, as is the `Metadata` message and neither will be present in `UnixFSv2` because mime types are not typically properties of a file system.

### Inheritance

When traversing down through a UnixFSv1.5 directory, child entries without metadata fields will inherit those of their direct ascendants.

### Deduplication and inlining

Where the file data is small it would normally be stored in the `Data` field of the UnixFS `File` node.

To aid in deduplication of data even for small files, file data can be stored in a separate node linked to from the `File` node in order for the data to have a constant [CID] regardless of the metadata associated with it.

As a further optimization, if the `File` node's serialized size is small, it may be inlined into it's v1 [CID] by using the [`identity`](https://github.com/multiformats/multicodec/blob/master/table.csv) [multihash].

Such [CID]s must consist of 23 bytes or fewer in order for them to fit inside the 63 character limit for a DNS label when encoded in base32 (see [RFC1035 Section 2.3.1](https://tools.ietf.org/html/rfc1035#section-2.3.1)).

## Importing

Importing a file into unixfs is split up into two parts. The first is chunking, the second is layout.

### Chunking

Chunking has two main parameters, chunking strategy and leaf format.

Leaf format should always be set to 'raw', this is mainly configurable for backwards compatibility with earlier formats that used a Unixfs Data object with type 'Raw'. Raw leaves means that the nodes output from chunking will be just raw data from the file with a CID type of 'raw'.

Chunking strategy currently has two different options, 'fixed size' and 'rabin'. Fixed size chunking will chunk the input data into pieces of a given size. Rabin chunking will chunk the input data using rabin fingerprinting to determine the boundaries between chunks.


### Layout

Layout defines the shape of the tree that gets built from the chunks of the input file.

There are currently two options for layout, balanced, and trickle.
Additionally, a 'max width' must be specified. The default max width is 174.

The balanced layout creates a balanced tree of width 'max width'. The tree is formed by taking up to 'max width' chunks from the chunk stream, and creating a unixfs file node that links to all of them. This is repeated until 'max width' unixfs file nodes are created, at which point a unixfs file node is created to hold all of those nodes, recursively. The root node of the resultant tree is returned as the handle to the newly imported file.

If there is only a single chunk, no intermediate unixfs file nodes are created, and the single chunk is returned as the handle to the file.

## Exporting

To read the file data out of the unixfs graph, perform an in order traversal, emitting the data contained in each of the leaves.

[multihash]: https://tools.ietf.org/html/draft-multiformats-multihash-00
[CID]: https://docs.ipfs.io/guides/concepts/cid/
[Bitswap]: https://github.com/ipfs/specs/blob/master/BITSWAP.md