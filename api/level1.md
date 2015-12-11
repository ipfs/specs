# IPFS API Level 1 Spec - Transport Agnostic

### IPFS Core

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
- log
  - level
  - tail
- name (ipns)
  - name publish
  - resolve

### IPFS Ext

> Everything defined here is optional

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

### IPFS Tools

> Everything defined here is optional, and might be specific to the
> implementation details (like running on the command line).

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

### Libp2p

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
- record (iprs)
  - put
  - get
- bitswap
  - stat
  - unwant
  - wantlist
