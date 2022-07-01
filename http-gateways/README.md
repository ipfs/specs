# Specification for HTTP Gateways

## About

**IPFS Gateway** acts as a **bridge between traditional HTTP clients and
IPFS.** Through the gateway, users can download files, directories and other
IPLD data stored in IPFS as if they were stored in a traditional web server.

**This directory** contains **the specification for HTTP Gateway:**
a description of HTTP  interface and conventions between an opinionated subset
of IPFS and the existing HTTP ecosystem of clients, tools, and libraries.

## **Intended audience**

The main goal of this spec is to provide reference documentation that is
independent of specific language or existing implementation, allowing everyone
to create a compatible Gateway, tailored to their needs and use cases.

<!-- (TODO: create a terse summary for docs.ipfs.io)
For user-facing documentation, please see
[https://docs.ipfs.io/reference/http/gateway/](https://docs.ipfs.io/reference/http/gateway/)
-->

# Specification index

## HTTP

These are "low level" gateways that expose IPFS resources over HTTP protocol.

* [PATH_GATEWAY.md](./PATH_GATEWAY.md) ← **START HERE**
* [TRUSTLESS_GATEWAY.md](./TRUSTLESS_GATEWAY.md)

## Web

Special types of gateway which leverage `Host` header in addition to URL `pathname`.

Designed for website hosting and improved interoperability with web browsers
and [origin-based security
model](https://en.wikipedia.org/wiki/Same-origin_policy).

* [SUBDOMAIN_GATEWAY.md](./SUBDOMAIN_GATEWAY.md)
* [DNSLINK_GATEWAY.md](./DNSLINK_GATEWAY.md)
