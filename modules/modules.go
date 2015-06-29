package modules

//-----------------------------------------------------------------------------

// the Multiformats are self-describing formats IPFS uses.

// Multihash is a self-describing hash format.
// See https://github.com/jbenet/multihash
type Multihash []byte

// Multiaddr is a self-describing network address format.
// See https://github.com/jbenet/mutliaddr
type Multiaddr []byte

//-----------------------------------------------------------------------------

// crypto is a module that defines relevant cryptographc operations.

type crypto.PublicKey interface {
  Encrypt([]byte) (crypto.Ciphertext, error)
  Verify(crypto.Signature) (bool, error)
}

type crypto.PrivateKey interface {
  Decrypt(crypto.Ciphertext) ([]byte, error)
  Sign([]byte) (crypto.Signature, error)

  PublicKey() crypto.PublicKey
}

type crypto.SymmetricKey interface {
}

type crypto.Signature []byte
type crypto.Ciphertext []byte

type Cipher interface {
  Encrypt(crypto.SymmetricKey, []byte) (crypto.Ciphertext, error)
  Decrypt(crypto.SymmetricKey, crypto.Ciphertext) ([]byte, error)
}

//-----------------------------------------------------------------------------

type Notifier interface {
  Notifiees() []Notifiee
  AddNotifiee() error
  RmNotifiee() error
}

//-----------------------------------------------------------------------------

// Net.ID is a system for identifying hosts/peers in a distributed system
// which uses cryptographic keys to identify hosts

// Net.ID is the identity of a host, the Multihash of the host's public key.
// For example:
//
//   QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC
type Net.ID Multihash

// Net.Addr is an IPFS-specific Multiaddr. the last component is:
//
//   .../ipfs/<Net.ID>
//
// For example:
//
//   /ip4/127.94.0.1/tcp/4001/ipfs/QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC
type Net.Addr Multiaddr

// Net.Host represents a host in the network (i.e. PrivateKey + Addrs)
type Net.Host interface {
  ID()         Net.ID
  PublicKey()  crypto.PublicKey
  PrivateKey() crypto.PrivateKey

  Addrs() []Net.Addr
}

//-----------------------------------------------------------------------------

// Path is a string representing a Path on the IPFS
// System overall. These are paths beginning with either:
//
//   /ipfs/<content-hash>/...
//   /ipns/<name>/...
//
// + default case of
//
//   <content-hash>/... -> /ipfs/<content-hash>/...
type Path string

// FSPath is a string representing an IPFS Path
// for content, it starts with either
//
//   <content-hash>/...
//   /ipfs/<content-hash>/...
//
type FSPath string

// NSPath is a string representing an IPNS Path
// for names, it must starts with either
//
//   /ipns/<ipns-pubkey-hash>/...
//   /ipns/<dns-domain-name>/...
//
type NSPath string

//-----------------------------------------------------------------------------

// DS is a module representing key-value store systems over arbitrary media.
// For example, a filesystem, redis, leveldb, ...
// See: https://github.com/jbenet/go-datastore/

// DS.Key is a path-based object key. it has notions of ancestry as paths do.
type DS.Key string

// Datastore is an interface for storing and retrieving arbitrary things.
// it is most common to store []byte. IPFS uses Datastore to provide a simple
// way to create arbitrary backends for Block.Stores.
type DS.Datastore interface {
  Put(DS.Key, interface{}) error
  Get(DS.Key) (interface{}, error)
  Has(DS.Key) (bool, error)
  Delete(DS.Key) error
  AllKeys() (DS.KeyIter, error)  // return all Keys stored by this Datastore
}

//-----------------------------------------------------------------------------

// Blocks is a module of byte sequences that can be stored in a storage
// system and are addressed by their content-hash (a multihash).
// IPFS uses Blocks as a way to represent serialized IPFS Nodes:
//
//    DAG.Node (deserialized) <==> Blocks.Block (serialized)
//
// (though lower layers of IPFS that handle only Blocks do not necessarily
// need to be moving DAG.Nodes.)

// Blocks.Key is a Multihash that is the hash of a Blocks.Block.
// It is used to reference, and (content) address blocks in various
// block storage systems, and interfaces.
type Blocks.Key Multihash

// Blocks.Block is a sequence of bytes. A block represents a "chunk of
// data".
type Blocks.Block interface {
  Data() []byte       // data that the block represents
  Key()  Blocks.Key   // name of the block
}


