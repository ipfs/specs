# Addressing on the Decentralized Web

> Note: This document is work in progress and largely incomplete.

Authors:
- Lars Gierth \<lgierth@ipfs.io>
- Your Name Here \<your@name.here>

Table of contents:
- Introduction
- Terminology
- The precarious Web
  - The addressing rift
  - Link competition and link rot
- DWeb Addressing
- Namespaces
  - /dat -- append-only filesystems
  - /ipfs -- immutable filesystem
  - /ipns -- mutable names
  - /ipld -- immutable linked data
  - /ssb --
  - Addressing other content-addressed systems
  - Network addressing
- Interoperability
  - dweb: URI scheme
  - URL schemes
  - HTTP-to-DWeb gateways
  - Content Security Policy / Origins
- Appendix
  - DWeb Maturity Model
  - FAQ
  - Implementations
  - Future Work
  - Related work


## Introduction

> Distributed hypertext is still in its infancy; be patient... (or better yet,
> keep contributing ideas and criticisms).
>
> -- WWW-Talk mailing list, May 1993

In this document we introduce DWeb Addresses: a new interoperable scheme for
addressing data in a shared, cryptography-defined namespace, which aims to make
the Web more cooperative, resilient, and flexible.

It is our strong belief that in order to achieve good interoperability among
systems and productive collaboration among projects, there needs to be room for
disagreement and ambiguity. DWeb Addresses are a means to avoiding the
inevitable bikeshedding of encodings, hash algorithms, data structures, etc. pp.
as well as the fragmentation that usually follows along.

Cryptography-defined protocols defy location-addressing:

Although DWeb Addresses originate from the IPFS community, they aim to be
interoperable with all content-addressed data storage and exchange systems.

We show how location-addressing and a lack of mature cryptographic primitives in
the Web's early days contribute to a condition that we conclude is precarious.

We also introduce three mechanisms for interoperability

---

We show how URLs have contributed to a fragmented addressing space, how they
hamper protocol innovation, and how they artificially limit our networking
abilities. We also demonstrate the centralizing character of location-based
addressing, how it lets links rot, and how it drives copies of data into mutual
competition.
- why a shared namespace is great (dweb:/)
- why encapsulation is great (multiaddr)

We then describe a content-based addressing model which provides permanent links
that don't rot, are portable, and are cryptographically verifiable.
- location-addressing phasing out in favor of content addressing and key addressing


## Terminology

To avoid confusion, we'll clarify a few terms used throughout this document.
We don't claim these are absolute truths -- they're only what we mean when
using them here.

When talking about properties of specific networked systems, a figure from
Paul Baran's publication "TODO" is often referenced. With simple diagrams,
it illustrates the basic structure of networks that are centralized,
decentralized, or distributed.
- https://www.researchgate.net/profile/Jason_Hoelscher/publication/260480880/figure/fig1/AS:297257619476480@1447883147178/Figure-1-Centralized-decentralized-and-distributed-network-models-by-Paul-Baran-1964.png
- meaning nowadays:
  - Federated = Decentralized
  - Peer-to-peer = Distributed
  - Decentralized = opposed to a centralized internet of monopolies

**Cryptography-defined** -- Addressing and naming mechanisms that derive names
and identifiers by means of cryptographic algorithms. This includes:
- Content Addressing, which derives immutable identifiers. It runs a
  cryptographic hash function (e.g. SHA256, Blake2b) over the data, and uses
  the output as an identifier for said data. Data received from an untrusted
  network participant can be verified using its identifier (or simply "hash")
  Examples of Content Addressing are the `/ipfs` and `/ipld` namespaces
  (sections 5.1 and 5.3).
- Key Addressing, which derives mutable names using public key cryptography.
  The public key's hash is used as the name, and the public key itself is used
  to sign "records" containing the hash of the latest version of the data, plus
  usually some means of causality (e.g. a timestamp or counter), and sometimes
  hashes of previous versions. Examples of Key Addressing are the `/dat` and
  `/ipns` namespaces (sections 5.4 and 5.2).

**URL** -- When talking about URLs, we mean the living standard maintained by
WHATWG, which is what implementations in all major web browser are based on.
For what it's worth, we regard RFC 3986 (the first URL specification) as a
historic document.

**URI** --


## The precarious Web

- walled gardens, facebook you-are-now-leaving-the-facebook-sector warnings, free basics
- many kinds of fragmentation on many layers [slate], we'll discuss specific kinds
- content that falls off the internet (domain owner change, link structure change, acquisition, censorship)
- content that has copies in many locations, which are all hidden in favor of the original address
- lack of content integrity
- lack of a concept of changing content. it changes regardless.

