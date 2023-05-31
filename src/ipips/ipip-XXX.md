---
title: "IPIP-XXX: Delegated Routing Reader Privacy Upgrade"
date: 2023-05-31
ipip: ratified
editors:
  - name: Andrew Gillis
    github: gammazero
  - name: Ivan Schasny
    github: ischasny 
  - name: Masih Derkani
    github: masih
  - name: Will Scott
    github: willscott
order: XXX
tags: ['ipips']
---

## Summary

This IPIP specifies new HTTP API for Privacy Preserving Delegated Content Routing provider lookups.

## Motivation

IPFS is currently lacking of many privacy protections. One of its main weak points lies in the lack 
of privacy protections for the Content Routing subsystem. Currently neither Readers (clients accessing files) 
nor Writers (hosts storing and distributing content) have much privacy with regard to content they publish or 
consume. It is very easy for a Content Router or a Passive Observer to learn which file is requested by 
which client during the routing process, as the potential adversary easily learns about the requested `CID`. 
A curious actor could request the same `CID` and download the associated file to monitor the user’s behavior. 
This is obviously undesirable and has been for some time now a strong request from the community.

The latest upgrades to DHT and IPNI have introduced Double Hashing - a technique that aims to better preserve Reader Privacy. 
With Double Hashing in place Provider Records are encrypted and opaque to Content Routers. If presented with the original `CID` a
Content Router can decrypt the relevant Provider Records and serve them via the existing Delegated Routing API. 
However in order to benefit from the privacy enhancement users need to change the way they interact with the Content Routers, in particular:
- A second hash over the original `Multihash` must be used when looking up the content;
- Assembling a full Provider Record requires multiple roundtrips and / or local caching; 
- Assembling a full Provider Record must be done on the User's side and involves decryption operations.

This new way of interaction requires a different API. This IPIP does not deprecate the existing API but is rather an incremental improvement 
to it. The existing API can still be fullfilled over the encrypted dataset, which is not true the other way around. 

Writer Privacy is out of scope of this IPIP and is going to be addressed separately.

## Detailed design

See the Delegated Routing Reader Privacy Upgrade spec (:cite[http-routing-reader-privacy-v1]) included with this IPIP.

## Design rationale

This API proposal makes the following changes:
- Adds new methods for looking up Encrypted Provider Records and the associated Metadata;
- Defines Hashing and Encryption functions and response payloads structure.

There are no ideomatic changes to the API - all data formats, design rationales and principles outlined in the original [HTTP Delegated Routing IPIP](./ipip-0337.md) apply here. 

### User benefit

With the new API users can protect themselves from:
- a malicious actor spying on the user by observing the user to Content Router traffic and then downloading the same data;
- it will also be a first step towards fully private IPNI protocol that will eliminate indexers as centralised observers.

There are no other functional improvements.

### Compatibility

#### Backwards Compatibility

The new API will be implemented in [go-delegated-routing](https://github.com/ipfs/boxo/tree/main/routing/http) and will not introduce any breaking changes. 
The API will be released in a new minor version. 

### Resources

- [IPIP-272 (double hashed DHT)](https://github.com/ipfs/specs/pull/373/) 
- [ipni#5 (reader privacy in indexers)](https://github.com/ipni/specs/pull/5)

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
