---
# IPIP number should  match its pull request number. After you open a PR,
# please update title and update the filename to `ipip0000`.
title: "IPIP-0504: Provider Query Parameter"
date: YYYY-MM-DD
ipip: proposal
editors:
  - name: Vasco Santos
relatedIssues:
  - link to issue
order: 0504
tags: ['ipips']
---

## Summary

A URI-based format for expressing content-addressed identifiers (such as IPFS CIDs) optionally augmented with one or more provider hints. This format aims to support a simple, unopinionated, transport-agnostic scheme to simplify data retrieval in content-addressable systems by introducing a clear, extensible, and broadly compatible URI format.

## Motivation

Content-addressable systems, such as IPFS, allow data to be identified by the hash of its contents (CID), enabling verifiable, immutable references. However, retrieving content typically relies on side content discovery systems (e.g. DHT, IPNI), even when a client MAY know one (or more) provider of the bytes. A provider in this context is any node, peer, gateway, or service that can serve content identified by a CID.

Existing solutions (e.g., magnet URIs, RASL) propose alternative ideas where provider hints are encoded next to the content identifier. Inspired by these solutions and focusing particularly on ergonomics, extensibility, and ease of adoption, this IPIP aims to augment an IPFS URI with a provider query parameter.

## Requirements, Goals, and Non-Goals

### Goals

| Goal                              | Description                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Low-effort adoption**           | Enable systems like IPFS (e.g., Kubo, Helia), gateways, etc., to adopt the format with minimal changes. Or even no changes by relying on current discovery systems.             |
| **Extensible hint system**        | Support encoding multiple transport hints (e.g., HTTP, TCP), while extensible to support intermediary hops (e.g. IPNI, RASL), priorities/fallbacks, etc.                        |
| **Preserve base compatibility**   | Maintain compatibility with existing URI forms such as `ipfs://CID/...` and HTTP gateway URLs.                                                                                  |
| **Ergonomic for CLI and sharing** | Should be human-editable, URL-query-based, no strict URL-encoding beyond what browsers or CLIs already handle. Easy to copy/paste, share, or edit by hand.                      |
| **Publisher-driven**              | Allow publishers to encode as much transport/discovery information as they want, with no requirement for intermediary systems. They can disappear, yet the link remains useful. |
| **Fallback resilience**           | URI should encode enough to allow clients to attempt various fallbacks or resolve via discovery (e.g., DHT, IPNI).                                                              |
| **Self-descriptive**              | May support optional encoding of content types to enable clients to understand how to interpret the content after verification.                                                 |
| **Protocol-agnostic**             | Must not be tied to HTTP-only systems. Other transport protocols, like the ones supported by libp2p, must be possible to use if encoded as hints.                               |
| **Forward-compatible**            | Format should support future expansions: new hint types, encodings, content representations, etc.                                                                               |

### Non-Goals

| Non-Goal                                            | Reason                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Replace existing `ipfs://` or HTTP gateway URLs** | This format builds upon and extends them; not a replacement.                                                                       |
| **Strictly define a resolution order**              | Clients may choose how and in what order to try hints or fallback strategies.                                                      |
| **Mandate use of a centralized service**            | While some hints may include centralized endpoints (e.g., HTTP URLs), the URI format should support fully decentralized retrieval. |
| **Guarantee live access**                           | A hint may point to an offline, censored or throttled node. The client may use other hints or its own discovery logic.             |
| **Act as a trust layer**                            | These URIs do not manage identity or trust directly—verification remains based on CID integrity.                                   |

### Requirements

