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

## network layer

### swarm

![](https://cldup.com/As4HG0h4d9-3000x3000.png)

swarms offers the API for routing layer be able to open "streams" with other peers. The API should look like:

- `.openStream(multiaddr, protocol)`
- `.registerHandle(protocol, cb)`

swarm holds the collection of connections and respective open streams on top of these connections (for reusing purposes)
a connection should be an abstraction of a socket where spdy was already negotiated

#### protocol muxing

![](https://cldup.com/o8CRUe2Y2U-1200x1200.png)

#### connection

![](https://cldup.com/JpaKDIUxRS-1200x1200.png)

#### nat traversal

![](https://cldup.com/3KMuGu3tEb-2000x2000.png)

# execution example



# refs

- https://github.com/ipfs/specs/pull/15/files
- https://github.com/ipfs/go-ipfs/blob/master/routing/dht/dht.go
- https://github.com/ipfs/go-ipfs/blob/master/p2p/host/host.go
- https://github.com/ipfs/go-ipfs/blob/master/routing/dht/notif.go
