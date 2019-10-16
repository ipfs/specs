# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) The Keychain

**Authors(s)**:
- [Juan Benet](github.com/jbenet)

* * *

**Abstract**

This document presents _The Keychain_, a distributed merkle-linked data structure that links cryptographic keys, identities, signatures, certificates, ciphertexts, proofs, and other objects.

The idea of _The Keychain_ is to provide a common construction for managing and distributing cryptographic keys and artifacts. It is similar to a Public Key Infrastructure, but goes further into binding objects together.

# Table of Contents

TODO

## Types

```go
// Identity represents an entity that can prove possession of keys.
// It is meant to map to People, Groups, Processes, etc. It is
// essentially a Prover
type Identity struct {
  Name string // does not need to be unique.
}

// Key represents a cryptographic key
type Key struct {
  Algorithm Link // the algorithm used to generate the key
  Encoding  Link // the encoding used to store the key
  Bytes     Data // the raw key bytes
}

// KeyPair represents a pair of keys
type KeyPair struct {
  Public Link // the public key
  Secret Link // the secret key
}

// Signature represents a digital signature over another object.
type Signature struct {
  Key       Link // the key used to verify this signature (PublicKey)
  Algorithm Link // the algorithm used to sign the signee
  Encoding  Link // the encoding the sig is serialized with
  Signee    Link // the object the key is signing
  Bytes     Data // the raw signature bytes
}

// Ciphertext represents encrypted data
type Encryption struct {
  Decryptor  Link // the identity able to decrypt the encryption
  Ciphertext Link // the encrypted data
}
```


## Proof Types

```go
// ProofOfControl proves a certain key is under control of a prover.
var ProofOfControl = "proof-of-control"

// ProofOfWork proves an amount of work was expended by a prover.
var ProofOfWork = "proof-of-work"

// ProofOfStorage proves certain data is possessed by prover.
var ProofOfStorage = "proof-of-storage"

// ProofOfRetrievability proves certain data is possessed by
// _and retrievable from_ a prover.
var ProofOfRetrievability = "proof-of-retrievability"
```

## diagrams

![](https://www.evernote.com/l/AMZm3JN_2TJIL5frkmLYPf71oeA7qaOUiVEB/image.png)

![](https://www.evernote.com/l/AMacVgdLVAhPc5EOuvFZKHOhhd9VNcUq9zAB/image.png)
