# Specification Template

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
terms. Our list format starts by including a **header**, which provides basic
information about the list itself, and can be used to set list-wide options
(*hints*, as we call them). We choose YAML for simplicity, readability, ease of
use and parser support.

In our lists, *hints* are a way of providing additional, optional information,
relative to the items in the list that can be processed by machines. For
example, a hint can tell implementations about HTTP return codes for blocked
items, when they are requested through the gateway. A hint can provide a
reason, or specify deviations from defaults. While there will be a minimal
number of specified hints, users can include custom ones and parsers can
implement functionality accordingly even when not part of the base specification.

The denylist itself, after the header, is a collection of **block items** and
block-item-specific hints. There are different flavours of block items,
depending on whether we are blocking by CID, CID+path, IPNS, using
double-hashing etc. but the idea is that whether an item is blocked or not can
be decided directly and ideally, prior to retrieval.

We include *negative block items* as well, with the idea of enabling denylists
that are append-only. One of the main operational constraints we have seen is
that a single item can cause a full denylist to be re-read, re-parsed and
ultimately need a full restart of the application. We want to avoid that by
providing operators and implementors with the possiblity of just watching
denylists for new items without then need to restart anything while new items
are added. This also gives the possiblity of storing an offset and seeking
directly to it after application restarts.

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
that the following should just work accross implementations for blocking
something new:

```
echo /ipfs/Qmcid >> ~/.config/ipfs/custom.deny
```

We conciously avoid defining any other API other than expecting
implementations to honor blocking what is on the denylist and act accordingly
when it is updated. Thus, we do not require implementations to provide an HTTP
endpoint to modify list items etc. that is outside the scope of this spec, and
entirely dependent on what each implementation wants to do and how they want
to do it.

As a last note, if we take Kubo and the go-ipfs stack as the reference IPFS
implementation, we expect the blocking-layer (that is, the introduction of the
logic that decides whether an item is blocked or not), to happen cleanly at
the `Resolver` and `BlockService` interfaces.

This specification corresponds to V1 of the compact list format. We have
limited the number of features and extensions to a minimum to start working
with, leaving some ideas on the table and the door open to develop the format
in future versions.

## Specification

### Denylist file extension and locations

While not pertaining to the denylist format itself, we introduce the following conventions about denylist files when they are stored in the local filesystem:

- Denylist files are named with the extension `.deny`.
- Implementations should look in `/etc/ipfs/denylists/` and `$XDG_CONFIG_HOME/ipfs/denylists/` for denylist files.
- Denylist files are processed in alphabetical order so that rules from later denylists override rules from earlier denylists on conflict.

### Denylist format

#### Summary

The following example showcases the features and syntax of a compact denylist:

```
version: 1
name: IPFSorp blocking list
description: A collection of bad things we have found in the universe
author: abuse-ipfscorp@example.com
hints:
  gateway_status: 410
  double_hash_fn: sha256
  double_hash_enc: hex
---
/ipfs/QmYvggjprWhRYiDhyZ57gtkadEBhcfPScGyx1AofkgAk3Q reason:DCMA
/ipfs/bafkreigtnn3j24rs5q2qhx3kleisjngot5w2lgd32armqbv2upeaqesrna
/ipfs/bafkreifhlk37n6gcnt6pjmvdtqdzxrok35wh46jjobrqqtqckbn4ygk3yy/dirty%20movies/xxx.mp4
/ipfs/bafkreidxe6kfaurhhxzkh6wsvbqwzcu5eluwm57a62gftxwt6w4zuiljte/*
/ipfs/bafkreigtdosqa2q542lhmt74aprtjsomobar6x3gp3zlrwdnyh56euphay/pics/secret*
/ipns/example.com gateway_status:410
/ipns/QmdxLxa4Sz6ygEhL9FKwfrknL9xXoeFJRFCDS8bQwFmFDz
/ipns/example.com/hidden/*
//f36d4ce6cf64f2aac2c8cab023be1af1842681bad77fb3b379740e2f76f10a31
/mime/*
-/mime/txt
```

#### High level list format

A denylist is made of an optional header and a list of blockitems separated by newlines.

```
<header>
---
<block_item1> [hint_list]
<block_item2> [hint_list]
...
```

#### Header

The list header is a YAML block:

- Must be valid YAML
- Fully optional
- 1KB maximum size
- Delimited by a line containing `---` at the end (document separator)

Known-fields:

- `version`: the denylist format version. Defaults to 1 when not specified.
- `name`
- `description`
- `author`
- `hints`: a map of *hints*. See section below for known hints

#### Hints

A *hint* is a key-value duple associated to the denylist as a whole (part of the header), or to a specific \<block_item\>.

Known hints:

- `double_hash_fn`: the multicodec string for the hashing function used for double-hashing. **Default**: `sha2-256`
- `double_hash_base`: the multibase string for the encoding if the double-hashing function result. **Default**: `base16`.

