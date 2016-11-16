URI specifications
==================

Authors: [Patrik Wallström](github.com/pawal)

Reviewers:

* * *

# Abstract

For different applications to handle ipfs references there need to be URIs registered. In order to for applications to understand how to handle the references, the URIs needs to have specificaitions. The generic syntax for URIs are described in [RFC3986](https://tools.ietf.org/html/rfc3986).

The consensus of which URIs need to be specified can be found here: https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-157478515

# Status of this spec

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

Note: These specifications are currently in the wip phase, things are likely to change.

# Overview

The discussion on what URI schemes that are needed is concluded [here](https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-157478515). The discussion lead to the consensus that these URI schemas are needed:

 * **canonical NURI** is a file system **path**. Does not need a URI specification. Examples, where **Qm...** is a [multihash](https://github.com/multiformats/multihash):
    * /ipfs/Qm...
    * /ipns/Qm...
    * /ipfs/Qm.../filename
    * /ipns/Qm.../dir/filename

 * **[ipfs://](./ipfs.md)** style URI that references IPFS content with the multihash and filepath.

 * **[fs://](./fs.md)** style URI referencing ipfs-specific AND non-ipfs specific hash resolution mechanisms
     * fs://ipns/Qm.../foo/bar

# Notes

Previous work has been done with URIs for naming hashes, most notably [RFC6920](https://tools.ietf.org/html/rfc6920). 6920 create the URI schemas ni: and nih: where the latter is a human-speakable name for the hash, both schemas are published in the [IANA registry](http://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml). These schemas were created from the EU FP7 project [SAIL](http://www.sail-project.eu/), Scalable and Adaptive Internet Solutions.

The guidelines to submitting URI schemas to the IANA registry is described in [RFC7595](https://tools.ietf.org/html/rfc7595).
