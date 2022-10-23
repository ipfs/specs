# IPIP: Improvement Process for IPFS Specifications

- [Introduction](#introduction)
- [Process design](#process-design)
  - [What is an IPIP?](#what-is-an-ipip)
  - [What changes need the IPIP process?](#what-changes-need-the-ipip-process)
- [Improvement lifecycle](#improvement-lifecycle)
  - [Opening an improvement proposal (IPIP)](#opening-an-improvement-proposal-ipip)
  - [Reviewing IPIPs](#reviewing-ipips)
  - [Things not covered by this document](#things-not-covered-by-this-document)

## Introduction

IPIP aims to focus protocol design discussions into an orderly process that:

1. Provides good visibility into to the full set of proposals
2. Keeps the full discussion for a proposal in one place, providing historical context
3. Ensures stakeholders in the project can be aware of proposed changes and participate
in the decision making process
4. Provides a mechanism to ensure proposals are given consideration and decisions get made

## Process design

We adopted an formal change management process for the [ipfs/specs][1] repository, providing a
minimal structure for opening, reviewing, and merging specification changes.

[1]: https://github.com/ipfs/specs/

### What is an IPIP?

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

## Improvement lifecycle

### Opening an improvement proposal (IPIP)

Changes to IPFS specifications can be proposed by opening a Git pull-request
(PR) against the `ipfs/specs` repository.

In addition to specification changes, such PR must include a short **IPIP
document** based on the template in [`ipfs/specs/IPIP/0000-template.md`](./0000-template.md).

When a new specification file is added to the repo, it should be based on
the template at [`ipfs/specs/template.md`](../template.md).

When naming a new proposal, don't try to introduce an IPIP number; we will do that only for
IPIPs that are approved before accepting into `main` branch.

Proposals are officially submitted when a pull request into `main` is opened

Proposals that were reviewed as useful, but rejected for now, will be moved into `IPIP/deferred` folder and then merged into `main`

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
and merged into the IPIP folder on `main` branch. Potentially useful (but rejected for now)
proposals should be also merged to `main`, but in a subfolder called `/IPIP/deferred`. Proposals rejected in intial
triage will simply have the PR declined.
8. IPIP author and two approving [Specs Stewards] are added to `CODEOWNERS` file to be
automatically asked to review any future changes to files added or modified by the IPIP.

### Things not covered by this document

[Specs Stewards] will adjust the process based on usage patterns.

[Specs Stewards]: https://github.com/orgs/ipfs/teams/specs-stewards/members

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
