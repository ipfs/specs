# IPLD conversion with Protocol Buffer legacy IPFS node format

IPLD has a known conversion with the legacy Protocol Buffers format in order for new IPLD objects to interact with older protocol buffer objects.

## Detecting if the legacy format is in use

The format is encapsulated after a multicodec header that tells which codec to use. In addition, older applications that do not yet use the multicodec header will transmit a protocol buffer stream. This can be detected by looking at the first byte:

- if the first byte is between 0 and 127, it is a multicodec header
- if the first byte if between 128 and 255, it is a protocol buffer stream

In case a multicodec header is in use, the actual IPLD object is encapsulated first with a multicodec header which identifier is `/mdagv1`, then by a second header which identifier corresponds to the actual encoding of the object:

- `/protobuf/msgio`: is the encapsulation for protocol buffer message
- `/json`: is the encapsulation for JSON encoding
- `/cbor`: is the encapsulation for CBOR encoding

For example, a protocol buffer object encapsulated in a multicodec header would start with "`\x08/mdagv1\n\x10/protobuf/msgio\n`" corresponding to the bytes :

    08 2f 6d 64 61 67 76 31 0a
    10 2f 70 72 6f 74 6f 62 75 66 2f 6d 73 67 69 6f 0a

A JSON encoded object would start with "`\x08/mdagv1\n\x06/json\n`" and a CBOR encoded object would start with "`\x08/mdagv1\n\x06/cbor\n`".


## Description of the legacy protocol buffers format

This format is defined with the Protocol Buffers syntax as:

    message PBLink {
        optional bytes  Hash = 1;
        optional string Name = 2;
        optional uint64 Tsize = 3;
    }
    
    message PBNode {
        repeated PBLink Links = 2;
        optional bytes  Data = 1;
    }

## Conversion to IPLD model

The conversion to the IPLD data model must have the following properties:

- It should be convertible back to protocol buffers, resulting in an identical byte stream (so the hash corresponds). This implies that ordering and duplicate links must be preserved in some way.
- When using paths as defined earlier in this document, links should be accessible without further indirection. This requires the top node object to have keys corresponding to link names.
- Link names should be able to be any valid file name. As such, the encoding must ensure that link names do not conflict with other keys in the model.

There is a canonical form which is described below:

**FIXME: decide on that form. Until now, multiple possible forms are presented here**


### Escape encoding

A protocol buffer message would be converted the following way:

    {
      "<Links[0].Name.(escaped)>": {
        "mlink": "<Links[0].Hash.(base58)>",
        "name": "<Links[0].Name>",
        "size": <Links[0].Tsize>
      },
      "<Links[1].Name.(escaped)>": {
        "mlink": "<Links[1].Hash.(base58)>",
        "name": "<Links[1].Name>",
        "size": <Links[1].Tsize>
      },
      ...
      "@attrs": {
        "data": "<Data>",
        "links": [
          {
            "mlink": "<Links[0].Hash.(base58)>",
            "name": "<Links[0].Name>",
            "size": <Links[0].Tsize>
          },
          {
            "mlink": "<Links[1].Hash.(base58)>",
            "name": "<Links[1].Name>",
            "size": <Links[1].Tsize>
          }
        ]
      }
    }

Notes :

- The `links` array in the `@attrs` section is there to preserve order and duplicate links to hash back to the exact same protocol buffer object.

- Link hashes are encoded in base58

- The link names are escaped to prevent clashing with the `@attr` key.

- The escaping mechanism transforms the `@` character into `\@`. This mechanism also implies a modification of the path algorithm. When a path component contains the `@` character, it must be escaped to look it up in the IPLD Node object.

    For example, a _filesystem merkle-path_ `/root/first@component/second@component/third_component` would look for object `root["first\@component"]["second\@component"]["third_component"]` (following mlinks when necessary).

**FIXME: Using the `@` character is not mandatory. Any other character could fit. Don't hesitate to give your ideas.**

### Other proposition that avoids escaping

We can imagine another transformation where the link names are not escaped. For example:

    {
      "<Links[0].Name>": {
        "mlink": "<Links[0].Hash.(base58)>",
        "tsize": <Links[0].Tsize>
      },
      "<Links[1].Name>": {
        "mlink": "<Links[2].Hash.(base58)>",
        "tsize": <Links[2].Tsize>
      },
      ...
      ".": {
        "data": "<Data>",
        "links": [
          "<Links[0].Name>",
          {
            "name": "<Link[1].Name>",
            "mlink": "<Links[1].Hash.(base58)>",
            "tsize": <Links[1].Tsize>
          }
          "<Links[2].Name>",
          ...
        ]
      }
    }

Notes:

- Very conveniently, we use the key `.` to represent data for the current node, and any other key can represent a link. This means that we forbid link to be named `.`. This is in any case a good thing to do as the `.` element in paths can always be removed (the same way `..` can be replaced by the parent directory)

- No escaping is needed, and no modification to the path algorithm is needed.

- Link order is kept by using the link names for links present in the top node. This avoid repeating identical data (even though it is probably generated on the fly).

    Links that cannot be present in the top node (the case for the link named `.`, which is forbidden, or for links that are repeated with the same name) are present in full to allow reconstructing the exact protocol buffer object.
