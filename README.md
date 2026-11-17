# IPFS Specifications

**Don't read the specs here! Go to [specs.ipfs.tech](https://specs.ipfs.tech/), it's a much better experience!**

## Maintenance status

This repository is maintained in a low-activity mode. The specifications in it
describe a protocol stack that is deployed and stable. Most of them carry the
`stable` badge, which means they change only to fix errors or to clarify text,
and there is no team working on new specifications.

Proposals are still welcome. They go through the
[IPIP process](https://specs.ipfs.tech/meta/ipip-process/), which names the
current stewards and explains what to expect from review: there is no schedule,
and a proposal moves when it comes with working code and a reviewer who knows
the area.

## Documentation and Community

Looking for user support?

See [Documentation](https://docs.ipfs.tech),
[Discussion Forums](https://discuss.ipfs.tech/), and other
[Community Resources](https://docs.ipfs.tech/community/) instead.

## Spec maturity

Each specification carries a maturity badge in its header:

- ![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - Not yet a specification: an idea being written up ahead of a proposal. May change completely or disappear.
- ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - A specification being worked on. It should be implementable, but it is likely to change and implementers should expect to track it.
- ![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - Implemented and relied upon. May receive fixes and clarifications, but no breaking changes. A breaking change to a stable specification requires an IPIP.
- ![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) - No longer in use. Will not change; do not implement.

The badge describes the specification text, not the protocol: a `draft` badge
on a protocol that has shipped for years means the document is still catching
up with what implementations do.

[Spec for Specs](https://specs.ipfs.tech/meta/spec-for-specs/) defines the
document format, including the `maturity` field.

## Contribute

- Found a mistake in a specification, or something implementations rely on that
  is not written down? [Open an issue](https://github.com/ipfs/specs/issues/new/choose),
  or better, a pull request with the fix.
- Want to change a protocol or add a new one? That is an
  **InterPlanetary Improvement Proposal (IPIP)**. See:
  - [IPIP: Improvement Process for IPFS Specifications](https://specs.ipfs.tech/meta/ipip-process/)
  - List of [ratified IPIPs](https://specs.ipfs.tech/ipips/)
  - List of [open IPIPs](https://github.com/ipfs/specs/pulls?q=is%3Apr+is%3Aopen+ipip+sort%3Aupdated-desc)

If you are wondering how to decide between an issue and an IPIP:

- **Does Not Need an IPIP**:
  - The spec has a bug: something that is plainly a mistake, or text that
    disagrees with the test fixtures or with what interoperable implementations do.
  - Adding more details, test vectors, and editorial or cosmetic changes.
- **Needs an IPIP**:
  - An addition to the protocol, or anything that could cause an interop issue.
  - A breaking change to a `stable` specification.

Every CID or content path added to a specification needs retrievable data
behind it; [AGENTS.md](AGENTS.md) explains what to attach and how.

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.
This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).