// Blocks.Store is a storage system for Blocks, a way to store Blocks and
// retrive them by their Key. (may wrap a Datastore, or something more
// complex, like Bitswap.Node)
type Blocks.Store interface {
  Put(*blocks.Block) error            // store a Block under its Key
  Has(key.Key) (bool, error)          // check whethrer Block is in Block.Store
  Get(key.Key) (*blocks.Block, error) // retrieve Block by its Key
  Delete(key.Key) error               // stop storing a Block

  AllKeys() (key.KeyIter, error)  // return all Keys stored by this Block.Store
}


// Blocks.Notifiee is an object listening for particular events in the
// Block.Store, in particular a block becoming available locally.
type Block.Notifiee interface {
  BlockPut(blocks.Block)     // fired when a block is put
  NewBlockPut(blocks.Block)  // fired when a new block is put
  BlockDeleted(blocks.Block) // fired when a block is deleted
}

//-----------------------------------------------------------------------------

// DAG is a module which represents the IPFS merkle dag. It has Links, Nodes,
// and a Store.
// IPFS uses DAG to represent arbitrary authenticated, distributed data
// structures. It is the "thin-waist" of the IPFS stack.

// DAG.Link represents an IPFS Merkle DAG Link between Nodes.
type DAG.Link struct {
  Name() string       // utf8 string name. should be unique per object
  Size() uint64       // cumulative size of target object
  Hash() mh.Multihash // multihash of the target object
}

// DAG.Node represents an IPFS Merkle DAG Node, the basic unit of data
// and datastructures in IPFS.
type DAG.Node interface {
  Links() []DAG.Link // link segment, link table
  Data()  []byte     // data segment, raw bytes
}

// DAG.Store represents a storage system for DAGs. it layers cleanly on top
// of a Block.Store (or even a Datastore) and provides basic node fetching
type DAG.Store interface {

  Add(*Node) error // Add a Node under its NodeKey
  AddRecursive(*Node) error
  Get(context.Context, key.Key) (*Node, error)
  Remove(*Node) error

  // GetDAG returns, in order, all the single leve child
  // nodes of the passed in node.
  GetDAG(context.Context, *Node) []NodeGetter
  GetNodes(context.Context, []key.Key) []NodeGetter
}

//-----------------------------------------------------------------------------

type SignedDAG.Node interface {
  DAG.Node

  Subnode() DAG.Node // node being signed.

  PublicKey() crypto.PublicKey // link - to public key
  Signature() crypto.Signature // data - signature data

  Signable() []byte            // link to Subnode()
  SigValid() (bool, error)     // whether the signature checks out
}

//-----------------------------------------------------------------------------

// Exchange is a module that represents a system that can retrieve Blocks over
// the network. This interface could divide things up into a "client" and a
// "server" (like in HTTP), but in practice, there are usually Peers (Bitswap)
// IPFS uses an Exchange to move around Blocks.Blocks representing DAG.Nodes.
//
// Note: https://github.com/ipfs/notes/issues/12 may mean that Exchange must
// think about _DAG.Nodes_ and not _Block.Blocks_.

// Exchange.Client is an interface that is implemented by systems using various
// protocol, like Bitswap, BitTorrent, HTTP, etc. It's just the retrieving
// blocks part.
type Exchange.Client interface {
  // retrieve Blocks from the Exchange
  GetBlock(key.Key) (*blocks.Block, error)
  GetBlocks([]key.Key) (<-chan *blocks.Block, error)
}

// Exchange.Server is an interface that is implemented by systems using various
// protocol, like Bitswap, BitTorrent, HTTP, etc. It's just the storing + serving
// to others part.
type Exchange.Server interface {
  BlockStore() Blocks.Store // return the internal Blocks.Store

  // serve Blocks to other peers.

  // It's a blocks.Notifiee. Specifically it listens to:
  //   NewBlockPut(blocks.Block)
  Blocks.Notifiee
}

// hypothetical constructor would take a Blocks.Store to serve Blocks from
func Exchange.NewServer(Blocks.Store) Exchange.Server

// Exchange.Peer is an interface that combines both Client and Server in one.
// This is usually how it's used, but the separation can help people understand
// how to construct an "Exchange" out a client/server-oriented protocol like HTTP.
type Exchange.Peer interface {
  Exchange.Client
  Exchange.Server
}