| Requirement                              | Reasoning                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CID as core address**                  | Content addressing should always resolve to a CID. Provider hints decorate, not replace, this.                                                      |
| **Multi-hint support**                   | Support multiple hints per URI, enabling clients to try multiple fetch paths if one fails.                                                          |
| **Hinted provider must be optional**     | Clients without support for hints must still be able to resolve using traditional discovery (DHT, IPNI, etc.), if the publisher set it up.          |
| **No required translation step**         | Links should not require dynamic translation (e.g., via an origin-based redirector). Links are self-contained.                                      |
| **Minimal client assumptions**           | Clients may safely ignore unknown hints and still function. This ensures progressive enhancement.                                                   |
| **Composable with Gateway URLs**         | Hints should not break Gateway-based access patterns. For example, users should be able to use URLs like `https://gw.io/ipfs/CID?provider=http...`. |
| **Multiaddr-based hint syntax**          | For transport-agnosticism, hints should leverage multiaddr representation.                                                                          |
| **No third-party resolution dependency** | Links should work standalone—resolution should not depend on reaching a third-party registry or lookup service.                                     |
| **No strict encoding rules**             | Except for standard URI syntax, do not require opaque encodings. Hints should be human-readable when possible.                                      |

## Detailed design

This section defines a URI format for expressing a content identifier (CID) along with optional provider hints that **guide clients** on how/where to fetch the associated content. The format is intended to be directly compatible with both IPFS Gateway URLs and `ipfs://` scheme URIs, while preserving flexibility and extensibility to also be compatible with other systems or upgrades.

Please note that the current format is not intended to fully specify all identified use cases or requirements. But focus on leaving the door open to more in depth specifications for specific cases.

### 📐 Format

The proposed URI format introduces a new optional query parameter `provider`, which may appear one or more times. Each `provider` value represents a content provider hint and is composed by a `multiaddr` string. The `provider` parameter is optional, and clients MAY ignore it.

The base format is:

```sh!
[ipfs://<CID> | https://<gateway>/ipfs/<CID> | https://<CID>.ipfs.<gateway> ]?[provider=<multiaddr1>&provider=<multiaddr22>&...]
```

### 🧠 Parsing

The CID is the core of a Provider-Hinted URI. Clients MUST extract the CID before evaluating any hints. The format is designed to be compatible with current IPFS like URIs, while explicitly defining how to locate the CID and interpret `provider` query parameters.

#### CID Extraction Rules

To ensure consistent parsing, clients MUST extract the CID using the following precedence rules:

**1. Multi-dotted Origin Format**

If the CID is encoded as a subdomain label (e.g., `https://<CID>.ipfs.<gateway>`):

- The CID MUST be the left-most label.
- The label immediately following MUST be `ipfs`.
- Any path MUST NOT also include a CID.

**Example:**  
✅ `https://bafy...ipfs.dweb.link`  
❌ `https://bafy...ipfs.dweb.link/ipfs/bafybogus` (ambiguous; reject)

**2. Path-Based Format**

If the CID is encoded in the path (e.g., `https://<gateway>/ipfs/<CID>`):

- The path MUST match the pattern `/ipfs/<CID>`, where `<CID>` is a valid content identifier.

**Example:**  
✅ `https://gateway.io/ipfs/bafy...`  
❌ `https://gateway.io/bafy...` (no `/ipfs/` marker)

**3. ipfs:// Scheme Format**

- The CID MUST immediately follow the scheme delimiter: `ipfs://<CID>`.
- Additional path/query components MAY follow.

**Example:**  
✅ `ipfs://bafy...`

**4. Conflict Resolution**

If a CID is present in both a multi-dotted origin and in the path (even if they match), the URI MUST be rejected as ambiguous.

---

#### Query Parameter: `provider`

- Name: `provider`
- Type: URI Query Parameter (repeating allowed)
- Value: Multiaddr string (`?provider=multiaddr`).
- Interpretation: Optional hint for how to fetch and locate the content identified by the CID

 Name: `provider`
- Type: URI Query Parameter (repeating allowed)
- Value: Either a Multiaddr string (`?provider=multiaddr`) or HTTP URL string (`?provider=http-url`) that can be transformed to Multiaddr.
- Interpretation: An optional hint for how to locate and fetch the content identified by the CID
- When using a `multiaddr`, the address MAY rely on non HTTP transports.
- Alternatively, a `HTTP URL String` may be used to simplify usage and not directly be tied with multiaddr, especially for content providers without protocol specific infrastructure or multiaddr knowledge. While this approach is easy to adopt, it trades off flexibility:
  - Only HTTP(S) is supported as the transport layer.
  - Protocols available to fetch data cannot be specified explicitly.
  - It is implicitly assumed that the server responds with raw bytes hashed using SHA-256, for verification purposes against the CID provided.

