# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) UnixFS  <!-- omit in toc -->

**Author(s)**:
- NA

* * *

**Abstract**

UnixFS is a [protocol-buffers](https://developers.google.com/protocol-buffers/) based format for describing files, directories, and symlinks as merkle-dags in IPFS.

## Table of Contents <!-- omit in toc -->

- [Implementations](#implementations)
- [Data Format](#data-format)
- [Metadata](#metadata)
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

## How to read a Node

To read a node, first get a CID. This is what we will decode.

To recap, every [CID](https://github.com/multiformats/cid) includes:
1. A [multicodec](https://github.com/multiformats/multicodec), also called codec.
1. A [Multihash](https://github.com/multiformats/multihash) used to specify a hashing algorithm, the hashing parameters and the hash digest.

The first step is to get the block, that means the actual bytes which when hashed (using the hash function specified in the multihash) gives you the same multihash value back.

### Multicodecs

With Unixfs we deal with two codecs which will be decoded differently:
- `Raw`, single block files
- `dag-pb`, can be any nodes

#### `Raw` blocks

The simplest nodes use `Raw` encoding.

They are always implicitly of type `file`.

They can be recognized because their CIDs have `Raw` codec.

The file content is purely the block body.

They never have any children nodes, and thus are also known as single block files.

Their sizes (both `dagsize` and `blocksize`) is the length of the block body.

#### `dag-pb` nodes

##### Data Format

The UnixfsV1 `Data` message format is represented by this protobuf:

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

##### IPLD `dag-pb`

A very important other spec for unixfs is the [`dag-pb`](https://ipld.io/specs/codecs/dag-pb/spec/) IPLD spec:

```protobuf
message PBLink {
	// binary CID (with no multibase prefix) of the target object
	optional bytes Hash = 1;

	// UTF-8 string name
	optional string Name = 2;

	// cumulative size of target object
	optional uint64 Tsize = 3; // also known as dagsize
}

message PBNode {
	// refs to other objects
	repeated PBLink Links = 2;

	// opaque user data
	optional bytes Data = 1;
}
```

The two different schemas plays together and it is important to understand their different effect,
- The `dag-pb` / `PBNode` protobuf is the "outside" protobuf message; in other words, it is the first message decoded. This protobuf contains the list of links and some "opaque user data".
- The `Data` message is the "inside" protobuf message. After the "outside" `dag-pb` (also known as `PBNode`) object is decoded, `Data` is decoded from the bytes inside the `PBNode.Data` field. This contains the rest of information.

In other words, we have a serialized protobuf message stored inside another protobuf message.
For clarity, the spec document may represents these nested protobufs as one object. In this representation, it is implied that the `PBNode.Data` field is encoded in a prototbuf.

##### Different Data types

`dag-pb` nodes supports many different types, which can be found in `decodeData(PBNode.Data).Type`. Every type is handled differently.

###### `File` type

####### The _sister-lists_ `PBNode.Links` and `decodeMessage(PBNode.Data).blocksizes`

The _sister-lists_ are the key point of why `dag-pb` is important for files.

This allows us to concatenate smaller files together.

Linked files would be loaded recursively with the same process following a DFS (Depth-First-Search) order.

Child nodes must be of type file (so `dag-pb` where type is `File` or `Raw`)

For example this example pseudo-json block:
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

When reading a file represented with `dag-pb`, the `blocksizes` array gives us the size in bytes of the partial file content present in child DAGs.
Each index in `PBNode.Links` MUST have a corresponding chunk size stored at the same index in `decodeMessage(PBNode.Data).blocksizes`.

Implementers need to be extra careful to ensure the values in `Data.blocksizes` are calculated by following the definition from [Blocksize](#blocksize) section.

This allows to do fast indexing into the file, 	for example if someone is trying to read bytes 25 to 35 we can compute an offset list by summing all previous indexes in `blocksizes`, then do a search to find which indexes contain the range we are intrested in.

For example here the offset list would be `[0, 20]` and thus we know we only need to download `Qmbar` to get the range we are intrested in.

UnixFS parser MUST error if `blocksizes` or `Links` are not of the same length.

####### `decodeMessage(PBNode.Data).Data`

This field is an array of bytes, it is file content and is appended before the links.

This must be taken into a count when doing offsets calculations (the len of the `Data.Data` field define the value of the zeroth element of the offset list when computing offsets).

####### `PBNode.Links[].Name` with Files

This field makes sense only in directory contexts and MUST be absent when creating a new file `PBNode`.
For historic reasons, implementations parsing third-party data SHOULD accept empty value here.

If this field is present and non empty, the file is invalid and parser MUST error.

####### `Blocksize` of a dag-pb file

This is not a field present in the block directly, but rather a computable property of `dag-pb` which would be used in parent node in `decodeMessage(PBNode.Data).blocksizes`.
It is the sum of the length of the `Data.Data` field plus the sum of all link's blocksizes.

####### `PBNode.Data.Filesize`

If present, this field must be equal to the `Blocksize` computation above, else the file is invalid.

####### Path resolution

A file terminates UnixFS content path.

Any attempt of path resolution on `File` type MUST error.

###### `Directory` Type

A directory node is a named collection of nodes.

The minimum valid `PBNode.Data` field for a directory is (pseudo-json): `{"Type":"Directory"}`, other values are covered in Metadata.

Every link in the Links list is an entry (children) of the directory, and the `PBNode.Links[].Name` field give you the name.

####### Link ordering

The cannonical sorting order is lexicographical over the names.

In theory there is no reason an encoder couldn't use an other ordering, however this lose some of it's meaning when mapped into most file systems today (most file systems consider directories are unordered-key-value objects).

A decoder SHOULD if it can, preserve the order of the original files in however it consume thoses names.

However when some implementation decode, modify then reencode some, the orignal links order fully lose it's meaning. (given that there is no way to indicate which sorting was used originally)

####### Path Resolution

Pop the left most component of the path, and try to match it to one of the Name in Links.

<!--TODO: check Kubo does this-->If you find a match you can then remember the CID. You MUST continue your search, however if you find a match again you MUST error.

Assuming no errors were raised, you can continue to the path resolution on the mainaing component and on the CID you poped.

####### Duplicate names

Duplicate names are not allowed, if two identical names are present in an directory, the decoder MUST error.

###### `Symlink` type

<!--TODO: check that this is true-->Symlinks MUST NOT have childs.

Their Data.Data field is a POSIX path that maybe appended in front of the currently remaining path component stack.

####### Path resolution on symlinks

There is no current consensus on how pathing over symlinks should behave.
Some implementations return symlinks objects and fail if a consumer tries to follow it through.

Following the POSIX spec over the current unixfs path context is probably fine.

###### `HAMTDirectory`

Thoses nodes are also sometimes called sharded directories, they allow to split directories into many blocks when they are so big that they don't fit into one single block anymore.

- `node.Data.hashType` indicates a multihash function to use to digest path components used for sharding.
It MUST be murmur3-x64-64 (multihash `0x22`).
- `node.Data.Data` is some bitfield, ones indicates whether or not the links are part of this HAMT or leaves of the HAMT.
The usage of this field is unknown given you can deduce the same information from the links names.
- `node.Data.fanout` MUST be a power of two. This encode the number of hash permutations that will be used on each resolution step.
The log base 2 of the fanout indicate how wide the bitmask will be on the hash at for that step. `fanout` MUST be between 8 and probably 65536<!-- 65536 is a totally arbitrary choice I made, FIXME: get consensus on an upper bound. -->.

####### `node.Links[].Name` on HAMTs

They start by some uppercase hex encoded prefix which is `log2(fanout)` bits wide

####### Path resolution on HAMTs

Steps:
1. Take the current path component then hash it using the multihash id provided in `Data.hashType`.
2. Pop the `log2(fanout)` lowest bits from the path component hash digest, then hex encode (using 0-F) thoses bits using little endian thoses bits and find the link that starts with this hex encoded path.
3. If the link name is exactly as long as the hex encoded representation, follow the link and repeat step 2 with the child node and the remaining bit stack. The child node MUST be a hamt directory else the directory is invalid, else continue.
4. Compare the remaining part of the last name you found, if it match the original name you were trying to resolve you successfully resolved a path component, everything past the hex encoded prefix is the name of that element (usefull when listing childs of this directory).


###### `TSize` / `DagSize`

This is an optional field for Links of `dag-pb` nodes, **it does not represent any meaningfull information of the underlying structure** and no known usage of it to this day (altho some implementation emit thoses).

To compute the `dagsize` of a node (which would be stored in the parents) you sum the length of the dag-pb outside message binary length, plus the blocksizes of all child files.

An example of where this could be usefull is as a hint to smart download clients, for example if you are downloading a file concurrently from two sources that have radically different speeds, it would probably be more efficient to download bigger links from the fastest source, and smaller ones from the slowest source.

<!--TODO: check that this is true-->
There is no failure mode known for this field, so your implementation should be able to decode nodes where this field is wrong (not the value you expect), partially or completely missing. This also allows smarter encoder to give a more accurate picture (for example don't count duplicate blocks, ...).

### Paths

Paths first start with `<CID>/`or `/ipfs/<CID>/` where `<CID>` is a [multibase](https://github.com/multiformats/multibase) encoded [CID](https://github.com/multiformats/cid).
The CID encoding MUST NOT use a multibase alphabet that have `/` (`0x2f`) unicode codepoints however CIDs may use a multibase encoding with a `/` in the alphabet if the encoded CID does not contain `/` once encoded.

Everything following the CID is a collection of path component (some bytes) seperated by `/` (`0x2f`), read from left to right.
This is inspired by POSIX paths.

- Components MUST NOT contain `/` unicode codepoints because else it would break the path into two components.
- Components SHOULD be UTF8 unicode.
- Components are case sensitive.

#### Escaping

The `\` may be supposed to trigger an escape sequence.

This might be a thing, but is broken and inconsistent current implementations.
So until we agree on a new spec for this, you SHOULD NOT use any escape sequence and non ascii character.

#### Relative path components

Thoses path components must be resolved before trying to work on the path.

- `.` points to the current node, those path components must be removed.
- `..` points to the parent, they must be removed first to last however when you remove a `..` you also remove the previous component on the left. If there is no component on the left to remove leave the `..` as-is however this is an attempt for an out-of-bound path resolution which mean you MUST error.

#### Restricted names

Thoses names SHOULD NOT<!--MUST NOT ? in future revisions--> be used:

- The `.` string. This represents the self node in POSIX pathing.
- The `..` string. This represents the parent node in POSIX pathing.
- nothing (the empty string) <!--TODO: check that this is true-->We don't actually know the failure mode for this, but it really feels like this shouldn't be a thing.
- Any string containing a NUL (0x00) byte, this is often used to signify string terminations in some systems (such as most C compatible systems), and many<!-- older ? --> unix file systems don't accept this character in path components.

### Glossary

- Node, Block
  A node is a word from graph theory, this is the smallest unit present in the graph.
  Due to how unixfs work, there is a 1 to 1 mapping between nodes and blocks.
- File
  A file is some container over an arbitrary sized amounts of bytes.
  Files can be said to be single block, or multi block, in the later case they are the concatenation of multiple children files.
- Directory, Folder
  A named collection of child nodes.
- HAMT Directory
  This is a [Hashed-Array-Mapped-Trie](https://en.wikipedia.org/wiki/Hash_array_mapped_trie) data structure representing a Directory, those may be used to split directories into multiple blocks when they get too big, and the list of children does not fit in a single block.
- Symlink
  This represents a POSIX Symlink.<!--TODO: Add link to POSIX spec.-->

### Metadata

UnixFS currently supports two optional metadata fields:

* `mode` -- The `mode` is for persisting the file permissions in [numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation) \[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].
  - If unspecified this defaults to
    - `0755` for directories/HAMT shards
    - `0644` for all other types where applicable
  - The nine least significant bits represent  `ugo-rwx`
  - The next three least significant bits represent `setuid`, `setgid` and the `sticky bit`
  - The remaining 20 bits are reserved for future use, and are subject to change. Spec implementations **MUST** handle bits they do not expect as follows:
    - For future-proofing the (de)serialization layer must preserve the entire uint32 value during clone/copy operations, modifying only bit values that have a well defined meaning: `clonedValue = ( modifiedBits & 07777 ) | ( originalValue & 0xFFFFF000 )`
    - Implementations of this spec must proactively mask off bits without a defined meaning in the implemented version of the spec: `interpretedValue = originalValue & 07777`

* `mtime` -- A two-element structure ( `Seconds`, `FractionalNanoseconds` ) representing the modification time in seconds relative to the unix epoch `1970-01-01T00:00:00Z`.
  - The two fields are:
    1. `Seconds` ( always present, signed 64bit integer ): represents the amount of seconds after **or before** the epoch.
    2. `FractionalNanoseconds` ( optional, 32bit unsigned integer ): when specified represents the fractional part of the mtime as the amount of nanoseconds. The valid range for this value are the integers `[1, 999999999]`.

  - Implementations encoding or decoding wire-representations must observe the following:
    - An `mtime` structure with `FractionalNanoseconds` outside of the on-wire range `[1, 999999999]` is **not** valid. This includes a fractional value of `0`. Implementations encountering such values should consider the entire enclosing metadata block malformed and abort processing the corresponding DAG.
    - The `mtime` structure is optional - its absence implies `unspecified`, rather than `0`
    - For ergonomic reasons a surface API of an encoder must allow fractional 0 as input, while at the same time must ensure it is stripped from the final structure before encoding, satisfying the above constraints.

  - Implementations interpreting the mtime metadata in order to apply it within a non-IPFS target must observe the following:
    - If the target supports a distinction between `unspecified` and `0`/`1970-01-01T00:00:00Z`, the distinction must be preserved within the target. E.g. if no `mtime` structure is available, a web gateway must **not** render a `Last-Modified:` header.
    - If the target requires an mtime ( e.g. a FUSE interface ) and no `mtime` is supplied OR the supplied `mtime` falls outside of the targets accepted range:
      - When no `mtime` is specified or the resulting `UnixTime` is negative: implementations must assume `0`/`1970-01-01T00:00:00Z` ( note that such values are not merely academic: e.g. the OpenVMS epoch is `1858-11-17T00:00:00Z` )
      - When the resulting `UnixTime` is larger than the targets range ( e.g. 32bit vs 64bit mismatch ) implementations must assume the highest possible value in the targets range ( in most cases that would be `2038-01-19T03:14:07Z` )

## Design decision rationale

### `mtime` and `mode` metadata support in UnixFSv1.5

Metadata support in UnixFSv1.5 has been expanded to increase the number of possible use cases.  These include rsync and filesystem based package managers.

Several metadata systems were evaluated:

#### Separate Metadata node

In this scheme, the existing `Metadata` message is expanded to include additional metadata types (`mtime`, `mode`, etc).  It then contains links to the actual file data but never the file data itself.

This was ultimately rejected for a number of reasons:

1. You would always need to retrieve an additional node to access file data which limits the kind of optimizations that are possible.

	For example many files are under the 256KiB block size limit, so we tend to inline them into the describing UnixFS `File` node.  This would not be possible with an intermediate `Metadata` node.

2. The `File` node already contains some metadata (e.g. the file size) so metadata would be stored in multiple places which complicates forwards compatibility with UnixFSv2 as to map between metadata formats potentially requires multiple fetch operations

#### Metadata in the directory

Repeated `Metadata` messages are added to UnixFS `Directory` and `HAMTShard` nodes, the index of which indicates which entry they are to be applied to.

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

### UnixTime protobuf datatype rationale

#### Seconds

The integer portion of UnixTime is represented on the wire using a varint encoding. While this is
inefficient for negative values, it avoids introducing zig-zag encoding. Values before the year 1970
will be exceedingly rare, and it would be handy having such cases stand out, while at the same keeping
the "usual" positive values easy to eyeball. The varint representing the time of writing this text is
5 bytes long. It will remain so until October 26, 3058 ( 34,359,738,367 )

#### FractionalNanoseconds
Fractional values are effectively a random number in the range 1 ~ 999,999,999. Such values will exceed
2^28 nanoseconds ( 268,435,456 ) in most cases. Therefore, the fractional part is represented as a 4-byte
`fixed32`, [as per Google's recommendation](https://developers.google.com/protocol-buffers/docs/proto#scalar).

## References

[multihash]: https://tools.ietf.org/html/draft-multiformats-multihash-05
[CID]: https://github.com/multiformats/cid/
[Bitswap]: https://github.com/ipfs/specs/blob/master/BITSWAP.md

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

1. First hash the data:
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

3. Profit
Assuming we stored this block in some implementation of our choice which makes it accessible to our client, we can try to decode it:
```console
$ ipfs cat f015512209f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
test
```


### Offset list

The offset list isn't the only way to use blocksizes and reach a correct implementation, it is a simple cannonical one, python pseudo code to compute it looks like this:
```python
def offsetlist(node):
	unixfs = decodeDataField(node.Data)
	if len(node.Links) != len(unixfs.Blocksizes):
		raise "unmatched sister-lists" # error messages are implementation details

	cursor = len(unixfs.Data) if unixfs.Data else 0
	return [cursor] + [cursor := cursor + size for size in unixfs.Blocksizes[:-1]]
```

This will tell you which offset inside this node the children at the corresponding index starts to cover. (using `[x,y)` ranging)