//-----------------------------------------------------------------------------

// Records is a module that implements a distributed record keeping system. It
// allows the crafting + distribution of secure records.


// Records.Record is an object that stores some data relevant to a distributed
// system. It is a necesary part of most distributed systems -- it is a sort of
// "glue" that improves how they operate.
type Records.Record  {
  Node() DAG.Node    // returns a DAG.Node representing the Record.

  // Version number records carry.
  Version() int
  Value() []byte // data carried by the record to be used
  Data() []byte  // data carried by the record used in determining validity
}

// Records.Validator represents an algorithm for determining the validity of a
// Record, and to order records deterministically.
type Records.Validator interface {
  // Valid returns whether a Record is valid in present circumstances.
  // This could include checking correctness of the record (checking cryptographic
  // signatures, and the like), or some validity regarding external infrastructure
  // such as:
  // - PKIs (Public Key Infrastructures)  -- is a signature chain valid?
  // - TIs (Time Infrastructures) -- is this record valid _right now_?
  Valid(*Records.Record) (bool, error)

  // Order returns {-1, 0, 1} to order (and pick from) {a, b}.
  Order(a, b *Records.Record) int
}

// Records.Order returns {-1, 0, 1} to order (and pick from) {a, b}. Orders by:
//
//   ( cmp(a.Version(), b.Version()),     // 1) version numbers always take precedence
//     validator.Order(a, b),             // 2) user's validator.Order(.) function
//     cmp(Marshal(a), Marshal(b) )       // 3) worst case, order by raw bytes.
//
// 1) A higher version number _always_ takes precedence over a lower version number.
// Record systems could use version numbers primarily for delivering updates, but
// SHOULD still address ordering records with equal version numbers (multipler
// writer problem).
//
// 2) The user's validator's Order function is used next to determine the order
// of records. Thus the user may define ordering based on timestamps on the record,
// or on some (pure) computation based on the record.
//
// 3) In the worst case, records are orderered by cmp( Marshal(a), Marshal(b) )
// to ensure there is _always_ a deterministic way to order records. This also
// lets the user define Validator.Order(.) functions to always return 0 and
// the record system _will still be deterministic_ (a very important property).
func Records.Order(validator Records.Validator, a, b *Records.Record) int

// Serialize/Deserialize Records
func Records.Marshal(Records.Record) ([]byte, error) {}
func Records.Unmarshal([]byte) (Records.Record, error) {}

//-----------------------------------------------------------------------------

// RecordStore is a module that defines a system for storing and retrieving
// records from some other subsystem.

// RecordStore.Key is a key used to store the record under.
type RecordStore.Key string

// RecordStore.Store is a storage system for Records. It can be backed by any KV-store,
// any DS.Datastore, or by a more complex distributed system, like a DHT or DNS.
type RecordStore.Store interface {
  // Put sets a record to a key
  Put(RecordStore.Key, Records.Record) error

  // Get returns a set of records.
  // Return value is represented by a channel because it may be a slow and
  // endless process (Consider a DHT).
  Get(RecordStore.Key) (<-Records.Record, error)
}

// RecordStore constructors
func RecordStore.FromDatastore(DS.Datastore) RecordStore.Store {}
func RecordStore.FromDHT(DHT.DHT)            RecordStore.Store {}
func RecordStore.Tiered([]RecordStore.Store) RecordStore.Store {}

//-----------------------------------------------------------------------------

// Records.RecordChain is a record part of a merkle-chain. It:
//  - links to another (sub) Record, which contains the value
//  - links to other _previous_ RecordChain parent(s)
type Records.RecordChain interface {
  DAG.Node

  SubRecord() Records.Record      // link
  Parents() []Records.RecordChain // link
}

// Records.SignedRecord is a record which is cryptographically signed.
// It authenticated any other record. It:
//  - links to another (sub) Record, which contains the value
//  - links to a crypto.PublicKey
//  - carries signature (publicKey.Sign, link to another record)
type Records.SignedRecord interface {
  SignedDAG.Node

  SubRecord() Records.Record // link
}

//-----------------------------------------------------------------------------

// Provide is a module that facilitates the serving of large amounts of data to
// the network. It layers cleanly on top of a Records.Store, and uses its own
// type of Record.Record.

