/**
 * Logical representation of a file chunk (a leaf node of the file DAG layout).
 * This representation had been subsumed by `FileChunk` representation and
 * therefor is marked as deprecated.
 *
 * UnixFS consumers are very likely to encounter nodes of this type, as of this
 * writing JS & Go implementations can be configured to produce these nodes, in
 * trickle DAG use this configuration.
 * 
 * UnixFS producers are RECOMMENDED to either use `FileChunk` representation or
 * better yet raw binary nodes (That is 0x55 multicodec) which will likely
 * relpace them in the future.
 * 
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv#L39
 * 
 * @deprecated
 */
export interface RawChunk extends PBNode {
  /**
   * While actual protobuf may include other fields consumers are recommended
   * to ignore them.
   */
  Data: ByteView<{
    Type: DataType.Raw,
    /**
     * Raw bytes of the content
     */
    Data: Bytes
  }>
  /**
   * Raw nodes MUST not have any links, yet empty `Links` list is expected.
   * At the type level it is expressed as `never[]` which guarantees that
   * no instatiation other than empty will satisfy this constraint.
   * 
   * Consumer of `Raw` nodes SHOULD ignore all links even they are present
   * in the block.
   * 
   * @TODO Verify this is accurate maybe they are treated just as files with
   * `ComplexFileLayout`.
   */
  Links: never[]
}

/**
 * Logical representation of a file chunk (a leaf node of the file DAG layout).
 * 
 * When large file is added to IPFS it gets chunked into smaller pieces
 * (according to the `--chunker` specified) and each chunk is encoded into this
 * representation (and linked from file DAG). Please note that in practice there
 * are many other representations fro file chunks (leaf nodes) like `RawChunk`s
 * (deprecated in favor of this representation) and raw binary nodes (That is
 * 0x55 multicodec) which are on a way to surpass this representation.
 *
 * Please note that in reality there is only one `file` node with many optional
 * fields, however different combination of fields corresponds to a different
 * semntaics and we represent each by a different type.
 * 
 * Also note that some file nodes may also have `mode` and `mtime` fields,
 * which we represent via `SimpleFileLayout` type however that is not completely
 * accurate, e.g because one could take two `SimpleFileLayout`s and represent
 * their concatination via `AdvancedDirectoryLayout` by linking to them. In such
 * a scenario consumer should treat leaves as `FileChunk`s and SHOULD ignore
 * `mode` and `mtime` fileds on them. However if those leves are accessed as
 * files consumer SHOULD treat them as `SimpleFileLayout` and SHOULD NOT ignore
 * `mode` and `mtime` fields.
 */
export interface FileChunk extends PBNode {
  Data: ByteView<{
    Type: DataType.File,
    /**
     * Raw bytes corresponding to this file chunk
     */
    Data: Bytes
    /**
     * Number of bytes in Data field
     */
    filesize: uint64
  }>
  /**
   * File chunks are leaf nodes and therefor are not supposed to have any links.
   */
  Links: never[]
}

export type FileLeaf =
  /**
   * May link to raw block (Not to confuse with UnixFS Raw nodes). Happens
   * when `--raw-leaves` option is used.
   */
  | RawNode
  /**
   * @TODO - I have no idea when this happens please help!
   */
  | RawChunk
  /**
   * Node links to actual chunks when it's a level above leaf nodes.
   */
  | FileChunk

/**
 * Logical representation of a file shard. When large files are chunked
 * slices that span multiple blocks may be represented via file shards in
 * certain DAG layouts (e.g. balanced & trickle DAGs).
 * 
 * Please note in practice there is only one `file` node type with many optional
 * fields. Different combination of fields corresponds to a different semntaics
 * and combination of fields in this type represent a branch nodes in the file
 * DAGs where nodes beside leaves and root exist.
 * 
 * Also note that you may encounter `FileShard`s with `mode` and `mtime` fields
 * which according to our categorization would fall under `AdvancedFileLayout`
 * category, however just as with `FileChunk` / `SimpleFileLayout` here as well
 * you should treat node as `AdvancedFileLayout` if you encounter it in the
 * root position (that is to say regard `mode`, `mtime` field) and treat it as
 * `FileShard` node if encountered further down the DAG (that is ignore `mode`,
 * `mtime` fileds).
 */
export interface FileShard extends PBNode {
  Data: ByteView<{
    Type: DataType.File,
    /**
     * The total number of bytes of a file slize represented by this shard.
     */
    filesize: uint64
    /**
     * List of `filesize`s for each linked node (in exact same order).
     */
    blocksizes: uint64[]
  }>
  /**
   * Links to the file slices this shard is comprised of. Please note that in
   * some layouts e.g. trickle DAG shards may link to both leaf nodes and other
   * shards, which is why this list heterogeneous.
   */
  Links: AnonymousLink<FileLeaf|FileShard>[]
}

