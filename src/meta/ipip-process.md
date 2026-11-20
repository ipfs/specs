---
title: "IPIP: Improvement Process for IPFS Specifications"
description: >
  How changes to IPFS specifications are proposed, reviewed and ratified, who the
  stewards are, and what to expect from a repository maintained in a low-activity mode.
date: 2026-11-03
maturity: stable
editors:
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
  - name: Guillaume Michel
    github: guillaumemichel
  - name: Henrique Dias
    github: hacdias
    url: https://hacdias.com/
  - name: Robin Berjon
    github: darobin
    url: https://berjon.com/
xref:
  - spec-for-specs
order: 1
---

## Introduction

IPIP aims to focus protocol design discussions into an orderly process that:

1. Provides good visibility into the full set of proposals
2. Keeps the full discussion for a proposal in one place, providing historical context
3. Ensures stakeholders in the project can be aware of proposed changes and participate
   in the decision making process
4. Provides a mechanism to ensure proposals are given consideration and decisions get made

## How this repository is maintained

The [ipfs/specs][1] repository is maintained in a low-activity mode. The
specifications in it describe a protocol stack that is deployed and relied
upon, and most of them carry the `stable` maturity defined in
:cite[spec-for-specs]: they change to fix errors and to clarify text, not to
alter what conforming implementations do. There is no team working on new
specifications and no review schedule.

[1]: https://github.com/ipfs/specs/

### Stewards

The :dfn[stewards] are the people who merge changes to this repository and
who ratify IPIPs. The current stewards are:

- Robin Berjon ([@darobin](https://github.com/darobin))
- Michelle Lee ([@mishmosh](https://github.com/mishmosh))

The `CODEOWNERS` file requests their review on every pull request. Stewards
triage on a best-effort basis; expect days to weeks.

The editors named in the header of each specification are the first point of
contact for that document. They are the people who know why it says what it
says, and a reviewer a steward will turn to.

The list of stewards changes by pull request to this document, approved by the
existing stewards. Anyone who has carried an IPIP through to ratification, or
who maintains an implementation, is a natural candidate.

### What changes need an IPIP?

- **Does not need an IPIP**: the spec has a bug, something that is plainly a
  mistake, or text that disagrees with the test fixtures or with what
  interoperable implementations do.
- **Does not need an IPIP**: adding more details, test vectors, and editorial
  or cosmetic changes.
- **Needs an IPIP**: an addition to the protocol.
- **Needs an IPIP**: anything that could cause an interop issue, including a
  breaking change to a `stable` specification. The pull request carries both
  the fix and an IPIP in `src/ipips/` explaining why the change is worth the
  breakage, with compatibility and migration considerations.

Changes that do not need an IPIP are ordinary pull requests. A steward merges
them once satisfied that they do not alter the behaviour of a conforming
implementation; for a `stable` specification that is the whole test.

## Improvement lifecycle

### What is an IPIP?

IPIP provides an orderly mechanism for considering proposed changes to IPFS
specifications. **An IPIP proposal is not the spec itself; the approval of an
IPIP leads to an update to a specification.**

To illustrate:

- In order to understand how a (hypothetical) WebDAV Gateway works, one would
  read the spec in `ipfs/specs/src/webdav-gateway.md`.
- The IPIP in `ipfs/specs/src/ipips/ipip-000N.md` only includes the
  **motivation** and an explainer of why certain design decisions were made at
  a certain point in time. It would explain why the WebDAV spec was added in the
  first place.

### Opening an improvement proposal

Changes to IPFS specifications are proposed by opening a pull request against
the `main` branch of the `ipfs/specs` repository.

In addition to the specification changes, the pull request includes a short
**IPIP document** based on the template in
[`ipfs/specs/ipip-template.md`](https://github.com/ipfs/specs/blob/main/ipip-template.md).
A new specification file is based on the template at
[`ipfs/specs/template.md`](https://github.com/ipfs/specs/blob/main/template.md).

The IPIP's number is the number of its pull request. Name the file
`ipip-NNNN.md` accordingly as soon as the pull request exists.

Every CID or content path the proposal adds needs retrievable data behind it.
[`AGENTS.md`](https://github.com/ipfs/specs/blob/main/AGENTS.md) explains what
to attach and how.

A proposal is officially submitted when the pull request is opened. Draft pull
requests are welcome for early feedback, but the review period below only
starts once the pull request is marked ready for review.

### Reviewing and ratifying an IPIP

There is no triage meeting and no monthly cycle. An IPIP is reviewed in its
pull request, asynchronously, and is ratified when all of the following hold:

1. The pull request has been open and ready for review for at least **14 days**.
2. At least one **steward** has approved it.
3. At least one **implementer** has approved it: a maintainer of an IPFS
   implementation other than the one the author works on. This approval is
   evidence that the change can be implemented interoperably, and it carries
   the most weight when it comes with working code. An author who maintains
   no implementation needs one implementer approval; an author who does needs
   an approval from a different implementation.
4. No steward has an objection that remains unresolved.
5. The proposal's test fixtures, if it has any, are attached and verified.

The stewards are the judges of whether a given reviewer counts as an
implementer. When in doubt, ask in the pull request before the 14 days run
out rather than after.

Once ratified, a steward sets `ipip: ratified` in the IPIP's front matter and
merges the pull request. The IPIP then appears in the
[list of ratified IPIPs](https://specs.ipfs.tech/ipips/).

Proposals that want a faster path should make the reviewers' job easy: a
working implementation, test fixtures, and a pull request that touches only
what it needs to.

### Deferred and rejected proposals

A proposal that is reasonable but that nobody can carry, because it has no
implementation, no reviewer with the relevant expertise, or an author who has
moved on, is closed with the `status/deferred` label. Closing it is not a
judgement on the idea. Anyone can reopen a deferred proposal by bringing an
implementation and committing to champion it through review.

A proposal that a steward rejects in triage has its pull request closed with a
reason.

### After ratification

An IPIP's author remains a natural reviewer of later changes to the
specifications the IPIP touched, and stewards will ask them. Beyond that, the
specification is on its own: it carries the maturity its text has earned, and
the rules of :cite[spec-for-specs] apply.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
