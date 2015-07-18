> this is a temporary doc, just so I can write down all the spec/notes that has been talked and iterate over it until we figure out how to organize it.

# Layers

```
            ┌──────────────────────────────────────────────┐
            │            MerkleDAG                         │
            └──────────────────────────────────────────────┘
        ▷   ┌──────────────────────────────────────────────┐
        │   │            bitswap                           │
exchange│   └──────────────────────────────────────────────┘
        │   ┌──────────────────────────────────────────────┐
        │   │            host                              │
        ▷   └──────────────────────────────────────────────┘
        ▷   ┌──────────────────────────────────────────────┐
        │   │            routing                           │
 routing│   └──────────────────────────────────────────────┘
        │   ┌────────────────────┐  ▲     ┌ ─ ─ ─ ─ ─ ─ ─ ─
        │   │      swarm         │  │      ┌───────────────┐
        │   │                    │◀─┴─────┤│   discovery   │
        │   │                    │         └───────────────┘
        ▷   └────────────────────┘        └ ─ ─ ─ ─ ─ ─ ─ ─
        ▷   ┌──────────┐┌────────┐
        │   │connection││protocol│
 network│   │          ││muxing  │
        ▷   └──────────┘└────────┘
```

## MerkleDAG layer

## exchange layer

### bitswap

### host

- holds connections open
- announces block interest to connections open
- api
  - .openStream(<peer that owns blockId>)

## routing layer

### router

![](https://cldup.com/gifxf20TnJ-3000x3000.png)

- routing interface
- DHT (Kademlia)
- mDNS
- Delegated
- Tracker

### discovery

![](https://cldup.com/q3JsosI5zo-3000x3000.png)

