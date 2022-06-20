# IPIP 0001: Lightweight "RFC" Process for IPFS Specifications

- Start Date: 2022-06-10
- Related Issues:
  - [ipfs/specs/issues/286](https://github.com/ipfs/specs/issues/286)

# Summary

This _InterPlanetary Improvement Proposal_ (IPIP) introduces a lightweight
"request for comments/change" process for the IPFS specifications
[repository][1].

[1]: https://github.com/ipfs/specs/

# Motivation

Today, protocol design discussions often take place in a repository of an IPFS
implementation. These conversations are unintentionally obscured from the useful input of [Specs Stewards], other
implementations, service operators and the wider IPFS Community.

The IPFS Project needs a mechanism for proposing and evaluating specification
improvements that are not tied to a specific programming language
or implementation of IPFS.

# Detailed design

Adopt an informal IPIP process for the [ipfs/specs][1] repository, providing a
minimal structure for opening, reviewing, and merging specification changes.

## Opening an improvement proposal (IPIP)

Changes to IPFS specifications can be proposed by opening a Git pull-request
(PR) against the repository. In addition to specification changes, such PR must
include a short IPIP document based on the template in `IPIP/0000-template.md`.

The purpose of IPIP documents is to **document motivation** behind the change
applied to the spec. **IPIP is not to be the spec itself**.

To illustrate:
 - In order to understand how (hypothetical) WebDAV Gateway works, one would
   read contents of specs in `ipfs/specs/WEBDAV_GATEWAY.md`.
 - IPIP in `ipfs/specs/IPIP/000N-webdav-gateway.md` would only include
   **Motivation** and explainer why certain design decisions were made at a
   certain point in time. Initial `IPIP/000N-webdav-gateway.md` would explain
   why we added WebDAV spec in the first place.
 - If we realize the spec has a bug, we will evaluate the impact: adding more
   details, test vectors, and editorials/cosmetics can be fixed without IPIP.
 - Things that could cause an interop issues require a PR with fix and IPIP in
   `ipfs/specs/IPIP/000M-webdav-fix-for-foo.md` explaining why we make the
   breaking spec change, compatibility/migration considerations etc.

## Reviewing IPIPs

[Specs Stewards] will review new IPIP PRs during weekly triage.

IPFS Community is encouraged to participate in the review process.

IPIP can be either:
- merged,
- rejected (PR close without merging),
- deferred (converting PR back to a draft).

The final decision belongs to [Specs Stewards].

## Merging IPIPs

PR with a IPIP can be merged only after two [Specs Stewards] approve it and
there are no objections from other Stewards.

IPIP number is assigned before the PR merge.

IPIP author and two approving [Specs Stewards] are added to `CODEOWNERS` file
to be automatically asked to review any future changes to files added or
modified by the IPIP.

## Long-term plan

[Specs Stewards] will adjust the process based on usage patterns.

## Design rationale

We want to empower IPFS community members and implementers with the ability to propose
changes in a well-known way, without introducing much overhead.

Guiding principles:
- No new tooling
  - Reuse Markdown, Git, and existing PR review process
- Convention over Byzantine process
  - Proposing a new IPIP should have low cognitive overhead, allowing us to
    focus on specs
  - Reuse existing Github developer accounts and reputation attached to them
  - One should be able to create a valid IPIP without reading a long explainer
    like this one. Looking at past IPIPs, and then copying a template and
    opening a PR with the proposal should be more than enough.

### User benefit

End users will indirectly benefit from a healthy IPIP process being in place:

- IPFS community members will be able to use IPIP drafts for evaluating ideas
  before investing time into building new things.
- The bar for creating a brand new IPFS implementation will be lowered, and
  existing implementations will be able to propose improvements for others to
  adopt. This removes the soft vendor lock-in present when the oldest
  implementation is considered as the reference standard and source of truth.
- IPFS implementers will have a better understanding of why certain design
  decisions were made, and have both historical context and language-agnostic
  specifications with test fixtures ready for use in their project, ensuring
  a high level of interoperability.
- More eyes looking at specifications will improve overall quality over time.

As a result, IPFS will become easier to implement, useful in more contexts,
and benefit more people.

### Compatibility

Existing contents of [ipfs/specs][1] repository act as the initial state
against which IPIP PRs can be opened.

### Security

Existing Git-based review infrastructure, user accounts and reputation
system will be reused.

Merging IPIP will require approval from two [Specs Stewards].

### Alternatives

- Maintaining the status quo (no IPIP process) is not acceptable, as we want to
  move specification discussions away from repositories of specific
  implementations. We need a mechanism for discussing improvements that is not
  tied to specific implementation or language.
- Creating more elaborate IPIP process. This comes with increased overhead and
  risk. Introducing a complex process requires deeper understanding of
  community needs and pitfalls of preexisting processes, and since we don't
  have any process in place, starting light, limits the risk.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[Specs Stewards]: https://github.com/orgs/ipfs/teams/specs-stewards/members
