# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Core API

**Maintainer(s)**:
- N/A

**Abstract**

The `core` API is the programmatic interface for IPFS, it defines the method signatures.

# Table of Contents

TODo

## Required for compliant IPFS implementation

> Everything defined here is required.

- version
- node
  - id
  - start
  - stop
- block
  - get
  - put
  - stat
- object - Basic manipulation of the DAG
  - data
  - get
  - links
  - new
  - patch
  - put
  - stat
- refs - Listing of references. (Essentially, walking around the graph).
  - local
- repo - Basic manipulation of the repo
  - init
  - stat
  - gc
  - config get
  - config put
- pin - Basic manipulation of the pin set
  - add
  - ls
  - rm

## Extensions

> Everything defined here is optional

- name (ipns)
  - name publish
  - resolve
- dns
  - resolve
- tar
  - add
  - cat
- tour
  - list
  - next
  - restart
- files
  - add
  - cat
  - get
- stat - Statistics about everything
  - bw
- mount
- bootstrap
  - add
  - list
  - rm
- bitswap
  - stat
  - wantlist
- log
  - level
  - tail


## Tooling on top of the Core + Extentions

> Everything defined here is optional, and might be specific to the implementation details (like running on the command line).

- commands
- update
- init - sugar around ipfs repo init
- config
  - edit
  - replace
  - show
- daemon
- diag
  - net
  - sys

## Network API specifics that bubble up from libp2p API

- ping
- dht
  - findpeer
  - findprovs
  - get
  - put
  - query
- swarm
  - addrs
  - addrs local
  - connect
  - disconnect
  - filters
  - filters add
  - filters rm
  - peers
- records (iprs)
  - put
  - get

## [Interface definition and test suite](https://github.com/ipfs/interface-ipfs-core)
