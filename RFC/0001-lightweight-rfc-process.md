# RFC 0001: Lightweight RFC Process for IPFS Specifications

- Start Date: 2022-06-10
- Related Issues:
  - [ipfs/specs/issues/286](https://github.com/ipfs/specs/issues/286)

# Summary

This Request for Change (RFC) introduces a lightweight RFC process
for the IPFS specifications [repository][1].

[1]: https://github.com/ipfs/specs/

# Motivation

Today, protocol design discussions often take place in a repository of an IPFS
implementation. These conversations are unintentionally obscured from the useful input of [Specs Stewards], other
implementations, service operators and the wider IPFS Community.

The IPFS Project needs a mechanism for proposing and evaluating specification
improvements that are not tied to a specific programming language
or implementation of IPFS.

# Detailed design

Adopt an informal RFC process for the [ipfs/specs][1] repository, providing a
minimal structure for opening, reviewing, and merging specification changes.

## Opening

Changes to IPFS specifications can be proposed by opening a PR against the
repository, and including a short "request for change" document based on the
template in `RFC/0000-template.md`.

## Reviewing

[Specs Stewards] will review new RFC PRs during weekly triage.

IPFS Community is encouraged to participate in the review process.

Final decision belongs to [Specs Stewards].

## Merging

RFC can be merged only after two [Specs Stewards] approve it.

RFC number is assigned before the merge.

RFC author and two approving [Specs Stewards] are added to CODEOWNERS file to be
automatically asked to review any future changes to files added or modified
by the RFC.

## Long-term plan

[Specs Stewards] will adjust the process based on usage patterns.

## Design rationale

We want to empower IPFS community members and implementers with the ability to propose
changes in a well-known way, without introducing much overhead.

Guiding principles:
- No new tooling
  - Reuse Markdown, Git, and existing PR review process
- Convention over Byzantine process
  - Proposing a new RFC should have low cognitive overhead, allowing us to
    focus on specs
  - Reuse existing Github developer accounts and reputation attached to them
  - One should be able to create a valid RFC without reading a long explainer
    like this one. Looking at past RFCs, and then copying a template and
    opening a PR with the proposal should be more than enough.

### User benefit

End users will indirectly benefit from a healthy RFC process being in place:

- IPFS community members will be able to use RFC drafts for evaluating ideas
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
against which RFC PRs can be opened.

### Security

Existing Git-based review infrastructure, user accounts and reputation
system will be reused.

Merging RFC will require approval from two [Specs Stewards].

### Alternatives

- Maintaining the status quo (no RFC process) is not acceptable, as we want to
  move specification discussions away from repositories of specific
  implementations. We need a mechanism for discussing improvements that is not
  tied to specific implementation or language.
- Creating more elaborate RFC process. This comes with increased overhead and
  risk. Introducing a complex process requires deeper understanding of
  community needs and pitfalls of preexisting processes, and since we don't
  have any process in place, starting light, limits the risk.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

[Specs Stewards]: https://github.com/orgs/ipfs/teams/specs-stewards/members
