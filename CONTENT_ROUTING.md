
# Problems

## Lack of abstraction

"Content routing" loosely refers to the mechanism that enables some nodes to advertise the data they have, and for other nodes to discover it, by a content identifier (CID). Currently content routing is not a unified software subsystem of IPFS, instead it is a workflow (involving using the DHT and other methods) that various applications (e.g. bitswap and graphsync) in need of content routing replicate individually and vary according to their need.

Remark: The IPFS codebase has an interface named `ContentRouting`. However, this is an interface to low-level DHT functions rather than to a wholistic content routing system as we describe here.

For instance, when bitswap fetches the contents of a CID, first it tries to find a provider using gossip-based queries to peering bitswap nodes and, if this fails, it tries to find a provider record in the DHT. This can be viewed as using two independent content-routing systems. Let's call them DHT-based and gossip-based, respectively. The DHT-based system has high latency and high success rate. Whereas the gossip-based system has lower-latency and lower success rate. To get the best of both, the DHT-based system is used as a fallback, should the gossip-based one fail.

Other applications, e.g. graphsync, also combine a DHT-based approach with application-specific approaches. Since the DHT-based approach is commonly used across applications, it could benefit from being abstracted into an independent system. Beyond benefitting from code reuse, a dedicated abstraction for DHT-based content routing would allow us to "intercept" (provide and fetch) requests and apply sophisticated caching/middleware logic akin to those utilized by HTTP CDN services. Furthermore, such logic would be transparent to applications and will enable cache sharing across applications.

## Quality-of-service for large trees

Current content routing protocols are fairly resource demanding. As a result, content trees — other than small ones — cannot be published entirely, leaving an unpredictable subset of cids unpublished.
On the other hand, judging from the history of early file-sharing systems, it appears to be the case
that individual users serving large content trees account for a majority of useful traffic.

In other words, we would like a typical individual IPFS user to be able to provide large content trees effectively.

So, why are large trees a problem? 

