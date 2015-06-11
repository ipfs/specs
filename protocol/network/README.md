# IPFS Protocol Network Spec or `libp2p`

Authors: [Juan Benet](http://github.com/jbenet)

Reviewers:

TODOS:
- incorporate peer-routing, as discussed in https://github.com/ipfs/specs/issues/1

* * *

This [spec](../../) describes the IPFS network protocol. The network layer
provides point-to-point transports (reliable and unreliable) between any two
IPFS nodes in the network.


## Supports

It SHOULD support:
- [NAT traversal](#NAT-traversal)
- [Connection Relaying](#Relay-is-unavoidable)
- [Encryption](#Encryption)
- [Multiple Transports](#Transport-Agnostic)
- [Multi-Multiplexing](#Multi-multiplexing)


### NAT traversal

Network Address Translation is ubiquitous in the internet. Not only are most
consumer devices behind many layers of NATs, but most datacenter nodes are
often behind NAT for security or virtualization reasons. As we move into
containerized deployments, this is getting worse. IPFS implementations SHOULD
provide a way to traverse NATs, otherwise it is likely that operation will be
affected. Even nodes meant to run with real IP addresses must implement NAT
traversal techniques, as they may need to establish connections to peers
behind NAT.

IPFS accomplishes full NAT traversal using an ICE-like protocol. It is not
exactly ICE, as ipfs networks provide the possibility of relaying communications over the IPFS protocol itself, for coordinating hole-
punching or even relaying communication.

It is recommended that implementations use one of the many NAT traversal
libraries available, such as `libnice`, `libwebrtc`, or `natty`. However,
NAT traversal must be interoperable.

### Relay

Unfortunately, due to symmetric NATs, container and VM NATs, and other
impossible-to-bypass NATs, IPFS MUST fallback to relaying communication
to establish a full connectivity graph. To be complete, implementations
MUST support relay, though it SHOULD be optional and able to be turned
off by end users.

### Encryption

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

**NOTE:** we do not use TLS directly, because we do not want the CA system
baggage. Most TLS implementations are very big. Since the IPFS model begins
with keys, IPFS only needs to apply ciphers. This is a minimal portion of the
whole TLS standard.

### Transport Agnostic

IPFS is transport agnostic, so it can run over any transport protocol. It does
not even depend on IP; it may run on top of NDN, XIA, and other new internet
architectures.

In order to reason about possible transports, IPFS uses
[multiaddr](https://github.com/jbenet/multiaddr), a self-describing addressing
format. This makes it possible for IPFS to treat addresses opaquely everywhere
in the system, and have support various transport protocols in the network
layer. The actual format of addresses in IPFS is `ipfs-addr`, a multiaddr that
ends with an ipfs nodeid. For example, these are all valid `ipfs-addrs`:

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

**Note:** at this time, no unreliable implementations exist. The protocol's
interface for defining and using unreliable transport has not been defined.

**TODO:** define how unreliable transport would work. base it on webrtc.


### Multi-Multiplexing

The IPFS Protocol is a collection of multiple protocols available at the same
IPFS Node. In order to conserve resources, and to make connectivity easier,
the IPFS network layer can perform all its operations through a single TCP or
UDP port, depending on the transports used. IPFS can multiplex its many
protocols through point-to-point connections. This multiplexing is for both
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


## Datastructures

The network protocol deals with these datastructures:

- a `PrivateKey`, the private key of a node.
- a `PublicKey`, the public key of a node.
- a `PeerID`, a hash of a node's public key.
- a `Node`[*], has a PeerID, and open connections to other `Nodes`.
- a `Connection`, a point-to-point link between two Nodes (muxes 1 or more streams)
- a `Stream`, a duplex message channel.

[*] currently called `PeerHost` in go-ipfs.

## Interface

The network protocol's interface has two parts:
1. the _client interface_, for clients (e.g. higher layers of IPFS)
2. the _service interface_, for remote peers (e.g. other IPFS nodes)

### Client Interface

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

### Protocol Interface

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

## Properties

### Communication Model - Streams

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

### Ports - Constrained Entrypoints

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

### Transport Protocols

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

### Non-IP Networks

Efforts like [NDN](http://named-data.net) and
[XIA](http://www.cs.cmu.edu/~xia/) are new architectures for the internet,
which are closer to the model IPFS uses than what IP provides today. IPFS
will be able to operate on top of these architectures trivially, as there
is no assumptions made about the network stack in the protocol. Implementations
will likley need to change, but changing implementations is vastly easier than
changing protocols.
