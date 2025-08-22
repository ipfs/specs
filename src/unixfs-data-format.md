---
title: UnixFS
description: >
  UnixFS is a Protocol Buffers-based format for describing files, directories,
  and symlinks as dag-pb and raw DAGs in IPFS.
date: 2025-03-01
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

Thus, the block must be retrieved; that is, the bytes which ,when hashed using the
hash function specified in the multihash, gives us the same multihash value back.

In UnixFS, a node can be encoded using two different multicodecs, listed below. More details are provided in the following sections:

- [`raw`](#raw-node) (`0x55`), which are single block files without any metadata.
- [`dag-pb`](#dag-pb-node) (`0x70`), which can be of any other type.

# `raw` Node

The simplest nodes use `raw` encoding and are implicitly a [File](#dag-pb-file). They can
be recognized because their CIDs are encoded using the `raw` (`0x55`) codec:

- The block is the file data. There is no protobuf envelope or metadata.
- They never have any children nodes, and thus are also known as single block files.
- Their size is the length of the block body (`Tsize` in parent is equal to `blocksize`).

# `dag-pb` Node

More complex nodes use the `dag-pb` (`0x70`) encoding. These nodes require two steps of
decoding. The first step is to decode the outer container of the block. This is encoded using the [`dag-pb`][ipld-dag-pb] specification, which can be
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
    Metadata = 3; // reserved for future use
    Symlink = 4;
    HAMTShard = 5;
  }

  required DataType Type = 1;
  optional bytes Data = 2;
  optional uint64 filesize = 3;
  repeated uint64 blocksizes = 4;
  optional uint64 hashType = 5;
  optional uint64 fanout = 6;
  optional uint32 mode = 7; // opt-in, AKA UnixFS 1.5
  optional UnixTime mtime = 8; // opt-in, AKA UnixFS 1.5
}

message Metadata {
  optional string MimeType = 1;
}

message UnixTime {
  required int64 Seconds = 1;
  optional fixed32 FractionalNanoseconds = 2;
}
```

Summarizing, a `dag-pb` UnixFS node is a [`dag-pb`][ipld-dag-pb] protobuf,
whose `Data` field is a UnixFSV1 Protobuf message. For clarity, the specification
document may represent these nested Protobufs as one object. In this representation,
it is implied that the `PBNode.Data` field is encoded in a protobuf.

## `dag-pb` Types

A `dag-pb` UnixFS node supports different types, which are defined in
`decode(PBNode.Data).Type`. Every type is handled differently.

### `dag-pb` `File`

A :dfn[File] is a container over an arbitrary sized amount of bytes. Files are either
single block or multi-block. A multi-block file is a concatenation of multiple child files.

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

:::warning
Implementers need to be extra careful to ensure the values in `Data.blocksizes`
are calculated by following the definition from [`Blocksize`](#decodepbnodedatablocksize).
:::

This allows for fast indexing into the file. For example, if someone is trying
to read bytes 25 to 35, we can compute an offset list by summing all previous
indexes in `blocksizes`, then do a search to find which indexes contain the
range we are interested in.

In the example above, the offset list would be `[0, 20]`. Thus, we know we only need to download `Qmbar` to get the range we are interested in.

UnixFS parser MUST error if `blocksizes` or `Links` are not of the same length.

#### `decode(PBNode.Data).Data`

An array of bytes that is the file content and is appended before
the links. This must be taken into account when doing offset calculations; that is,
the length of `decode(PBNode.Data).Data` defines the value of the zeroth element
of the offset list when computing offsets.

#### `PBNode.Links[].Name`

This field makes sense only in [Directories](#dag-pb-directory) contexts and MUST be absent
when creating a new file. For historical reasons, implementations parsing
third-party data SHOULD accept empty values here.

If this field is present and non-empty, the file is invalid and the parser MUST
error.

#### `decode(PBNode.Data).Blocksize`

This field is not directly present in the block, but rather a computable property
of a `dag-pb`, which would be used in the parent node in `decode(PBNode.Data).blocksizes`.
It is the sum of the length of `decode(PBNode.Data).Data` field plus the sum
of all link's `blocksizes`.

#### `decode(PBNode.Data).filesize`

If present, this field MUST be equal to the `Blocksize` computation above.
Otherwise, this file is invalid.

#### `dag-pb` `File` Path Resolution

A file terminates a UnixFS content path. Any attempt to resolve a path past a
file MUST error.

### `dag-pb` `Directory`

A :dfn[Directory], also known as folder, is a named collection of child [Nodes](#dag-pb-node):

- Every link in `PBNode.Links` is an entry (child) of the directory, and
  `PBNode.Links[].Name` gives you the name of that child.
- Duplicate names are not allowed. Therefore, two elements of `PBNode.Link` CANNOT
  have the same `Name`. If two identical names are present in a directory, the
  decoder MUST fail.
- Implementations SHOULD detect when directory becomes too big to fit in a single
  `Directory` block and use [`HAMTDirectory`] type instead.

The minimum valid `PBNode.Data` field for a directory is as follows:

```json
{
  "Type": "Directory"
}
```

#### `dag-pb` `Directory` Link Ordering

The canonical sorting order is lexicographical over the names.

In theory, there is no reason an encoder couldn't use an other ordering. However,
this loses some of its meaning when mapped into most file systems today, as most file
systems consider directories to be unordered key-value objects.

A decoder SHOULD, if it can, preserve the order of the original files in the same way
it consumed those names. However, when some implementations decode, modify and then
re-encode, the original link order loses it's original meaning, given that there
is no way to indicate which sorting was used originally.

#### `dag-pb` `Directory` Path Resolution

Pop the left-most component of the path, and try to match it to the `Name` of
a child under `PBNode.Links`. If you find a match, you can then remember the CID.
You MUST continue the search. If you find another match, you MUST error since
duplicate names are not allowed. <!--TODO: check Kubo does this-->

Assuming no errors were raised, you can continue to the path resolution on the
remaining components and on the CID you popped.

### `dag-pb` `HAMTDirectory`

A :dfn[HAMT Directory] is a [Hashed-Array-Mapped-Trie](https://en.wikipedia.org/wiki/Hash_array_mapped_trie)
data structure representing a [Directory](#dag-pb-directory). It is generally used to represent
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

#### `dag-pb` `HAMTDirectory` Path Resolution

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

### `dag-pb` `Symlink`

A :dfn[Symlink] represents a POSIX [symbolic link](https://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html).
A symlink MUST NOT have children. <!--TODO: check that this is true-->

The `PBNode.Data.Data` field is a POSIX path that MAY be inserted in front of the
currently remaining path component stack.

#### `dag-pb` `Symlink` Path Resolution

Symlink path resolution SHOULD follow the POSIX specification, over the current UnixFS path context, as much as is applicable.

:::warning

There is no current consensus on how pathing over symlinks should behave. Some
implementations return symlink objects and fail if a consumer tries to follow them
through.

:::

### `dag-pb` `TSize` (child DAG size hint)

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

:::

:::warning

When total data size is needed for important purposes such as accounting, billing, and cost estimation, the `Tsize` SHOULD NOT be used, and instead a full DAG walk SHOULD to be performed.

:::

### `dag-pb` Optional Metadata

UnixFS currently supports below optional metadata fields.

#### `mode` Field

The `mode` is for persisting the file permissions in [numeric notation](https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation)
\[[spec](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html)\].

- If unspecified, implementations MAY default to
  - `0755` for directories/HAMT shards
  - `0644` for all other types where applicable
- The nine least significant bits represent  `ugo-rwx`
- The next three least significant bits represent `setuid`, `setgid` and the `sticky bit`
- The remaining 20 bits are reserved for future use, and are subject to change. Spec implementations **MUST** handle bits they do not expect as follows:
  - For future-proofing, the (de)serialization layer must preserve the entire uint32 value during clone/copy operations, modifying only bit values that have a well defined meaning: `clonedValue = ( modifiedBits & 07777 ) | ( originalValue & 0xFFFFF000 )`
  - Implementations of this spec must proactively mask off bits without a defined meaning in the implemented version of the spec: `interpretedValue = originalValue & 07777`

#### `mtime` Field

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

## UnixFS Paths

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
  component on the left, you MUST error to avoid out-of-bounds
  path resolution.
- Implementations MUST error when resolving a relative path that attempts to go
  beyond the root CID (example: `/ipfs/cid/../foo`).

### Restricted Names

The following names SHOULD NOT be used:

- The `.` string, as it represents the self node in POSIX pathing.
- The `..` string, as it represents the parent node in POSIX pathing.
- The empty string. <!--TODO: check that this is true-->
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

<!-- TODO: Rust libraries seem to be abandoned, hiding them for now
- Rust
  - [`iroh-unixfs`](https://github.com/n0-computer/iroh/tree/b7a4dd2b01dbc665435659951e3e06d900966f5f/iroh-unixfs)
  - [`unixfs-v1`](https://github.com/ipfs-rust/unixfsv1)
-->

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
  limits the kind of optimizations that are possible. For example, many files are
  under the 256 KiB block size limit, so we tend to inline them into the describing
  UnixFS `File` node. This would not be possible with an intermediate `Metadata` node.
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


[protobuf]: https://developers.google.com/protocol-buffers/
[CID]: https://github.com/multiformats/cid/
[multicodec]: https://github.com/multiformats/multicodec
[multihash]: https://github.com/multiformats/multihash
[Bitswap]: https://specs.ipfs.tech/bitswap-protocol/
[ipld-dag-pb]: https://ipld.io/specs/codecs/dag-pb/spec/
