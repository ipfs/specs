# IPIP 0000: IPNS Lagrange Replication

<!-- IPIP number will be assigned by an editor. When opening a pull request to
submit your IPIP, please use number 0000 and an abbreviated title in the filename,
`0000-draft-title-abbrev.md`. -->

- Start Date: 2022-08-12
- Related Issues:
  - https://github.com/ipfs/kubo/issues/1958
  - https://github.com/ipfs/kubo/issues/3117
  - https://github.com/ipfs/kubo/issues/4435
  - https://github.com/ipfs/kubo/issues/8542

## Summary

Implement a replication factor for IPNS records, which maintains the number of record holders above a threshold, to remove the need for IPNS record expiration while maintaining replay attack resistance.

## Motivation

IPNS record expiration is a major downside when using IPNS. If your node is offline for too long, the IPNS records will expire and the IPNS address won't be resolvable anymore, and because the records are signed other people can't maintain the record, however, expiration is needed to counter replay attacks. Unfortunately, making a new solution is challenging:

1. IPFS is a volatile network, nodes disappear and clear their caches fairly frequently, IPNS records will "expire" by themselves even without a set expiration date.
2. IPNS needs replay attack protection. Whatever replaces IPNS record's expiration needs to mitigate replay attacks at least mostly; the new system shouldn't have significantly worse security than the current one.

## Detailed design

**Lagrange Replication** is a system for maintaining a dynamic set of IPNS record holders, who will collectively keep the number of IPNS records above the highest threshold set amongst the nodes, so that the IPNS record owner does not need to remain online to periodically republish the IPNS record to the network. IPFS nodes will gain two new configuration options:

- The **Lagrange Threshold**: How many IPNS record holders need to exist before new record holders are searched for.
- The **Lagrange Timing**: How often to check for the current number of IPNS record holders.

To explain, here's an example scenario:

1. A random node decides to publish an IPNS record with the IPNS address `k51key`.
2. This record gets distributed to an initial set of record holders with PeerIDs `12D3KooWkay`, `12D3KooWkez`, and `12D3KooWbey`.
3. And now, the random node disappears forever; the IPNS record for `k51key` will never be updated again.
4. The goal for the remaining record holders is to keep the IPNS record for `k51key` available for as long as possible.

Here's what the three IPNS record holders will do:

1. Node `12D3KooWkay` has a threshold of *0*. This means the node will not maintain the number of record holders above a threshold, it does not participate in lagrange replication, this is somewhat analogous to the DHTClient routing option.
2. Let's say that eventually `12D3KooWkay` disappears as well, thus causing the following to happen.
3. Nodes `12D3KooWkez` and `12D3KooWbey` have thresholds of *1* and *2* respectively. They will periodically check the DHT, or via PubSub, the number of record holders (as determined by their timing values) and see that they are the only two record holders for `k51key`.
4. Node `12D3KooWkez` won't act because the number of record holders is above it's own threshold, however, `12D3KooWbey` will act because the threshold has been met or surpassed.
5. Node `12D3KooWbey` will search towards `k51key`, just as the random node would have when (re)publishing, and find new nodes who will be willing to hold the IPNS record for `k51key`.
6. Node `12D3KooWkab` is found (with threshold *2*), however, lagrange replication adds an additional step to the IPNS logic.
7. If the number of record holders is more than 150% (rounded up) of the threshold value, unless the value is *0* in which case it will use *k* as the "increased" value, then `12D3KooWkab` will refuse to hold the record in order to prevent over replication.
8. In this case, the current number of record holders is less than *3*, so `12D3KooWkab` agrees to hold the IPNS record for `k51key`. Now, the number of record holders is above the highest threshold used by this set of nodes.

*Note:* When trying to find the number of IPNS record holders, you only need to know if the number goes *over* the threshold; as soon as the threshold is surpassed you can stop searching.

## Design rationale

The threshold value does two things:

1. It provides a per-node configuration option so that more or less powerful devices can choose to maintain the IPNS record more or less actively.
2. Only nodes with the highest threshold values will act. The lower the threshold, the less likely it will be reached.

The timing value helps reduce the bandwidth consumption associated with checking the number of IPNS record holders.

The name **Lagrange Replication** is related to [lagrange points](https://en.wikipedia.org/wiki/Lagrange_points "Wikipedia page on Lagrange Points"); the idea of IPNS record holders appearing to "orbit" the IPNS address as if it had it's own "gravity".

### User benefit

Using lagrange replication, IPNS records are unlikely to disappear, even after extended periods of time without republishing, and will be more reliably accessible as a result.

### Compatibility

Since the IPNS record holders are the ones that choose to participate in lagrange replication, IPNS records published by old nodes can still be replicated by record holders that use this system (although old IPNS records will still expire).

IPNS-PubSub would be the most ideal for lagrange replication, record holders would form a mesh which makes checking the number of record holders easier, however, the DHT will work fine as well.

IPNS records won't have anything set for the expiration field, this may interfere with implementations which expect this field to be populated.

### Security

To prevent old IPNS records from being replicated, the optional 5th step stated in https://github.com/ipfs/specs/blob/main/naming/pubsub.md#protocol should be followed. This should make replay attacks difficult to execute.

IPNS V1 (Perhaps? Need clarification) records can contain inline CIDs, and Kubo specifically accepts arbitrary bytes for the `Value` field (See https://github.com/ipfs/specs/issues/273), so deliberately huge IPNS records could be distributed. IPNS V2 records explicitly don't have this problem as they have a max size of 10KiB (https://github.com/ipfs/specs/pull/319).

IPFS nodes **must** check the current number of record holders before accepting to hold the IPNS record. Without this check, a record holder with a high threshold value could over replicate an IPNS record.

### Alternatives

- Exponential back-off for lagrange timings.
- Replication factor as a product of total size, rather than the number of providers, so larger IPNS records are replicated less (e.g. Checking if the number of IPNS records distributed in the network would sum to more than 1MiB).

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
