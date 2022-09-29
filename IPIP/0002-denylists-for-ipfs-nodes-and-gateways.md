# IPIP 0002: Denylists for IPFS Nodes and Gateways

- Start Date: 2022-07-14
- Related Issues:
  - [ipfs/specs/issues/298](https://github.com/ipfs/specs/issues/298)

## Summary

This issue proposes a descriptive and maintainable denylist, leaving open the possibility of allowlists in the future. These can be used to help standardize content moderation for IPFS nodes and gateways.

## Motivation

The current [Bad Bit Denylist](https://badbits.dwebops.pub/denylist.json), which is a list of hashed CIDs, has multiple major drawbacks for implementation. One is lacking support for content path, it's hard to block an IPNS path only based on CIDs. The other is lacking description and status code response for each anchor. The description is especially for hashed blocking items, since the hashing is unidirectional, the description can outline the reason why it's been blocked thus increasing maintainability.

A well-thought-out denylist schema can ease the implementation of the denylist, and bring consensus on how content blocking works for gateway and node operators in the community.

## Detailed design


### Denylist Schema

Here is the proposed denylist and each field will be explained in detail later.

```js=
{
  action: "block",
  entries: [
    {
      type: "cid",
      content: "bafybeihfqymzmqhbutdd7i4mkq2ltzznzgoshi4r2pnv4hsc2acsojawoe",
      description: "ipfs quick start",
      status_code: 410
    },
    {
      type: "content_path",
      content: "/ipns/example.com",
      description: "example.com",
      status_code: 410
    },
    {
      type: "content_path",
      content: "/ipfs/bafybeihfqymzmqhbutdd7i4mkq2ltzznzgoshi4r2pnv4hsc2acsojawoe",
      description: "ipfs readme",
      status_code: 451
    },
    {
      type: "hashed_cid",
      content: "9056e0f9948c942c16af3564af56d4bb96b6203ad9ccd3425ec628bcd843cc39",
      description: "sensitive cid that needs to be blocked",
      status_code: 451
    },
    {
      type: "hashed_content_path",
      content: "65e60fcaa506ca5b0b49d7aa73df5ba32446bddb4e72a1f8bb5df12eaaaa8745",
      description: "sensitive content path that needs to be blocked",
      status_code: 410
    }
  ]
}
```

#### `action`

Though it's called `denylist`, the only allowed action field here is `block`. Other actions such as `allow` can be added in the future to enable allowlists or other types of content lists.


#### Each denylist entry

- `type`: specifies the type of the content should be blocked. E.g. `cid`, `hashed_content_path`.
- `content`: stores the content that should be blocked according to the type. It's suggested that all CIDv0 needs to be converted into CIDv1 to keep the consistency.
- `content_path`: the content path needs to be blocked).
- `description`: description of the CIDs or content paths.
- `status_code`: status code to be responded for the blocked content. E.g. [410 Gone](https://github.com/ipfs/specs/blob/main/http-gateways/PATH_GATEWAY.md#410-gone); [451 Unavailable For Legal Reasons](https://github.com/ipfs/specs/blob/main/http-gateways/PATH_GATEWAY.md#451-unavailable-for-legal-reasons) or `200 OK` for allowed entry.

**Side notes on `hashed_cids` & `hashed_content_paths` types**

The main difference between non-hashed entries and hashed ones is that the CIDs or content paths in the entry will be hashed and no plaintext is shown in the list. Following the [bad bits](https://badbits.dwebops.pub/), each CID or content path is `sha256()` hashed, so it's easy to determine one way but not the other. The hashed entries are designed to store sensitive blocking items and prevent creating an easily accessible list of sensitive content.

Before the hashing, all CIDv0 in both `cid` field and `content_path` fields are converted to CIDv1 for consistency.

## Design rationale

The gist of the rationale is tackling the inconveniences of blocking implementation when using [current denylist](https://badbits.dwebops.pub/denylist.json). Adding support for content path, description, status code and action can make the denylist more maintainable, extensible, and easier to implement. This is especially true when a list is maintained by multiple parties or needs to keep records for auditing.

Other minor design decisions, including CIDv1 normalization, allowing both plain text and hashed entries in one denylist, are also made to ease the implementation. It will force the consistency between multiple denylists that pave the way for wider adoption.

Denylists are important to empower gateway to make their own policy decisions. While gateway can access any IPFS content, they might decide to not serve it all. This could be for reputation concerns, for safety, or for internal reasons.


### Operation benefit

The proposed schema could ease the implementation of denylist for gateway and node operators. It supports both CID and content path and each entry has a customizable description and response status code.

The other operation benefit comes after the wide adoption of the proposed denylist, a new onboard gateway operator can use a shared to start a gateway right away.

### Compatibility

No existing implementations yet.

JSON format is used to maximize interoperability.  The intent is for IPFS implementations and services to standardize content filtering around this format for exchanging and storing allow and deny lists.

### Security

The following concern may not lie in this scope, but it is worth to be mentioned in this proposal. The blocking of CIDs which are not malicious and are widely used can potentially jeopardize the availability of multiple sites on that IPFS gateway. Possible examples include common images, javascript bundles, or stylesheets.

### Alternatives

[Bad Bits Denylist](https://badbits.dwebops.pub/) is focusing on blocking public flagged CIDs for IPFS node operators, the blocking mainly happens between the nodes.

[Denylist implementation of NFT.Storage](https://github.com/nftstorage/nft.storage/pull/1721/files) follows the above bad bits denylist format and creates [a separated denylist](https://github.com/nftstorage/nft.storage/pull/1721/files#diff-05dcde18c34b023574f6f073330869c633ee086a5a4917de2016d49e6044a3ee) for specific usage.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).