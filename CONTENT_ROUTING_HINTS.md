# Introduction

Content routing maps a CID to one or more *providers*, which specify locations where the CID can be fetched. 

In order to fetch content-addressed data, there must be *some* location addressing involved. With IPFS, the implicit default starting point is a set of bootstrap nodes. (And perhaps some LAN nodes discovered by mDNS, which has a starting point of the local subnet.)

So far, Kubo has planned to keep this “location addressing” implicit by adding new content routers to the default Kubo config (e.g. Filecoin indexers). But this only solves the problem for whatever specific records are provided by that indexer, and those set of implicit content routers have to be supported by the various implementations to maintain the facade of “pure content addressing”. There are also trust issues in terms of automatically sending user data to indexers that users have not explicitly trusted.

Instead of gateways and IPFS nodes implicitly sending all requests to a set of content routers that changes over time, and the community needing to reach consensus on what default routers to use, this proposes specifying that the default implicit content router is *only* the IFPS public DHT and LAN DHT, and all additional content routers must be opted-in by users when making API requests.

# Specification

The default implicit content router for IPFS nodes is the IPFS public DHT and LAN DHT. Any additional content routers must be opted-in by users when making API requests.

Users may opt-in to additional content routers using “content routing hints”, which give *suggestions* to the IPFS node about where provider records for the given CID may be found. This can include, but is not limited to, Reframe URLs, pubsub topics, multiaddrs, etc. As hints, the IPFS node is free to decide the order and strategy for using hints. If an IPFS node implements support for a hint that is specified below, it must follow the specification for that hint type.

When a node receives a request with content routing hints, it should search for provider records in the IPFS public DHT and at locations specified in the hints.

## Hint Types

Implementations are free to support hint types that make sense for their use cases.

### URI

- **Reframe**
    - HTTPS URL that ends with `/reframe` MUST be interpreted as a Reframe hint, for example:
        - [`https://cid.contact/reframe`](https://cid.contact/reframe)
        - [`https://routing.delegate.ipfs.io/reframe`](https://routing.delegate.ipfs.io/reframe)
- **Magnet links (TBD, for consideration)**
    - “De facto standard” outside IPFS: [https://en.wikipedia.org/wiki/Magnet_URI_scheme](https://en.wikipedia.org/wiki/Magnet_URI_scheme)
- **HTTP mirror  AKA Web seed (TBD, for consideration)**
    - We could speed up data transfer of leaf nodes by making HTTP range-requests to the provided HTTP URL.
    - Bit out there, but could provide additional flexibility, especially when a URL of a public gateway is used.

### Multiaddr (instant win)

Multiaddrs alone provide a very flexible solution for routing hints. They enable control over the number of additional  lookups that a client needs to make to reach the data:

- `/ip4/A.B.C.D/tcp/NNN/p2p/{peerID}`
    - Removes need for any lookups, can try to connect directly and start data transfer
- `/p2p/{PeerID}`
    - Saves 1 DHT lookup - we already know potential provider’s PeerID, only need to find their addresssed via `findpeer` (or similar)
        - On gateways this is highly cacheable
- `/dnsaddr/{domain}`
    - Requires resolving [DNSAddr TXT records](https://github.com/multiformats/multiaddr/blob/master/protocols/DNSADDR.md) on DNS, but allows big content storage services to scale / load-balance with ease, leverage DNS-based delegation to nodes that have data and are the closest
    - Could include fully resolved addresses, PeerIDs, or another DNSAddrs (with some sane recursion limit, could be the same as for resolving /ipns/ paths – 32)
    - Allows us to collapse a lot of complexity into a single DNS-based hint
        - 💡IDEA: we could implicitly check for DNSaddr on domains that have DNSLink
            - Opening `[https://dweb.link/ipns/en.wikipedia-on-ipfs.org](https://dweb.link/ipns/en.wikipedia-on-ipfs.org)` could make gateway implicitly check for DNSAddr for the domain at `_dnsaddr.en.wikipedia-on-ipfs.org` , that could have TXT records pointing at storage providers that have website data (TXT record `dnsaddr=/dnsaddr/storage-provider1.com`)
        - 💡IDEA:  Since we have a valid DNS name, we could also check if `{domain}` exposes Reframe endpoint at `/reframe`
            - This would create a pretty elegant convention where URL hint  is short (`/dnsaddr/service.com`, and at the same time allows for multiple types of  routing hints to be passed this way.

### PubSub Router Topic (future, TBD)

- This one is for the future, needs additional design analysis, but we already  have PoC for [IPNS over PubSub](https://github.com/ipfs/go-ipfs/blob/master/docs/experimental-features.md#ipns-pubsub) and a “Generic” router is implemented in https://github.com/libp2p/go-libp2p-pubsub-router
- We could  come up with an implicit or explicit protocol for joining a specific pubsub topic for   requested content.
    - The implicit topic name could be based on the root CID of the requested path (allowing peers browsing the same DAG to participate in the same topic)
    - This could happen even without `?providers=` being present, but needs analysis how feasible it is to do this by default.
- Even if this type of router is disabled by default, we could leverage the fact that `?providers=/dnsaddr/{domain}` is passed and create one.
    - Nodes could join a topic based on the DNS name from DNSaddr, allowing peers interested in the content from the same provider to exchange data directly over PubSub, skipping DHT or centralized Reframe endpoint.
- A variant of this that is especially powerful. s when browsing DNSLink website or IPNS name. Mutable pointer would ensure people having old and new version of

## Gateway Requests

We would add support for an optional `?providers=` URL parameter ([percent-encoded](https://en.wikipedia.org/wiki/Percent-encoding), comma-separated) or HTTP header `X-Ipfs-Providers` sent with HTTP request to a gateway.

- `/ipfs/{cid}?providers=url,multiaddr,somethingelse?`
    - Example:  `https://dweb.link/ipfs/bafy..acbd?providers=/dnsaddr/storage-provider1.com`
- `X-Ipfs-Providers: url,multiaddr,somethingelse`
    - Example:  `X-Ipfs-Providers: /dnsaddr/storage-provider1.com`
- Gateways will be free to leverage this hint to speed up content routing, or ignore it.
- Allows public gateways to load content from services that do not announce CIDs on DHT (e.g.,  Pinata).

## API Requests

We would add optional `--providers` parameter, that allows for passing as-hoc hints that are scoped to specific command. 

### Prior art

- [https://en.wikipedia.org/wiki/Magnet_URI_scheme](https://en.wikipedia.org/wiki/Magnet_URI_scheme)
    - DHT hash + optional list of HTTP URLs with trackers (~indexer’s reframe endpoints)
    - [routing.delegate.ipfs.io/reframe](http://routing.delegate.ipfs.io/reframe)
    - Example:
        
        ```jsx
        magnet:?xt=urn:ipfs:[IPFS_CID]
        &dn=file_name.mp4
        &x.ref=[REFRAME_URL_1]
        &x.ref=[REFRAME_URL_2]
        ```
        

- In IPFS  ecosystem
    - [Content routing hint via DNS records #6516](https://github.com/ipfs/kubo/issues/6516)
    - [Content routing hint via HTTP headers #6515](https://github.com/ipfs/kubo/issues/6515)
    - [https://discuss.ipfs.tech/t/proposal-peer-hint-uri-scheme/4649/21?u=lidel](https://discuss.ipfs.tech/t/proposal-peer-hint-uri-scheme/4649/21?u=lidel)
