---
title: IPFS Principles
description: >
  IPFS is a suite of specifications and tools that are defined by two key characteristics: content-addressing and
  transport-agnosticity. This document provides context and details about these characteristics. In doing so it defines what
  is or is not an IPFS implementation.
date: 2023-03-28
maturity: reliable
editors:
  - name: Robin Berjon
    email: robin@berjon.com
    url: https://berjon.com/
    github: darobin
    twitter: robinberjon
    mastodon: "@robin@mastodon.social"
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
tags: ['architecture']
order: 0
---

The IPFS stack is a suite of specifications and tools that share two key characteristics:

1. Data is addressed by its contents using an extensible verifiability mechanism, and
2. Data is moved in ways that are tolerant of arbitrary transport methods.

This document provides context and details about these characteristics. In doing so it defines
what is or is not an IPFS implementation. This is a **living document**; it is expected to
change over time as we define more of the principles that guide the architecture of IPFS or
find clearer ways of describing those we have already defined.

## Addressing

The web's early designers conceived it as a universal space in which identifiers map to
information resources. As the web grew, they enshrined in
[web architecture](https://www.w3.org/TR/webarch/#identification) that all resources
should have an identifier and
defined "addressability" as meaning that
"[*a URI alone is sufficient for an agent to carry out a particular type of interaction.*](https://www.w3.org/2001/tag/doc/whenToUseGet.html#uris)" (:cite[webarch])

This design is tremendously successful. For all its flaws, the web brings together a
huge diversity of software, services, and resources under universal addressability.

Unfortunately, HTTP addressability is based on a hierarchy of authorities that places
resources under the control of a host and places hosts under the control of the DNS system
(further issues with this model are discussed further in the Appendix). As indicated
in :cite[RFC3986]:

> Many URI schemes include a hierarchical element for a naming
> authority so that governance of the name space defined by the
> remainder of the URI is delegated to that authority (which may, in
> turn, delegate it further).

[CIDs](https://github.com/multiformats/cid) in IPFS offer an improvement over HTTP URLs by
maintaining universal addressability while eliminating the attack vectors inherent in
hierarchical authority. Content addressability derives identifiers from the content of
an information resource, such that any party can both mint the identifier and verify
that it maps to the right resource. This eliminates the need for any authority outside
of the resource itself to certify its content. It makes CIDs the universal
self-certifying addressability component of the web.

Addressing data using [CIDs](https://github.com/multiformats/cid) is the first defining
characteristic of IPFS. And the second characteristic, transport-agnosticity, can be
supported thanks to the verifiability that CIDs offer. Across a vast diversity of implementations,
architectures, and services, *IPFS is the space of resources that can be interacted with
over arbitrary transports using a CID*. As Juan Benet once put it,
"[*That's it!*](https://github.com/multiformats/cid/commit/ece08b40a6b1e9eeafc224e2757d8d1ef3317163#diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5R43)"

Conversely, any system that exposes interactions with resources based on CIDs is
an IPFS implementation. There are
[many contexts in which CIDs can be used for addressing](https://docs.ipfs.tech/how-to/address-ipfs-on-web/)
and [content routing delegation](https://github.com/ipfs/specs/blob/main/routing/ROUTING_V1_HTTP.md)
can support a wealth of interaction options by resolving CIDs.

## Robustness

Common wisdom about network protocol design is captured by *Postel's Law* or the
*Robustness Principle*. Over the years it has developed multiple formulations, but the
canonical one from :cite[RFC1958] ("*Architectural Principles of the Internet*") is:

> Be strict when sending and tolerant when receiving.

This principle is elegant, and expresses an intuitively pleasing behavior of protocol
implementations. However, over the years, the experience of internet and web protocol
designers has been that this principle can have detrimental effects on interoperability.
As discussed in the Internet Architecture Board's recent work on
[*Maintaining Robust Protocols*](https://datatracker.ietf.org/doc/html/draft-iab-protocol-maintenance),
implementations that silently accept faulty input can lead to interoperability defects
accumulating over time, leading the overall protocol ecosystem to decay.

There are two equilibrium points for protocol ecosystems: when deployed implementations
are strict, new implementations, out of necessity, are required to be strict as well, leading to a
strict ecosystem; conversely, when deployed implementations are tolerant, new
implementations will have a strong incentive to tolerate non-compliance so as to
interoperate. Tolerance is highly desirable for extensibility and adaptability to new
environments, but strictness is highly desirable to prevent a protocol ecosystem from
decaying into a complex collection of corner cases with poor or difficult
interoperability (what the IETF refers to as
"[virtuous intolerance](https://datatracker.ietf.org/doc/html/draft-iab-protocol-maintenance#name-virtuous-intolerance)").

IPFS approaches this problem space with a new iteration on the robustness principle:

> Be strict about the outcomes, be tolerant about the methods.

CIDs enforce strict outcomes because the mapping from address to content is verified;
there is no room for outcomes that deviate from the intent expressed in an address.
This strictness is complemented by a design that proactively expects change thanks to
a self-describing format (CIDs are a [multiformat](https://multiformats.io/) implementation and support
an open-ended list of hashes, codecs, etc.). The endpoints being enforceably strict means
that everything else, notably transport, can be tolerant. Being tolerant about methods
enables adaptability in how the protocol works, notably in how it can adapt to specific
environments, and in how intelligence can be applied at the endpoints in novel ways, while
being strict with outcomes guarantees that the result will be correct and interoperable.

Note that this approach to robustness also covers the
[End-to-end Principle](https://en.wikipedia.org/wiki/End-to-end_principle). The end-to-end
principle states that the reliability properties of a protocol have to be
supported at its endpoints and not in intermediary nodes. For instance, you can best guarantee
the confidentiality or authenticity of a message by encrypting or signing at one endpoint and
decrypting or verifying at the other rather than asking relaying nodes to implement local
protections. IPFS's aproach to robustness, via CIDs, is well aligned with that principle.

## IPFS Implementation Requirements

An :dfn[IPFS Implementation]:
- MUST support addressability using CIDs.
- MUST expose operations (eg. retrieval, provision, indexing) on resources using CIDs. The operations
  that an implementation may support is an open-ended set, but this requirement should cover any interaction
  which the implementation exposes to other IPFS implementations.
- MUST verify that the CIDs it resolves match the resources they address, at least when it
  has access to the resources' bytes. Implementations MAY relax this requirement in
  controlled environments in which it is possible to ascertain that verification has happened
  elsewhere in a trusted part of the system.
- SHOULD name all the important resources it exposes using CIDs. Determining which resources are
  important is a matter of judgment, but anything that another agent might legitimately wish to
  access is in scope, and it is best to err on the side of inclusion.
- SHOULD expose the logical units of data that structure a resource (eg. a CBOR document, a file or
  directory, a branch of a B-tree search index) using CIDs.
- SHOULD support incremental verifiability, notably so that it may process content of arbitrary sizes.
- MAY rely on any transport layer. The transport layer cannot dictate or constrain the way in which
  CIDs map to content.

## Boundary Examples

These IPFS principles are broad. This is by design because, like HTTP, IPFS supports an open-ended set of
use cases and is adaptable to a broad array of operating conditions. Considering cases
at the boundary may help develop an intuition for the limits that these principles draw.

### Other Content-Addressing Systems

CIDs are readily made compatible with other content-addressable systems, but this does not
entail that all content-addressable systems are part of IPFS. Git's SHA1 hashes aren't CIDs
but can be converted into CIDs by prefixing them with `f01781114`. Likewise, BitTorrent v2
uses multihashes in the `btmh:` scheme. BitTorrent addresses aren't CIDs, but can be
converted to CIDs by replacing `btmh:` with `f017b`.

The simplicity with which one can expose these existing system over IPFS by simply prefixing
existing addresses to mint CIDs enables radical interoperability with other content-addressable
systems.

### Verification Matters

The requirements above state that an implementation may forgo verification when "*it is
possible to ascertain that verification has happened elsewhere in a trusted part of the system.*"
This is intended as a strict requirement in which implementors take trustlessness seriously, an indication
that it's okay to not constantly spend cycles verifying hashes in an internal setup which you
have reasons to believe is trustworthy. This is *not* a licence to trust an arbitrary data
source just because you like them.

For instance:

- A JS code snippet that fetches data from an IPFS HTTP gateway without verifying it is not an
  IPFS implementation.
- An IPFS HTTP gateway that verifies the data that it is pulling from other IPFS implementations
  before serving it over HTTP is an IPFS implementation.
- That JS piece of code in the first bullet can be turned into an IPFS implementation if it
  fetches from a :cite[trustless-gateway] and verifies what it gets.

## Self-Certifying Addressability

:dfn[Authority] is control over a given domain of competence. :dfn[Naming authority] is
control over what resources are called.

:dfn[Addressability] is the property of a naming system such that its names are sufficient
for an agent to interact with the resources being named.

:dfn[Verifiability] is the property of a naming system such that an agent can certify that
the mapping between a name it uses and a resource it is interacting with is correct without
recourse to an authority other than itself and the resource.

:dfn[Self-certifying addressability] is the property of a naming system such that it is both
addressable and verifiable: any name is sufficient to interact with a resource, and its mapping
to that resource can be certified without recourse to additional authority. Self-certifying
addressability is a key component of a
[self-certifying web](https://jaygraber.medium.com/web3-is-self-certifying-9dad77fd8d81)
and it supports capture-resistance which can help mitigate against centralization.

CIDs support :ref[self-certifying addressability]. With CIDs, the authority to name a resource
resides only with that resource and derives directly from that resource's intrinsic
property: its content. This frees interactions with CID-named resources from the power
relation implicit in a client-server architecture. CIDs are the trust model of IPFS.

An implementation may retrieve a CID without verifying that the resource matches it, but that
loses the resource's naming authority. Such an implementation would be comparable to an HTTP
client looking DNS records up from a random person's resolver: it cannot guarantee that the
addressing is authoritative. Implementers may make informed decisions as to where in their
systems they support verification, but they should ensure that the mapping between CID and resource
is verified whenever they have access to both the resource and the CID that maps to it.

## Appendix: Historical Notes

We tend not to think about addressability because it is so foundational that we
struggle to apprehend a system without it, but that is precisely why it is important
that we get it right. You can find extensive historical evidence that TimBL and others saw
URLs as arguably the most fundamental invention of the Web, and the early groups that
worked on Web architecture discussed and debated the properties of URLs at length. The
problems of centralization we face today trace their lineage back to those decisions.

The hierarchical nature of the HTTP addresses was intentional, as TimBL wrote clearly in
[Web Architecture from 50,000 feet](https://www.w3.org/DesignIssues/Architecture.html):
> The HTTP space consists of two parts, one hierarchically delegated, for which the
> Domain Name System is used, and the second an opaque string whose significance is
> locally defined by the authority owning the domain name.

The model that the Web's earlier designers had in mind was a federated model
in which authority is delegated and addresses are *owned* based on that
authority delegation. This is notably clear in the *URI Ownership* passage of the
[*Architecture of the World Wide Web, Volume One*](https://www.w3.org/TR/webarch/#def-uri-ownership):
>URI ownership is a relation between a URI and a social entity, such as a person,
>organization, or specification. URI ownership gives the relevant social entity certain
>rights, including:
> * to pass on ownership of some or all owned URIs to another owner—delegation; and
> * to associate a resource with an owned URI—URI allocation.
>
> By social convention, URI ownership is delegated from the IANA URI scheme registry,
> itself a social entity, to IANA-registered URI scheme specifications.(…)
>
> The approach taken for the "http" URI scheme, for example, follows the pattern whereby
> the Internet community delegates authority, via the IANA URI scheme registry and the
> DNS, over a set of URIs with a common prefix to one particular owner. One consequence
> of this approach is the Web's heavy reliance on the central DNS registry.(…)
>
> URI owners are responsible for avoiding the assignment of equivalent URIs to multiple
> resources. Thus, if a URI scheme specification does provide for the delegation of
> individual or organized sets of URIs, it should take pains to ensure that ownership
> ultimately resides in the hands of a single social entity. Allowing multiple owners
> increases the likelihood of URI collisions.
>
> URI owners may organize or deploy infrastruture [sic] to ensure that representations of
> associated resources are available and, where appropriate, interaction with the resource
> is possible through the exchange of representations. There are social expectations for
> responsible representation management (§3.5) by URI owners. Additional social
> implications of URI ownership are not discussed here.

This notion of address or name ownership is
[pervasive across architectural documents](https://www.w3.org/DesignIssues/). This passage
from an interview of TimBL
([Philosophical Engineering and Ownerhip of URIs](https://www.w3.org/DesignIssues/PhilosophicalEngineering.html)) is explicit:
> **Alexandre Monnin**: Regarding names and URIs, a URI is not precisely a philosophical
> concept, it's an artifiact [sic]. So you can own a URI while you cannot own a philosophical
> name. The difference is entirely in this respect.\
> **Tim Berners-Lee**: For your definition of a philosophical name, you cannot own it.
> Maybe in your world, in your philosophy, you don't deal with names that are owned, but
> in the world we're talking about, names are owned.

This expectation of delegated naming authority was so strong among early Web architects
that the development of naming conventions in HTTP space (eg. `robots.txt`, `favicon.ico`,
all the `.well-known` paths) is described as "*expropriation*" in the
[Web Architecture](https://www.w3.org/TR/webarch/) and the W3C's Technical Architecture
Group (TAG) issue on the topic stated that it "breaks the web".

Federated models only have weak capture-resistance because the federated entities can always
concede power (precisely because they have ownership) but lack established means to
support collective organization. As a result, any power imbalance will likely become hard
to dislodge. A good example is search: as a publisher (the owner of delegated authority
over your domain) you can cede the rights to index your content but you can't have a voice
in what is done with the indexed content (individual opt out is not an option). This was
fine when you could barter content for links, but once search power consolidated, the
terms of trade deteriorated with no immediate recourse.

## Acknowledgements

Many thanks to the following people, listed alphabetically, whose feedback was instrumental
in producing this document:
Adin Schmahmann,
biglep,
Dietrich Ayala,
Juan Benet,
lidel,
Molly Mackinlay, and
mosh.