// Provide.Record is a signed statement from a particular Host that promises
// to serve a particular piece of data.
//
// A future version will carry a (publicly verifiable) proof of storage.
type Provide.Record interface {
  Records.SignedRecord

  Key() Blocks.Key  // the key of the block being provided
  Provider() Net.ID // the author of the record, same as hash of PublicKey()
  Proof() []byte    // unsued today. will be a publicly verifiable proof of storage.
}

// Provide announces Net.Host as a Provider for Blocks.Key
func Provide.Provide(RecordStore.Store, Blocks.Key, Net.Host) error {}

// FindProviders looks in the RecordStore for Providers for given Key
func Provide.FindProviders(RecordStore.Store, Blocks.Key) (<-Net.ID, error) {}


//-----------------------------------------------------------------------------

// Network provides the p2p network utilities

type Net.Stream interface {
  io.ReadWriteCloser

  Conn() Net.Conn
}

type Net.Conn interface {
  Local() Net.ID
  Remote() Net.ID
  LocalMultiaddr() Net.Addr
  RemoteMultiaddr() Net.Addr
  LocalPrivateKey() Crypto.PrivateKey
  RemotePublicKey() Crypto.PublicKey
}

type Net.Network interface {
  OpenStream(Net.ID) (Net.Stream, error)
  SetStreamHandler(func(Net.Stream))
}


//-----------------------------------------------------------------------------

// NetDiscovery provides the p2p network discovery services. It is an abstract
// interface, a concrete service searches a particular medium for other nodes.

type NetDiscovery.Service interface {
  Discovery.Notifier
}

// The notifiee of this service is where the bulk of the work is done.
type NetDiscovery.Notifiee interface {
  Notifiee

  DiscoveredPeer(Net.ID)
}

// Bootstrap Discovery Service provides a NetDiscovery with a list of known bootstraps
type NetDiscovery.Bootstrap interface {
  NetDiscovery.Service
}

// DHT Discovery Service provides a NetDiscovery with new peers found from a DHT
type NetDiscovery.DHT interface {
  NetDiscovery.Service
}

// mDNS Discovery Service provides a NetDiscovery service over mDNS
type NetDiscovery.MDNS interface {
  NetDiscovery.Service
}

//-----------------------------------------------------------------------------

// NetFind provides searching for particular peers in a p2p network. It is an
// abstract interface, concrete services will often do other pieces of the puzzle
// such as a full Kademlia DHT.


type NetFind.Service {
  FindNode(Net.ID) ([]Net.Addr, nil)
}


//-----------------------------------------------------------------------------
//TODO

// PubSub is a publish/subscribe mechanism on top of the record system. It is useful
// to sign up users to receive updates for something.
// The endpoint has a relationship to the keys used to sign messages. Perhaps:
//
//   /ipps/<public-key>/<path>     // messages signed by public-key
//   /ipps/<symmetric-key>/<path>  // messages encrypted with symmetric-key
//

// Endpoint is really just a string path
type PubSub.Endpoint interface {
  Path() string     // endpoint path.
  Key()  crypto.Key // key used for the record, from first component of path.
  Type() string     // asymmetric or symmetric, from type of Key.
}

// SubscribeRecord is a signed statement from a subscriber, asking for updates.
// Stored on a RecordStore at Path()/sub
type PubSub.SubscribeRecord interface {
  Records.SignedRecord

  Endpoint() Endpoint // a string path representing the pubsub endpoint path
  Subscriber() Net.ID // the author of the record, same as hash of PublicKey()
}

// To communicate:
// - asymmetric endpoints are like signed pipes - messages are signed by key
// - symmetric endpoints are like ciphers - messages are encrypted
// both of these can be implemented with an AEAD,

// SignedMessage is a message in an asymmetric pubsub endpoint
type PubSub.SignedMessage interface {
  SignedDAG.Node

  Endpoint() Endpoint
  Key() crypto.PublicKey // link - to key.            Node().PublicKey()
  Message()              // link - to another object. Node().Subnode()
}

// EncryptedMessage is a message in an assymetric pubsub endpoint
type PubSub.EncryptedMessage interface {
  DAG.Node

  Endpoint() Endpoint
  Key() crypto.PublicKey // link - SignedRecord().PublicKey()
  Message()              // link - to another object. SignedRecord().SubRecord().
}


