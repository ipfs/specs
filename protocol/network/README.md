IPFS Protocol Network Spec
=========================

Authors: 
- [Juan Benet](https://github.com/jbenet)
- [David Dias](https://github.com/diasdavid)

Reviewers:

* * *

# Abstract

This describes the IPFS network protocol. The network layer provides point-to-point transports (reliable and unreliable) between any two IPFS nodes in the network.

This document defines the spec implemented in libp2p.

# Status of this spec

> This spec is a Work In Progress (WIP)

# Table of Contents

- [1 Introduction and Goals]()
- [2 Requirements]()
  - [2.1 NAT traversal] ()
  - [2.2 Relay]()
  - [2.3 Ecryption]()
  - [2.4 Transport Agnostic]()
  - [2.5 Multi-Multiplexing]()
- [3 Datastructures]()
- [4 Interface]()
  - [4.1 Client Interface]()
  - [4.2 Protocol Interface]()
- [5 Properties]()
  - [5.1 Communication Model - Streams]()
  - [5.2 Ports - Constrained Entrypoints]()
  - [5.3 Transport Protocol]()
  - [5.4 Non-IP Networks]()
  - [5.5 On the wire]()
    - [5.5.1 Protocol-Multiplexing]()
    - [5.5.2 multistream - self-describing protocol stream]()
    - [5.5.3 multistream-selector - self-describing protocol stream selector]()
    - [5.5.4 Stream Multiplexing]()
    - [5.5.5 Portable Encodings]()
- [6 Software Stack]()
- [7 Implementation Details]()
- [References]()

## 1. Introduction and Goals

It SHOULD support:
- [NAT traversal](#NAT-traversal)
- [Connection Relaying](#Relay-is-unavoidable)
- [Encryption](#Encryption)
- [Multiple Transports](#Transport-Agnostic)
- [Multi-Multiplexing](#Multi-multiplexing)

## 2. Requirements

### 2.1 NAT traversal

Network Address Translation is ubiquitous in the internet. Not only are most consumer devices behind many layers of NATs, but most datacenter nodes are often behind NAT for security or virtualization reasons. As we move into containerized deployments, this is getting worse. IPFS implementations SHOULD provide a way to traverse NATs, otherwise it is likely that operation will be affected. Even nodes meant to run with real IP addresses must implement NAT traversal techniques, as they may need to establish connections to peers behind NAT.

IPFS accomplishes full NAT traversal using an ICE-like protocol. It is not exactly ICE, as ipfs networks provide the possibility of relaying communications over the IPFS protocol itself, for coordinating hole-punching or even relaying communication.

It is recommended that implementations use one of the many NAT traversal libraries available, such as `libnice`, `libwebrtc`, or `natty`. However, NAT traversal must be interoperable.

### 2.2 Relay

Unfortunately, due to symmetric NATs, container and VM NATs, and other impossible-to-bypass NATs, IPFS MUST fallback to relaying communication to establish a full connectivity graph. To be complete, implementations MUST support relay, though it SHOULD be optional and able to be turned off by end users.

### 2.3 Encryption

Communications on IPFS may be:

- **encrypted**
- **signed** (not encrypted)
- **clear** (not encrypted, not signed)

We take both security and performance seriously. We recognize that encryption
is not viable for some in-datacenter high performance use cases.

We recommend that:
- implementations encrypt all communications by default
- implementations are audited
- unless absolutely necessary, users normally operate with encrypted communications only.

IPFS uses cyphersuites like TLS.

**NOTE:** we do not use TLS directly, because we do not want the CA system baggage. Most TLS implementations are very big. Since the IPFS model begins with keys, IPFS only needs to apply ciphers. This is a minimal portion of the whole TLS standard.

### 2.4 Transport Agnostic

IPFS is transport agnostic, so it can run over any transport protocol. It does not even depend on IP; it may run on top of NDN, XIA, and other new internet architectures.

In order to reason about possible transports, IPFS uses [multiaddr](https://github.com/jbenet/multiaddr), a self-describing addressing format. This makes it possible for IPFS to treat addresses opaquely everywhere in the system, and have support various transport protocols in the network layer. The actual format of addresses in IPFS is `ipfs-addr`, a multiaddr that ends with an ipfs nodeid. For example, these are all valid `ipfs-addrs`:

```
# ipfs over tcp over ipv6 (typical tcp)
/ip6/fe80::8823:6dff:fee7:f172/tcp/4001/ipfs/QmYJyUMAcXEw1b5bFfbBbzYu5wyyjLMRHXGUkCXpag74Fu

# ipfs over utp over udp over ipv4 (udp-shimmed transport)
/ip4/162.246.145.218/udp/4001/utp/ipfs/QmYJyUMAcXEw1b5bFfbBbzYu5wyyjLMRHXGUkCXpag74Fu

# ipfs over ipv6 (unreliable)
/ip6/fe80::8823:6dff:fee7:f172/ipfs/QmYJyUMAcXEw1b5bFfbBbzYu5wyyjLMRHXGUkCXpag74Fu

# ipfs over tcp over ip4 over tcp over ip4 (proxy)
/ip4/162.246.145.218/tcp/7650/ip4/192.168.0.1/tcp/4001/ipfs/QmYJyUMAcXEw1b5bFfbBbzYu5wyyjLMRHXGUkCXpag74Fu

# ipfs over ethernet (no ip)
/ether/ac:fd:ec:0b:7c:fe/ipfs/QmYJyUMAcXEw1b5bFfbBbzYu5wyyjLMRHXGUkCXpag74Fu
```

**Note:** at this time, no unreliable implementations exist. The protocol's interface for defining and using unreliable transport has not been defined.

**TODO:** define how unreliable transport would work. base it on webrtc.

### 2.5 Multi-Multiplexing

The IPFS Protocol is a collection of multiple protocols available at the same IPFS Node. In order to conserve resources, and to make connectivity easier, the IPFS network layer can perform all its operations through a single TCP or UDP port, depending on the transports used. IPFS can multiplex its many protocols through point-to-point connections. This multiplexing is for both
reliable streams and unreliable datagrams.

IPFS is pragmatic. It seeks to be usable in as many settings as possible, to
be modular and flexible to fit various use cases, and to force as few choices
as possible. Thus the IPFS network layer provides what we're loosely referring
to as "multi-multiplexing":

- can multiplex multiple listen network interfaces
- can multiplex multiple transport protocols
- can multiplex multiple connections per peer
- can multiplex multiple client protocols
- can multiples multiple streams per protocol, per connection (SPDY, HTTP2, QUIC, SSH)
- has flow control (backpressure, fairness)
- encrypts each connection with a different ephemeral key

To give an example, imagine a single IPFS node that:

- listens on a particular TCP/IP address
- listens on a different TCP/IP address
- listens on a SCTP/UDP/IP address
- listens on a UDT/UDP/IP address
- has multiple connections to another node X
- has multiple connections to another node Y
- has multiple streams open per connection
- multiplexes streams over http2 to node X
- multiplexes streams over ssh to node Y
- one IPFS protocol uses one stream per peer
- one IPFS protocol uses multiple streams per peer

Not providing this level of flexbility makes it impossible to use IPFS in
various platforms, use cases, or network setups. It is not important that all
implementations support all choices; what is critical is that the spec is
flexible enough to allow implementations to use precisely what they need. This
ensures that complex user or application constraints do not rule out IPFS as an
option.


## 3. Datastructures

The network protocol deals with these datastructures:

- a `PrivateKey`, the private key of a node.
- a `PublicKey`, the public key of a node.
- a `PeerID`, a hash of a node's public key.
- a `Node`[1], has a PeerID, and open connections to other `Nodes`.
- a `Connection`, a point-to-point link between two Nodes (muxes 1 or more streams)
- a `Stream`, a duplex message channel.

[1] currently called `PeerHost` in go-ipfs.

## 4. Interface

The network protocol's interface has two parts:A

1. the _client interface_, for clients (e.g. higher layers of IPFS)
2. the _service interface_, for remote peers (e.g. other IPFS nodes)

### 4.1 Client Interface

The **Client Interface** is exposed to the higher layers of IPFS. It is the entry point for other parts to open + handle streams.

This type system represents the interface exposed to clients. Actual implementations will likely be more complicated, but they should aim to cover this.

```go
type PrivateKey interface {
  PublicKey() PublicKey

  Sign(data []byte) Signature
  Decrypt(ciphertext []byte) (plaintext []byte)
}

type PublicKey interface {
  PeerID() PeerID

  Verify(Signature) (ok bool)
  Encrypt(plaintext []byte) (ciphertext []byte)
}

// PeerID is a hash of a PublicKey, encoded in multihash
// It represents the identity of a node.
type PeerID Multihash

// Node is a peer in the network. It is both a client and server.
// Users may open streams to remote peers, or set handlers for protocols.
type Node interface {
  // ID returns the PeerID of this Node
  ID() PeerID

  // NewStream creates a new stream to given peerID.
  // It may have to establish a new connection to given peer.
  // (This includes finding the addresses of a peer, and NAT Traversal.)
  NewStream(Protocol, PeerID) (Stream, error)

  // SetStreamHandler sets a callback for remote-opened streams for a protocol
  // Thus clients register "protocol handlers", much like URL route handlers
  SetStreamHandler(Protocol, StreamHandler)

  // Raw connections are not exported to the user, only streams.
}

type StreamHandler func (Stream)
```

TODO: incorporate unreliable message / packet streams.

### 4.2 Protocol Interface

The network protocol consists of:

- Any secure, reliable, stream transport:
  - a reliable transport protocol (TCP, QUIC, SCTP, UDT, UTP, ...)
  - a secure PKI based transport protocol (SSH, TLS, ...)
  - a stream transport (with flow control, etc) (HTTP2, SSH, QUIC)
- Protocol stream framing, to multiplex services
- Auxiliary protocols for connectivity:
  - Identify - exchange node information
  - NAT - NAT Traversal (ICE)
  - Relay - for when NAT Traversal fails

Both the transport and stream muxer are pluggable. Unless
constraints dictate otherwise, implementations SHOULD implement TCP and HTTP/2
for interoperability. These are the default

- any reliable transport protocol
- a secure channel encryption
- a stream multiplexor with flow control (e.g. HTTP/2, SPDY, QUIC, SSH)
- every stream protocol header

(TODO: unreliable transport)

## 5 Properties

### 5.1 Communication Model - Streams

The Network layer handles all the problems of connecting to a peer, and exposes
simple bidirectional streams. Users can both open a new stream
(`NewStream()`) and register a stream handler (`SetStreamHandler`). The user
is then free to implement whatever wire messaging protocol she desires. This
makes it easy to build peer-to-peer protocols, as the complexities of
connectivity, multi-transport support, flow control, and so on, are handled.

To help capture the model, consider that:

- `NewStream` is similar to making a Request in an HTTP client.
- `SetStreamHandler` is similar to registering a URL handler in an HTTP server

So a protocol, such as a DHT, could:

```go
node := p2p.NewNode(peerid)

// register a handler, here it is simply echoing everything.
node.SetStreamHandler("/helloworld", func (s Stream) {
  io.Copy(s, s)
})

// make a request.
buf1 := []byte("Hello World!")
buf2 := make([]byte, len(buf1))

stream, _ := node.NewStream("/helloworld", peerid) // open a new stream
stream.Write(buf1)  // write to the remote
stream.Read(buf2)   // read what was sent back
fmt.Println(buf2)   // print what was sent back
```

### 5.2 Ports - Constrained Entrypoints

In the internet of 2015, we have a processing model where a program may be
running without the ability to open multiple -- or even single -- network
ports. Most hosts are behind NAT, whether of household ISP variety or new
containerized data-center type. And some programs may even be running in
browsers, with no ability to open sockets directly (sort of). This presents
challenges to completely peer-to-peer networks who aspire to connect _any_
hosts together -- whether they're running on a page in the browser, or in
a container within a container.

IPFS only needs a single channel of communication with the rest of the
network. This may be a single TCP or UDP port, or a single connection
through Websockets or WebRTC. In a sense, the role of the TCP/UDP network
stack -- i.e. multiplexing applications and connections -- may now be forced
to happen at the application level.

### 5.3 Transport Protocols

IPFS is transport agnostic. It can run on any transport protocol. The
`ipfs-addr` format (which is an ipfs-specific
[multiaddr](https://github.com/jbenet/multiaddr)) describes the transport.
For example:

```sh
# ipv4 + tcp
/ip4/10.1.10.10/tcp/29087/ipfs/QmVcSqVEsvm5RR9mBLjwpb2XjFVn5bPdPL69mL8PH45pPC

# ipv6 + tcp
/ip6/2601:9:4f82:5fff:aefd:ecff:fe0b:7cfe/tcp/1031/ipfs/QmRzjtZsTqL1bMdoJDwsC6ZnDX1PW1vTiav1xewHYAPJNT

# ipv4 + udp + udt
/ip4/104.131.131.82/udp/4001/udt/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ

# ipv4 + udp + utp
/ip4/104.131.67.168/udp/1038/utp/ipfs/QmU184wLPg7afQjBjwUUFkeJ98Fp81GhHGurWvMqwvWEQN
```

IPFS delegtes the transport dialing to a multiaddr-based network pkg, such
as [go-multiaddr-net](https://github.com/jbenet/go-multiaddr-net). It is
advisable to build modules like this in other languages, and scope the
implementation of other transport protocols.

Some of the transport protocols we will be using:

- UTP
- UDT
- SCTP
- WebRTC (SCTP, etc)
- Websockets
- TCP Remy

### 5.4 Non-IP Networks

Efforts like [NDN](http://named-data.net) and
[XIA](http://www.cs.cmu.edu/~xia/) are new architectures for the internet,
which are closer to the model IPFS uses than what IP provides today. IPFS
will be able to operate on top of these architectures trivially, as there
is no assumptions made about the network stack in the protocol. Implementations
will likley need to change, but changing implementations is vastly easier than
changing protocols.

### 5.5 On the wire

We have the **hard constraint** of making IPFS work across _any_ duplex stream (an outgoing and an incoming stream pair, any arbitrary connection) and work on _any_ platform.

To make this work, IPFS has to solve a few problems:

- [Protocol Multiplexing](#protocol-multiplexing) - running multiple protocols over the same stream
  - [multistream](#multistream) - self-describing protocol streams
  - [multistream-select](#multistream-select) - a self-describing protocol selector
  - [Stream Multiplexing](#stream-multiplexing) - running many independent streams over the same wire.
- [Portable Encodings](#portable-encodings) - using portable serialization formats
- [Secure Communications](#secure-communication) - using ciphersuites to establish security and privacy (like TLS).

#### 5.5.1 Protocol-Multiplexing

Protocol Multiplexing means running multiple different protocols over the same stream. This could happen sequentially (one after the other), or concurrently (at the same time, with their messages interleaved). We achieve protocol multiplexing using three pieces:

- [multistream](#multistream) - self-describing protocol streams
- [multistream-select](#multistream-select) - a self-describing protocol selector
- [Stream Multiplexing](#stream-multiplexing) - running many independent streams over the same wire.

#### 5.5.2 multistream - self-describing protocol stream

[multistream](https://github.com/jbenet/multistream) is a self-describing protocol stream format. It is extremely simple. Its goal is to define a way to add headers to protocols that describe the protocol itself. It is sort of like adding versions to a protocol, but being extremely explicit.

For example:

```
/ipfs/QmVXZiejj3sXEmxuQxF2RjmFbEiE9w7T82xDn3uYNuhbFb/ipfs-dht/0.2.3
<dht-message>
<dht-message>
...
```

#### 5.5.3 multistream-selector - self-describing protocol stream selector

[multistream-select](https://github.com/jbenet/multistream/tree/master/multistream-select) is a simple [multistream](https://github.com/jbenet/multistream) protocol that allows listing and selecting other protocols. This means that Protomux has a list of registered protocols, listens for one, and then _nests_ (or upgrades) the connection to speak the registered protocol. This takes direct advantage of multistream: it enables interleaving multiple protocols, as well as inspecting what protocols might be spoken by the remote endpoint.

For example:

```
/ipfs/QmdRKVhvzyATs3L6dosSb6w8hKuqfZK2SyPVqcYJ5VLYa2/multistream-select/0.3.0
/ipfs/QmVXZiejj3sXEmxuQxF2RjmFbEiE9w7T82xDn3uYNuhbFb/ipfs-dht/0.2.3
<dht-message>
<dht-message>
...
```

#### 5.5.4 Stream Multiplexing

Stream Multiplexing is the process of multiplexing (or combining) many different streams into a single one. This is a complicated subject because it enables protocols to run concurrently over the same wire. And all sorts of notions regarding fairness, flow control, head-of-line blocking, etc. start affecting the protocols. In practice, stream multiplexing is well understood and there are many stream multiplexing protocols. To name a few:

- HTTP/2
- SPDY
- QUIC
- SSH

IPFS nodes are free to support whatever stream multiplexors they wish, on top of the default one. The default one is there to enable even the simplest of nodes to speak multiple protocols at once. The default multiplexor will be HTTP/2 (or maybe QUIC?), but implementations for it are sparse, so we are beginning with SPDY. We simply select which protocol to use with a multistream header.

For example:

```
/ipfs/QmdRKVhvzyATs3L6dosSb6w8hKuqfZK2SyPVqcYJ5VLYa2/multistream-select/0.3.0
/ipfs/Qmb4d8ZLuqnnVptqTxwqt3aFqgPYruAbfeksvRV1Ds8Gri/spdy/3
<spdy-header-opening-a-stream-0>
/ipfs/QmVXZiejj3sXEmxuQxF2RjmFbEiE9w7T82xDn3uYNuhbFb/ipfs-dht/0.2.3
<dht-message>
<dht-message>
<spdy-header-opening-a-stream-1>
/ipfs/QmVXZiejj3sXEmxuQxF2RjmFbEiE9w7T82xDn3uYNuhbFb/ipfs-bitswap/0.3.0
<bitswap-message>
<bitswap-message>
<spdy-header-selecting-stream-0>
<dht-message>
<dht-message>
<dht-message>
<dht-message>
<spdy-header-selecting-stream-1>
<bitswap-message>
<bitswap-message>
<bitswap-message>
<bitswap-message>
...
```

#### 5.5.5 Portable Encodings

In order to be ubiquitous, we _must_ use hyper-portable format encodings, those that are easy to use in various other platforms. Ideally these encodings are well-tested in the wild, and widely used. There may be cases where multiple encodings have to be supported (and hence we may need a [multicodec](https://github.com/jbenet/multicodec) self-describing encoding), but this has so far not been needed.

For now, we use [protobuf](https://github.com/google/protobuf) for all protocol messages exclusively, but other good candidates are [capnp](https://capnproto.org), [bson](http://bsonspec.org/), [ubjson](http://ubjson.org/).

## 6 Software Stack

### 6.1 Overview

### 6.2 Discovery

goal: find more peers, keep routing table fresh (if Kad-Router is not being used, discovery doens't necessary has a use)

### 6.3 Peer Routing

goal: get ref to other peers, that then can be used by swarm to open a stream. Also is free to open streams to other peers to traverse the DHT

### 6.4 Swarm (aka Connectivity)

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

### 6.5 libp2p

## 7 Implementation Details

### 7.1 Discovery

A discovery service must have return new peers as they are found. It must implement a feature to `verify` if we can open a Connection, using swarm, before returning it as a "new peer found"

### 7.2 Peer Routing

### 7.3 Swarm

Identify stream requests should be issued by the listenner as soon as it receives a valid connection, otherwise the listenner won't be able to identify who is that stream comming, disabling its ability for connection reuse. Identify is responsible for 'tagging' the incomming connection on swarm with the right Id.

A peer only updates its own multiaddrs list with observedAddrs if it receives the same observedAddr twice, avoiding addr explosion (a phenomenon that happens when both peers are behind symmetric NAT).

### 7.4 libp2p


## References