#### Query Parsing (`provider` Parameters)

Once a CID has been successfully extracted, clients MAY parse `provider` parameters from the query string. Each `provider` value represents a provider hint, encoded as either a Multiaddr string (`?provider=multiaddr`) or HTTP URL string (`?provider=http-url`) that can be transformed to Multiaddr

**1. Parsing Rules**

- The `provider` query parameter MAY appear multiple times.
- If the provider value starts with a `/` it MUST be parsed as a `multiaddr`. Otherwise, it should be parsed as a `http(s)` like URL and, therefore transformable to `multiaddr` behind the scenes.
- Each `provider` parameter MUST be treated as an independent, optional provider hint.
- Clients MAY ignore hints with invalid multiaddrs or HTTP URLs.

**2. Evaluate hints**

- Clients MAY:
  - Ignore all `provider` parameters (if unsupported).
  - Evaluate hints in order of appearance (left-to-right).
  - Evaluate hints in parallel.
  - Apply their own prioritization or fallback strategies. If all hints fail, clients SHOULD fall back to default discovery strategies (e.g., DHT/IPNI), if available. Or even rely on discovery strategies in parallel.

Note that the `multiaddr` string should point to the `origin` server where given CID is provided, and not include the actual CID in the Hint multiaddr as a subdomain/path.

---

#### Example Parsing Flows

**Input URI:**
`https://bafy....ipfs.dweb.link/ipfs/bafy...?provider=/dns4/hash-stream-like-server.io/tcp/443/https`
→ **REJECT** (CID appears in both hostname and path)

**Input URI:**
`https://dweb.link/ipfs/bafy...?provider=/dns4/hash-stream-like-server.io/tcp/443/https&provider=/ip4/192.0.2.1/tcp/4001/ws`

→ Extract CID: `bafy...`
→ Parse `provider` params:

1. `/dns4/hash-stream-like-server.io/tcp/443/https` using `http`
2. `/ip4/192.0.2.1/tcp/4001/ws` using `libp2p`
   → Attempt connections via hints.

**Input URI:**
`https://dweb.link/ipfs/bafy...?provider=/dns4/hash-stream-like-server.io/tcp/443/https`

→ Extract CID: `bafy...`
→ Parse `provider` params:

1. `/dns4/hash-stream-like-server.io/tcp/443/https` using `http`
   → Attempt connections via hints.

**Input URI:**
`ipfs://bafk...?provider=https://foo.bar/example-framework.js`

→ Extract CID: `bafk...`
→ Parse `provider` params:

1. After verifying it is not a multiaddr, parse it as a URL and transform it to a valid multiaddr
   → Attempt connections via hints.

---

### Client Behavior and potential Server Roles

In addition to guiding client-side resolution, provider hints can be interpreted by servers under certain circumstances. The semantics of hint placement influence visibility and use:

- If the `provider` parameter is included in the **query** (`?...`), it MAY be communicated to the server depending on the client parsing the parameter.
- If the `provider` is encoded as a **fragment** (`#...`), it is only accessible to the client (browsers do not send fragments to the server).

This distinction allows URI publishers to tailor behavior:

- **Client-only mode:** Use a fragment (`#provider=...`) to ensure the server remains unaware of hint data. This is useful for privacy-preserving client apps or when hints are intended to guide only the client.
- **Server-assisted mode:** Use query parameters (`?provider=...`) to allow the server to parse and act on provider hints. This may enable proxy behavior, similar to existing IPFS gateways like `ipfs.io` or `dweb.link`.

Publishers of such URIs should consider the **security profile** and **trust assumptions** of their environment when deciding how to encode hints.

This flexibility supports a spectrum of use cases—from fully local client-side fetch strategies to cooperative client-server resolution pipelines.

## Design rationale

TODO

