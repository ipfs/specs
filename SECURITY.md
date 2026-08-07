# Security Policy

This repository holds specifications, not running code. That changes where a
report should go.

## A weakness in a specification

Discuss it in the open. A protocol weakness that nobody can exploit today is
exactly what this repository exists to debate, and a public issue or an
[IPIP](https://specs.ipfs.tech/meta/ipip-process/) puts it in front of the people
who can change the spec. [Open an issue](https://github.com/ipfs/specs/issues/new/choose).

## A vulnerability in an implementation

If a deployed system can be attacked today, do not open a public issue here.

Email your report to **security@ipfs.io**, or use the implementation's own
policy. Kubo, Boxo, Helia and the rest each carry a `SECURITY.md`.

Include whatever you have: which implementation and version, how to reproduce
the problem, and what an attacker gets out of it. A rough report is better than
no report, and we will ask if we need more.

A maintainer will confirm we received it and keep you posted while we work on a
fix. We are glad to credit you, or to leave you unnamed if you would rather not
be credited.

If two weeks pass and no human has replied, assume the message never reached
one. Resend it, or escalate: the [OpenSSF finder guide](https://github.com/ossf/oss-vulnerability-guide/blob/main/finder-guide.md)
lays out the options, and [CERT/CC](https://kb.cert.org/vuls/report/) takes
reports when coordination with a project breaks down. We would rather you do
that than sit on a live bug.

## Everything else

This repository follows the [IPFS project security policy](https://github.com/ipfs/community/blob/master/SECURITY.md).
