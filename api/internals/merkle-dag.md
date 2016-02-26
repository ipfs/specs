Internal: ipfs-merkle-dag
=========================

> This is the specification for merkle-dag related modules used by IPFS.

Functionality is broken down into two modules:

- `ipfs-merkle-dag-node` - provides the means to create and examine properties
  of an IPFS Merkle DAG Node
- `ipfs-merkle-dag-service` - implements the DAG Service; an interface to store
  and fetch Nodes that works with ipfs-blocks, and therefore local storage and
  network storage (through exchange)

## API

### DAG Node

##### var node = dag.Node(data, links)

Creates a new IPFS Merkle DAG node with `data` contents and links to other DAG
nodes `links`.

`data` is expected to support at the minimum an arbitrary binary blobs, but
potentially also other data types such as strings, so long as they can be
converted into a binary blob internally by the module.

`links` can either be a list of Links or an object that maps link names
(strings) to nodes (Nodes):

Using a list: `node2 = new dag.Node('foo', [node1.asLink('link-name')]`

Using an object reference: `node2 = new dag.Node('foo', { 'link-name': node1 })`

If not provided, `links` will be considered an empty list.

### node

Nodes are immutable objects, and expose the following properties:

- `data` - a `Buffer` containing the data passed in when the node was created.
- `encoded` - a `Buffer` with the binary
  [protobuffer](https://developers.google.com/protocol-buffers/) encoding of the
  node.
- `hash` - a `Buffer` of the object after it has been SHA2-256 hashed.
- `size` - for convenience, the size of the `encoded` data, in bytes.
- `multihash` - for convenience, the base58-encoded string of `hash`.

#### node.asLink(name)

Creates a new immutable Link object with name `name` (a string) that points to
the node `node`.

Links have the following properties:

- `name` - the name of the link
- `size` - the size of the node the link points to, in bytes
- `hash` - a binary blob of the object after it has been hashed using a SHA2-256 multihash

### dag.fromProtobuf(data)

Creates a new DAG node from the binary protobuffer encoding of a node
(`encoded`, above).

### missing functionality

- removeNodeLink / removeNodeLinkByHash
- copy

### DAG Link

##### var link = node1.asLink(name)

Can only be created by referring to an existing Node object. *TODO: probably not
a desirable property?*

`name` is a string. If not provided, it will be treated as the empty string,
`''`.

`link.name` - string containing the name of the link
`link.size` - numeric value indicating the size of the node it points to, in
bytes
`link.hash` - binary blob containing the raw multihash of the node being pointed
to


## DAG Service

##### add

> stores the node

##### get

> fetches a node by its multihash

##### getRecursive

> fetches a node and all of its links (if possible)

##### remove

> deletes a node



## Data Structures

### DAG Node

- protobuf schema - https://github.com/ipfs/go-ipfs/blob/master/merkledag/pb/merkledag.proto#L31-L39

### DAG Link

- protobuf schema - https://github.com/ipfs/go-ipfs/blob/master/merkledag/pb/merkledag.proto#L18-L29

## Implementations

- [Javascript](https://github.com/vijayee/js-ipfs-merkle-dag)
- [Go](https://github.com/ipfs/go-ipfs/tree/master/merkledag)