The rationale fleshes out the specification by describing what motivated
the design and why particular design decisions were made.

Provide evidence of rough consensus and working code within the community,
and discuss important objections or concerns raised during discussion.

### User benefit

The proposed **Provider-Hinted URI** format aims to enable "non interactive" content-addressable retrieval by enabling smart clients to fetch bytes directly from specified providers. This allows for reduced latency, lower load on discovery systems, and improved resiliency. his brings several concrete benefits to users across different contexts:

#### 🧑‍💻 Power Users & Developers

- **Improved Resilience for Data Migration & Recovery**
  - Enables seamless data exfiltration or migration from providers that do not participate in public discovery systems (e.g., not on Amino DHT or cid.contact). - Useful during outages or vendor lock-in scenarios.
- **Custom Provider Prioritization**
  - Developers can craft links that prefer self-hosted providers (e.g., local gateways, corporate infra) before falling back to public gateways or network discovery.

#### 🚀 Performance-Sensitive Applications

- **Reduced Latency on First Fetch**
  - By embedding direct provider hints, clients can skip discovery lookups and go straight to fetching bytes—significantly lowering time to first byte, especially in cold-start scenarios.
-	**Faster Initial Seeding**
  - Clients like IPFS Desktop can opportunistically add hints to links they generate (e.g., using their peer ID or trusted gateway), enabling faster and more deterministic bootstrapping when others use those links.
  - No need to wait until provider records are propagated in the discovery systems
  - Alternative approach for this use case is for IPFS Desktop to do manual provide on Amino DHT of the CID that is being shared. This would not require hardcoding anything in shared URL, but Provider Record will still be available until expiration if node goes offline.
-	**Protocol-Aware Connection Optimization**
  - Clients can skip trial-and-error protocol negotiation by targeting providers with clearly tagged protocol support, reducing failed dials and wasted roundtrips.

#### 🌍 Content Publishers & Infra Operators

-	**Edge Caching & Locality-Based Optimization**
  - Content can be pre-cached at the edge or in specific geographies. Hints can prioritize nearby locations (e.g. /dns/cache-berlin.example.com/tcp/443/https) to improve latency and reliability.
-	**Compatibility with Static Hosting**
  - Allows use of static CDNs or S3-like storage for verifiable delivery. Hints like https://foo.bar/example.js combined with CID verification unlock content-addressed [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)-like guarantees, even from legacy infra.

### Compatibility

These are optional hints, clients may opt to not use them. Therefore, there is no need to account for legacy compatibility or upgrade paths.

### Security

While guiding client-side resolution, there are no relevant security considerations to have. However, there may be privacy implications if these hints are forwarded to the servers under certain circumstances. The semantics of hint placement influence visibility and use:

- If the `provider` parameter is included in the **query** (`?...`), it MAY be communicated to the server depending on the client parsing the parameter.
- If the `provider` is encoded as a **fragment** (`#...`), it is only accessible to the client (browsers do not send fragments to the server).

This distinction allows URI publishers to tailor behavior:

- **Client-only mode:** Use a fragment (`#provider=...`) to ensure the server remains unaware of hint data. This is useful for privacy-preserving client apps or when hints are intended to guide only the client.
- **Server-assisted mode:** Use query parameters (`?provider=...`) to allow the server to parse and act on provider hints. This may enable proxy behavior, similar to existing IPFS gateways like `ipfs.io` or `dweb.link`.

Publishers of such URIs should consider the **security profile** and **trust assumptions** of their environment when deciding how to encode hints.

This flexibility supports a spectrum of use cases—from fully local client-side fetch strategies to cooperative client-server resolution pipelines.

Finally, there MAY exist additional privacy concerns while using a provider query parameter that make a single client easily tracked. For instance, if a malicious or noisy tracking entity starts encoded provider hints into all their URLs.

### Alternatives

There were considered other alternatives, but they typically fail to address all the goals/requirements above. Some of these can be seen at [hackmd.io/@vasco-santos/S1IKn51-eg](https://hackmd.io/@vasco-santos/S1IKn51-eg).

## Test fixtures

N/A

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