#### List body

A denylist is made of lines which are made by a *block items* followed by zero or more space-separated hints.

Lines should not contain more than 2MiB of data.

#### Block item

A block item represents a rule to enable content-blocking:
- `<path>` elements are expected to be %-encoded, per [RFC 3986, section 2.1](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).

##### `/ipfs/\<cid\>`

Blocks a specific multihash. If the CID is a CIDv1, it blocks the
multihash. Blocking directly by multihash must be done using CIDv0s (that is,
base58btc-encoded multihashes). This does not prevent resolution of sub-paths starting at this CID.

Blocking layer recommendation: BlockService.

##### `/ipfs/\<cid\>/\<path\>`

Blocks the exact ipfs path that is referenced from the multihash embedded the
CID before attempting to resolve it. It does not block the CID that the path resolves to.

Blocking layer recommendation: Resolver.

##### `/ipfs/\<cid\>/*` `/ipfs/\<cid\>/\<path\>*

Blocks any multihash-path combination starting with the the given path prefix. `/*` includes the empty path. Thus `/ipfs/<cid>/*` blocks the CID itself, and any paths. Examples:

- `/ipfs/<cid>/*` : blocks CID (by multihash) and any path before resolving.
- `/ipfs/<cid>/ab*`: blocks any path derived from the CID (multihash) and starting with "ab", including "ab"
- `/ipfs/<cid>/ab/*`: equivalent to the above.

Blocking layer recommendation: Resolver + (BlockService if the CID itself is blocked too).

##### `/ipns/\<ipns_domain_or_hash\>`

Blocks the given IPNS before resolving. It does not block the CID that it resolves to.

Blocking layer recommendation: Resolver.

##### `/ipns/\<ipns_name\>/\<path\>`

Blocks specifically the IPNS path, before resolving.

Blocking layer recommendation: Resolver.

##### `/ipns/\<ipns_name\>/*` `/ipns/\<ipns_name\>/\<path\>*`

Same as with the `/ipfs/` rule, blocks IPNS paths starting with the given path prefix. `/*` is equivalent to the empty string, so `/abc/*` == `/abc*`.

Blocking layer recommendation: Resolver.

##### `/\<path\>` `/\<path\>/*` `/\<path\>*`

Block solely by looking at the path component, and ignoring the CID/IPNS parts, before resolving.

This blocks all the paths matching exactly or having the same prefix as the one in the rule:

- `/my/path`: blocks any item that tries to resolve `/my/path`, regardless of the CID used.
- `/my/path*` and `/my/path/*`: blocks any paths that contain the prefix `/my/path`.

Blocking layer recommendation: Resolver.

##### `//\<double_hash\>`

Blocks a double-hashed item, which can be:

- The hash of a CIDv1base32[+path]: legacy badbits, block-by-cid format
- The hash of an IPNS path `/ipns/*`.
- The hash of a CIDv0[+path]

Blocking layer recommendation: Resolver + BlockService.

In order to check for a matching rule, the Resolver should:

- IPFS path: convert the CID to v1base32 and hash the path without the `/ipfs/` prefix.
- IPFS path: convert the CID to v0 and hash the path without the `/ipfs/` prefix.
- IPNS path: hash the path "as is".

The Blockservice should, in turn do the following to check for matches:

- Convert the CID to v1base32 (keeping the codec) and hash the CID string
- Convert the CID to v0 and hash the CID string

When blocking by double-hashing the recommendation is to use the result of hasing `<cidv0_to_block>[/<optional_path>]`. This ensures that blocking by multihash happens.

##### `/mime/\<mimetype\>` `/mime/*`

Blocks content detected to be of the given type. `/mime/*` blocks all the mimetypes and is meant to work with allow rules (all mimetypes blocked except specific ones).

Blocking layer recommendation: Unixfs

Our recommendation is that /mime/ rules automatically set IPFS clients into a
"unixfs only" mode where only unixfs (+raw blocks) are allowed at the
BlockService layer, and content type is checked at the Unixfs layer, as the
blocks get assembled into an actual files. That should cover gateway usage.

#### Allow block items

Block items can be prepended by `+`, signaling that they are to be allowed and
triumphing over other negative entries. Implementations should check first if
items have been allowed, before processing blocking rules. Examples:

```
/mime/*
+/mime/text/plain
/ipfs/<cid>/photo*
+/ipfs/<cid>/photo123.jpg
```

#### Negative block items

Block items can be prepended `-`, signaling that they undo a block item found
previously on the list. This allows to remove entries from a list by just
negating them in an append-only fashion.

#### Hint list

A hint list is an optional space-separated list of hints associated with specific block items in the form:

```
<block_item> hintA:v1 hintB:v2 hintC:v3
```

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