/**
 * Logical representation of a file that fits a single block. Note this is only
 * semantically different from a `FileChunk` and your interpretation SHOULD vary
 * depending on where you encounter the node (In root of the DAG or not).
 */
export interface SimpleFileLayout extends PBNode {
  Data: ByteView<{
    Type: DataType.File,
    /**
     * Raw bytes of the file content
     */
    Data: Bytes
    /**
     * Number of bytes in above `Data` field
     */
    filesize: uint64,

    /**
     * If omitted to be interprented as default `0644`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>

  /**
   * Simple files SHOULD NOT have any links as they are represented by single
   * chunk.
   */
  Links: never[]
}

/**
 * Logical represenatation of a file that consists of multiple blocks. Note is
 * semantically different from a `FileShard`, even though structurally it is
 * compatible. Unlike `FileShard` it may contain `mode`, `mtime` file metadata.
 */

export interface AdvancedFileLayout extends PBNode {
  Data: ByteView<{
    Type: DataType.File,
    // Total number of bytes in the file (not the graph structure).
    filesize: uint64,

    /**
     * List of `filesize`s for each linked node (in exact same order).
     */
    blocksizes: uint64[]

    /**
     * If omitted to be interprented as default `0644`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  /**
   * Links to the file slices this file is comprised of.
   * Note: That this is heterogeneous list as e.g. in trickle DAG layout
   * shards may link to both leaves and other shards.
   */
  Links: AnonymousLink<RawNode|FileShard>[]
}

/**
 * These type of nodes are not produces by referenece IPFS implementations, yet
 * such file nodes could be represented and therefor defined with this type.
 * 
 * In this file representation first chunk of the file is represented by a
 * `data` field while rest of the file is represented by links.
 * 
 * It is NOT RECOMMENDED to use this representation (which is why it's marked
 * deprecated), however it is still valid representation and UnixFS consumers
 * SHOULD recognize it and interpret as described.
 *
 * @deprecated
 */
export interface ComplexFileLayout extends PBNode {
  Data: ByteView<{
    Type: DataType.File,
    /**
     * Total number of bytes in the file (not the graph structure). Which is 
     * `data` size + sum of `blocksizes`.
     */
    filesize: uint64,

    /**
     * Represents content of the first chunk of the file.
     */
    data: Bytes

    /**
     * List of `filesize`s for each linked node (in exact same order).
     */
    blocksizes: uint64[]

    /**
     * If omitted to be interprented as default `0644`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  /**
   * Links to the rest of the file slices, besides one in `data` field, this
   * file is comprised of.
   */
  Links: AnonymousLink<RawNode|FileShard>[]
}

/**
 * In IPFS large files are chucked into several blocks for a more effective
 * replication. Such files in UnixFS are represented via `AdvancedFileLayout`.
 * And files that fit into a single block are represented via `SimpleFileLayout`.
 * 
 * Please note: In some configurations files that fit a single block are not
 * even encoded as UnixFS but rather as a `RawNode` blocks. However this type
 * describes UinxFS File representation and not IPFS file representation which
 * is why `RawNode` variant is not part of it.
 */
export type FileLayout =
  | SimpleFileLayout
  | AdvancedFileLayout
  | ComplexFileLayout


/**
 * Logacal representation of a directory that fits single block.
 */
export interface FlatDirectoryLayout extends PBNode {
  Data: ByteView<{
    Type: DataType.Directory
    /**
     * Directories MUST have `filesize` set to `0`.
     */
    filesize: 0
    /**
     * If omitted to be interpreted as default `0755`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  /**
   * Links are directory entries.
   */
  Links: NamedLink<FileLayout|DirectoryLayout>[]
}


/**
 * Logical representation of directory encoded in multiple blocks (usually when
 * it contains large number of entries). Such directories are represented via
 * Hash Array Map Tries (HAMT).
 * 
 * @see https://en.wikipedia.org/wiki/Hash_array_mapped_trie
 */
export interface AdvancedDirectoryLayout {
  Data: ByteView<{
    Type: DataType.HAMTShard,
    Data: ByteView<Bitfield>
    /*
     * HAMT table width (In IPFS it's usually 256)
     */
    fanout: uint64,
    /**
     * Multihash code for the hashing function used (In IPFS it's [murmur3-64][])
     *
     * [murmur3-64]:https://github.com/multiformats/multicodec/blob/master/table.csv#L24
     */
    hashType: uint64,

    /**
     * If omitted to be interpreted as default `0755`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  Links: NamedLink<FileLayout|DirectoryLayout|DirectoryShard>[]
}

/**
 * Logical represenatation of the shard of the sharded directory. Please note
 * that it only semantically different from `AdvancedDirectoryLayout`, in
 * practice they are the same and interpretation should vary based on view. If
 * viewed form root position it is `AdvancedDirectoryLayout` and it's `mtime`
 * `mode` field to be respected, otherwise it is `DirectoryShard` and it's
 * `mtime` and `mode` field to be ignored.
 */
export interface DirectoryShard extends PBNode {
  Data: ByteView<{
    Type: DataType.HAMTShard,
    Data: ByteView<Bitfield>
    /*
     * HAMT table width (In IPFS it's usually 256)
     */
    fanout: uint64,
    /**
     * Multihash code for the hashing function used (In IPFS it's [murmur3-64][])
     *
     * [murmur3-64]:https://github.com/multiformats/multicodec/blob/master/table.csv#L24
     */
    hashType: uint64,
  }>
  /**
   * Either links to other shards or actual directory entries
   */
  Links: NamedLink<FileLayout|DirectoryLayout|DirectoryShard>[]
}

/**
 * Type for either UnixFS directory representation.
 */
export type DirectoryLayout =
  | FlatDirectoryLayout
  | AdvancedDirectoryLayout


/**
 * Metadata as a separate node type has been considered in varios forms but
 * ultimately had been decided against in favor of optional `mode`, `mtime`
 * fields on the file & directory nodes.
 *
 * Consumers are RECOMMENDED to treat `Metadata` nodes same as `file` nodes,
 * that is:
 * 
 * - If node has both `Links` and `Data` treat it as `ComplexFileLayout`
 * - In node has `Data` but no `Links` treat it as `SimpleFileLayout` if
 *   encountered in root position and as `FileChunk` in any other position.
 * - If node has `Links` and no `Data` treat it as `AdvancedFileLayout` if
 *   encountered in root position and as `FileShard` in any other position.
 * - If node has neither `Data` nor `Links` treat it as `EmptyFile` in root
 *   position and as empty `FileShard` otherwise.
 * 
 * 
 * Producers SHOULD NOT produce `Metadata` nodes and use appropriate `file`
 * node instead.
 *
 * @deprecated
 */
export interface Metadata extends PBNode {
  Data: ByteView<{
    Type: DataType.Metadata
    /**
     * Raw bytes of the file content
     */
    Data?: Bytes
    /**
     * Number of bytes in above `Data` field
     */
    filesize?: uint64,

    /**
     * List of `filesize`s for each linked node (in exact same order).
     */
    blocksizes: uint64[]

    /**
     * If omitted to be interprented as default `0644`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  /**
   * Links to the file slices this shard is comprised of. Please note that in
   * some layouts e.g. trickle DAG shards may link to both leaf nodes and other
   * shards, which is why this list heterogeneous.
   */
  Links: AnonymousLink<FileLeaf|FileShard>[]
}


/**
 * Logical representation of a [symbolic link][].
 *
 * [symbolic link]:https://en.wikipedia.org/wiki/Symbolic_link
 */
export interface Symlink extends PBNode {
  Data: ByteView<{
    Type: DataType.Symlink,
    /**
     * UTF-8 encoded path to the symlink target.
     */
    Data: ByteView<string>
    /**
     * In practice it may be present, in those cases it SHOULD be ignored.
     * Producers should leave this field out.
     * @deprecated
     */
    filesize?: uint64

    /**
     * If omitted to be interprented as default `0644`. It is RECOMMENDED
     * to omit if mode matches default.
     */
    mode?: Mode
    mtime?: UnixTime
  }>
  /**
   * Symlink nodes MUST not have any links.
   *
   * Consumers SHOULD ignore links if they are present.
   */
  Links: never[]
}

/**
 * Type representing any UnixFS node.
 */
export type UnixFS =
  | RawChunk
  | FileChunk
  | FileLayout
  | DirectoryShard
  | DirectoryLayout
  | Metadata
  | Symlink

export enum DataType {
  Raw = 0,
  Directory = 1,
  File = 2,
  Metadata = 3,
  Symlink = 4,
  HAMTShard = 5,
}

/**
 * representing the modification time in seconds relative to the unix epoch
 * 1970-01-01T00:00:00Z.
 */
export interface UnixTime {
  /**
   * (signed 64bit integer): represents the amount of seconds after or before
   * the epoch.
   */
  readonly Seconds: int64;

  /**
   * (optional, 32bit unsigned integer ): when specified represents the
   * fractional part of the mtime as the amount of nanoseconds. The valid
   * range for this value are the integers [1, 999999999].
   */
  readonly FractionalNanoseconds?: fixed32
}

/**
 * The mode is for persisting the file permissions in [numeric notation].
 * If unspecified this defaults to
 * - `0755` for directories/HAMT shards
 * - `0644` for all other types where applicable
 *
 * The nine least significant bits represent `ugo-rwx`
 * The next three least significant bits represent setuid, setgid and the sticky bit.
 * The remaining 20 bits are reserved for future use, and are subject to change.
 * Spec implementations MUST handle bits they do not expect as follows: 
 * - For future-proofing the (de)serialization layer must preserve the entire
 *   `uint32` value during clone/copy operations, modifying only bit values that
 *    have a well defined meaning:
 *    `clonedValue = ( modifiedBits & 07777 ) | ( originalValue & 0xFFFFF000 )`
 * - Implementations of this spec MUST proactively mask off bits without a
 *   defined meaning in the implemented version of the spec:
 *   `interpretedValue = originalValue & 07777`

 * 
 * [numeric notation]:https://en.wikipedia.org/wiki/File-system_permissions#Numeric_notation
 * 
 * @see https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html
 */
export type Mode = uint32;


/**
 * Less loosely defined PB Link which requires TSize and does not
 * require `Name`.
 */
export interface AnonymousLink<Data> extends PBLink<Data> {
  Hash: CID<Data>
  /**
   * UnixFS links MUST specify size of the linked block.
   */

  Tsize: uint64
  /**
   * Anonymoust links (e.g. links from files) SHOULD NOT specify `Name` on
   * links.
   *
   * Consumers SHOULD ignore `Name` even if present.
   */
  Name?: never
}

/**
 * Less loosely defined PB Link that requires `Name` and `TSize` fields.
 */
export interface NamedLink<Data> extends PBLink<Data> {
  Hash: CID<Data>
  /**
   * Named links (e.g. directory links) MUST specify link name. In case of
   * directories those are interpreted as entry names.
   */
  Name: string

  /**
   * UnixFS links MUST specify size of the linked block.
   */
  Tsize: uint64
}


/**
 * Logical representation of DAG-PB Node
 * @see https://ipld.io/specs/codecs/dag-pb/spec/
 */

export interface PBNode {
  Data?: ByteView<unknown>
  Links: PBLink<unknown>[]
}

/**
 * Logical representation of DAG-PB link
 * @see https://ipld.io/specs/codecs/dag-pb/spec/
 */

export interface PBLink<Data> {
  /**
   * Binary CID of the target node.
   */
  Hash: CID<Data>
  /**
   * UTF-8 string name
   */
  Name?: string

  /**
   * Cumulative size of target node.
   */
  Tsize?: uint64
}


/**
 * Logical representation of raw binary nodes as raw IPLD codec
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv#L39
 */
export interface RawNode extends Bytes {
}

/**
 * Logical representation of *C*ontent *Id*entifier, where `C` is a logical
 * representation of the content it identifies.
 *
 * Note: This is not an actual definition used by (JS) IPFS but a more
 * appropriate definition to convey desired semantics.
 */
export interface CID<C> extends Phantom<C> {}

/**
 * Represents byte encoded representation of the `Data`. It uses type parameter
 * to capture the structure of the data it encodes.
 */
export interface ByteView<Data> extends Phantom<Data> {}




// JS/TS specific type definitions that are not really relevant and
// could be ignored. Mostly present so file type checks, although
// may also be useful for JS/TS reader.


/**
 * Type representing raw bytes, in JS it's usually Uint8Array. Use type
 * alias so it's less JS sepcific.
 */
export type Bytes = Uint8Array

/**
 * @see https://github.com/ipfs/go-bitfield
 */
export type Bitfield = Uint8Array

// TS does not really have these, create aliases so it's aligned closer
// to protobuf spec
export type int64 = number
export type fixed32 = number
export type uint64 = number

export type uint32 = number


/**
 * This is an utility type to retain unused type parameter `T`. It can be used
 * as nominal type e.g. to capture semantics not represented in actual type structure.
 */
export interface Phantom<T> {
  // This field can not be represented because field name is non-existings
  // unique symbol. But given that field is optional any object will valid
  // type contstraint.
  [PhantomKey]?: T
}

declare const PhantomKey: unique symbol 
