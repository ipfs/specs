Internal: ipfs-merkle-dag
=========================

> This is the specification for the merkle-dag module used by IPFS.

The merkle-dag module offers an interface to create MerkleDAG nodes and links and in addition implements the DAG Service, offering an interface to store and fetch Nodes that works with ipfs-blocks, and therefore local storage and network storage (through exchange).

## API

### DAG Service

##### add

> stores the node

##### get

> fetches a node by its multihash

##### getRecursive

> fetches a node and all of its links (if possible)

##### remove

> deletes a node

### DAG Node

##### createNode

##### addNodeLink

> creates a link on node A to node B by using node B to get its multihash

##### addRawLink

> creates a link on node A to node B by using direclty node B multihash

##### updateNodeLink

> updates a link on the node. *caution* this method returns a copy of the MerkleDAG node

##### removeNodeLink

> removes a link from the node by name

##### removeNodeLinkByHash

> removes a link from the node by the hash of the linked node

##### copy

> creates a copy of the MerkleDAG Node

##### size

> size of the node. This is a property, not a function

##### multihash

> returns the multihash (default: sha2-256)

##### marshal

> returns a protobuf serialized version, compatible with go-ipfs MerkleDAG

##### unMarshal

> desirializes a probuf serialized node

##### (used internally) getPBNode

> used internally

##### (used internally) makeLink

> used internally

### DAG Link



## Data Structures

### DAG Node

- protobuf schema - https://github.com/ipfs/go-ipfs/blob/master/merkledag/pb/merkledag.proto#L31-L39

### DAG Link

- protobuf schema - https://github.com/ipfs/go-ipfs/blob/master/merkledag/pb/merkledag.proto#L18-L29

## Implementations

- [js](https://github.com/vijayee/js-ipfs-merkle-dag)
- [go](https://github.com/ipfs/go-ipfs/tree/master/merkledag)
