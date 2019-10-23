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

	repeated Metadata metadata = 7;
}

message Metadata {
	optional string mimeType = 1;
	optional uint32 mode = 2;
	optional int64 mtime = 3;
}
```

This `Data` object is used for all non-leaf nodes in Unixfs.

For files that are comprised of more than a single block, the 'Type' field will be set to 'File', the 'filesize' field will be set to the total number of bytes in the file (not the graph structure) represented by this node, and 'blocksizes' will contain a list of the filesizes of each child node.

This data is serialized and placed inside the 'Data' field of the outer merkledag protobuf, which also contains the actual links to the child nodes of this object.

## Metadata

There are two ways to specify file metadata:

1. The repeated `metadata` field in a directory applies metadata to each file in the directory.
2. An intermediary node with a `Type` of `Metadata` applies metadata to an individual file. While this feature should be supported, it has been deprecated.

Fields:

* `mimeType` -- The mime-type of the file. This generally shouldn't be used.
* `mode` -- The `mode` is for optionally persisting the [file permissions in numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation) \[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].
* `mtime` -- The modification time in seconds since the epoch. This is a 64 bit uint for forwards compatibility.

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
