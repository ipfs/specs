/**
 * Logical representation of a file chunk.
 * 
 * TODO: Clarify when this represenation is used as opposed to `FileChunk`.
 */
export interface RawChunk extends PBNode {
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
   * no instatiation other than empty will satisfy this constraint
   */
  Links: never[]
}

/**
 * Logical representation of a file chunk. When large file is added to IPFS
 * it gets chunked into smaller pieces (according to specified `--chunker`)
 * and each chunk is encoded into this representation (and linked from file
 * DAG).
 * 
 * Note: While technically it is possible to add `mode` and `mtime` to
 * `FileChunk` node it is logical nonsense and therefor to be ignore.
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
   * Raw nodes MUST not have any links, yet empty `Links` list is expected.
   * At the type level it is expressed as `never[]` which guarantees that
   * no instatiation other than empty will satisfy this constraint
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
 * slices that span multiple chunks may be represented via file shards.
 * 
 * Please note that some file layouts may create shallow DAGs where file root
 * node links to `FileChunk|Raw` nodes and in other layouts DAGs may be
 * several levels deep, in those cases file root link to `FileShard` nodes
 * that link to either other shards or leaf `FileChunk|Raw` nodes.
 * 
 * Note: While technically it is possible to add `mode` and `mtime` to
 * `FileShard` nodes it is logical nonsense and therefor to be ignore.
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
   * Links to the file slices this shard is comprised of.
   * Note: That this is heterogeneous list as e.g. in trickle DAG layout
   * shards may link to both leaves and other shards.
   */
  Links: AnonymousLink<FileLeaf|FileShard>[]
}

/**
 * Logical representation of a file that fits a single block. Note is
 * semantically different from a `FileChunk`, even though structurally it is
 * compatible. Unlike `FileChunk` it may contain `mode`, `mtime` file metadata.
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
   * MUST not have any links, yet empty `Links` list is expected.
   * At the type level it is expressed as `never[]` which guarantees that
   * no instatiation other than empty will satisfy this constraint
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
 * 
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
 * @TODO
 */
export type MetadataNode = never

/**
 * @TODO
 */
export interface Symlink extends PBNode {
  Data: ByteView<{
    Type: DataType.Symlink,
    /**
     * UTF-8 encoded path to the symlink target.
     */
    Data: ByteView<string>
    /**
     * Number of bytes in Data field
     */
    filesize: uint64
  }>
  /**
   * Symlink nodes MUST not have any links, yet empty `Links` list is expected.
   * At the type level it is expressed as `never[]` which guarantees that
   * no instatiation other than empty will satisfy this constraint.
   *
   * Decoder implementation SHOULD ignore links even if present.
   */
  Links: never[]
}

/**
 * Type representing any UnixFS node.
 */
export type UnixFS =
  | RawChunk
  | DirectoryLayout
  | FileChunk
  | FileLayout
  | MetadataNode
  | Symlink
  | DirectoryShard

export enum DataType {
  Raw = 0,
  Directory = 1,
  File = 2,
  /**
   * TODO: Have not came across this one would be nice to either mark
   * or entype it's represenation deprecated
   */
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
   * File links MUST specify `TSize` for the linked slice.
   */

  Tsize: uint64
  /**
   * File links SHOULD NOT specify `Name` for the links.
   * TODO: JS actually uses `''` so maybe that is what type should say.
   */
  Name?: never
}

/**
 * Less loosely defined PB Link that requires `Name` field.
 */
export interface NamedLink<Data> extends PBLink<Data> {
  Hash: CID<Data>
  /**
   * Directory link SHOULD specify size of the entry.
   */
  Tsize: uint64
  /**
   * Directory link MUST specify link name which is a name for the directory
   * entry.
   */
  Name: string
}


/**
 * Logical representation of DAG-PB Node
 * @see https://ipld.io/specs/codecs/dag-pb/spec/
 */

export interface PBNode {
  Data: ByteView<unknown>
  Links: PBLink<unknown>[]
}

/**
 * Logical representation of DAG-PB link
 * @see https://ipld.io/specs/codecs/dag-pb/spec/
 */

export interface PBLink<Data> {
  Hash: CID<Data>
  Tsize?: uint64
  Name?: string
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
