# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) UnixFS  <!-- omit in toc -->

**Author(s)**:
- NA

* * *

**Abstract**

UnixFS is a [protocol-buffers](https://developers.google.com/protocol-buffers/) based format for describing files, directories, and symlinks in IPFS. The current implementation of UnixFS has grown organically and does not have a clear specification document. See [“implementations”](#implementations) below for reference implementations you can examine to understand the format.

Draft work and discussion on a specification for the upcoming version 2 of the UnixFS format is happening in the [`ipfs/unixfs-v2` repo](https://github.com/ipfs/unixfs-v2). Please see the issues there for discussion and PRs for drafts. When the specification is completed there, it will be copied back to this repo and replace this document.

## Table of Contents <!-- omit in toc -->

- [Implementations](#implementations)
- [Data Format](#data-format)
- [Metadata](#metadata)
	- [Inheritance](#inheritance)
	- [Deduplication and inlining](#deduplication-and-inlining)
- [Importing](#importing)
	- [Chunking](#chunking)
	- [Layout](#layout)
- [Exporting](#exporting)
- [Design decision rationale](#design-decision-rationale)
	- [Metadata](#metadata-1)
		- [Separate Metadata node](#separate-metadata-node)
		- [Metadata in the directory](#metadata-in-the-directory)
		- [Metadata in the file](#metadata-in-the-file)
		- [Side trees](#side-trees)
		- [Side database](#side-database)

## Implementations

- JavaScript
  - Data Formats - [unixfs](https://github.com/ipfs/js-ipfs-unixfs)
  - Importer - [unixfs-importer](https://github.com/ipfs/js-ipfs-unixfs-importer)
  - Exporter - [unixfs-exporter](https://github.com/ipfs/js-ipfs-unixfs-exporter)
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

UnixFS currently supports two optional metadata fields:

* `mode` -- The `mode` is for persisting the file permissions in [numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation) \[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].
  If unspecified this defaults to `0755` for directories/HAMT shards and `0644` for all other types where applicable
  The nine least significant bits represent  `ugo-rwx`
  The next three least significant bits represent `setuid`, `setgid` and the `sticky bit`
  All others are reserved for future use
* `mtime` -- The modification time in seconds since the epoch. This defaults to the unix epoch if unspecified

### Inheritance

When traversing down through a UnixFSv1.5 directory, child entries without metadata fields will inherit those of their direct ascendants.

### Deduplication and inlining

Where the file data is small it would normally be stored in the `Data` field of the UnixFS `File` node.

To aid in deduplication of data even for small files, file data can be stored in a separate node linked to from the `File` node in order for the data to have a constant [CID] regardless of the metadata associated with it.

As a further optimization, if the `File` node's serialized size is small, it may be inlined into its v1 [CID] by using the [`identity`](https://github.com/multiformats/multicodec/blob/master/table.csv) [multihash].

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

## Design decision rationale

### Metadata

Metadata support in UnixFSv1.5 has been expanded to increase the number of possible use cases.  These include rsync and filesystem based package managers.

Several metadata systems were evaluated:

#### Separate Metadata node

In this scheme, the existing `Metadata` message is expanded to include additional metadata types (`mtime`, `mode`, etc).  It then contains links to the actual file data but never the file data itself.

This was ultimately rejected for a number of reasons:

1. You would always need to retrieve an additional node to access file data which limits the kind of optimizations that are possible.

	For example many files are under the 256KiB block size limit, so we tend to inline them into the describing UnixFS `File` node.  This would not be possible with an intermediate `Metadata` node.

2. The `File` node already contains some metadata (e.g. the file size) so metadata would be stored in multiple places which complicates forwards compatibility with UnixFSv2 as to map between metadata formats potentially requires multiple fetch operations

#### Metadata in the directory

Repeated `Metadata ` messages are added to UnixFS `Directory` and `HAMTShard` nodes, the index of which indicates which entry they are to be applied to.

Where entries are `HAMTShard`s, an empty message is added.

One advantage of this method is that if we expand stored metadata to include entry types and sizes we can perform directory listings without needing to fetch further entry nodes (excepting `HAMTShard` nodes), though without removing the storage of these datums elsewhere in the spec we run the risk of having non-canonical data locations and perhaps conflicting data as we traverse through trees containing both UnixFS v1 and v1.5 nodes.

This was rejected for the following reasons:

1. When creating a UnixFS node there's no way to record metadata without wrapping it in a directory.

2. If you access any UnixFS node directly by its [CID], there is no way of recreating the metadata which limits flexibility.

3. In order to list the contents of a directory including entry types and sizes, you have to fetch the root node of each entry anyway so the performance benefit of including some metadata in the containing directory is negligible in this use case.

#### Metadata in the file

This adds new fields to the UnixFS `Data` message to represent the various metadata fields.

It has the advantage of being simple to implement, metadata is maintained whether the file is accessed directly via its [CID] or via an IPFS path that includes a containing directory, and by keeping the metadata small enough we can inline root UnixFS nodes into their CIDs so we can end up fetching the same number of nodes if we decide to keep file data in a leaf node for deduplication reasons.

Downsides to this approach are:

1. Two users adding the same file to IPFS at different times will have different [CID]s due to the `mtime`s being different.

	If the content is stored in another node, its [CID] will be constant between the two users but you can't navigate to it unless you have the parent node which will be less available due to the proliferation of [CID]s.

2. Metadata is also impossible to remove without changing the [CID], so metadata becomes part of the content.

3. Performance may be impacted as well as if we don't inline UnixFS root nodes into [CID]s, additional fetches will be required to load a given UnixFS entry.

#### Side trees

With this approach we would maintain a separate data structure outside of the UnixFS tree to hold metadata.

This was rejected due to concerns about added complexity, recovery after system crashes while writing, and having to make extra requests to fetch metadata nodes when resolving [CID]s from peers.

#### Side database

This scheme would see metadata stored in an external database.

The downsides to this are that metadata would not be transferred from one node to another when syncing as [Bitswap] is not aware of the database, and in-tree metadata

[multihash]: https://tools.ietf.org/html/draft-multiformats-multihash-00
[CID]: https://docs.ipfs.io/guides/concepts/cid/
[Bitswap]: https://github.com/ipfs/specs/blob/master/BITSWAP.md
[MFS]: https://docs.ipfs.io/guides/concepts/mfs/
