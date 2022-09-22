# IPIP 0001: Lightweight Improvement Process for IPFS Specifications

- Start Date: 2022-06-10
- Related Issues:
  - [ipfs/specs/issues/286](https://github.com/ipfs/specs/issues/286)

## Summary

This _InterPlanetary Improvement Proposal_ (IPIP) introduces a lightweight
RFC (request for comments/change) process for IPFS protocol [specifications][1].

[1]: https://github.com/ipfs/specs/

## Motivation

Today, protocol design discussions often take place in a repository of an IPFS
implementation, forums, github issues, etc. We aim to focus these discussions into
an orderly process that:

1. Provides good visibility into to the full set of proposals
2. Keeps the full discussion for a proposal in one place, providing historical context
3. Ensures stakeholders in the project can be aware of proposed changes and participate
in the decision making process
4. Provides a mechanism to ensure proposals are given consideration and decisions get made

## Detailed design

Adopt an formal change management process for the [ipfs/specs][1] repository, providing a
minimal structure for opening, reviewing, and merging specification changes.

IPIP Provides an orderly mechanism for considering proposed changes to IPFS specifications. 
**An IPIP proposal is not to be the spec itself; the approval of an IPIP leads to an update to 
a specification.**

To illustrate:
- In order to understand how (hypothetical) WebDAV Gateway works, one would
  read contents of specs in `ipfs/specs/WEBDAV_GATEWAY.md`.
- IPIP in `ipfs/specs/IPIP/000N-webdav-gateway.md` would only include
  **Motivation** and explainer why certain design decisions were made at a
  certain point in time. Initial `IPIP/000N-webdav-gateway.md` would explain
  why we added WebDAV spec in the first place.

### What changes need the IPIP process?
- **Does Not Need IPIP**: The spec has a bug - something that is plainly a mistake 
- **Does Not need IPIP**: Adding more details, test vectors, and editorials/cosmetic changes
- **Needs IPIP**: An addition to the protocol 
- **Needs IPIP**:Things that could cause an interop issues require a PR with fix and IPIP in
  `ipfs/specs/IPIP/000M-webdav-fix-for-foo.md` explaining why we make the
  breaking spec change, compatibility/migration considerations etc.

### Opening an improvement proposal (IPIP)

Changes to IPFS specifications can be proposed by opening a Git pull-request
(PR) against the `ipfs/specs` repository.

In addition to specification changes, such PR must include a short **IPIP
document** based on the template in [`ipfs/specs/IPIP/0000-template.md`](./0000-template.md).

When a new specification file is added to the repo, it should be based on
the template at [`ipfs/specs/template.md`](../template.md).

When naming a new proposal, don't try to introduce an IPIP number; we will do that only for 
IPIPs that are approved before accepting into master.

Proposals are officially submitted when a pull request into master is opened

Proposals that were reviewed and rejected will be moved into /archive folder and then merged into master

### Reviewing IPIPs

1. [Specs Stewards] will do an initial triage of newly opened PRs roughly monthly. They'll try to filter out 
noise, so that community consideration is given only to reasonable proposals; others they'll reject.
2. Specs Stewards will post to the forums linking to the proposal; directing feedback/discussion to 
take place in Github on the PR
3. After a month of discussion, Specs Stewards will review again. If there are no substantive disagreements 
with the proposal, including within Spec Stewards, the proposal will be approved. 
4. If discussion or modification is still underway and appears to be leading to a resolution, it can be held 
open for another month 
5. Proposals that are generating ongoing discussion and seem contentious or stuck will be brought in for 
consideration at a monthly sync, to be announced at least a week ahead of time on the forum.
6. After discussion, Spec Stewards will make call on whether to approve or reject the proposal. 
7. At this point approved proposals get assigned a number (encoded in the filename),
and merged into the IPIP folder on master. Rejected
proposals should be also merged to master, but in a subfolder called "Rejected". Proposals rejected in intial
triage will simply have the PR declined.
8. IPIP author and two approving [Specs Stewards] are added to `CODEOWNERS` fileto be 
automatically asked to review any future changes to files added or modified by the IPIP.


### Long-term plan

[Specs Stewards] will adjust the process based on usage patterns.

## Design rationale

We want to empower IPFS community members and implementers with the ability to propose
changes in a well-known way, without introducing much overhead.

Guiding principles:
- No new tooling
  - Reuse Markdown, Git, and existing PR review process
  - *Just Enough* process to ensure some predictability and fairness for those 
    with vested interest in a proposal outcome
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
