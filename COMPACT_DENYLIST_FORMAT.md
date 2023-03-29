# Compact Denylist Format specification

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Author(s)**:
- @hsanjuan

**Maintainer(s)**:
- @hsanjuan

* * *

**Abstract**

This is the specification for [compact denlylist format V1](IPIP/383-compact-denylist-format.md).

Denylists provide a way to indicate what content should be blocked by IPFS.

## Organization of this document

- [Introduction](#introduction)
- [Specification](#specification)
  - [Test fixtures](#test-fixtures)
  - [Security](#security)
  - [Privacy and User Control](#privacy-and-user-control)

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
double-hashing etc. but the idea is that whether an item is blocked or not can
be decided directly and ideally, prior to retrieval.

We include *negative block items* as well, with the idea of enabling denylists
that are append-only. One of the main operational constraints we have seen is
that a single item can cause a full denylist to be re-read, re-parsed and
ultimately need a full restart of the application. We want to avoid that by
providing operators and implementors with the possiblity of just watching
denylists for new items without then need to restart anything while new items
are added. This also gives the possiblity of storing an offset and seeking
directly to it after application restarts. *negative block items* can also be
used to make exceptions to otherwise more general rules.

Another aspect that we have maintained in the back of our minds is the
possiblity of sharing lists using IPFS. The append-mostly aspect also plays a
role here, for lists can be chunked and DAG-ified and only the last chunk will
change as the file grows. This makes our lists immediately friendly to
content-addressing and efficient transmission over IPFS. However, the
protocols, subscriptions and list-sharing approaches are rightfully beyond
this spec.

Beyond all of that, we put emphasis in making our format easily editable by
users and facilitating integrations using scripts and with other applications
(unrelated to the implementation of the parsing/blocking inside IPFS). We
conciously avoid JSON and other machine formats and opt for text and for
space-delimited items in a grep/sed/cut-friendly way. For example, we expect
that the following should just work accross implementations for adding and
blocking something new:

```
echo /ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768 >> ~/.config/ipfs/custom.deny
```

We conciously avoid defining any other API other than expecting
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

## Specification

### Denylist file extension, locations and order

While not pertaining to the denylist format itself, we introduce the following conventions about denylist files when they are stored in the local filesystem:

- Denylist files are named with the extension `.deny`.
- Implementations should look in `/etc/ipfs/denylists/` and
  `$XDG_CONFIG_HOME/ipfs/denylists/` for denylist files.
- Denylist files are processed in alphabetical order so that rules from later
  denylists override rules from earlier denylists on conflict.

### Denylist format

#### Summary

The following example showcases the features and syntax of a compact denylist:

```
version: 1
name: IPFSCorp blocking list
description: A collection of bad things we have found in the universe
author: abuse-ipfscorp@example.com
hints:
  hint: value
  hint2: value2
---
# Blocking by CID - blocks wrapped multihash.
# Does not block subpaths.
/ipfs/bafybeihvvulpp4evxj7x7armbqcyg6uezzuig6jp3lktpbovlqfkuqeuoq

# Block all subpaths
/ipfs/QmdWFA9FL52hx3j9EJZPQP1ZUH8Ygi5tLCX2cRDs6knSf8/*

# Block some subpaths (equivalent rules)
/ipfs/Qmah2YDTfrox4watLCr3YgKyBwvjq8FJZEFdWY6WtJ3Xt2/test*
/ipfs/QmTuvSQbEDR3sarFAN9kAeXBpiBCyYYNxdxciazBba11eC/test/*

# Block some subpaths with exceptions
/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked*
+/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blockednot
+/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/not
+/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/exceptions*

# Block IPNS domain name
/ipns/domain.example

# Block IPNS domain name and path
/ipns/domain2.example/path

# Block IPNS key - blocks wrapped multihash.
/ipns/k51qzi5uqu5dhmzyv3zac033i7rl9hkgczxyl81lwoukda2htteop7d3x0y1mf

# Block all mime types with exceptions
/mime/image/*
+/mime/image/gif

# Legacy CID double-hash block
# sha256(bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/)
# blocks only this CID
//d9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7

# Legacy Path double-hash block
# Blocks bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/path
# but not any other paths.
//3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572

# Double hash CID block
# base58btc-sha256-multihash(QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR)
# Blocks bafybeidjwik6im54nrpfg7osdvmx7zojl5oaxqel5cmsz46iuelwf5acja
# and QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR etc. by multihash
//QmX9dhRcQcKUw3Ws8485T5a9dtjrSCQaUAHnG4iK9i4ceM

# Double hash Path block using blake3 hashing
# base58btc-blake3-multihash(gW7Nhu4HrfDtphEivm3Z9NNE7gpdh5Tga8g6JNZc1S8E47/path)
# Blocks /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/f01701e20903cf61d46521b05f926ba1634628d0bba8a7ffb5b6d5a3ca310682ca63b5ef0/path etc...
# But not /path2
//QmbK7LDv5NNBvYQzNfm2eED17SNLt1yNMapcUhSuNLgkqz
```

#### High level list format

A denylist is made of an optional header and a list of blockitems separated by newlines. Comment lines start with `#`. Empty lines are allowed.

```
<header>
---
<block_item1> [hint_list]

# comment
<block_item2> [hint_list]
...
```

#### Header

The list header is a YAML block:

- Must be valid YAML
- Fully optional
- 1KB maximum size
- Delimited by a line containing `---` at the end (document separator)

Known-fields (they must be lowercase):

- `version`: the denylist format version. Defaults to 1 when not specified.
- `name`
- `description`
- `author`
- `hints`: a map of *hints*. See section below for known hints

#### Hints

A *hint* is a key-value duple associated to the denylist as a whole (part of the header), or to a specific \<block_item\>.

Header hints can be used to set denylist-wide options or information that
implementations can choose to interpret or not.

#### List body

A denylist is made of lines which are made by a *block items* followed by zero or more space-separated hints.

Lines should not be longer than 2MiB including the "\n" delimiter.

#### Block item

A block item represents a rule to enable content-blocking:

- `PATH` elements are expected to be %-encoded, per [RFC 3986, section 2.1](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).
- `CID` elements represent a CID (either V0 or V1).
- `CIDv0` are for us equivalent to baseb58btc-encoded sha256 multihashes although they are not the same thing (a CIDV0 carries implicit codec (dag-pb) and multibase information (b58btc). When we say a b58-encoded multihash needs to be extracted from the CID, this usually is a no-op in case of CIDv0s.

##### `/ipfs/CID`

CID-rule: Blocks a specific multihash. If the CID is a V1, it blocks the
multihash contained in it (CIDv0s are multihashes already).

When users want to block by multihash directly, they must base58btc-encoded
multihashes. This rule does not block subpaths that start at this CID, only
the CID itself.

Blocking layer recommendation: BlockService.

##### `/ipfs/CID/PATH`

IPFS-Path-Rule: Blocks the exact ipfs path that is referenced from the
multihash embedded the CID before attempting to resolve it. It does not block
the CID that the path resolves to.

Note `/ipfs/CID/path` and `/ipfs/CID/path/` are equivalent rules.

Blocking layer recommendation: PathResolver.

##### `/ipfs/CID/*` `/ipfs/CID/P/A/T/H*`

IPFS-Path-Prefix-Rule: Blocks any multihash-path combination starting with the
the given path prefix. `/*` includes the empty path. Thus `/ipfs/CID/*`
blocks the CID itself, and any paths. Examples:

- `/ipfs/CID/*` : blocks CID (by multihash) and any path before resolving.
- `/ipfs/CID/ab*`: blocks any path derived from the CID (multihash) and starting with "ab", including "ab"
- `/ipfs/CID/ab/*`: equivalent to the above.

Blocking layer recommendation: PathResolver + (BlockService if the CID itself is blocked too).

##### `/ipns/IPNS`

IPNS-rule: Blocks the given IPNS name before resolving. It does not block the CID that it
resolves to.

If the IPNS name is a domain name, it is blocked directy.

If the IPNS name is a CIDv1 (libp2p-key) or b58-encoded-multihash (CIDV0),
then the blocking affects the underlying Multihash.

Blocking layer recommendation: NameSystem.

##### `/ipns/IPNS/PATH`

IPNS-Path-rule: Blocks specifically the IPNS path, before resolving. Equivalent to `/ipfs/CID/PATH`.

Blocking layer recommendation: There is no good place to implement this rule
as the NameSystem only handles IPNS names (without paths), and the
path.Resolver only handles already-resolved Paths.

##### `/ipns/NAME/*` `/ipns/NAME/PATH*`

IPNS-Path-Prefix-Rule: Same as with the IPFS-Path-Prefix-Rule.

Blocking layer recommendation:  There is no good place to implement this rule
as the NameSystem only handles IPNS names (without paths), and the
path.Resolver only handles already-resolved Paths.

##### `/PATH` `/PATH/*` `/PATH*`

Subpath-Rule: Block solely by looking at the subpath component of an IPFS path. Examples:

- `/my/path`: blocks any item that tries to resolve `/my/path`, regardless of the CID used.
- `/my/path*` and `/my/path/*`: blocks any paths that contain the prefix `/my/path`.

Blocking layer recommendation: PathResolver.

##### `//DOUBLE_HASH`

Doublehash-Rule: Blocks using double-hashed item, which can be:

- The sha256-hex-encoded hash of `CIDV1_BASE32/PATH`: this is the legacy
  badbits block anchor format. It can only block by CID and not by
  multihash. When no path present, the trailing slash must be kept
  (`CIDV1_BASE32/`).
- A b58-encoded multihash (a.k.a CIDV0), corresponding to the Sum() of:
  - An IPNS-Path:
    - `/ipns/IPNS` when the IPNS name is NOT a CID.
    - The b58-encoded-multihash extracted from an IPNS key when the IPNS key
      is a CID.
  - An IPFS-Path: `b58-encoded-multihash/P/A/T/H` where the multihash is
    extracted from the CID in `/ipfs/CID/P/A/T/H` (The multihash and the CID
    are the same in the case of CIDV0). The `/P/A/T/H` component is optional
    and should not have a trailing `/`.

The latter form allows blocking by double-hash using any hashing function of
choice. Implementations will have to hash requests using all the hashing functions
used in the denylist, so we recommend sticking to one.

Conveniently, the latter form allows using a b58-encoded sha256 multihashes
(usual form of CIDv0 - `Qmxxx...`), so that double-hashes can be like:

```
$ printf "QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/my/path" | ipfs add --raw-leaves --only-hash --quiet | ipfs cid format -f '%M' -b base58btc
QmSju6XPmYLG611rmK7rEeCMFVuL6EHpqyvmEU6oGx3GR8
```

The rule `//QmSju6XPmYLG611rmK7rEeCMFVuL6EHpqyvmEU6oGx3GR8` will block `/ipfs/bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze/my/path`, with `QmSju6XPmYLG611rmK7rEeCMFVuL6EHpqyvmEU6oGx3GR8` being the base58-encoded multihash contained in `bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze`.

We can convert any CID to its multihash with:

```
$ ipfs cid format -f '%M' -b base58btc bafybeihrw75yfhdx5qsqgesdnxejtjybscwuclpusvxkuttep6h7pkgmze
QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768
```

Blocking layer recommendation: NameSystem + PathResolver + BlockService.

In order to check for a matching rule, the PathResolver should:

- IPFS path: convert the CID to v1base32 and hash `CIDV1BASE32/PATH` with the
  hashing functions used in the denylist. Match against declared double-hashes.
- IPFS path: convert the CID to CIDv0 and hash `CIDV0/PATH` without trailing `/` with the hashing functions used in the denylist. Match against declared double-hashes.
- IPNS path:

The NameSystem should:

- If NAME is a domain name: Hash `/ipns/NAME` with the hashing functions used in the denylist. Match against declared double-hashes.
- If NAME is a CID, extract the multihash, encoded with baseb58btc and hash it with the hashing functions used in the denylist. Match against declared double-hashes.

The BlockService should:

- Convert the CID to `CIDV1BASE32/` (keeping the CID codec and adding a slash at the end) and hash it with the hashing functions used in the denylist. Match against declared double-hashes.

- Convert the CID to b58-encoded-multihash (that is CIDv0) and hash the CID string.

##### `/mime/MIMETYPE` `/mime/*`

Blocks content detected to be of the given type. `/mime/*` blocks all the mimetypes and is meant to work with allow rules (all mimetypes blocked except specific ones).

Blocking layer recommendation: Unixfs

Our recommendation is that /mime/ rules automatically set IPFS clients into a
"unixfs only" mode where only unixfs (+raw blocks) are allowed at the
BlockService layer, and content type is checked at the Unixfs layer, as the
blocks get assembled into an actual files. That should cover gateway usage.

#### Allow (or negated) rules

Block items can be prepended by `+`, that items matching the rule are to be allowed
rather than blocked.

This can be used to undo existing rules, but also to add concrete exceptions to wider rules. Order matters, and Allow rules must come AFTER other existing rules.

Implementations should parse rules in general, and match them in inverse order
as they appear in the denylist, so an explicit Allow rule will be evaluated
before previously defined Deny rules, and can return non-blocked status for an
item before further processing.

Examples:

```
/ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/photo*
+/ipfs/QmecDgNqCRirkc3Cjz9eoRBNwXGckJ9WvTdmY16HP88768/photo123.jpg
/mime/*
+/mime/text/plain
+/ipns/my.domain
/ipns/my.domain
```

In this example, `/ipns/my.domain` stays blocked because the deny rule happens
after the allow one.

#### Hint list

A hint list is an optional space-separated list of hints associated with specific block items in the form:

```
<block_item> hintA:v1 hintB:v2 hintC:v3
```

Block items and hints are separated by one or more consecutive instances of
the "space" character.

### Test fixtures

TODO

### Security

This proposal takes into account security:

- Denylist headers and line-length limits are well specified to avoid malformed lists to cause things like large memory usage while parsing.
- Supported type of blocks have been though out to avoid amplified consumption of resources or side effects (i.e. downloading of additional dag-blocks) during the implementation.
- Paths are sanitized and follow the same encoding rules as URLs (RFC 3986), so that existing and safe parsing can be done with regular tooling.
- Official and custom-hint systems allow the introduction of additional features that can co-exist with the specified format without needing to be supported.

### Privacy and User Control

The main aspect regarding privacy in the scope of this specification has to do
with supporting the use of double-hashing in block items.

Double-hashing is particularly useful when the denylist is meant to be shared. Double-hashing:

- Prevents readers of the denylist to know what the original content-address
  of the block item is, and therefore avoids making the denylist a directory
  of *bad* content. This is particularly useful for harmful content, where
  solely accessing it is bad.
- Double-hashing does not exclude adding additional context via comments or hints
- The presence of a single double-hashed block item makes necessary that the implementation hashes every CID and CID+path that needs to be checked, which has a performance impact.
- In general, it is good that users can inspect the nature of the content blocked if they wish to, so we recommend not using double-hashing by default as it helps transparency (i.e. blocking due to copyright claims).

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
