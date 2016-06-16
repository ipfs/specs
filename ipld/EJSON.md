EJSON Specification
===================

EJSON is a variation on top of JSON, first created by
[Meteor](http://docs.meteor.com/api/ejson.html) that allows to use additional
data types in JSON. It is used in the context of IPLD to allow inclusion of
binary data inside JSON (encoded as Base 64) and add merkle link objects.

EJSON serialisation format is JSON. EJSON data model is a superset of JSON
because of its extra data types.

Binary Data
-----------

It is possible to encode a binary string in a EJSON document using the base64
encoding. Any EJSON object containing a single key named `$binary` mapping to a
base64 string is converted in an extended JSON object having the binary string
unescaped.

Example: the following EJSON document:

    { "$binary": "SGVsbG8AV29ybGQA" }

Is converted to the following string:

    "Hello\0World\0"

Date
----

A date can be represented by a timestamp in **milliseconds** since the unix
epoch using:

    { "$date": ... }

Not a Number, Infinites
-----------------------

The Not a Number value can be represented using:

    { "$InfNaN": 0 }

Negative infinity:

    { "$InfNaN": -1 }

Positive infinity:

    { "$InfNaN": 1 }

User Types
----------

Any user type can be encoded using:

    { "$type": "<type name>", "$value": ... }

### Merkle Links ###

Merkle links can be represented as a user type:

- the user type name would be `"ipfs/merkle-link"`
- the user type value would be the string representation of the link

Escape mechanism
----------------

A EJSON object having a single key named `$escape` is used to escape legitimate
JSON code that might match EJSON code instead.

Example: the following EJSON document:

    { "$escape": { "$date": "not a date" } }

Is converted to the following JSON document:

    { "$date": "not a date" }

When generating the EJSON document, any JSON object with a single key that
starts with the character `$` should be escaped this way. Any JSON object with
two keys that are `$type` and `$value` (in either order) should also be escaped.


