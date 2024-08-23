---
title: Compact Denylist Format
description: >
  How content blocking rules can be represented as a .deny file.
date: 2023-08-24
maturity: reliable
editors:
  - name: Hector Sanjuan
    github: hsanjuan
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
      name: Protocol Labs
      url: https://protocol.ai/
tags: ['filtering']
order: 1
---

Denylists provide technical means for IPFS service operators to control
the content hosted on their nodes.

## Introduction

A denylist is a collection of items that will be "blocked" on IPFS software.

While this specification is implementation agnostic and just defines the form
and syntax supported by the denylist, it is clear that when talking of
blocking we are specifically thinking on how to implement it in a way that is
efficient and operationally sound. Thus, we are thinking of lists that will
grow to be made of billions of items, that will be constantly updated while
the application runs, that will be shared and distributed around using IPFS
itself and that users should have the power to edit and adjust very easily.

The presented denylist format is the result of careful reflection on such
terms. Our list format starts by including an optional **header**, which
provides basic information about the list itself, and can be used to set
list-wide options (*hints*, as we call them). We choose YAML for simplicity,
readability, ease of use and parser support.

In our lists, *hints* are a way of providing additional, optional information,
relative to the items in the list that can be processed by machines. For
example, a hint can tell implementations about HTTP return codes for blocked
items, when they are requested through the gateway. In this original
specification we do not define any mandatory or optional hint, but this may be
done in the future to support specific features.

The denylist itself, after the header, is a collection of **block items** and
block-item-specific hints. There are different flavours of block items,
depending on whether we are blocking by CID, CID+path, Path, IPNS, using
double-hashing etc. but the idea is that whether an item is blocked or not
SHOULD be decided directly and ideally, *prior to retrieval*.

We include *negative block items* as well, with the idea of enabling denylists
that are append-only. One of the main operational constraints we have seen is
that a single item can cause a full denylist to be re-read, re-parsed and
ultimately need a full restart of the application. We want to avoid that by
providing operators and implementors with the possibility of just watching
denylists for new items without then need to restart anything while new items
are added. This also gives the possibility of storing an offset and seeking
directly to it after application restarts. *negative block items* can also be
used to make exceptions to otherwise more general rules.

Another aspect that we have maintained in the back of our minds is the
possibility of sharing lists using IPFS. The append-mostly aspect also plays a
role here, for lists can be chunked and DAG-ified and only the last chunk will
change as the file grows. This makes our lists immediately friendly to
content-addressing and efficient transmission over IPFS. However, the
protocols, subscriptions and list-sharing approaches are rightfully beyond
this spec.

Beyond all of that, we put emphasis in making our format easily editable by
users and facilitating integrations using scripts and with other applications
(unrelated to the implementation of the parsing/blocking inside IPFS). We
consciously avoid JSON and other machine formats and opt for text and for
space-delimited items in a grep/sed/cut-friendly way. For example, we expect
that the following should just work across implementations for adding and
blocking something new:

```
echo /ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768 >> ~/.config/ipfs/custom.deny
```

We consciously avoid defining any other API other than expecting
implementations to honor blocking what is on the denylist and act accordingly
when it is updated. CLI commands or API endpoint to modify list items etc. are
outside the scope of this spec. Implementations how much information to
provide to users when a request for an IPFS object is blocked.

As a last note, if we take Kubo and the go-ipfs stack as the reference IPFS
implementation, we expect the blocking-layer (that is, the introduction of the
logic that decides whether an item is blocked or not), to happen cleanly at
the `NameSystem`, `path.Resolver` and `BlockService` interfaces (IPNS, IPFS
Path and CID blocks respectively).

This specification corresponds to V1 of the compact list format. We have
limited the number of features and extensions to a minimum to start working
with, leaving some ideas on the table and the door open to develop the format
in future versions.

## Example