- ownership
  - location-addressing gives control over data to those entities who already have enough resources for server + bandwidth + domain + certificates
    - control its liveness through hosting it (whether it's allowed to continue to exist and be available)
      - and through not being able to address replicated copies in the network
    - control its truth, by controlling the request path
  - location-addressing ties linked content to only to one entity, but also to exactly one transport mechanism
    - this is part of the addressing rift
    - huge liability of not being able to upgrade and mix transports

- history of the url shows you have only very small window (~2yrs) for fundamental changes



### Link competition and link rot

> In 1996 Keith Shafer and several others proposed a solution to the problem of
> broken URLs. [The link][shafer] to this solution is now broken. Roy Fielding
> posted an implementation suggestion in July of 1995. [The link][fielding] is
> now broken.
>
> -- [The History of the URL, Zack Bloom][bloom]

- borrow from matt https://github.com/ipfs/blog/pull/117
- geocities
- large datasets
  - especially those that are already endangered :(
- figure out how large to quote lol https://eager.io/blog/the-history-of-the-url-path-fragment-query-auth/



### The addressing rift

> Many protocols and systems for document search and retrieval are
> currently in use, and many more protocols or refinements of existing
> protocols are to be expected in a field whose expansion is explosive.
>
> -- [Universal Document Identifiers on the Network, February 1992][osi-ds29]

[osi-ds29]: https://www.w3.org/Protocols/old/osi-ds-29-00.txt

- location-addressing doesn't just

the rift web (uri) vs. os (fs) vs. databases (sql)
- plan9 everything-is-a-file is nice
- fuse is nice
- ipfs aims to reunite fs and web

- example of the rift
- example of what we're missing out on currently

- if we had URIs instead of multiaddr
- p2p+tcp://bootstrap.libp2p.io/QmFoo
  1. it doesn't fit the resource-on-server model
  2. there's too many protocol combinations to have one URI scheme for each
- church of context vs. church of self-description


## DWeb Addressing

At the heart of this proposal lies the desire to decouple data from its network location.

- great quote in http://1997.webhistory.org/www.lists/www-talk.1993q2/0234.html
- tons of great things in https://eager.io/blog/the-history-of-the-url-path-fragment-query-auth/

- hourglass model
- osi model
- need a data thin waist (=> ipld) in addition to network thin waist
  - why again?


## Namespaces

- syntax
- local filesystem examples


### /ipfs -- immutable data

- cid
- unixfs
- ipld

- example: expose only /ipfs to a container


### /ipns -- mutable names

- ipns
- dnslink
- proquint


### Integration with other content-addressed systems

- want to collaborate with all groups working on content-addressed stuff
- how /ipfs and /ipfs fit in with other-type schemes in one universal namespace

- /git /eth /btc /zcash /torrent
- /dat
- /ob

- mention /ipld?
- mention /did? probably not yet (@jonnycrunch)
- mention /iptf? probably not yet
- don't mention: Historic namespaces: /dns


### Network addressing

- reiterate why we decouple content from location
- thanks to the same location-addressing problems, we also can't properly addressing network endpoints
- show multiaddr


## Interoperability

- explain concept of upgrade path


### DWeb Addressing with HTTP

- gateway semantics
  - caching
  - directory redirect
  - directory index
  - custom 404
  - writable gateway
- CSP: quasi-browser vs. subdomains
- suborigins


### ipfs:// and ipns:// URL schemes

- syntax
- security model
- base32 conversions


### dweb: URI scheme

We're not trying to bring in all the possible sources of data, or interfaces, etc.
We only work on content-addressed stuff here.
But we do think paths are the better canonical address and that
all kinds of things with different semantics can live in a shared universal namespace.


### Content Security Policy / Origins

Pluggable origins? would make this a bit easier. suborigins step in right direction

How to detect and intercept http-to-ipfs URLs in documents
- Simply /ipfs/* and /ipns/*?
- $hash.ipfs.somedomain ?
- could have links in document to //qmfoo.ipfs.dweb.link (http://) and //qmfoo (ipfs://)


## Appendix


### Related work

- IPFS: peer-to-peer hypermedia protocol
- IPLD: data model of the content-addressable web
- dnslink: human-readable IPNS names
- beaker
- html content integrity


### FAQ

But Lars, why path namespaces and a dweb: URI scheme, why not just only ipfs:// and ipns://?
- These URLs satisfy the content-addressing requirement
- They don't satisfy the universal-data-namespace requirement
- We want to leave room for others in this new addressing scheme

But Lars, you can achieve all this realtime/replication/verification stuff with existing tools and protocols!
- Sure, but these setups would be on an individual basis, brittle, and even more fragmented
- What we're missing is a protocol that is built around these core requirements

How does content-addressing fit with existing schemes of identifiers and universal names?
- The short hort answeris to use Stable names (ie. DOIs) that map to content-addresses (content-hashes of the current values).
- Of course, this quickly invokes the need for an entire layer of metadata mapping between stable names and the many versions, derivatives, and sub-parts of a named entity.
- For an example of the sprawling metadata space this invokes, see the [Portland Common Data Model (PCDM)](https://github.com/duraspace/pcdm/wiki).


### Implementations

- ipfs-companion
- dweb.link / ipfs.io / go-ipfs-gateway
- git-remote-ipld
- go-ipfs and js-ipfs


### DWeb Maturity Model

To describe the various degrees of usage of DWeb Addressing, we propose a maturity model
that breaks down the principal elements of a DWeb approach into three steps
(in spirit of the [Richardson Maturity Model](https://www.martinfowler.com/articles/richardsonMaturityModel.html)).

- Level 0: Publish Hashes for the data you hold. If you are an authoritative source for those data, sign the hashes using public key cryptography so that anyone can confirm the authenticity of the data. (examples: gx, ???, docker images?)
- Level 1: Provide a web-based API that allows people to retrieve content by its hash (github, gitlab, bitbucket, etc)
- Level 2: The data are available over P2P protocols, meaning peers can use P2P protocols to retrieve content by its hash.
- Level 3: When you reference data, reference it by Hash.
- taken from https://github.com/datatogether/datatogether/pull/7


### Future work

- security model
- ipfs:// and ipns:// protocol handlers in browsers
- dweb: protocol handler in browsers
- figuring out how multiaddrs fit into the dweb namespace
- improvements to the fuse client
- improvements to the gateway
- dapps :)

