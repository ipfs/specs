# IPIP-0388: Routing v1 Multiple Routers

<!-- IPIP number should  match its pull request number. After you open a PR,
please update title and include an abbreviated title in the filename too:
`0000-draft-title-abbrev.md`. -->

- Start Date: 2023-03-20
- Related Issues:
  - (add links here)

## Summary

Adding support for querying individual routers to a single Routing v1 HTTP endpoint.

## Motivation

At the moment there is no way for a Routing v1 client to ask for a specific routing backend to be used nor for a Routing v1 endpoint to signal what routing backends they support. When Routing v1 is used as a proxy for one or more routing systems (e.g. IPFS Public DHT, IPNI, mainlineDHT, ...) clients may want to be able to judge a given endpoint's suitability to be a proxy for that routing system.

For instance if all-the-routers.alice.tld is very good at proxying IPNI requests but bad at proxying IPFS Public DHT requests, but dht-proxy.bob.tld is good at proxying IPFS Public DHT requests. In this scenario clients wanting good responses would have to ask both Alice and Bob to do DHT lookups for them even though Alice's DHT lookups are unneccessary because Bob is doing them. Similarly, clients could evaluate the best endpoint to request responses from since they can now do comparisons between largely equivalent routing systems. Additionally, this allows clients to discover the data sources behind Routing v1 endpoints without as much out of band information.

## Detailed design

AKA Solution Proposal

The proposal is to:
1. Add a `?routing=<list-of-routers>` optional parameter to `GET /routing/v1/providers/{CID}` that indicates which routing systems to use
2. Add an `OPTIONS /routing/v1/providers` endpoint which when queried may respond with a `Ipfs-Supported-Routers` HTTP  header, with the value as the comma separated list of the routing systems supported

## Design rationale

The rationale fleshes out the specification by describing what motivated
the design and why particular design decisions were made.

Provide evidence of rough consensus and working code within the community,
and discuss important objections or concerns raised during discussion.

### User benefit

End users will be able to query endpoints that provide proxies for multiple routing systems (e.g. cid.contact/routing/v1) and get back DHT, IPNI or both depending on what they need.

For users that are running a DHT client locally they can dynamically evaluate if cid.contact's DHT proxy is either good enough that they can conserve their local resources by reducing how they use their client. Similarly, if they discover that their local DHT results are better than cid.contact's DHT proxy then they can ease the burden on cid.contact by only requesting IPNI results and doing the DHT lookups themselves.

### Compatibility

This should not effect existing clients or servers

### Security

Mostly not applicable. However, clients should not expect proxies to give 1:1 mappings with the underlying systems if they are too expensive and should consider that when evaluating the performance of individual endpoints.

### Alternatives

- Having clients fetch from multiple sources which may have overlapping data -> lots of work on servers and extra processing work for clients
- Having clients fetch from a single source with the best data -> is not friendly to the introduction of new services and may result in less data being retrieved
- Having servers restrict to one endpoint per router (e.g. dht.alice.tld and ipni.alice.tld or alice.tld/dht/routing/v1 and alice.tld/ipni/routing/v1) -> also doable, but discoverability of new router types would require other semantics (e.g. an OPTIONS request to alice.tld/routing/v1)
- Having `OPTIONS` on `/routing/v1` instead of `/routing/v1/providers` -> also good, perhaps a better choice. given that not every router will support every request type there's a tradeoff around how low level you put the `OPTIONS`. In theory both could be supported.
- Having `OPTIONS` on `/routing/v1/providers/{CID}` in the event the CID tells you some information about which providers to use (e.g. for non-BitTorrent codecs don't use mainline DHT) -> also doable. Unclear if this would be useful in practice since sometimes the codec information will get lost (e.g. replaced with the raw/0x55 codec).

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
