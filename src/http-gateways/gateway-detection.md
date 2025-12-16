---
title: Detecting User-Preferred IPFS Gateway
description: >
  Specification of the rules and standards for detecting and identifying
  user-preferred IPFS gateways within applications, enabling seamless
  integration and user control.
date: 2025-12-16
maturity: reliable
editors:
  - name: Mark Gaiser
    github: markg85
  - name: Marcin Rataj
    github: lidel
    url: https://lidel.org/
    affiliation:
        name: Shipyard
        url: https://ipshipyard.com
tags: ['httpGateways', 'integratingHttpGateways']
order: 99
---


## Introduction

This document defines conventions for how applications can identify available
IPFS gateway, and how IPFS gateway implementations can signal own endpoint to
client applications.

## Specification

There are two ways of hinting user-preferred gateway URL:

- Setting the `IPFS_GATEWAY` environment variable
- Creating a `gateway` file at a well-known path

Applications SHOULD evaluate these hints in order and stop on the first match:

1. Check if a valid `IPFS_GATEWAY` environment variable is set
2. Check if a valid `gateway` file is present at one of well-known filesystem paths


### `IPFS_GATEWAY` Environment Variable

When `IPFS_GATEWAY` environment variable is set, the value SHOULD be interpreted
as URL of IPFS Gateway application to use.

This variable SHOULD override gateway selection done by all other means, including
internal application configuration.

### The `gateway` Configuration File

Client application SHOULD check if file is present at specific filesystem paths, in order:

1. If `IPFS_PATH` is set, try `$IPFS_PATH/gateway`
2. If `HOME` is set, try `$HOME/.ipfs/gateway`
3. Try OS-specific paths:
   - Linux/Unix:
     1. `$XDG_CONFIG_HOME/ipfs/gateway` (only if `XDG_CONFIG_HOME` is set)
     2. `$HOME/.config/ipfs/gateway` (default XDG location)
     3. `/etc/ipfs/gateway` (system-wide)
   - Windows:
     1. `%LOCALAPPDATA%/ipfs/gateway` (local user)
     2. `%APPDATA%/ipfs/gateway` (roaming user)
     3. `%PROGRAMDATA%/ipfs/gateway` (system-wide)
   - macOS:
     1. `$HOME/Library/Application Support/ipfs/gateway` (user)
     2. `/Library/Application Support/ipfs/gateway` (system-wide)

When `gateway` file is present, the file contents MUST be interpreted as an
ASCII text file with one URL per line (separated by `\n` or `\r\n`).

The first line MUST be a valid `http://` or `https://` URL without a path
(e.g., `http://127.0.0.1:8080`). The gateway at this URL MUST support
:cite[trustless-gateway], SHOULD support :cite[path-gateway] when deserialized
responses are required, and SHOULD support :cite[subdomain-gateway] when Origin
isolation is required.

Implementations MAY support additional lines for gateway pools or failover.
Implementations that do not support multiple URLs SHOULD read only the first
line and ignore the rest of the file.

### Security

Applications that integrate IPFS support via HTTP gateway:

MUST NOT hard-code non-localhost URL as a default fallback. Instead, SHOULD ask
user to define preferred IPFS gateway using one of methods defined in this
document.

SHOULD either warn user when non-localhost gateway is used for deserialized
responses (warning about the risk of MITM), or (preferred) limit HTTP use
outside of localhost to verifiable response types defined in
:cite[trustless-gateway].

### Privacy and User Control

Applications SHOULD never default to public gateways. Instead, suggest to the
user how to run a local node.

### Compatibility and Testing

Implementers should test against implementations mentioned in :cite[ipip-0280]
as the baseline for making decisions around maximizing interoperability.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