We use Wikipedia as a running example, using some relevant metrics reported on [Wikipedia infrastructure, circa 2008](https://www.datacenterknowledge.com/archives/2008/06/24/a-look-inside-wikipedias-infrastructure).

Wikipedia's content tree comprises 250M nodes across languages (18M for English), a fraction of which changes daily.

In the current IPFS approach, a user advertises content by eagerly publishing provider records
for all nodes in the content tree. This can be done in parallel using one or more threads.

A single thread can publish about 720 provider records per day, as it consumes about 2 minutes per publish. To publish the whole Wikipedia tree in one day, one would need 350K threads executing in parallel. Each published record has a TTL of 1 day. Therefore each tree node has to be republished within 1 day of its previous publication, if it is to be discoverable on the network.

Maintaining 350K threads can be expensive. Assuming a typical server IPFS node (TODO: check Hydra or gateway metrics) can handle 10K threads, it would take 35 server machines to advertise the Wikipedia tree.

This approach of "eagerly" publishing provider records for all tree nodes can be undesirable for a few reasons:

- It is relatively expensive to provide Wikipedia on IPFS. While a typical single server IPFS user can store a snapshot of Wikipedia, they could not advertise it. Thus there is gap between space on the one hand, and compute and bandwidth on the other.

- Eager publication wastes network resources. In one study, half of Wikipedia articles are accessed less frequently than daily. In this case, for instance, at least half of published provider records will not be looked up within their TTL. To make this issue somewhat bigger, note that provider records for intermediate tree nodes are only used when the application resolves CID-only URLs (pointing directly at a tree node). However, some portion of application URLs will be root-relative CID paths (a CID pointing at the tree root and a path leading to the intermediate node). These URLs will lookup the root CID provider, and thus will not utilize provider records for an intermediate node.

- Advertising content should not require resources that grow proportionally with the size of the content. Historically, in file-sharing systems (based on a centralized web index and Bittorent downloads) it has been common for individual end-users to be the only source for large static collections of unique files. E.g. a user might share a large library of legacy or otherwise commercially unavailable media content. Such users are essential as they provide the fat tail of content, which is usually half (or more) of all shared content. These tail users would be obstructed from sharing on IPFS due to the oversized upfront cost of advertising their content.

## Missing metrics

IPFS is currently lacking sufficient metrics to let us accurately estimate the quality of content routing and the supply and demand for content itself.

This section lists a few metrics that would give us a better understanding of content routing dynamics and performance. We are lacking these metrics in part because content routing currently spans multiple systems and applications (the DHT, bitswap, graphsync) which makes it hard to maintain unified metrics.

Once content routing is encapsulated in a dedicated system, we should be able to extract a large number of detailed metrics with relative ease, perhaps by using the generic event-based approach used in the DHT.

Metrics that enable understanding the quality of content routing:
* Number of successful/failed provider record publish operations
* Number of successful/failed provider record lookup operations
* Distribution of the number of times a published provider record is returned as a result of a lookup operation

Metrics that enable tuning the content routing algorithms proposed here:
* What is the typical size of an intermediate content block? An intermediate block is one that corresponds to a directory: It contains links to child block nodes (file or directories) and is not a file.
* How many intermediate blocks does a typical user fetch per day?

Metrics specific to the algorithm proposed here:
* Distribution of number of backtracking steps before a providers are found

# Solution

Here we are going to propose a conent routing approach which is in sharp contrast to "eager providing" (the current approach).
The new approach could well be dubbed "lazy providing". The two approaches have strengths and weaknesses
in different regimes and thus an optimal solution would be a blend of the two. Blending will be 
discussed in a later section. Now we describe the lazy providing approach and compare it with eager providing.

## Content routing interface

To set the stage, we begin by defining the abstract interface that content routing provides to applications:

     provide(tree):
          provide advertises to the network that this peer is serving the content of the given IPLD tree,
          e.g. specified by its root cid.
     resolve(cid, path) -> cid:
          resolve returns all peers in the network that can provide the content for cid/path.
     fetch(cid) -> block:
          fetch downloads the contents of cid from available providers.

Note, we have chosen to define _provide_ as an operation over trees, rather than one over individual blocks.
In other words, applications can request to provide entire trees, not individual blocks.
This is not to say that IPFS nodes cannot provide individual blocks at the protocol level, rather that such
behavior belongs as part of the content-routing implementation and should be transparent to applications.
Furthermore, the proposed interface is sufficient to port bitswap and graphsync without compromises in functionality.

To implement this application-facing interface, we are going to need the following
routines, which are internal to the content routing implementation:

     find_parent(cid) -> list of cids:
          find_parent returns known parent cids for the given cid
     backtracking_fetch(look_at_cid, look_for_cid) -> content block:
          backtracking_fetch fetches the content of look_for_cid, by attempting to find it
          first at providers for look_at_cid and then at providers for the parents of look_at_cid, and so on.

## Lazy content routing

The idea behind the design of lazy routing comes from the observation that
current (eager) routing ignores content structure altogether. Indeed, eager
routing does the exact same thing whether the user provides a tree of 100 content nodes,
or 100 singleton content nodes. In both cases, each node is published to the DHT individually.

Throwing away content structure is wasteful. As we'll see, the "backtracking" algorithm
proposed below allows one to discover alternate content trees containing some content
of interest, and hence more providers.

We now turn our attention to the implementation of the content routing interface, and
also comment on how it differs from eager routing (the current approach).

     provide(tree):
          (*) Publish a provider record for the root cid of tree _alone_,
          once per provider record TTL period, repeatedly for as long as the application desires to provide the tree.

In contrast, eagerly providing (the current approach) entails trying to publish _all_ tree nodes per TTL period.

     resolve(cid, path) -> cid:
          (*) If path is empty, there is nothing to resolve. Return cid.
          (*) Otherwise, the path has the form first_part/path_remainder.
               (*) Fetch the content for cid, using fetch(cid).
                    (*) If the block is not found, abort.
                    (*) Otherwise:
                         (*) Extract the child_cid corresponding to first_part from the fetched cid content.
                         (ReProvideBlock) Additively publish the hint child_cid->cid (saying "child_cid is parented by cid") to the DHT
                         each TTL period, for as long as the content of cid is in the local block cache introduced in (Cache), below.
                         (*) Recurse using child_cid and the remaining path: Return resolve(child_cid, path_remainder)

We use the term "additively publish" to emphasize that newly published provider records are added to any
already published records for the same key.

     fetch(cid) -> content block:
          (*) return backtracking_fetch(cid, cid)

     backtracking_fetch(look_at_cid, look_for_cid) -> content block:
          (*) Fetch provider records for look_at_cid from the DHT:
               (*) If no records found, go to (backtrack).
               (*) Otherwise, contact providers for look_at_cid and try fetching the block of look_for_cid.
                    (*) If successful:
                         (Cache) Place the fetched block in a local, persistent LRU cache of fixed size.
                         (ReProvideParent) For as long as a block is in the local cache, on each TTL period:
                         Additively publish to the DHT a provider record for the cid listing oneself as a provider.
                         (*) Return the fetched block.
                    (*) Otherwise, goto (backtrack).
          (backtrack) Use find_parent to find the known parent cids of look_at_cid.
               (*) If no records found, abort.
               (*) Otherwise, for each parent of look_at_cid, execute in parallel:
                    backtracking_fetch(parent, look_for_cid).
               (*) Return the first result returned, otherwise abort.

For comparison, note that steps (ReProvideBlock) and (ReProvideParent) are not present in eager resolution.
Step (ReProvideBlock) has the effect of "lazily" creating provider records for cid's as that are being used.
Step (ReProvideParent) enables find_parent (described below), which is necessary to guarantee that
yet-not-cached content is still discoverable (using backtracking_fetch).

     find_parent(cid) -> list of cids:
          (*) Lookup provider records for the child_cid in the DHT.
               (*) If no record found, abort.
               (*) Otherwise, if the provider record contains parent (hint) information, return it.

## Analysis

Right off the bat the implementation of _provide_ ensures that every node can provide any size content tree for any duration of time. The burden of proof lies on the retrieving side.

For soundness, we need to confirm:
- [S] If there is a live provider for a tree of content, then others will be able to fetch a CID pointing at any part of the tree.

For efficiency and scalability of the provider:
- [P] The number of block fetches served by a content provider (per provided content block) _does not_ grow proportionally to the block's popularity.
- [R] The amount of work required by a retrieving node is proportional to the amount of content retrieved.

### Soundness

Suppose cid QUERY is a descendant of cid ROOT and the tree rooted at ROOT is provided by a PROVIDER node. We want to characterize when a user invokation of _fetch(QUERY)_ will succeed.

If QUERY=ROOT, fetching succeeds trivially, because ROOT is provided by PROVIDER by definition.

Otherwise, QUERY is a strict descendant of ROOT. In this case, fetching will succeed if two conditions are met:
     
1. The user's invocation of _fetch(QUERY)_ is preceeded either by a successful call to _fetch(QUERY)_ or a successful call to _resolve(CID, PATH)_, such that QUERY is present along the path CID/PATH. The preceding call can be initated by any IPFS node.
2. The content block retrieved by the preceding call in question is still in the local cache of the caller.

These conditions are sufficient, as _fetch_ and _resolve_ cache every block they receive, and furthermore any block present in a node's cache is provided for as long as it has not been evicted from its fixed-size cache.

Content which is frequently accessed will meet both conditions. How frequent is sufficient? For a block to be discoverable, it must still be present in the local cache of at least one node. Thus the duration of a block's discoverability is dependent on the LIFETIME of a block within local cache. The lifetime is determined by (i) the cache size and (ii) the rate at which the node inserts new blocks in the cache (which is also the rate at which old blocks are evicted).

Quantities (i) and (ii) are not currently known to us, and we have thus listed them in 
the section on missing metrics for future collection. Nevertheless, one can make
a qualitative argument that a typical block lifetime within a local cache is large:
* We are only interested in the lifetime of intermediate IPLD blocks, which tend to be small in size as they only contain links to child nodes. Hence a large number of them can be retained. (This observation motivates an optimization, described later, which proposes the use of separate caches for small and large blocks).
* The rate at which intermediate blocks are fetched by any given node is typically bounded by the rate at which the file content (which is much larger in size) they lead to can be downloaded. 

To summarize, content that is accessed more frequently than LIFETIME is discoverable. All other content is not discoverable using lazy resolution.

Note that such undiscoverable content is present in the (current) eager routing approach as well.
The difference is that in the current approach the set of undiscoverable content is unpredictable, as it comprises all nodes that failed to be provided due to resource limitations.

In contrast, lazy routing "occludes" a specific set of nodes: the long tail of infrequent use.
This enables us to provide a mechanism for addressing these cases, which is described in a following section on blending.

### Blending eager routing for tail content

This section describes a mechanism for ensuring that non-root infrequently accessed content blocks
can be discovered, filling the gap left by lazy routing.

We begin by noting that a resolution request for a non-root cid cannot be made until
a user is aware of the cid, which can happen in one of two ways:
* Either the content provider disseminates the cid to users out-of-band (outside of IPFS)
* Or a user "browses" to the cid, starting from a root cid and resolving links along the path to the cid.

In the first case, it is the provider's responsibility to explicitly "advise" IPFS that the disseminated cids should be provided individually. This can be accomplished simply
by invoking _provide(cid)_ for each such cid, in addition to the implied _provide(root)_.

In the second case, browsing to a cid leaves a "footprint" with the root provider.
The root provider knows that a descendant cid was fetched once and then never again for longer than LIFETIME. For such cids the provider can check whether no other providers exist by attempting to resolve the cid. If this is the case, the provider has the choice to explicitly provide the cid,
as above, by calling _provide(cid)_.

We expect that resorting to explicit (aka eager) providing only for cases of low frequency
content is more resource efficient than eagerly providing all content.

### Provider efficiency and benefits from backtracking

The backtracking algorithm was designed to ensure that a retrieving node can
discover the ancestors of a cid. This is useful in two situations:
* When the cid itself is not provided in the DHT, the peers providing its ancestors are likely going to be able to provide the cid as well,
* When the cid is part of multiple trees, backtracking will discover ancestors from all trees and thereby supply a larger variery of available providers.

When retrieving content, backtracking ensures that ancestors are contacted in reverse order: starting from the cid and recursively going up towards the root. This strategy protects the provider of the root node from serving requests for descendant nodes, unless the desired cid is not served by anyone else. This ensures condition [P] holds.

### Retriever efficiency

For each cid that is successfully fetched by a user, the user becomes responsible for providing the cid for as long as it lives in its cache (which is of fixed size). Thus, regardless of the number of blocks fetched, a user is responsible for providing a small fixed number of blocks. Amortizing this responsibility across all blocks fetched by the user ensures condition [R] holds.

## Optimizations

Step (Cache) introduces a fixed-size cache for content blocks, based on an LRU policy.

In practice, there are two types of content blocks:
* "intermediate" blocks correspond to intermediate IPLD tree nodes; they contain cid links to child nodes and are thus generally smaller than data blocks,
* "data" blocks correspond to leaf IPLD tree nodes; they contain file data blocks and are generally larger.

The two types differ not only in typical size, but also in access pattern. It may thus be a worthwhile optimization to maintain separate caches for each type. This is to ensure that
caching one large block does not displace a large number of small intermediate blocks,
which have higher value for content-routing.

## Applications

### Content delivery: bitswap and graphsync integration

bitswap and graphsync are the main current users of content routing. Integration with the new content routing API should be straightforward, as the new API has the same corresponding methods as the currently utilized low-level API for publishing to the DHT and finding records.

### Content discovery, ranking and recommendation

As a consequence of lazy routing, the following information becomes available via provider records:
* The exact current popularity of a cid, which is reflected in the number of providers for it. In contrast, eager routing results in provider records that do not directly reflect the cid popularity.
* The set of users identities (IPFS nodes) interested in (i.e. providing) a cid.
* The relationships between content nodes, e.g. if two cids share a child they can be viewed as "related".

This set of data is sufficient for implementing standard content discovery algorithms:
* Recommendation (e.g. collaborative filtering)
* Ranking (e.g. PageRank)
