3 Requirements
==============

## 3.1 NAT traversal

Network Address Translation is ubiquitous in the internet. Not only are most consumer devices behind many layers of NATs, but most datacenter nodes are often behind NAT for security or virtualization reasons. As we move into containerized deployments, this is getting worse. IPFS implementations SHOULD provide a way to traverse NATs, otherwise it is likely that operation will be affected. Even nodes meant to run with real IP addresses must implement NAT traversal techniques, as they may need to establish connections to peers behind NAT.

IPFS accomplishes full NAT traversal using an ICE-like protocol. It is not exactly ICE, as ipfs networks provide the possibility of relaying communications over the IPFS protocol itself, for coordinating hole-punching or even relaying communication.

It is recommended that implementations use one of the many NAT traversal libraries available, such as `libnice`, `libwebrtc`, or `natty`. However, NAT traversal must be interoperable.

## 3.2 Relay

Unfortunately, due to symmetric NATs, container and VM NATs, and other impossible-to-bypass NATs, IPFS MUST fallback to relaying communication to establish a full connectivity graph. To be complete, implementations MUST support relay, though it SHOULD be optional and able to be turned off by end users.

## 3.3 Encryption

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

## 3.4 Transport Agnostic

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

## 3.5 Multi-Multiplexing

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
