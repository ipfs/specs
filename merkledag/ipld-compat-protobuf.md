# IPLD conversion with Protocol Buffer legacy IPFS node format

IPLD has a known conversion with the legacy Protocol Buffers format in order for new IPLD objects to interact with older protocol buffer objects.

## Detecting the format in use

The format is encapsulated after two multicodec headers. The first have the codec path `/mdagv1` and can be used to detect whether IPLD objects are transmitted or just legacy protocol buffer messages.

The second multicodec header is used to detect the actual format in which the IPLD object is encoded:

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

- It MUST be convertible back to protocol buffers, resulting in an identical byte stream (so the hash corresponds). This implies that ordering and duplicate links must be preserved in some way.
- When using paths as defined in the IPLD specification, links should be accessible without further indirection. This requires the top node object to have keys corresponding to link names.
- Link names should be able to be any valid file name. As such, the encoding must ensure that link names do not conflict with other keys in the model.

There is a canonical form which is described below:

    {
      "data": "<Data>",
      "named-links": {
        "<Links[0].Name>": {
          "@link": "<Links[0].Hash.(base58)>",
          "name": "<Links[0].Name>",
          "size": <Links[0].Tsize>
        },
        "<Links[2].Name>": {
          "@link": "<Links[1].Hash.(base58)>",
          "name": "<Links[1].Name>",
          "size": <Links[1].Tsize>
        },
        ...
      }
      "ordered-links": [
        "<Links[0].Name>",
        {
          "name": "<Link[1].Name>",
          "@link": "<Links[1].Hash.(base58)>",
          "size": <Links[1].Tsize>
        }
        "<Links[2].Name>",
        ...
      ]
    }

- Here we assume that the link #0 and #1 have the same name. As specified in [ipld.md](ipld.md) in paragraph **Duplicate property keys**, only the first link is present in the named link section. The other link is present in the `ordered-links` section for completeness and to allow recreating the original protocol buffer message.

- Links are not accessible on the top level object. Applications that are using protocol buffer objects such as unixfs will have to handle that and special case for legacy objects.

- No escaping is needed and no conflict is possible
