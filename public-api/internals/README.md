Internals
=========

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

In addition to the APIs exposed to developers (cli, http and core), the IPFS spec provides a set of specifications for the IPFS subsystems (AKA modules), providing a clean understanding of the components that have to be constructed for a full IPFS implementation or even a clear knowledge of how to make a partial implementation, without compromissing due to the interdependencies of these subsystems.

This spec is a `WIP` and should be treated like so.

## Architecture

In a birds eye view, the Internals of IPFS might look like this:

```
             ▶  ┌───────────────────────────────────────────────────────────────────────────────┐
                │                                   IPFS Core                                   │
             │  └───────────────────────────────────────────────────────────────────────────────┘
                                                        │                                        
             │                                          │                                        
                                                        │                                        
             │            ┌──────────────┬──────────────┼────────────┬─────────────────┐         
                          │              │              │            │                 │         
             │            │              │              │            │                 │         
                          ▼              │              ▼            │                 ▼         
             │  ┌──────────────────┐     │    ┌──────────────────┐   │       ┌──────────────────┐
                │                  │     │    │                  │   │       │                  │
             │  │  Block Service   │     │    │   DAG Service    │   │       │    IPFS Repo     │
                │                  │     │    │                  │   │       │                  │
             │  └──────────────────┘     │    └──────────────────┘   │       └──────────────────┘
                          │              │              │            │                           
  IPFS Core  │            ▼              │         ┌────┴────┐       │                           
                     ┌────────┐          │         ▼         ▼       │                           
             │       │ Block  │          │    ┌────────┐┌────────┐   │                           
                     └────────┘          │    │DAG Node││DAG Link│   │                           
             │                           │    └────────┘└────────┘   │                           
                ┌──────────────────┐     │                           │       ┌──────────────────┐
             │  │                  │     │                           │       │                  │
                │    Bitswap       │◀────┤                           ├──────▶│    Importer      │
             │  │                  │     │                           │       │                  │
                └──────────────────┘     │                           │       └──────────────────┘
             │                           │                           │                 │         
                                         │                           │            ┌────┴────┐    
             │                           │                           │            ▼         ▼    
                                         │                           │       ┌────────┐┌────────┐
             │  ┌──────────────────┐     │                           │       │ layout ││chunker │
                │                  │     │              ┌────────────┘       └────────┘└────────┘
             │  │    Files         │◀────┘              │                                        
                │                  │                    │                                        
             │  └──────────────────┘                    │                                        
             ▶                                          │                                        
                                                        ▼                                        
                ┌───────────────────────────────────────────────────────────────────────────────┐
                │                                                                               │
                │                                                                               │
                │                                                                               │
                │                                 libp2p                                        │
                │                                                                               │
                │                                                                               │
                └───────────────────────────────────────────────────────────────────────────────┘
```

TODO:

- [ ] Add IPLD

## Index

- ipfs-blocks - Block Service and Block
  - [spec]()
  - [js](https://github.com/ipfs/js-ipfs-blocks)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/blocks)
- ipfs-merkle-dag - DAG Service and DAG Node (protobuf data format)
  - [spec]()
  - [js](https://github.com/vijayee/js-ipfs-merkle-dag)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/merkledag)
- ipfs-bitswap
  - Defined by the [Exchange Spec](https://github.com/ipfs/specs/pull/53)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/exchange/bitswap)
- ipfs-data-importing
  - Defined by the [Data Importing Spec](https://github.com/ipfs/specs/pull/57)
  - [js](https://github.com/ipfs/js-ipfs-data-importing)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/unixfs/io)
- ipfs-repo
  - Defined by the [Repo](https://github.com/ipfs/specs/pull/43)
  - [js](https://github.com/ipfs/js-ipfs-repo)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/repo)
- ipfs-files
  - [spec]()
  - js - Currently, we support `jsipfs files add`, on the js-ipfs impl, but not the full files API impl
  - [go](https://github.com/ipfs/go-ipfs/tree/master/mfs)
- ipfs-unixfs
  - [spec]()
  - [js](https://github.com/ipfs/js-ipfs-unixfs)
  - [go](https://github.com/ipfs/go-ipfs/tree/master/unixfs)
