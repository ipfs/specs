# IPIP 0180: Gateways file
- Start Date: 2022-12-08
- Related Issues:
  - https://github.com/ipfs/kubo/issues/8847

## Summary

Defines how IPFS implementations must expose their gateway. This only affects the file-based method of exposiing a gateway.

## Motivation

Applications wanting to use IPFS resources are, without this spec, left to invent their own ways of finding a gateway. This spec defines how an application wanting to implement IPFS support can find a list of gateways.

Users should be aware that this is just a list of gateways. It could contain a local gateway but doesn't have to. It's up to the user to do filtering on that list to find an actual local gateway.

## Detailed design

This integration spec defines the recommended way for IPFS implementations to expose the gateway they host for IPFS integrations (think applications wanting to support IPFS) to find and use said gateways.

An IPFS implementation must expose the gateway it serves in a file called `gateways` (more on where this file is located in the section below). The gateway must be exposed as a single line in the following format:

`http://<ip>:<port>`

In case the `gateways` file already exists, this line must be **prepended** with the rest of the data left as-is. This is a soft guarantee that any locally running gateways are at the top of the list. In any other case the `gateways` file must be created and the `gateway` line inserted to it as one line terminated with `\r\n`.

Upon shutdown of the IPFS implementation it is to remove it's specific gateway line from the `gateways` file and leave no gaps. It must take care potential empty lines and leave a file behind with the remaning gateways each on a single line and terminated - per line - with `\r\n`.

### Gateways file placement

As a reference, [this](https://github.com/cjbassi/platform-dirs-rs#path-list) list of configuration folders is used.

| | with variables | full paths |
| -------- | -------- | -------- |
| Windows     | %APPDATA%/ipfs     | C:/Users/%USERNAME%/AppData/Roaming/ipfs     |
| macOS     | $XDG_CONFIG_HOME/ipfs     | ~/Library/Application Support/ipfs     |
| Linux     | $XDG_CONFIG_HOME/ipfs     | ~/.config/ipfs     |

The `gateways` file must be placed in the folder appropiate for the platform the IPFS implementation instance is running on. For linux that would be `~/.config/ipfs/gateways` or `$XDG_CONFIG_HOME/ipfs/gateways`

The file will be created when it doesn't exist.
It will never be delated! This means the file will exist and be empty when an IPFS implementation removes it's own gateway from that file and if that gateway was the only line in the file.

## Test fixtures

N/A

## Design rationale

To simplify IPFS integrations in third party applications it's important to know if said application can use a gateway. This spec defines the rules to find such a gateway and/or how to influence it.

### User benefit

Users, applications using IPFS, get a defined way to find gateways to use. Without this spec there is no defined way.

### Compatibility

**This is only applicable to Kubo! Other IPFS implementations are to ignore this**
The legacy gateway file (placed in `~/.ipfs/gateway`) was made up as a response to a need to know which gateway an IPFS node would expose. While that file itself was never specced out, it served the need. Some applications are using this file therefore the file has to be maintained for the Kubo reference implemenation. Any other IPFS implementation should ignore this.

The file only contains a single line being the http gateway url. For example: "http://localhost:8080".

The file conditions:
    1. is named "gateway"
    2. **only** exists when Kubo starts a gateway
    3. is removed when Kubo shuts down

Future Kubo implemenations will do the above via symlinking the `gateways` file to `gateway` while maintaining the same rules as stated above.

### Security

N/A

### Alternatives

There are no alternatives I'm aware of. There is [this](https://github.com/ipfs/kubo/issues/8847) issue that predates this very IPIP but also serves as starting block to this IPIP.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