The following example showcases the features and [syntax](#file-syntax) of a compact denylist:

```yaml
version: 1
name: Example IPFSCorp blocking list
description: A collection of bad things we have found in the universe
author: abuse-ipfscorp@example.com
hints:
  hint: value
  hint2: value2
---
# Blocking by CID is codec-agnostic (blocks by multihash).
# Does not block subpaths per se, but might stop an implementation
# from resolving subpaths if this block is not retrievable.
/ipfs/bafybeihvvulpp4evxj7x7armbqcyg6uezzuig6jp3lktpbovlqfkuqeuoq

# Blocking by subpath (equivalent rules)
/ipfs/Qmah2YDTfrox4watLCr3YgKyBwvjq8FJZEFdWY6WtJ3Xt2/test*
/ipfs/QmTuvSQbEDR3sarFAN9kAeXBpiBCyYYNxdxciazBba11eC/test/*

# Block some subpaths with exceptions: last-matching-rule wins (!)
/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked*
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blockednot
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/not
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/exceptions*

# Block DNSLink domain name
/ipns/domain.example

# Block DNSLink domain name and path
/ipns/domain2.example/path

# Block IPNS key - blocks wrapped multihash.
/ipns/k51qzi5uqu5dhmzyv3zac033i7rl9hkgczxyl81lwoukda2htteop7d3x0y1mf

# Double-hash CID block using sha2-256 hashing
# base58btc-sha256-multihash(QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR)
# Blocks bafybeidjwik6im54nrpfg7osdvmx7zojl5oaxqel5cmsz46iuelwf5acja
# and QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR etc. by multihash
//QmX9dhRcQcKUw3Ws8485T5a9dtjrSCQaUAHnG4iK9i4ceM

# Double-hash Path block using blake3 hashing
# base58btc-blake3-multihash(gW7Nhu4HrfDtphEivm3Z9NNE7gpdh5Tga8g6JNZc1S8E47/path)
# Blocks /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/f01701e20903cf61d46521b05f926ba1634628d0bba8a7ffb5b6d5a3ca310682ca63b5ef0/path etc...
# But not /path2
//gW813G35CnLsy7gRYYHuf63hrz71U1xoLFDVeV7actx6oX

# Legacy CID double-hash block
# sha256(bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/)
# blocks only this CID
//d9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7

# Legacy DNSLink double-hash block
# sha256(bad-domain-name.tld/)
//c555c4de78827ba42527dd3dc5398db38d6c0a8c345a88e0158b2d100f317e50

# Legacy Path double-hash block
# Blocks bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/path
# but not any other paths.
//3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572

```

## File syntax

A denylist is a UTF-8 encoded text file made of an optional [header](#header)
terminated with `---` and a list of [block items](#block-item) separated by
newlines (`\n`). Block items can have optional [hints](#hints).

Comment lines start with `#`. Empty lines are allowed.

```yaml
[yaml_header]
---
[block_item1] [optional_hint_list]

# comment
[block_item2] [optional_hint_list]
...
```

Lines should not be longer than 2MiB including the "\n" delimiter.

### Header

The list header is an optional YAML block.

- Must be valid YAML
- Fully optional
- 1 MiB (1048576 bytes) maximum size
- Delimited by a line containing `---` at the end (document separator)
- Field names are case-sensitive

Known fields:
- `version`
  - The denylist format version. Defaults to 1 when not specified.
  - Implementations SHOULD reject parsing denylist versions that they do not
    support.
- `name`
- `description`
- `author`
- `hints`
  - A map of optional global [hints](#hints). When present, SHOULD be applied
    to every [block item](#block-item) on the list before applying per item
    ones (if any).

The list of known fields may be expanded in the future. Fields with names not
listed above are considered custom. List creators can freely include custom
fields in the header and implementations can support them as needed.
Implementations SHOULD ignore unknown header fields to ensure custom fields do
not impact parsing of the list.

In order to parse the YAML header, implementations MUST:
1. Read the denylist until a `---` is found or the 1MiB limit is reached.
   - If the size limit is reached, assume the list includes no
     header and start parsing block items from the beginning of the denylist. A
     header that was too large will be parsed line by line as block items and
     error accordingly line per line, without causing excessive resource
     allocation.
2. If the `---` is found, attempt parsing the header as YAML.
   - If parsing the header fails, abort and signal an error.

### Block item

A block item represents a rule to enable content-blocking:

- `PATH` elements are expected to be %-encoded, per [RFC 3986, section 2.1](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).
- `CID` elements represent a CID (either V0 or V1).
  - Legacy CIDv0 are equivalent to baseb58btc-encoded sha256 multihashes
    although they are not the same thing. A CIDv0 carries implicit codec
    (dag-pb) and multibase information (b58btc). When we say a b58-encoded
    multihash needs to be extracted from the CID, this is a no-op in
    case of CIDv0s.

Implementations must decide what to do when processing a denylist and an invalid block-item rule is found:

- Prominently log the parsing error (always recommended)
- Abort parsing and return a general error OR
- Continue processing the list, discarding unrecognized rules

#### `/ipfs/CID`

CID-rule: Blocks a specific multihash. If the CID is a V1, it blocks the
multihash contained in it (CIDv0s are multihashes already).

When users want to block by multihash directly, they must base58btc-encoded
multihashes. This rule does not block subpaths that start at this CID, only
the CID itself.

Blocking layer recommendation: BlockService (or PathResolver if wanting to
block by path only).

:::warning

See note in `/ipfs/CID/*` below, as to why this rule may effectively block all subpaths too.

:::

#### `/ipfs/CID/PATH`

IPFS-Path-Rule: Blocks the exact ipfs path that is referenced from the
multihash embedded in the CID before attempting to resolve it. It does not block
the CID that the path resolves to.

Note `/ipfs/CID/path` and `/ipfs/CID/path/` are equivalent rules.

Blocking layer recommendation: PathResolver.

#### `/ipfs/CID/PATH*`

IPFS-Path-Prefix-Rule: Blocks any multihash-path combination starting with the
given path prefix. `/*` includes the empty path. Thus, `/ipfs/CID/*`
blocks the CID itself, and any paths. Examples:

- `/ipfs/CID/*` : blocks CID (by multihash) and any path BEFORE resolving.
- `/ipfs/CID/ab*`: blocks any path derived from the CID (multihash) and starting with "ab", including "ab"
- `/ipfs/CID/ab/*`: equivalent to the above.

Blocking layer recommendation: PathResolver

:::warning

When the rule `/ipfs/CID` exists and BlockService-level blocking
  exists, subpaths of CID will effectively be blocked in the process of being
  resolved, as we would disallow fetching the root CID, even if the subpath
  itself is not block. This causes `/ipfs/CID` to behave like
  `/ipfs/CID/*`. In cases where all requests go through the PathResolver,
  blocking at the BlockService could be disabled. In that case fetching
  `/ipfs/CID` would be allowed even if that rule existed, when the process is
  part of the resolution of a subpath that is not blocked. Implementations can
  decide which model they want to adopt.

:::

#### `/ipns/NAME`

IPNS-rule: Blocks the given IPNS name before resolving. It does not block the CID that it
resolves to.

If the IPNS `NAME` is a domain name, it is blocked directly.

If the IPNS `NAME` is a CIDv1 (libp2p-key) or b58-encoded-multihash (CIDV0),
then the blocking affects the underlying Multihash.

Blocking layer recommendation: NameSystem.

#### `/ipns/NAME/PATH`

IPNS-Path-rule: Blocks specifically the IPNS path, before resolving. Equivalent to `/ipfs/CID/PATH`.

Blocking layer recommendation: There is no good place to implement this rule
as the NameSystem only handles IPNS names (without paths), and the
path.Resolver only handles already-resolved Paths.

#### `/ipns/NAME/PATH*`

IPNS-Path-Prefix-Rule: Same as with the IPFS-Path-Prefix-Rule.

Blocking layer recommendation:  There is no good place to implement this rule
as the NameSystem only handles IPNS names (without paths), and the
path.Resolver only handles already-resolved Paths.

<!-- TODO: hidding for now, we don't use this nor have tests for this, and it
           creates ambiguity when we add new top level namespace like /ipld

#### `/PATH` `/PATH/*` `/PATH*`

Subpath-Rule: Block solely by looking at the subpath component of an IPFS path. Examples:

- `/my/path`: blocks any item that tries to resolve `/my/path`, regardless of the CID used.
- `/my/path*` and `/my/path/*`: blocks any paths that contain the prefix `/my/path`.

Blocking layer recommendation: PathResolver.

-->

#### `//DOUBLE-HASH`

Doublehash-Rule: Blocks using double-hashed item, which can be:

- (modern) a base58btc-encoded multihash, corresponding to the hash of either:
  - An IPFS-Path: `b58-encoded-multihash/P/A/T/H` where the multihash is
    extracted from the CID in `/ipfs/CID/P/A/T/H`
    - CIDv1 needs to be converted to a raw Multihash in b58 mutlibase. CIDv0 is
      already a valid b58 Multihash and required no conversion.
    - The `/P/A/T/H` component is optional and should not have a trailing `/`.
  - An IPNS-Path:
    - `/ipns/NAME` when the IPNS name is NOT a CID.
    - The b58-encoded-multihash extracted from an IPNS name when the IPNS name
      is a CID.
  - The modern Multihash form allows blocking by double-hash using any hashing
    function of choice. Implementations will have to hash requests using all
    the hashing functions used in the denylist, so we recommend sticking to
    one.
- (legacy) the sha256-hex-encoded hash of `CIDV1_BASE32/PATH`
  - This is the legacy badbits block anchor format used before this
    specification was created.
  - When no path is present, the trailing slash must be kept (`CIDV1_BASE32/`).
  - It can only block by CID and not by multihash, and is tied to sha256 hash
    function, which makes is inferior to the modern and more future-proof
    b58-encoded multihash notation which supports use of alternative hash
    functions.
  - If necessary, CID blocks can be applied to IPNS namespace:
    - IPNS Names work out of the box when represented as `CIDV1_LIBP2P-KEY_BASE32/`.
    - DNSLink rule can be enforced if matching sha256-hex-encoded hash
      of `dnslink.domain.example.com/` (domain with with trailing slash).

In a case where implementation cannot distinguish a double-hashed rule between
a b58btc multihash (modern) and a sha256 hex-string (legacy), content blocking
system MUST create deny rules for both.

Content filtering of double-hashed entries SHOULD be applied in every logical
system acting as NameSystem, PathResolver or BlockService.

In order to check for a matching rule, the PathResolver working with `/ipfs/CID/PATH` should:

- (modern) Convert the CID to Multihash and hash `b58-multihash/PATH` without
  trailing `/` with the hashing functions used in the denylist. Match against
  declared double-hashes.
- (legacy) Convert the CID to CIDv1Base32 and hash `CIDV1BASE32/PATH` with the
  hashing functions used in the denylist. Match against declared double-hashes.
  An empty path means that the value to hash is `CIDV1BASE32/` (with the
  trailing slash). This is the legacy hashing, the function is
  sha256 and the matched rules are legacy badbits anchor rules.

The NameSystem (used only for `/ipns/*`) should:

- If NAME is a CID (try parsing as CID first), extract the multihash, encode it with base58btc and hash it with the hashing functions used in the denylist. Match against declared double-hashes.
- Otherwise, assume NAME is a domain name: Hash `/ipns/NAME` with the hashing functions used in the denylist. Match against declared double-hashes.

The BlockService should:

- (modern) Convert the CID to b58-encoded-multihash (that is CIDv0) and hash the CID string.
- (legacy) Convert the CID to `CIDV1BASE32/` (keeping the CID codec and adding a slash at the end) and hash it with the hashing functions used in the denylist. Match against declared double-hashes.

:::note

The "modern" double-hashed items (b58-encoded-multihash) can be created with
existing CLI tools like
[Kubo](https://docs.ipfs.tech/how-to/command-line-quick-start/):

Convert any CID to its multihash with:

```
$ ipfs cid format -f '%M' -b base58btc bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze
QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768
```

Then, create a second multihash to be used in `//DOUBLE-HASH` rule that will be
blocking specific content path under the extracted multihash:

```
$ printf "QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/my/path" | ipfs block put --mhtype sha2-256 | ipfs cid format -f '%M' -b base58btc
QmSju6XPmYLG611rmK7rEeCMFVuL6EHpqyvmEU6oGx3GR8
```

The double-hash rule `//QmSju6XPmYLG611rmK7rEeCMFVuL6EHpqyvmEU6oGx3GR8` will block
`/ipfs/bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze/my/path`.

The `QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768` is the multihash contained
in `bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze`.

:::

#### Negated rules

The specification syntax examples describe a `.deny` list of items to block (deny).

Block items can be prepended by `!`, which means that items matching the rule are to be allowed rather than blocked.

This can be used to undo existing rules, but also to add concrete exceptions to wider rules. Order matters, and Allow rules must come AFTER other existing rules.

Implementations should parse rules in general, and match them in inverse order
as they appear in the denylist, so an explicit Allow rule will be evaluated
before previously defined Deny rules, and can return non-blocked status for an
item before further processing.

Examples:

```
/ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/photo*
!/ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/photo123.jpg
!/ipns/my.domain
/ipns/my.domain
```

In this example, `/ipns/my.domain` stays blocked because the deny rule happens
AFTER the allow one.

:::note

Implementations MAY reuse denylist format for `.allow` files, where  everything
is blocked by default, and only matching items are allowed.

:::

#### Hints

A *hint* is an optional key-value metadata duple associated to a [block item](#block-item).

Hints can be defined for the entire denylist when `hints` map is present in the
[header](#header), or per item, as space-separated list at the end of a [block
item](#block-item):

```
[block_item] hintA:v1 hintB:v2 hintC:v3
```

Local hint overrides a global one with the same key name.

## Denylist integration

### File extension, locations and order

While not pertaining to the denylist format itself, we introduce the following conventions about denylist files when they are stored in the local filesystem:

- Denylist files MUST be named with the extension `.deny`.
- Implementations SHOULD look in `/etc/ipfs/denylists/` and
  `$XDG_CONFIG_HOME/ipfs/denylists/` (default: `~/.config/ipfs/denylists`) for denylist files.
- Implementations MAY also look in their own configuration directory.
- Denylist files are processed in alphabetical order so that rules from later
  denylists override rules from earlier denylists on conflict.

### Security

- Denylist headers and line-length limits are well specified to avoid malformed lists to cause things like large memory usage while parsing.
  - Implementations MUST error when parsed list is bigger than the limit defined in this specification.
- Supported type of blocks have been thought out to avoid amplified consumption of resources or side effects (i.e. downloading of additional dag-blocks) during the implementation.
  - Implementations SHOULD avoid retrieving content that is blocked by a denylist.
- Paths are sanitized and follow the same encoding rules as URLs (RFC 3986), so that existing and safe parsing can be done with regular tooling.
- Official and custom-hint systems allow the introduction of additional features that can co-exist with the specified format without needing to be supported.
  - Implementation SHOULD ignore unsupported fields and hints.

### Privacy and User Control

The goal of content filtering is to empower operators of IPFS services with
tools to control what content is hosted and processed by their infrastructure.

Implementations SHOULD allow the end user to configure denylists.

The main aspect regarding privacy in the scope of this specification has to do
with supporting the use of [double-hashing](#double-hash) in block items.

Double-hashing is particularly useful when the denylist is meant to be shared. Double-hashing:

- Prevents readers of the denylist to know what the original content-address
  of the block item is, and therefore avoids making the denylist a directory
  of *bad* content. This is particularly useful for harmful content, where
  solely publishing the address (CID) and not the content it is bad.
- Double-hashing does not exclude adding additional context via comments or hints
- The presence of a single double-hashed block item makes necessary that the implementation hashes every CID and CID+path that needs to be checked, which has a performance impact.
- In general, it is good that users can inspect the nature of the content blocked if they wish to, so we recommend not using double-hashing by default as it helps transparency (i.e. blocking due to copyright claims).

### Test fixtures

Denylist parsing and correct behaviour can be tested using the
[test.deny](https://github.com/ipfs-shipyard/nopfs/blob/master/tester/test.deny)
denylist, which provides example rules and describes the expected behaviour in
detail.

In particular, a reference [Blocker implementation validator](https://github.com/ipfs-shipyard/nopfs/tree/master/tester) is provided in Go, and can be adapted to other languages if needed.

### Implementations

- [NOpfs](https://github.com/ipfs-shipyard/nopfs): A reference library implementation of IPIP-383 which add supports for content blocking to the go-ipfs stack.
- [Kubo](https://github.com/ipfs/kubo): IPFS implementation, ships with built-in NOpfs implementation ([docs](https://github.com/ipfs/kubo/blob/master/docs/content-blocking.md))
- [Rainbow](https://github.com/ipfs/rainbow/): A standalone IPFS Gateway implementation, ships with built-in NOpfs implementation

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
