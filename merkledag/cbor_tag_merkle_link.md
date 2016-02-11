Merke Links
===========

This document registers a tag for binary MIME messages in Concise Binary Object Representation (CBOR) (ref. 1).

    Tag: 258
    Data item: byte string, text string or array
    Semantics: IPLD Merkle Link

Introduction
------------

IPLD documents, when encoded in CBOR may have links to other IPLD documents. Such links are an important part of IPFS and should be able to be processed in priority. In this way, we define a tag to allow easy recognition of these links.

These links can also be represented in pure JSON or untagged CBOR. There is a one to one mapping between the tagged CBOR version and the untagged CBOR version. This tag describes this mapping in detail.

Detailed Semantics
------------------

Tag 258 can be applied to different types: a text string, a byte string and an array containing a string (text or binary) and a map.

byte strings can semantically be transformed to text strings. The conversion process is defined in the multiaddress specification.

### Simple text links ###

When the tag is applied to a text string, its is semantically equivalent to a map containing a single key `@link` associated with the text string.

### Simple binary encoded links ###

When the tag is applied to a byte string, it is semantically equivalent to a map containing a single key `@link` associated to the binary string decodec into its textual form.

### Links with attributes ###

When the tag is applied to an array, the array must have two elements. The first element is either a text or a binary string, and the second is a map. This is semantically equivalent to the map in which the key `@link` would be inserted before all other keys. This key would be associated to a text string that is either the same as the first array item if it is textual, or the textual representation of the binary string.

References
----------

1. Bormann, C. and Hoffman, P. "Concise Binary Object Representation (CBOR)". RFC 7049, October 2013.

2. Juan Benet. "Network address format". https://github.com/jbenet/multiaddr

Author
------

- Mildred Ki'Lya (mildred-pub at mildred dot fr)
- Credits to the IPLD team, in particular Juan Benet and David A Roberts

---

Any copyright to this specification is released to the Public Domain. http://creativecommons.org/publicdomain/zero/1.0/
