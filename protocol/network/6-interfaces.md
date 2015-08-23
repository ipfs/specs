6 Interfaces
============

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


