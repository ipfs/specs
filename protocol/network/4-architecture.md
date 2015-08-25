4 Architecture
==============

libp2p was designed around the Unix Philosophy, creating smaller components, easier to understand and to test. These components should also be able to be swapped in order to accomodate different technologies or scenarios and also make it that it is upgradable over time.

Although different Peers can support different protocols depending on their capabilities, any Peer can act as a dialer and/or a listener for connections from other Peers, connections that once established can be reused from both ends, removing the distinction between clients and servers.

libp2p interface acts as a thin veneer to three subsystems that are required in order for peers to be able to communicate. These subsystems are allowed to be built on top of other subsystems as long as they respect the standardized interface. The main 3 subsystems are:

- Peer Routing - Mechanism to find a Peer in a network. This Routing can be done recursively, iteratively or even in a broadcast/multicast mode.
- Swarm - Handles everything that touches the 'opening a stream' part of libp2p, from protocol muxing, stream muxing, NAT Traversal, Connection Relaying, while being multitransport
- Distributed Record Store - A system to store provider records and relay records

Each of these subsystem exposes a well known interface (see chapter 6 for Interfaces) and may use eachother in order to fulfil their goal. A global overview of the system is:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  libp2p                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────┐┌──────────────────────────┐┌──────────────────────────┐
│       Peer Routing      ││      Swarm               ││ Distributed Record Store │
└─────────────────────────┘└──────────────────────────┘└──────────────────────────┘
```

## 4.1 Peer Routing

A Peer Routing subsystem, exposes an interface to identify which peers should a message be routed in the DHT. It receives a key and must return one or more PeerInfo objects.

We present two examples of possible Peer Routing subsystems, the first based on a the Kademlia DHT and the second based on mDNS. Nevertheless, other Peer Routing mechanisms might be implemented, as long as they fulfil the same expectation and interface.




### 4.1.1 kad-routing

kad-routing implements the Kademlia Routing table, where each peer holds a set of k-buckets, each of them containing several PeerInfo from other peers in the network. In order to find the whereabouts of these peers, it implements 3 discovery mechanisms:

- mDNS-discovery
- random-walk
- bootstrap-list

```
┌────────────────────────────────────────────────────────────────┐
│       Peer Routing                                             │
│┌──────────────────────────────────────────────────────────────┐│
││ kad-routing ┌──────────────┐┌──────────────┐┌──────────────┐ ││
││             │mDNS-discovery││random-walk   ││bootstrap-list│ ││
││             └──────────────┘└──────────────┘└──────────────┘ ││
│└──────────────────────────────────────────────────────────────┘│
│┌──────────────────────────────────────────────────────────────┐│
││ mDNS-routing                                                 ││
│└──────────────────────────────────────────────────────────────┘│
│┌──────────────────────────────────────────────────────────────┐│
││ other-routing-mechanisms                                     ││
│└──────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

#### 4.1.1.1 mDNS-discovery

mDNS-discovery uses mDNS to emit beacons in the local area network to find if there are more peers available, these peers are extremely interesting because our link to them will have an low latency, plus if we are disconnected from the network, we will be leverage the content on those peers have cached.

#### 4.1.1.2 random-walk

Random walking consists on traversing the routing tables of the peers available in the network, learning about new peers along the way.

#### 4.1.1.3 bootstrap-list

A predefined set of peers available on the network in well known locations, so that a new created node can easily find more peers to connect in the network.

### 4.1.2 mDNS-routing

mDNS-routing uses mDNS probes to identify if local area network peers that have a given key or simply are present.

## 4.2 Swarm


### 4.2.1 Stream Muxer

The stream muxer must implement the interface offered by [abstract-stream-muxer](https://github.com/diasdavid/abstract-stream-muxer).

### 4.2.2 Protocol Muxer

### 4.2.3 Transport

### 4.2.4 Crypto

### 4.2.5 Identify

**Identify** is one of the protocols mounted on top of swarm, our Connection handler, however, it follows and respects the same pattern as any other protocol when it comes to mounting it on top of swarm. Identify enables us to trade listenAddrs and observedAddrs between peers, this is crucial for the working of IPFS, since every socket open implements REUSEPORT, an observedAddr by another peer can enable a third peer to connect to us, since the port will be already open and redirect to us on a NAT.

### 4.2.6 Relay



## 4.3 Distributed Record Store

### 4.3.1 Record

Follows [IPRS](https://github.com/ipfs/specs/tree/master/records)

### 4.3.2 abstract-record-store

### 4.3.3 kad-record-store

### 4.3.4 mDNS-record-store

### 4.3.5 s3-record-store


