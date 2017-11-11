# Addressing on the Decentralized Web

> Note: This document is work in progress and largely incomplete.

Authors:
- Lars Gierth \<lgierth@ipfs.io>

Table of contents:
- Introduction
- The precarious web
  - Link competition and link rot
  - The addressing rift
- DWeb Addressing
- Namespaces
  - /ipfs -- immutable data
  - /ipns -- mutable pointers
  - Addressing data from other content-addressed systems
  - Network addressing
- Interoperability
  - DWeb Addressing with HTTP
  - ipfs:// and ipns:// URL schemes
  - dweb: URI scheme
  - Content Security Policy / Origins
- Appendix
  - DWeb Maturity Model
  - FAQ
  - Implementations
  - Future Work
  - Related work


## Introduction

Location-based addressing is a centralizing vector on the web.
It lets links rot and drives copies of content into mutual competition.

This document describes a content-based addressing model
which provides permanent links that don't rot and are cryptographically verifiable.
The result is a more cooperative, resilient, and performant web.
