---
title: UnixFS
description: >
  UnixFS is a Protocol Buffers-based format for describing files, directories,
  and symlinks as dag-pb DAGs and raw blocks in IPFS.
date: 2025-08-23
maturity: draft
editors:
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
contributors:
  - name: Hugo Valtier
    github: jorropo
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
thanks:
  - name: Jeromy Johnson
    github: whyrusleeping
  - name: Steven Allen
    github: Stebalien
  - name: Hector Sanjuan
    github: hsanjuan
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
  - name: Łukasz Magiera
    github: magik6k
  - name: Alex Potsides
    github: achingbrain
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/
  - name: Peter Rabbitson
    github: ribasushi
  - name: Henrique Dias
    github: hacdias
    affiliation:
      name: Interplanetary Shipyard
      url: https://ipshipyard.com/

tags: ['data-formats']
order: 1
---

# Node Types

A :dfn[Node] is the smallest unit present in a graph, and it comes from graph
theory. In UnixFS, there is a 1-to-1 mapping between nodes and blocks. Therefore,
they are used interchangeably in this document.

A node is addressed by a [CID]. In order to be able to read a node, its [CID] is
required. A [CID] includes two important pieces of information:

1. A [multicodec], simply known as a codec.
2. A [multihash] used to specify the hashing algorithm, the hash parameters and
   the hash digest.

Thus, when a block is retrieved and its bytes are hashed using the
hash function specified in the multihash, this gives the same multihash value contained in the CID.

In UnixFS, a node can be encoded using two different multicodecs, listed below. More details are provided in the following sections:

- [`raw`](#raw-node) (`0x55`), which are single block files without any metadata.
- [`dag-pb`](#dag-pb-node) (`0x70`), which can be of any other type.

# `raw` Node

The simplest nodes use `raw` encoding and are implicitly a [File](#dag-pb-file). They can
be recognized because their [CIDs](https://github.com/multiformats/cid) are encoded using the `raw` (`0x55`) codec:

- The block is the file data. There is no protobuf envelope or metadata.
- They never have any children nodes, and thus are also known as single block files.
- Their size is the length of the block body (`Tsize` in parent is equal to `blocksize`).

:::warning
**Important**: Do not confuse `raw` codec blocks (`0x55`) with the deprecated `Raw` DataType (enum value `0`):
- **`raw` codec** - Modern way to store data without protobuf wrapper (used for small files and leaves)
- **`Raw` DataType** - Legacy UnixFS type that wrapped raw data in dag-pb protobuf (implementations MUST NOT produce, MAY read for compatibility)
:::

# `dag-pb` Node

More complex nodes use the `dag-pb` (`0x70`) encoding. These nodes require two steps of
decoding. The first step is to decode the outer container of the block. This is encoded using the [`dag-pb`][ipld-dag-pb] specification, which uses [Protocol Buffers][protobuf] and can be
summarized as follows:

```protobuf
message PBLink {
  // Binary representation of CID (https://github.com/multiformats/cid) of the target object.
  // This contains raw CID bytes (either CIDv0 or CIDv1) with no multibase prefix.
  // CIDv1 is a binary format composed of unsigned varints, while CIDv0 is a raw multihash.
  // In both cases, the bytes are stored directly without any additional prefix.
  bytes Hash = 1;

  // UTF-8 string name
  string Name = 2;

  // cumulative size of target object
  uint64 Tsize = 3;
}

message PBNode {
  // refs to other objects
  repeated PBLink Links = 2;

  // opaque user data
  bytes Data = 1;
}
```

After decoding the node, we obtain a `PBNode`. This `PBNode` contains a field
`Data` that contains the bytes that require the second decoding. This will also be
a protobuf message specified in the UnixFSV1 format:

```protobuf
message Data {
  enum DataType {
    Raw = 0; // deprecated, use raw codec blocks without dag-pb instead
    Directory = 1;
    File = 2;
    Metadata = 3; // reserved for future use
    Symlink = 4;
    HAMTShard = 5;
  }

  DataType Type = 1;          // MUST be present - validate at application layer
  bytes Data = 2;              // file content (File), symlink target (Symlink), bitmap (HAMTShard), unused (Directory)
  uint64 filesize = 3;         // mandatory for Type=File and Type=Raw, defaults to 0 if omitted
  repeated uint64 blocksizes = 4; // required for multi-block files (Type=File) with Links
  uint64 hashType = 5;         // required for Type=HAMTShard (currently always murmur3-x64-64)
  uint64 fanout = 6;           // required for Type=HAMTShard (power of 2, max 1024)
  uint32 mode = 7;             // opt-in, AKA UnixFS 1.5
  UnixTime mtime = 8;          // opt-in, AKA UnixFS 1.5
}

message Metadata {
  string MimeType = 1; // reserved for future use
}

message UnixTime {
  int64 Seconds = 1;              // MUST be present when UnixTime is used
  fixed32 FractionalNanoseconds = 2;
}
```

Summarizing, a `dag-pb` UnixFS node is a [`dag-pb`][ipld-dag-pb] protobuf,
whose `Data` field is a UnixFSV1 Protobuf message. For clarity, the specification
document may represent these nested Protobufs as one object. In this representation,
it is implied that the `PBNode.Data` field is protobuf-encoded.

## `dag-pb` Types

A `dag-pb` UnixFS node supports different types, which are defined in
`decode(PBNode.Data).Type`. Every type is handled differently.

### `dag-pb` `File`

A :dfn[File] is a container over an arbitrary sized amount of bytes. Files are either
single block or multi-block. A multi-block file is a concatenation of multiple child files.

:::note
Single-block files SHOULD prefer the `raw` codec (0x55) over `dag-pb` for the canonical CID,
as it's more efficient and avoids the protobuf overhead. The `raw` encoding is described
in the [`raw` Node](#raw-node) section.
:::

#### The _sister-lists_ `PBNode.Links` and `decode(PBNode.Data).blocksizes`

The _sister-lists_ are the key point of why `dag-pb` is important for files. They
allow us to concatenate smaller files together.

Linked files would be loaded recursively with the same process following a DFS
(Depth-First-Search) order.

Child nodes must be of type File; either a `dag-pb` [File](#dag-pb-file), or a
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

The child blocks containing the partial file data can be either:
- `raw` blocks (0x55): Direct file data without protobuf wrapper
- `dag-pb` blocks (0x70): File data wrapped in protobuf, potentially with further children

:::warning
Implementers need to be extra careful to ensure the values in `Data.blocksizes`
are calculated by following the definition from [`Blocksize`](#decodepbnodedatablocksize).
:::

This allows for fast indexing into the file. For example, if someone is trying
to read bytes 25 to 35, we can compute an offset list by summing all previous
indexes in `blocksizes`, then do a search to find which indexes contain the
range we are interested in.

In the example above, the offset list would be `[0, 20]`. Thus, we know we only need to download `Qmbar` to get the range we are interested in.

A UnixFS parser MUST reject the node and halt processing if the `blocksizes` array and
`Links` array contain different numbers of elements. Implementations SHOULD return a
descriptive error indicating the array length mismatch rather than silently failing or
attempting to process partial data.

#### `decode(PBNode.Data).Data`

An array of bytes that is the file content and is appended before
the links. This must be taken into account when doing offset calculations; that is,
the length of `decode(PBNode.Data).Data` defines the value of the zeroth element
of the offset list when computing offsets.

#### `PBNode.Links[].Name`

The `Name` field is primarily used in directories to identify child entries.

**For internal file chunks:**
- Implementations SHOULD NOT produce `Name` fields (the field should be absent in the protobuf, not an empty string)
- For compatibility with historical data, implementations SHOULD treat empty string values ("") the same as absent when parsing
- If a non-empty `Name` is present in an internal file chunk, the parser MUST reject the file and halt processing as this indicates an invalid file structure

#### `decode(PBNode.Data).Blocksize`

This field is not directly present in the block, but rather a computable property
of a `dag-pb`, which would be used in the parent node in `decode(PBNode.Data).blocksizes`.

**Important:** `blocksize` represents only the raw file data size, NOT including the protobuf envelope overhead.

It is calculated as:
- For `dag-pb` blocks: the length of `decode(PBNode.Data).Data` field plus the sum of all child `blocksizes`
- For `raw` blocks (small files, raw leaves): the length of the entire raw block

:::note

Examples of where `blocksize` is useful:

- Seeking and range requests (e.g., HTTP Range headers for video streaming). The `blocksizes` array allows calculating byte offsets (see [Offset List](#offset-list)) to determine which blocks contain the requested range without downloading unnecessary blocks.

:::

#### `decode(PBNode.Data).filesize`

For `Type=File` (0) and `Type=Raw` (2), this field is mandatory. While marked as "optional" 
in the protobuf schema (for compatibility with other types like Directory), implementations:
- MUST include this field when creating File or Raw nodes
- When reading, if this field is absent, MUST interpret it as 0 (zero-length file)
- If present, this field MUST be equal to the `Blocksize` computation above, otherwise the file is invalid

#### `dag-pb` `File` Path Resolution

A file terminates a UnixFS content path. Any attempt to resolve a path past a
file MUST be rejected with an error indicating that UnixFS files cannot have children.

### `dag-pb` `Directory`

A :dfn[Directory], also known as folder, is a named collection of child [Nodes](#dag-pb-node):

- Every link in `PBNode.Links` is an entry (child) of the directory, and
  `PBNode.Links[].Name` gives you the name of that child.
- Duplicate names are not allowed. Therefore, two elements of `PBNode.Link` CANNOT
  have the same `Name`. Names are considered identical if they are byte-for-byte
  equal (not just semantically equivalent). If two identical names are present in
  a directory, the decoder MUST fail.
- Implementations SHOULD detect when a directory becomes too big to fit in a single
  `Directory` block and use [`HAMTDirectory`] type instead.

The `PBNode.Data` field MUST contain valid UnixFS protobuf data for all UnixFS nodes.
For directories (DataType==1), the minimum valid `PBNode.Data` field is as follows:

```json
{
  "Type": "Directory"
}
```

For historical compatibility, implementations MAY encounter dag-pb nodes with empty or
missing Data fields from older IPFS versions, but MUST NOT produce such nodes.

#### `dag-pb` `Directory` Link Ordering

Directory links SHOULD be sorted lexicographically by the `Name` field when creating
new directories. This ensures consistent, deterministic directory structures across
implementations.

While decoders MUST accept directories with any link ordering, encoders SHOULD use
lexicographic sorting for better interoperability and deterministic CIDs.

A decoder SHOULD, if it can, preserve the order of the original files. This "sort on write,
not on read" approach maintains DAG stability - existing unsorted directories remain unchanged
when accessed or traversed, preventing unintentional mutations of intermediate nodes that could
alter their CIDs.

Note: Lexicographic sorting was chosen as the standard because it provides a universal,
locale-independent ordering that works consistently across all implementations and languages.
Sorting on write (when the Links list is modified) helps with deduplication detection and enables more
efficient directory traversal algorithms in some implementations.

#### `dag-pb` `Directory` Path Resolution

Pop the left-most component of the path, and match it to the `Name` of
a child under `PBNode.Links`.

Duplicate names are not allowed in UnixFS directories. However, when reading 
third-party data that contains duplicates, implementations MUST always return 
the first matching entry and ignore subsequent ones (following the 
[Robustness Principle](https://specs.ipfs.tech/architecture/principles/#robustness)). 
Similarly, when writers mutate a UnixFS directory that has duplicate 
names, they MUST drop the redundant entries and only keep the first occurrence 
of each name.

Assuming no errors were raised, you can continue to the path resolution on the
remaining components and on the CID you popped.

### `dag-pb` `HAMTDirectory`

A :dfn[HAMT Directory] is a [Hashed-Array-Mapped-Trie](https://en.wikipedia.org/wiki/Hash_array_mapped_trie)
data structure representing a [Directory](#dag-pb-directory). It is generally used to represent
directories that cannot fit inside a single block. These are also known as "sharded
directories", since they allow you to split large directories into multiple blocks, known as "shards".

#### HAMT Structure and Parameters

The HAMT directory is configured through the UnixFS metadata in `PBNode.Data`:

- `decode(PBNode.Data).Type` MUST be `HAMTShard` (value `5`)
- `decode(PBNode.Data).hashType` indicates the [multihash] function to use to digest
  the path components for sharding. Currently, all HAMT implementations use `murmur3-x64-64` (`0x22`),
  and this value MUST be consistent across all shards within the same HAMT structure
- `decode(PBNode.Data).fanout` is REQUIRED for HAMTShard nodes (though marked optional in the
  protobuf schema). The value MUST be a power of two, a multiple of 8 (for byte-aligned
  bitfields), and at most 1024.
  
  This determines the number of possible bucket indices (permutations) at each level of the trie.
  For example, fanout=256 provides 256 possible buckets (0x00 to 0xFF), requiring 8 bits from the hash.
  The hex prefix length is `log2(fanout)/4` characters (since each hex character represents 4 bits).
  The same fanout value is used throughout all levels of a single HAMT structure
  
  :::note
  Implementations that onboard user data to create new HAMTDirectory structures are free to choose a `fanout` value or allow users to configure it based on their use case:
  - **256**: Balanced tree depth and node size, suitable for most use cases
  - **1024**: Creates wider, shallower DAGs with fewer levels
    - Advantages: Minimizes tree depth for faster lookups, reduces number of intermediate nodes to traverse
    - Trade-offs: Larger blocks mean higher latency on cold cache reads and more data
      rewritten when modifying directories (each change affects a larger block)
  :::
  
  :::warning
  Implementations MUST limit the `fanout` parameter to a maximum of 1024 to prevent
  denial-of-service attacks. Excessively large fanout values can cause memory exhaustion
  when allocating bucket arrays. See [CVE-2023-23625](https://nvd.nist.gov/vuln/detail/CVE-2023-23625) and
  [GHSA-q264-w97q-q778](https://github.com/advisories/GHSA-q264-w97q-q778) for details
  on this vulnerability.
  :::
- `decode(PBNode.Data).Data` contains a bitfield indicating which buckets contain entries.
  Each bit corresponds to one bucket (0 to fanout-1), with bit value 1 indicating the bucket
  is occupied. The bitfield is stored in little-endian byte order. The bitfield size in bytes
  is `fanout/8`, which is why fanout MUST be a multiple of 8.
  - Implementations MUST write this bitfield when creating HAMT nodes
  - Implementations SHOULD use this bitfield for efficient traversal (checking which buckets
    exist without examining all links)
  - Note: Some implementations derive bucket occupancy from link names instead of reading
    the bitfield, but this is less efficient

The field `Name` of an element of `PBNode.Links` for a HAMT uses a
hex-encoded prefix corresponding to the bucket index, zero-padded to a width
of `log2(fanout)/4` characters.

To illustrate the HAMT structure with a concrete example:

```protobuf
// Root HAMT shard (bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i)
// This shard contains 1000 files distributed across buckets
message PBNode {
  // UnixFS metadata in Data field
  Data = {
    Type = HAMTShard        // Type = 5
    Data = 0xffffff...      // Bitmap: bits set for populated buckets
    hashType = 0x22         // murmur3-x64-64
    fanout = 256            // 256 buckets (8-bit width)
  }

  // Links to sub-shards or entries
  Links = [
    {
      Hash = bafybeiaebmuestgbpqhkkbrwl2qtjtvs3whkmp2trkbkimuod4yv7oygni
      Name = "00"           // Bucket 0x00
      Tsize = 2693          // Cumulative size of this subtree
    },
    {
      Hash = bafybeia322onepwqofne3l3ptwltzns52fgapeauhmyynvoojmcvchxptu
      Name = "01"           // Bucket 0x01
      Tsize = 7977
    },
    // ... more buckets as needed up to "FF"
  ]
}

// Sub-shard for bucket "00" (multiple files hash to 00 at first level)
message PBNode {
  Data = {
    Type = HAMTShard        // Still a HAMT at second level
    Data = 0x800000...      // Bitmap for this sub-level
    hashType = 0x22         // murmur3-x64-64
    fanout = 256            // Same fanout throughout
  }

  Links = [
    {
      Hash = bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa
      Name = "6E470.txt"    // Bucket 0x6E + filename
      Tsize = 1271
    },
    {
      Hash = bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa
      Name = "FF742.txt"    // Bucket 0xFF + filename
      Tsize = 1271
    }
  ]
}
```

#### `dag-pb` `HAMTDirectory` Path Resolution

To resolve a path inside a HAMT:

1. Hash the filename using the hash function specified in `decode(PBNode.Data).hashType`
2. Pop `log2(fanout)` bits from the hash digest (lowest/least significant bits first),
   then hex encode those bits using little endian to form the bucket prefix. The prefix MUST use uppercase hex characters (00-FF, not 00-ff)
3. Find the link whose `Name` starts with this hex prefix:
   - If `Name` equals the prefix exactly → this is a sub-shard, follow the link and repeat from step 2
   - If `Name` equals prefix + filename → target found
   - If no matching prefix → file not in directory
4. When following to a sub-shard, continue consuming bits from the same hash

Note: Empty intermediate shards are typically collapsed during deletion operations to maintain consistency
and avoid having HAMT structures that differ based on insertion/deletion history.

:::note
**Example: Finding "470.txt" in a HAMT with fanout=256** (see [HAMT Sharded Directory test vector](#hamt-sharded-directory))

Given a HAMT-sharded directory containing 1000 files:

1. Hash the filename "470.txt" using murmur3-x64-64 (multihash `0x22`)
2. With fanout=256, we consume 8 bits at a time from the hash:
   - First 8 bits determine root bucket → `0x00` → link name "00"
   - Follow link "00" to sub-shard (`bafybeiaebmuestgbpqhkkbrwl2qtjtvs3whkmp2trkbkimuod4yv7oygni`)
3. The sub-shard is also a HAMT (has Type=HAMTShard):
   - Next 8 bits from hash → `0x6E`
   - Find entry with name "6E470.txt" (prefix + original filename)
4. Link name format at leaf level: `[hex_prefix][original_filename]`
   - "6E470.txt" means: file "470.txt" that hashed to bucket 6E at this level
   - "FF742.txt" means: file "742.txt" that hashed to bucket FF at this level
:::

#### When to Use HAMT Sharding

Implementations typically convert regular directories to HAMT when the serialized directory
node exceeds a size threshold between 256 KiB and 1 MiB. This threshold:
- Prevents directories from exceeding block size limits
- Is implementation-specific and may be configurable
- Common values range from 256 KiB (conservative) to 1 MiB (modern)

See [Block Size Considerations](#block-size-considerations) for details on block size limits and conventions.

### `dag-pb` `Symlink`

A :dfn[Symlink] represents a POSIX [symbolic link](https://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html).
A symlink MUST NOT have children in `PBNode.Links`.

The `PBNode.Data.Data` field is a POSIX path that MAY be inserted in front of the
currently remaining path component stack.

#### `dag-pb` `Symlink` Path Resolution

Symlink path resolution SHOULD follow the POSIX specification, over the current UnixFS path context, as much as is applicable.

:::warning

There is no current consensus on how pathing over symlinks should behave. Some
implementations return symlink objects and fail if a consumer tries to follow them
through.

:::

### `dag-pb` `TSize` (cumulative DAG size)

`Tsize` is an optional field in `PBNode.Links[]` which represents the cumulative size of the entire DAG rooted at that link, including all protobuf encoding overhead.

While optional in the protobuf schema, implementations SHOULD include `Tsize` for:
- All directory entries (enables fast directory size display)
- Multi-block files (enables parallel downloading and progress tracking)
- HAMT shard links (enables efficient traversal decisions)

**Key distinction from blocksize:**
- **`blocksize`**: Only the raw file data (no protobuf overhead)
- **`Tsize`**: Total size of all serialized blocks in the DAG (includes protobuf overhead)

To compute `Tsize`: sum the serialized size of the current dag-pb block and the Tsize values of all child links.

:::note

**Example: Directory with multi-block file**

Consider the [Simple Directory fixture](#simple-directory) (`bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy`):

The directory has a total `Tsize` of 1572 bytes:
- Directory block itself: 227 bytes when serialized
- Child entries with Tsizes: 31 + 31 + 12 + 1271 = 1345 bytes

The `multiblock.txt` file within this directory demonstrates how `Tsize` accumulates:
- Raw file content: 1026 bytes (blocksizes: [256, 256, 256, 256, 2])
- Root dag-pb block: 245 bytes when serialized
- Total `Tsize`: 245 + 1026 = 1271 bytes

This shows how `Tsize` includes both the protobuf overhead and all child data, while `blocksize` only counts the raw file data.

:::

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

:::

:::warning

When total data size is needed for important purposes such as accounting, billing, and cost estimation, the `Tsize` SHOULD NOT be used, and instead a full DAG walk SHOULD to be performed.

:::

### `dag-pb` Optional Metadata

UnixFS defines the following optional metadata fields.

#### `mode` Field

The `mode` (introduced in UnixFS v1.5) is for persisting the file permissions in [numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation)
\[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].

- If unspecified, implementations MAY default to
  - `0755` for directories/HAMT shards
  - `0644` for all other types where applicable
- The nine least significant bits represent  `ugo-rwx`
- The next three least significant bits represent `setuid`, `setgid` and the `sticky bit`
- The remaining 20 bits are reserved for future use, and are subject to change. Spec implementations **MUST** handle bits they do not expect as follows:
  - For future-proofing, the (de)serialization layer must preserve the entire uint32 value during clone/copy operations, modifying only bit values that have a well defined meaning: `clonedValue = ( modifiedBits & 07777 ) | ( originalValue & 0xFFFFF000 )`
  - Implementations of this spec must proactively mask off bits without a defined meaning in the implemented version of the spec: `interpretedValue = originalValue & 07777`

**Implementation guidance:**
- When importing new data, implementations SHOULD NOT include the mode field unless the user explicitly requests preserving permissions
  - Including mode changes the root CID, causing unnecessary deduplication failures when permission differences are irrelevant
- Implementations MUST be able to parse UnixFS nodes both with and without this field
- When present during operations like copying, implementations SHOULD preserve this field

#### `mtime` Field

The `mtime` (introduced in UnixFS v1.5) is a two-element structure ( `Seconds`, `FractionalNanoseconds` ) representing the
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

**Implementation guidance:**
- When importing new data, implementations SHOULD NOT include the mtime field unless the user explicitly requests preserving timestamps
  - Including mtime changes the root CID, causing unnecessary deduplication failures when timestamp differences are irrelevant
- Implementations MUST be able to parse UnixFS nodes both with and without this field
- When present during operations like copying, implementations SHOULD preserve this field

## UnixFS Paths

:::note
Path resolution describes how IPFS systems traverse UnixFS DAGs. While path resolution
behavior is mostly IPFS semantics layered over UnixFS data structures, certain UnixFS
types (notably HAMTDirectory) define specific resolution algorithms as part of their
data structure specification. Each UnixFS type includes a "Path Resolution" subsection
documenting its specific requirements.
:::

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

### Path Escaping

:::warning

Behavior is not defined.

Until we agree on a specification for this, implementations SHOULD NOT depend on any escape
sequences and/or non-ASCII characters for mission-critical applications, or limit escaping to specific context.

- HTTP interfaces such as Gateways have limited support for [percent-encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding).
- The `\` may be used to trigger an escape sequence. However, it is currently broken and inconsistent across implementations.

:::

### Relative Path Components

Relative path components MUST be resolved before trying to work on the path:

- `.` points to the current node and MUST be removed.
- `..` points to the parent node and MUST be removed left to right. When removing
  a `..`, the path component on the left MUST also be removed. If there is no path
  component on the left, implementations MUST reject the path with an error to avoid
  out-of-bounds path resolution.
- Implementations MUST reject paths that attempt to traverse beyond the root CID
  (example: `/ipfs/cid/../foo`) with an error indicating invalid path traversal.

### Restricted Names

The following names SHOULD NOT be used in UnixFS directories:

- The `.` string, as it represents the self node in POSIX pathing.
- The `..` string, as it represents the parent node in POSIX pathing.
- The empty string, as POSIX explicitly prohibits zero-length filenames
- Any string containing a `NULL` (`0x00`) byte, as this is often used to signify string
  terminations in some systems, such as C-compatible systems. Many unix
  file systems do not accept this character in path components.

# Appendix: Test Vectors

:::warning
**Implementations SHOULD validate against these test vectors and reference implementations before production use.**
:::

This section provides test vectors organized by UnixFS structure type, progressing from simple to complex within each category.

## File Test Vectors

Test vectors for UnixFS file structures, progressing from simple single-block files to complex multi-block files.

### Single `raw` Block File

- Fixture: [`dir-with-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_unixfs/dir-with-files.car)
  - CID: `bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4` (hello.txt)
  - Type: [`raw` Node](#raw-node)
  - Content: "hello world\n" (12 bytes)
  - Block Analysis:
    - Block size (`ipfs block stat`): 12 bytes
    - Data size (`ipfs cat`): 12 bytes
    - DAG-PB envelope: N/A (raw blocks have no envelope overhead)
  - Purpose: Single block using `raw` codec, no protobuf wrapper
  - Validation: Block content IS the file content, no UnixFS metadata

### Single `dag-pb` Block File

- Fixture: Well-known test CID from IPFS Gateway Checker
- CID: `bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m`
- Type: [`dag-pb` File](#dag-pb-file) with data in the same block
- Content: "Hello from IPFS Gateway Checker\n" (32 bytes)
- Block Analysis:
  - Block size (`ipfs block stat`): 40 bytes
  - Data size (`ipfs cat`): 32 bytes
  - DAG-PB envelope: 8 bytes (40 - 32)
- Structure:
  ```
  📄 small-file.txt      # bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m (dag-pb)
      └── 📦 Data.Data   # "Hello from IPFS Gateway Checker\n" (32 bytes, stored inline in UnixFS protobuf)
  ```
- Purpose: Small file stored within dag-pb Data field
- Validation: File content extracted from UnixFS Data.Data field

### Multi-block File

- Fixture: [`dir-with-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_unixfs/dir-with-files.car)
  - CID: `bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa` (multiblock.txt)
  - Type: [`dag-pb` File](#dag-pb-file) with multiple [`raw` Node](#raw-node) leaves
  - Content: Lorem ipsum text (1026 bytes total)
  - Block Analysis:
    - Root block size (`ipfs block stat`): 245 bytes (dag-pb)
    - Total data size (`ipfs cat`): 1026 bytes
    - Child blocks:
      - Block 1: 256 bytes (raw)
      - Block 2: 256 bytes (raw)
      - Block 3: 256 bytes (raw)
      - Block 4: 256 bytes (raw)
      - Block 5: 2 bytes (raw)
    - DAG-PB envelope: 245 bytes (root block containing metadata + links)
  - Structure:
    ```
    📄 multiblock.txt    # bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa (dag-pb root)
    ├── 📦 [0-255]       # bafkreie5noke3mb7hqxukzcy73nl23k6lxszxi5w3dtmuwz62wnvkpsscm (raw, 256 bytes)
    ├── 📦 [256-511]     # bafkreih4ephajybraj6wnxsbwjwa77fukurtpl7oj7t7pfq545duhot7cq (raw, 256 bytes)
    ├── 📦 [512-767]     # bafkreigu7buvm3cfunb35766dn7tmqyh2um62zcio63en2btvxuybgcpue (raw, 256 bytes)
    ├── 📦 [768-1023]    # bafkreicll3huefkc3qnrzeony7zcfo7cr3nbx64hnxrqzsixpceg332fhe (raw, 256 bytes)
    └── 📦 [1024-1025]   # bafkreifst3pqztuvj57lycamoi7z34b4emf7gawxs74nwrc2c7jncmpaqm (raw, 2 bytes)
    ```
  - Purpose: File chunking and reassembly
  - Validation:
    - Links have no Names (must be absent)
    - Blocksizes array matches Links array length
    - Reassembled content matches original

### File with Missing Blocks

- Fixture: [`bafybeibfhhww5bpsu34qs7nz25wp7ve36mcc5mxd5du26sr45bbnjhpkei.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_7unnamedlinks%2Bdata/bafybeibfhhww5bpsu34qs7nz25wp7ve36mcc5mxd5du26sr45bbnjhpkei.dag-pb)
  - CID: `bafybeibfhhww5bpsu34qs7nz25wp7ve36mcc5mxd5du26sr45bbnjhpkei`
  - Type: [`dag-pb` File](#dag-pb-file) with 7 links to child blocks
  - Size: 306MB total (from metadata)
  - Structure:
    ```
    📄 large-file        # bafybeibfhhww5bpsu34qs7nz25wp7ve36mcc5mxd5du26sr45bbnjhpkei (dag-pb root)
    ├── ⚠️ block[0]      # (missing child block)
    ├── ⚠️ block[1]      # (missing child block)
    ├── ⚠️ block[2]      # (missing child block)
    ├── ⚠️ block[3]      # (missing child block)
    ├── ⚠️ block[4]      # (missing child block)
    ├── ⚠️ block[5]      # (missing child block)
    └── ⚠️ block[6]      # (missing child block)
    ```
  - Note: Child blocks are NOT included - they may be unavailable locally or missing entirely
  - Purpose:
    - Reading UnixFS file metadata should require only the root block
    - File size and structure can be determined without fetching children
    - Operations should not block waiting for child blocks unless content is actually requested
  - Validation: Can extract file size and chunking info from root block alone

### Range Requests with Missing Blocks

- Fixture: [`file-3k-and-3-blocks-missing-block.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/trustless_gateway_car/file-3k-and-3-blocks-missing-block.car)
  - CID: `QmYhmPjhFjYFyaoiuNzYv8WGavpSRDwdHWe5B4M5du5Rtk`
  - Type: [`dag-pb` File](#dag-pb-file) with 3 links but middle block intentionally missing
  - Structure:
    ```
    📄 file-3k           # QmYhmPjhFjYFyaoiuNzYv8WGavpSRDwdHWe5B4M5du5Rtk (dag-pb root)
    ├── 📦 [0-1023]      # QmPKt7ptM2ZYSGPUc8PmPT2VBkLDK3iqpG9TBJY7PCE9rF (raw, 1024 bytes)
    ├── ⚠️ [1024-2047]   # (missing block - intentionally removed)
    └── 📦 [2048-3071]   # QmWXY482zQdwecnfBsj78poUUuPXvyw2JAFAEMw4tzTavV (raw, 1024 bytes)
    ```
  - Critical requirement: Must support seeking without all blocks available
  - Purpose:
    - Fetch only required blocks for byte range requests (e.g., bytes=0-1023 or bytes=2048-3071)
    - Gateway conformance tests verify that first block (`QmPKt7ptM2ZYSGPUc8PmPT2VBkLDK3iqpG9TBJY7PCE9rF`) and third block (`QmWXY482zQdwecnfBsj78poUUuPXvyw2JAFAEMw4tzTavV`) can be fetched independently
    - Requests for middle block or byte ranges requiring it should fail gracefully

## Directory Test Vectors

Test vectors for UnixFS directory structures, progressing from simple flat directories to complex HAMT-sharded directories.

### Simple Directory

- Fixture: [`dir-with-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_unixfs/dir-with-files.car)
  - CID: `bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy`
  - Type: [`dag-pb` Directory](#dag-pb-directory)
  - Block Analysis:
    - Directory block size (`ipfs block stat`): 185 bytes
    - Contains UnixFS Type=Directory metadata + 4 links
  - Structure:
    ```
    📁 /                    # bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy
    ├── 📄 ascii-copy.txt  # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (raw, 31 bytes) "hello application/vnd.ipld.car"
    ├── 📄 ascii.txt       # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (raw, 31 bytes) "hello application/vnd.ipld.car"
    ├── 📄 hello.txt       # bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4 (raw, 12 bytes) "hello world\n"
    └── 📄 multiblock.txt  # bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa (dag-pb, 1026 bytes) Lorem ipsum text
    ```
  - Purpose: Directory listing, link sorting, deduplication (ascii.txt and ascii-copy.txt share same CID)
  - Validation: Links sorted lexicographically by Name, each has valid Tsize

### Nested Directories

- Fixture: [`subdir-with-two-single-block-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/trustless_gateway_car/subdir-with-two-single-block-files.car)
  - CID: `bafybeietjm63oynimmv5yyqay33nui4y4wx6u3peezwetxgiwvfmelutzu`
  - Type: [`dag-pb` Directory](#dag-pb-directory) containing another Directory
  - Block Analysis:
    - Root directory block size: 55 bytes
    - Subdirectory block size: 110 bytes
  - Structure:
    ```
    📁 /                    # bafybeietjm63oynimmv5yyqay33nui4y4wx6u3peezwetxgiwvfmelutzu
    └── 📁 subdir/         # bafybeiggghzz6dlue3m6nb2dttnbrygxh3lrjl5764f2m4gq7dgzdt55o4 (dag-pb Directory)
        ├── 📄 ascii.txt   # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (raw, 31 bytes) "hello application/vnd.ipld.car"
        └── 📄 hello.txt   # bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4 (raw, 12 bytes) "hello world\n"
    ```
  - Purpose: Path traversal through directory hierarchy
  - Validation: Can traverse `/subdir/hello.txt` path correctly

- Fixture: [`dag-pb.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_dag/dag-pb.car)
  - CID: `bafybeiegxwlgmoh2cny7qlolykdf7aq7g6dlommarldrbm7c4hbckhfcke`
  - Type: [`dag-pb` Directory](#dag-pb-directory)
  - Structure:
    ```
    📁 /                    # bafybeiegxwlgmoh2cny7qlolykdf7aq7g6dlommarldrbm7c4hbckhfcke
    ├── 📁 foo/            # bafybeidryarwh34ygbtyypbu7qjkl4euiwxby6cql6uvosonohkq2kwnkm (dag-pb Directory)
    │   └── 📄 bar.txt     # bafkreigzafgemjeejks3vqyuo46ww2e22rt7utq5djikdofjtvnjl5zp6u (raw, 14 bytes) "Hello, world!"
    └── 📄 foo.txt         # bafkreic3ondyhizrzeoufvoodehinugpj3ecruwokaygl7elezhn2khqfa (raw, 13 bytes) "Hello, IPFS!"
    ```
  - Purpose: Another example of standard UnixFS directory with raw leaf blocks

### Special Characters in Filenames

- Fixture: [`path_gateway_tar/fixtures.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_tar/fixtures.car)
  - CID: `bafybeig6ka5mlwkl4subqhaiatalkcleo4jgnr3hqwvpmsqfca27cijp3i`
  - Type: [`dag-pb` Directory](#dag-pb-directory) with nested subdirectories
  - Structure:
    ```
    📁 /                    # bafybeig6ka5mlwkl4subqhaiatalkcleo4jgnr3hqwvpmsqfca27cijp3i
    └── 📁 ą/              # (dag-pb Directory)
        └── 📁 ę/          # (dag-pb Directory)
            └── 📄 file-źł.txt  # (raw, 34 bytes) "I am a txt file on path with utf8"
    ```
  - Path with Polish diacritics: `/ipfs/bafybeig6ka5mlwkl4subqhaiatalkcleo4jgnr3hqwvpmsqfca27cijp3i/ą/ę/file-źł.txt`
  - Purpose: UTF-8 characters in directory and file names (ą, ę, ź, ł)
  - Validation: Directory traversal works with UTF-8 paths

- Fixture: [`dir-with-percent-encoded-filename.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_unixfs/dir-with-percent-encoded-filename.car)
  - CID: `bafybeig675grnxcmshiuzdaz2xalm6ef4thxxds6o6ypakpghm5kghpc34`
  - Type: [`dag-pb` Directory](#dag-pb-directory)
  - Structure:
    ```
    📁 /                    # bafybeig675grnxcmshiuzdaz2xalm6ef4thxxds6o6ypakpghm5kghpc34
    └── 📄 Portugal%2C+España=Peninsula Ibérica.txt  # bafkreihfmctcb2kuvoljqeuphqr2fg2r45vz5cxgq5c2yrxnqg5erbitmq (raw, 38 bytes) "hello from a percent encoded filename"
    ```
  - Purpose: Filenames with percent-encoding (`%2C`), plus signs, equals, and non-ASCII characters
  - Validation:
    - Implementations MUST preserve the original filename exactly as stored in UnixFS
    - Must not be confused by filenames mixing Unicode characters with percent-encoding
    - Gateway example: In gateway-conformance, accessing this file from a web browser requires double-encoding the `%2C` as `%252C` in the URL path (`/ipfs/{{CID}}/Portugal%252C+España=Peninsula%20Ibérica.txt`)
    - Browser implementations should preserve `%2C` in the filename to avoid conflicts with URL encoding

### Directory with Missing Blocks

- Fixture: [`bafybeigcsevw74ssldzfwhiijzmg7a35lssfmjkuoj2t5qs5u5aztj47tq.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_4namedlinks%2Bdata/bafybeigcsevw74ssldzfwhiijzmg7a35lssfmjkuoj2t5qs5u5aztj47tq.dag-pb)
  - CID: `bafybeigcsevw74ssldzfwhiijzmg7a35lssfmjkuoj2t5qs5u5aztj47tq`
  - Type: [`dag-pb` Directory](#dag-pb-directory)
  - Structure:
    ```
    📁 /                    # bafybeigcsevw74ssldzfwhiijzmg7a35lssfmjkuoj2t5qs5u5aztj47tq
    ├── ⚠️  audio_only.m4a   # (link to missing block, ~24MB)
    ├── ⚠️  chat.txt         # (link to missing block, ~1KB)
    ├── ⚠️  playback.m3u     # (link to missing block, ~116 bytes)
    └── ⚠️  zoom_0.mp4       # (link to missing block)
    ```
  - Note: Child blocks are NOT included - they may be unavailable locally or missing entirely
  - Purpose:
    - Directory enumeration should require only the root block
    - Can list all filenames and their CIDs without fetching child blocks
    - Operations should not block waiting for child blocks unless content is actually requested
  - Validation: Can enumerate directory contents from root block alone

### HAMT Sharded Directory

- Fixture: [`single-layer-hamt-with-multi-block-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/trustless_gateway_car/single-layer-hamt-with-multi-block-files.car)
  - CID: `bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i`
  - Type: [`dag-pb` HAMTDirectory](#dag-pb-hamtdirectory)
  - Block Analysis:
    - Root HAMT block size (`ipfs block stat`): 12046 bytes
    - Contains UnixFS Type=HAMTShard metadata with fanout=256
    - Links use 2-character hex prefixes for hash buckets (00-FF)
  - Structure:
    ```
    📂 /                    # bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i (HAMT root)
    ├── 📄 1.txt           # (dag-pb file, multi-block)
    ├── 📄 2.txt           # (dag-pb file, multi-block)
    ├── ...
    └── 📄 1000.txt        # (dag-pb file, multi-block)
    ```
  - Contents: 1000 numbered files (1.txt through 1000.txt), each containing Lorem ipsum text
  - Purpose: HAMT sharding for large directories
  - Validation:
    - Fanout field = 256
    - Link Names in HAMT have 2-character hex prefix (hash buckets)
    - Can retrieve any file by name through hash bucket calculation

## Special Cases and Advanced Features

Test vectors for special UnixFS features and edge cases.

### Symbolic Links

- Fixture: [`symlink.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/path_gateway_unixfs/symlink.car)
  - CID: `QmWvY6FaqFMS89YAQ9NAPjVP4WZKA1qbHbicc9HeSKQTgt`
  - Types: [`dag-pb` Directory](#dag-pb-directory) containing [`dag-pb` Symlink](#dag-pb-symlink)
  - Block Analysis:
    - Root directory block: Not measured (V0 CID)
    - Symlink block (`QmTB8BaCJdCH5H3k7GrxJsxgDNmNYGGR71C58ERkivXoj5`): 9 bytes
    - Target file block (`Qme2y5HA5kvo2jAx13UsnV5bQJVijiAJCPvaW3JGQWhvJZ`): 16 bytes
  - Structure:
    ```
    📁 /                    # QmWvY6FaqFMS89YAQ9NAPjVP4WZKA1qbHbicc9HeSKQTgt
    ├── 📄 foo           # Qme2y5HA5kvo2jAx13UsnV5bQJVijiAJCPvaW3JGQWhvJZ - file containing "content"
    └── 🔗 bar           # QmTB8BaCJdCH5H3k7GrxJsxgDNmNYGGR71C58ERkivXoj5 - symlink pointing to "foo"
    ```
  - Purpose: UnixFS symlink resolution
  - Security note: Critical for preventing path traversal vulnerabilities

### Mixed Block Sizes

- Fixture: [`subdir-with-mixed-block-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/trustless_gateway_car/subdir-with-mixed-block-files.car)
  - CID: `bafybeidh6k2vzukelqtrjsmd4p52cpmltd2ufqrdtdg6yigi73in672fwu`
  - Type: [`dag-pb` Directory](#dag-pb-directory) with subdirectory
  - Structure:
    ```
    📁 /                    # bafybeidh6k2vzukelqtrjsmd4p52cpmltd2ufqrdtdg6yigi73in672fwu
    └── 📁 subdir/         # bafybeicnmple4ehlz3ostv2sbojz3zhh5q7tz5r2qkfdpqfilgggeen7xm
        ├── 📄 ascii.txt   # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (raw, 31 bytes) "hello application/vnd.ipld.car"
        ├── 📄 hello.txt   # bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4 (raw, 12 bytes) "hello world\n"
        └── 📄 multiblock.txt  # bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa (dag-pb, 1271 bytes total)
    ```
  - Purpose: Directories containing both single-block raw files and multi-block dag-pb files
  - Validation: Can handle mixed file types in same directory

### Deduplication

- Fixture: [`dir-with-duplicate-files.car`](https://github.com/ipfs/gateway-conformance/raw/refs/tags/v0.8.1/fixtures/trustless_gateway_car/dir-with-duplicate-files.car)
  - CID: `bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy`
  - Type: [`dag-pb` Directory](#dag-pb-directory)
  - Structure:
    ```
    📁 /                    # bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy
    ├── 🔗 ascii-copy.txt  # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (same CID as ascii.txt)
    ├── 📄 ascii.txt       # bafkreifkam6ns4aoolg3wedr4uzrs3kvq66p4pecirz6y2vlrngla62mxm (raw, 31 bytes) "hello application/vnd.ipld.car"
    ├── 📄 hello.txt       # bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4 (raw, 12 bytes) "hello world\n"
    └── 📄 multiblock.txt  # bafybeigcisqd7m5nf3qmuvjdbakl5bdnh4ocrmacaqkpuh77qjvggmt2sa (dag-pb, multi-block)
    ```
  - Purpose: Multiple directory entries pointing to the same content CID (deduplication)
  - Validation: Both ascii.txt and ascii-copy.txt resolve to the same content block

### Invalid Test Cases

These fixtures test raw dag-pb codec capabilities and serve as invalid test vectors for UnixFS implementations. Most lack UnixFS metadata - meaning their dag-pb Data field either doesn't exist, is empty, or contains bytes that aren't a valid UnixFS protobuf (which requires at minimum a `Type` field specifying File/Directory/Symlink etc).

These validate that implementations properly reject malformed or non-UnixFS dag-pb nodes rather than crashing or behaving unpredictably:

- 💢 [`bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_empty/bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku.dag-pb) - Empty dag-pb node, 0 bytes (no UnixFS metadata)
- 💢 [`bafybeihyivpglm6o6wrafbe36fp5l67abmewk7i2eob5wacdbhz7as5obe.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_1link/bafybeihyivpglm6o6wrafbe36fp5l67abmewk7i2eob5wacdbhz7as5obe.dag-pb) - Single link without data, bytes: `12240a2212207521fe19c374a97759226dc5c0c8e674e73950e81b211f7dd3b6b30883a08a51` (no UnixFS metadata)
- 💢 [`bafybeibh647pmxyksmdm24uad6b5f7tx4dhvilzbg2fiqgzll4yek7g7y4.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_2link%2Bdata/bafybeibh647pmxyksmdm24uad6b5f7tx4dhvilzbg2fiqgzll4yek7g7y4.dag-pb) - Two links with data, bytes: `12340a2212208ab7a6c5e74737878ac73863cb76739d15d4666de44e5756bf55a2f9e9ab5f431209736f6d65206c696e6b1880c2d72f12370a2212208ab7a6c5e74737878ac73863cb76739d15d4666de44e5756bf55a2f9e9ab5f44120f736f6d65206f74686572206c696e6b18080a09736f6d652064617461` (invalid UnixFS protobuf)
- 💢 [`bafybeie7xh3zqqmeedkotykfsnj2pi4sacvvsjq6zddvcff4pq7dvyenhu.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_11unnamedlinks%2Bdata/bafybeie7xh3zqqmeedkotykfsnj2pi4sacvvsjq6zddvcff4pq7dvyenhu.dag-pb) - Eleven unnamed links with data (invalid UnixFS protobuf)
- 💢 [`bafybeibazl2z4vqp2tmwcfag6wirmtpnomxknqcgrauj7m2yisrz3qjbom.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Data_some/bafybeibazl2z4vqp2tmwcfag6wirmtpnomxknqcgrauj7m2yisrz3qjbom.dag-pb) - Node with data field populated, bytes: `0a050001020304` (invalid UnixFS protobuf)
- 💢 [`bafybeiaqfni3s5s2k2r6rgpxz4hohdsskh44ka5tk6ztbjerqpvxwfkwaq.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Data_zero/bafybeiaqfni3s5s2k2r6rgpxz4hohdsskh44ka5tk6ztbjerqpvxwfkwaq.dag-pb) - Node with empty data field, bytes: `0a00` (no UnixFS metadata)
- 💢 [`bafybeia53f5n75ituvc3yupuf7tdnxf6fqetrmo2alc6g6iljkmk7ys5mm.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Links_Hash_some/bafybeia53f5n75ituvc3yupuf7tdnxf6fqetrmo2alc6g6iljkmk7ys5mm.dag-pb) - Links with hash only, bytes: `120b0a09015500050001020304` (no UnixFS metadata)
- 💢 [`bafybeifq4hcxma3kjljrpxtunnljtc6tvbkgsy3vldyfpfbx2lij76niyu.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Links_Hash_some_Name_some/bafybeifq4hcxma3kjljrpxtunnljtc6tvbkgsy3vldyfpfbx2lij76niyu.dag-pb) - Links with hash and name, bytes: `12160a090155000500010203041209736f6d65206e616d65` (no UnixFS metadata)
- 💢 [`bafybeie7fstnkm4yshfwnmpp7d3mlh4f4okmk7a54d6c3ffr755q7qzk44.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Links_Hash_some_Name_zero/bafybeie7fstnkm4yshfwnmpp7d3mlh4f4okmk7a54d6c3ffr755q7qzk44.dag-pb) - Links with hash but empty name, bytes: `120d0a090155000500010203041200` (no UnixFS metadata)
- 💢 [`bafybeiezymjvhwfuharanxmzxwuomzjjuzqjewjolr4phaiyp6l7qfwo64.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Links_Hash_some_Tsize_some/bafybeiezymjvhwfuharanxmzxwuomzjjuzqjewjolr4phaiyp6l7qfwo64.dag-pb) - Links with hash and Tsize, bytes: `12140a0901550005000102030418ffffffffffffff0f` (no UnixFS metadata)
- 💢 [`bafybeichjs5otecmbvwh5azdr4jc45mp2qcofh2fr54wjdxhz4znahod2i.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_Links_Hash_some_Tsize_zero/bafybeichjs5otecmbvwh5azdr4jc45mp2qcofh2fr54wjdxhz4znahod2i.dag-pb) - Links with hash but zero Tsize, bytes: `120d0a090155000500010203041800` (no UnixFS metadata)
- 💢 [`bafybeia2qk4u55f2qj7zimmtpulejgz7urp7rzs44cvledcaj42gltkk3u.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_simple_forms_1/bafybeia2qk4u55f2qj7zimmtpulejgz7urp7rzs44cvledcaj42gltkk3u.dag-pb) - Simple form variant 1, bytes: `0a03010203` (invalid UnixFS protobuf)
- 💢 [`bafybeiahfgovhod2uvww72vwdgatl5r6qkoeegg7at2bghiokupfphqcku.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_simple_forms_2/bafybeiahfgovhod2uvww72vwdgatl5r6qkoeegg7at2bghiokupfphqcku.dag-pb) - Simple form variant 2, bytes: `120b0a0901550005000102030412100a09015500050001020304120362617212100a090155000500010203041203666f6f` (no UnixFS metadata)
- 💢 [`bafybeidrg2f6slbv4yzydqtgmsi2vzojajnt7iufcreynfpxndca4z5twm.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_simple_forms_3/bafybeidrg2f6slbv4yzydqtgmsi2vzojajnt7iufcreynfpxndca4z5twm.dag-pb) - Simple form variant 3, bytes: `120b0a09015500050001020304120e0a09015500050001020304120161120e0a09015500050001020304120161` (no UnixFS metadata)
- 💢 [`bafybeieube7zxmzoc5bgttub2aqofi6xdzimv5munkjseeqccn36a6v6j4.dag-pb`](https://github.com/ipld/codec-fixtures/raw/381e762b85862b2bbdb6ef2ba140b3c505e31a44/fixtures/dagpb_simple_forms_4/bafybeieube7zxmzoc5bgttub2aqofi6xdzimv5munkjseeqccn36a6v6j4.dag-pb) - Simple form variant 4, bytes: `120e0a09015500050001020304120161120e0a09015500050001020304120161` (no UnixFS metadata)

## Additional Testing Resources

- Gateway Conformance Suite: [ipfs/gateway-conformance](https://github.com/ipfs/gateway-conformance)
  - Real-world test suite with UnixFS fixtures
  - Tests gateway behaviors with various UnixFS structures
  - Includes edge cases and performance scenarios

- Test fixture generator: [go-fixtureplate](https://github.com/ipld/go-fixtureplate)
  - Tool for generating custom test fixtures
  - Includes UnixFS files and directories of arbitrary shapes

Report specification issues or submit corrections via [ipfs/specs](https://github.com/ipfs/specs/issues).

# Appendix: Notes for Implementers

This section and included subsections are not authoritative.

## Popular Implementations

- JavaScript
  - [`@helia/unixfs`](https://www.npmjs.com/package/@helia/unixfs) implementation of a filesystem compatible with [Helia SDK](https://github.com/ipfs/helia#readme)
  - Data Formats - [unixfs](https://github.com/ipfs/js-ipfs-unixfs)
    - Importer - [unixfs-importer](https://github.com/ipfs/js-ipfs-unixfs/tree/main/packages/ipfs-unixfs-importer)
    - Exporter - [unixfs-exporter](https://github.com/ipfs/js-ipfs-unixfs/tree/main/packages/ipfs-unixfs-exporter)
- Go
  - [Boxo SDK](https://github.com/ipfs/boxo#readme) includes implementation of UnixFS filesystem
    - Protocol Buffer Definitions - [`ipfs/boxo/../unixfs.proto`](https://github.com/ipfs/boxo/blob/v0.23.0/ipld/unixfs/pb/unixfs.proto)
    - [`ipfs/boxo/files`](https://github.com/ipfs/boxo/tree/main/files)
    - [`ipfs/boxo/ipld/unixfs`](https://github.com/ipfs/boxo/tree/main/ipld/unixfs/)
  - Alternative `go-ipld-prime` implementation: [`ipfs/go-unixfsnode`](https://github.com/ipfs/go-unixfsnode)


## Block Size Considerations

While UnixFS itself does not mandate specific block size limits, implementations typically
enforce practical constraints for operational efficiency:

- **Safe conventions for producing new blocks**: Implementations SHOULD use 256 KiB (popular
  legacy size) or 1 MiB (modern maximum recommended) for newly created blocks
- **Decoding requirement**: Implementations MUST be able to decode blocks up to 2 MiB
  as it is effectively the maximum message size in Bitswap, which acts as ecosystem-wide
  common denominator of what is the max block size at the time of writing this note (2025Q3)

These limits affect several UnixFS behaviors:
- Small files that fit in a single chunk (most common: 256 KiB, 1 MiB) are typically
  stored as single `raw` blocks or within the `Data` field of a single `dag-pb` node
- Directories automatically convert to HAMT sharding when approaching the block size
  limit (commonly triggered around 256 KiB-1 MiB)
- File chunking algorithms target block sizes that stay within these limits while
  maximizing deduplication opportunities

Note that specific block size policies are implementation-dependent and may be
configurable. If you want to maximize the interoperability of your data, make sure
to keep chunk sizes no bigger than 1 MiB. Consult your implementation's documentation
for exact limits and configuration options.

## Simple `raw` Example

In this example, we will build a single `raw` block with the string `test` as its content.

First, hash the data:

```console
$ echo -n "test" | sha256sum
9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08  -
```

Add the CID prefix:

```
f01551220
         9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08

f this is the multibase prefix, we need it because we are working with a hex CID, this is omitted for binary CIDs
 01 the CID version, here one
   55 the codec, here we MUST use Raw because this is a Raw file
     12 the hashing function used, here sha256
       20 the digest length 32 bytes
         9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 is the the digest we computed earlier
```

Done. Assuming we stored this block in some implementation of our choice, which makes it accessible to our client, we can try to decode it.

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

# Appendix: Historical Design Decisions

:::warning
Below section explains some of historical decisions. This is not part of specification,
and is provided here only for extra context.
:::

## Design Considerations: Extra Metadata

Metadata support in UnixFSv1.5 has been expanded to increase the number of possible
use cases. These include `rsync` and filesystem-based package managers.

Several metadata systems were evaluated, as discussed in the following sections.

:::note

UnixFS 1.5 stores optional `mode` and `mtime` metadata in the `Data` fields of
the root `dag-pb` node, however below analysis may be useful when additional
metadata is being discussed, or UnixFS 1.5 approach is revisited.

:::

### Pros and Cons: Metadata in a Separate Metadata Node

In this scheme, the existing `Metadata` message is expanded to include additional
metadata types (`mtime`, `mode`, etc). It contains links to the actual file data,
but never the file data itself.

This was ultimately rejected for a number of reasons:

1. You would always need to retrieve an additional node to access file data, which
  limits the kind of optimizations that are possible. For example, many files fit
  within a single block (see [Block Size Considerations](#block-size-considerations)),
  so we tend to inline them into the describing UnixFS `File` node. This would not be
  possible with an intermediate `Metadata` node.
2. The `File` node already contains some metadata (e.g. the file size), so metadata
  would be stored in multiple places. This complicates forwards compatibility with
  UnixFSv2, as mapping between metadata formats potentially requires multiple fetch
  operations.

### Pros and Cons: Metadata in the Directory

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

1. When creating a UnixFS node, there's no way to record metadata without
   wrapping it in a directory.
2. If you access any UnixFS node directly by its [CID], there is no way of
   recreating the metadata which limits flexibility.
3. In order to list the contents of a directory including entry types and
   sizes, you have to fetch the root node of each entry, so the performance
   benefit of including some metadata in the containing directory is negligible
   in this use case.

### Pros and Cons: Metadata in the File

This adds new fields to the UnixFS `Data` message to represent the various metadata fields.

It has the advantage of being simple to implement. Metadata is maintained whether
the file is accessed directly via its [CID] or via an IPFS path that includes a
containing directory. In addition, metadata is kept small enough that we can inline root
UnixFS nodes into their CIDs so that we can end up fetching the same number of nodes if
we decide to keep file data in a leaf node for deduplication reasons.

Downsides to this approach are:

1. Two users adding the same file to IPFS at different times will have
   different [CID]s due to the `mtime`s being different. If the content is
   stored in another node, its [CID] will be constant between the two users,
   but you can't navigate to it unless you have the parent node, which will be
   less available due to the proliferation of [CID]s.
2. Metadata is also impossible to remove without changing the [CID], so
   metadata becomes part of the content.
3. Performance may be impacted as well as if we don't inline UnixFS root nodes
   into [CID]s, so additional fetches will be required to load a given UnixFS
   entry.

### Pros and Cons: Metadata in Side Trees

With this approach, we would maintain a separate data structure outside of the
UnixFS tree to hold metadata.

This was rejected due to concerns about added complexity, recovery after system
crashes while writing, and having to make extra requests to fetch metadata nodes
when resolving [CID]s from peers.

### Pros and Cons: Metadata in Side Database

This scheme would see metadata stored in an external database.

The downsides to this are that metadata would not be transferred from one node
to another when syncing, as [Bitswap] is not aware of the database and in-tree
metadata.

## Design Decision: UnixTime Protobuf Datatype

### UnixTime Seconds

The integer portion of UnixTime is represented on the wire using a `varint` encoding.
While this is inefficient for negative values, it avoids introducing zig-zag encoding.
Values before the year `1970` are exceedingly rare, and it would be handy having
such cases stand out, while ensuring that the "usual" positive values are easily readable. The `varint` representing the time of writing this text is 5 bytes
long. It will remain so until October 26, 3058 (34,359,738,367).

### UnixTime FractionalNanoseconds

Fractional values are effectively a random number in the range 1 to 999,999,999.
In most cases, such values will exceed 2^28 (268,435,456) nanoseconds. Therefore,
the fractional part is represented as a 4-byte `fixed32`,
[as per Google's recommendation](https://developers.google.com/protocol-buffers/docs/proto#scalar).

[protobuf]: https://protobuf.dev/
[CID]: https://github.com/multiformats/cid/
[multicodec]: https://github.com/multiformats/multicodec
[multihash]: https://github.com/multiformats/multihash
[Bitswap]: https://specs.ipfs.tech/bitswap-protocol/
[ipld-dag-pb]: https://ipld.io/specs/codecs/dag-pb/spec/
