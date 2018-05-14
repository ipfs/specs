![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) unixfs
================================================================================

Draft work and discussion on the upcoming UnixFS specification is happening in the [`ipfs/ipld-unixfs` repo](https://github.com/ipfs/unixfs-v2). Please see the issues there for discussion and PRs for drafts. When the specification is completed there, it will be copied back to this repo and replace this document.

The current implementation of UnixFS has grown organically and does not currently have a clear specification. See [“implementations”](#implementations) below for reference implementations.

# Implementations

- JavaScript
  - Data Formats - [unixfs](https://github.com/ipfs/js-ipfs-unixfs)
  - Importers and Exporters - [unixfs-engine](https://github.com/ipfs/js-ipfs-unixfs-engine)
- Go
  - [`ipfs/go-ipfs/unixfs`](https://github.com/ipfs/go-ipfs/tree/b3faaad1310bcc32dc3dd24e1919e9edf51edba8/unixfs)
  - Protocol Buffer Definitions - [`ipfs/go-ipfs/unixfs/pb`](https://github.com/ipfs/go-ipfs/blob/b3faaad1310bcc32dc3dd24e1919e9edf51edba8/unixfs/pb/unixfs.proto)
