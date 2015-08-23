4 Architecture
==============

libp2p was designed around the Unix Philosophy, creating smaller components, easier to understand and to test that can be swapped or added in order to accomodate different technologies or scenarios and also make it that it is upgradable over time.
Although different Peers can support different protocols depending on their capabilities, any Peer can act as a dialer and/or a listener for connections from other Peers, connections that once established can be reused from both ends, removing the distinction between clients and servers.

libp2p interface acts as a thin veneer to four subsystems that are required in order for peers to be able to communicate. These subsystems are allowed to be built on top of other subsystems as long as they respect the standardized interface. The main 4 subsystems are:

- Peer Discovery - Ability to discovery of new peers in the network, so that a routing table can be generated and refreshed.
- Peer Routing - Mechanism to find a Peer in a network. This Routing can be done recursively, iteratively or even in a broadcast/multicast mode.
- Swarm - Handles everything that touches the 'opening a stream' part of libp2p, from protocol muxing, stream muxing, NAT Traversal, Connection Relaying, while being multitransport
- Record Store - A system to store provider records and relay recordes

## 4.1 Peer Discovery

> goal: find more peers, keep routing table fresh (if Kad-Router is not being used, discovery doens't necessary has a use)

## 4.2 Peer Routing

> goal: get ref to other peers, that then can be used by swarm to open a stream. Also is free to open streams to other peers to traverse the DHT

## 4.3 Swarm

goal: open stream, NAT traversal, Relay

~~The network is abstracted through the swarm which presents a simplified interface for the remaining layers to have access to the network. This interface should look like:~~

- `.openStream(peer, protocol)` - peer should contain the ID of the peer and its respective multiaddrs known.
- `.registerHandler(protocol, handlerFunc)` - enable a protocol to be registered, so that another peer can open a stream to talk with us to that specific protocol
- `.listen()` - to start listening for incoming connections and therefore opening of streams

The following figure represents how the network level pieces, are tied together:

```
┌ ─ ─ ─ ─ ┌ ─ ─ ─ ─ ┌ ─ ─ ─ ─ ┌───────────┐
 mounted │ mounted │ mounted ││Identify   │
│protocol │protocol │protocol │(mounted   │
 1       │ 2       │ ...     ││ protocol) │
└ ─ ─ ─ ─ └ ─ ─ ─ ─ └ ─ ─ ─ ─ └───────────┘
┌─────────────────────────────────────────┐
│             swarm                       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│            connection                   │
└─────────────────────────────────────────┘
┌───────────────┐┌───────────┐┌───────────┐
│Transport      ││multistream││ stream    │
│(TCP, UDP, etc)││           ││ muxer     │
└───────────────┘└───────────┘│┌ ─ ─ ─ ─ ┐│
                              │  spdy     │
                              │└ ─ ─ ─ ─ ┘│
                              │┌ ─ ─ ─ ─ ┐│
                              │ multiplex │
                              │└ ─ ─ ─ ─ ┘│
                              │┌ ─ ─ ─ ─ ┐│
                              │ QUIC      │
                              │└ ─ ─ ─ ─ ┘│
                              │┌ ─ ─ ─ ─ ┐│
                              │ others    │
                              │└ ─ ─ ─ ─ ┘│
                              └───────────┘
```

**Identify** is one of the protocols mounted on top of swarm, our Connection handler, however, it follows and respects the same pattern as any other protocol when it comes to mounting it on top of swarm. Identify enables us to trade listenAddrs and observedAddrs between peers, this is crucial for the working of IPFS, since every socket open implements REUSEPORT, an observedAddr by another peer can enable a third peer to connect to us, since the port will be already open and redirect to us on a NAT.

The stream muxer must implement the interface offered by [abstract-stream-muxer](https://github.com/diasdavid/abstract-stream-muxer).

Every socket open (through the transport chosen), is "multistream'ed" into the stream muxer used, once a stream muxer connection

## 4.4 Record Store


