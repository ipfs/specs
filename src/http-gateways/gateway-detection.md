---
title: User-Preferred Gateway Detection
description: >
  How applications detect the user-preferred IPFS Gateway via the
  IPFS_GATEWAY environment variable or a well-known gateway file.
date: 2026-08-07
maturity: reliable
editors:
  - name: Mark Gaiser
    github: markg85
  - name: Marcin Rataj
    github: lidel
    affiliation:
      name: Shipyard
      url: https://ipshipyard.com
thanks:
  - name: Tim Perry
    github: pimterry
  - name: Dietrich Ayala
    github: autonome
  - name: Dave Justice
    github: meandavejustice
  - name: dirkf
    github: dirkf
  - name: Daniel Norman
    github: 2color
tags: ['httpGateways', 'integratingHttpGateways']
order: 99
---

## Introduction

This document defines conventions for how applications can identify an available
IPFS Gateway, and how IPFS Gateway implementations can signal their own endpoint to
client applications.

## Specification

There are two ways of hinting the user-preferred gateway URL:

- Setting the `IPFS_GATEWAY` environment variable
- Creating a `gateway` file at a well-known path

Applications SHOULD evaluate these hints in order and stop on the first match:

1. Check if a valid `IPFS_GATEWAY` environment variable is set
2. Check if a valid `gateway` file is present at one of the well-known filesystem paths

If a hint is present but its value is not a valid URL, applications SHOULD
report an error instead of silently falling back to the next hint.

If no valid hint is found, gateway selection is unconfigured. Applications
SHOULD NOT fall back to a hard-coded non-localhost gateway (see Security below).

### `IPFS_GATEWAY` Environment Variable

When the `IPFS_GATEWAY` environment variable is set, the value SHOULD be interpreted
as the URL of the IPFS Gateway to use. The value holds a single URL, following
the same rules as the first line of the `gateway` file.

Applications SHOULD give this variable precedence over gateway URLs from
internal application configuration. Explicit per-invocation user input, such as
a command-line argument, MAY take precedence over this variable.

### The `gateway` Configuration File

Client application SHOULD check if file is present at specific filesystem paths, in order:

1. If `IPFS_PATH` is set, try `$IPFS_PATH/gateway`
2. Otherwise, if `HOME` is set, try `$HOME/.ipfs/gateway` (the default `IPFS_PATH` location)
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

The first line MUST be a valid `http://` or `https://` URL consisting only of
a scheme, host, and optional port, with no path, query, or fragment
(e.g., `http://127.0.0.1:8080`). The gateway at this URL MUST support
:cite[trustless-gateway], SHOULD support :cite[path-gateway] when deserialized
responses are required, and SHOULD support :cite[subdomain-gateway] when Origin
isolation is required.

Implementations MAY support additional lines for gateway pools or failover.
Additional lines, when present, MUST follow the same URL rules, and empty
lines MUST be ignored. Implementations that do not support multiple URLs
SHOULD read only the first line and ignore the rest of the file.

### Security

Applications that integrate IPFS support via HTTP gateways:

- SHOULD NOT hard-code a non-localhost URL as a default fallback. Instead, they
  SHOULD ask the user to define a preferred IPFS gateway using one of the
  methods defined in this document.
- SHOULD either warn the user when a non-localhost gateway is used for
  deserialized responses (risk of MITM), or (preferred) limit HTTP use
  outside of localhost to verifiable response types defined in
  :cite[trustless-gateway].
- When running in a web browser, SHOULD use a gateway URL that qualifies as a
  [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts):
  either `https://`, or localhost (e.g., `http://127.0.0.1:8080`), which
  browsers treat as potentially trustworthy.
- When Origin isolation is required, SHOULD use a :cite[subdomain-gateway]
  (e.g., `http://{cid}.ipfs.localhost:8080`), so each content root is loaded
  from its own origin.

### Privacy and User Control

Applications SHOULD NOT default to public gateways (see Security above).
Instead, applications SHOULD suggest to the user how to run a local node.

### Compatibility and Testing

Implementers SHOULD test against implementations mentioned in :cite[ipip-0280]
as the baseline for making decisions around maximizing interoperability.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
