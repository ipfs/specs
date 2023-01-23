# IPIP 0000: Double Hash DHT

<!-- IPIP number will be assigned by an editor. When opening a pull request to
submit your IPIP, please use number 0000 and an abbreviated title in the filename,
`0000-draft-title-abbrev.md`. -->
![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)
- Start Date: 2023-01-18
- Related Resources:
  - [Specs in Notion](https://pl-strflt.notion.site/Double-Hashing-for-Privacy-ff44e3156ce040579289996fec9af609)
  - [WIP Implementation](https://github.com/ChainSafe/go-libp2p-kad-dht)
  - https://github.com/ipfs/specs/pull/334
  - https://github.com/ipfs/specs/issues/345

## Summary

<!--One paragraph explanation of the IPIP.-->
/TODO

## Motivation

IPFS is currently lacking of many privacy protections. One of its principal weaknesses currently lies in the lack of privacy protections for the DHT content routing subsystem. Currently in the IPFS DHT, neither readers (clients retrieving content) nor writers (hosts storing and distributing content) have much privacy with regard to content they consume or publish. It is trivial for a DHT server node to associate the requester's identity with the accessed content during the routing process. A curious DHT server node, can request the same CIDs to find out what content other users are consuming. Improving privacy in the IPFS DHT has been a strong request from the community for some time.

The changes described in this document introduce a DHT privacy upgrade boosting the reader’s privacy. It will prevent DHT tracking as described above, and add Provider Records Authentication. The proposed modifications also add a slight Writer Privacy improvement as a side effect.

## Detailed design

### Definitions

<!-- TODO: Define data format for each. e.g byte array of 32 bytes, etc. -->
- **`CID`** is the IPFS [Content IDentifier](https://github.com/multiformats/cid)
- **`MH`** is the [Multihash](https://github.com/multiformats/multihash) contained in a `CID`. It corresponds to the digest of a hash function over some content.
- **`HASH2`** is defined as `SHA256(bytes("CR_DOUBLEHASH") || MH)`. It represents the location of the Kademlia keyspace for the Provider Record associated with `CID`.
- **Content Provider** is the node storing some content, and advertising it to the DHT.
- **DHT Servers** are nodes running the IPFS public DHT. In this documents, DHT Servers mostly refer to the DHT Servers storing the Provider Records associated with specific `CID`s, and not the DHT Servers helping routing lookup requests to the right keyspace location. 
- **Client** is an IPFS client looking up a content identified by an already known `CID`.
- **Publish Process** is the process of the Content Provider communicating to the DHT Servers that it provides some content identified by `CID`.
- **Lookup Process** is the proces
s of the Client retreiving the content identified by `CID`.
- **`PeerID`** s define stable [peer identities](https://github.com/libp2p/specs/blob/master/peer-ids/peer-ids.md). The `PeerID` is derived from the node's cryptographic public key.
- **`multiaddrs`** are the [network addresses](https://github.com/libp2p/specs/tree/master/addressing) associated with a `PeerID`. It represents the location(s) of the peer.
- **`KeyPrefix`** is defined as a prefix of lenght `l` bits of `HASH2`.
- **`ServerKey`** is defined as `SHA256(bytes("CR_SERVERKEY") || MH)`. It is derived from the `MH`. The Content Provider communicates `ServerKey` to the DHT Servers during the Publish Process. The DHT Servers use it to encrypt the data sent to the Client during the lookup process.
- **`TS`** is the Timestamp (unix timestamp) when the Content Provider published the content.
- **`CPPeerID`** is the `PeerID` of the Content Provider for a specific `CID`.
- **`EncPeerID`** is the result of the encryption of `CPPeerID` using `MH` as encryption key and a random nonce `AESGCM(MH, CPPeerID || RandomNonce)`. `EncPeerID` contains the [varint](https://github.com/multiformats/multicodec) of the encryption algorithm used (AESGCM), the bytes array of the encrypted payload, and the Nonce. <!-- TODO: define draft varint -->
- **`Signature`** is the signature of the `EncPeerID` encrypted payload (not including the varint nor the nonce) and `TS` using the Content Provider's private key, either with ed25519 or rsa signature algorithm, depending on the keys of the Content Provider.
- **Provider Record** is defined as a pointer to the storage location of some content identified by `CID` or `HASH2`. A Provider Record consists on the following fields: [`EncPeerID`, `TS`, `Signature`].
- **Provider Store** is the data structure on the DHT Servers used to store the Provider Records. Its structure is a nested dictionary/map: `HASH2` -> `ServerKey` -> [`CPPeerID`, `EncPeerID`, `TS`, `Signature`]. There is only one single correct `ServerKey` for each `HASH2`. However, any peer can forge a valid Publish request (with invalid `EncPeerID` but valid `Signature`) undetected by the DHT Server. The DHT server isn't able to distinguish which `ServerKey` is correct as it doesn't have the knowledge of `MH`, hence it has to keep both and serve both upon request for `HASH2`.

**Magic Values**
- bytes("CR_DOUBLEHASH")
- bytes("CR_SERVERKEY")
- AESGCM varint <!-- TODO: add varint draft -->
- Max number of Provider Records returned by a DHT Server for a single request: `128` <!-- TODO: define number-->

### Current DHT

The following process describes the event of a client looking up a CID in the IPFS DHT:
1. Client computes `Hash(MH)` (`MH` is the MultiHash included in the CID).
2. Client looks for the closest peers to `Hash(MH)` in XOR distance in its Routing Table.
3. Client sends a DHT lookup request for `CID` to these DHT servers.
4. Upon receiving the request, the DHT servers search if there is an entry for `MH` in their Provider Store. If yes, go to 10. Else continue.
5. DHT servers compute `Hash(MH)`.
6. DHT servers find the 20 closest peers to `Hash(HM)` in XOR distance in their Routing Table.
7. DHT servers return the 20 `peerids` and `multiaddrs` of these peers to Client.
8. Client sends a DHT lookup request for `CID` to the closest peers in XOR distance to `Hash(MH)` that it received.
9. Go to 4.
10. The DHT servers storing the Provider Record(s) associated with `MH` send them to Client. (Currently, if a Provider Record has been published less than 30 min before being requested, the DHT servers also send the `multiaddresses` of the Content Provider to Client).
11. If the response from the DHT server doesn't include the `multiaddrs` associated with the Content Providers' `peerid`s, Client performs a DHT `FindPeer` request to find the `multiaddrs` of the returned `peerid`s.
12. Client sends a Bitswap request for `CID` to the Content Provider (known `peerid` and `multiaddrs`).
13. Content Provider sends the requested content back to Client.

### Double Hash DHT design

**Publish Process**
1. Content Provider wants to publish some content with identifier `CID`.
2. Content Provider computes `HASH2`$\leftarrow{}$`SHA256(bytes("CR_DOUBLEHASH") || MH)` (`MH` is the MultiHash included in the CID).
3. Content Provider starts a DHT lookup request for the 20 closest `peerid`s in XOR distance to `HASH2`.
4. Content Provider encrypts its own `peerid` (`CPPeerID`) with `MH`, using AES-GCM. `EncPeerID = varint || Nonce || AESGCM(MH, CPPeerID || Nonce)`
5. Content Provider takes the current timestamp `TS`.
6. Content Provider signs `EncPeerID` and `TS` using its private key. `Signature = Sign(privkey, EncPeerID || TS)`
7. Content Provider computes `ServerKey = SHA256(bytes("CR_SERVERKEY") || MH)`.
8. Once the lookup request has returned the 20 closest peers, Content Provider sends a Publish request to these DHT servers. The Publish request contains [`HASH2`, `EncPeerID`, `TS`, `Signature`, `ServerKey`].<!-- TODO: define exact format -->
9. Each DHT server verifies `Signature` against the `peerid` of the Content Provider used to open the libp2p connection. `Verify(CPPeerID, Signature, EncPeerID || TS)`. It verifies that `TS` is _recent enough_. If invalid, send an error to the client. <!-- TODO: define error && check TS valid -->
10. Each DHT server adds an entry in their Provider Store for `HASH2` -> `ServerKey` -> [`CPPeerID`, `EncPeerID`, `TS`, `Signature`], with `CPPeerID` being the `peerid` of the Content Provider. If there is already an entry including `CPPeerID` for `HASH2` -> `ServerKey`, and if the `TS` of the new valid entry is newer than the existing `TS`, overwrite the entry in the Provider Store. Else drop the new entry.
11. Each DHT server confirms to Content Provider that the Provider Record has been successfully added.
12. The proces is over once Content Provider has received 20 confirmations.

**Lookup Process**
1. Client computes `HASH2 = SHA256(bytes("CR_DOUBLEHASH") || MH)` (`MH` is the MultiHash included in the CID).
2. Client selects a prefix of `HASH2`, `KeyPrefix = HASH2[:l]` for a defined `l` (see [`l` selection](#prefix-length-selection)).
2. Client finds the closest `peerid`s to `HASH2` in XOR distance in its Routing Table.
3. Client sends a DHT lookup request for `KeyPrefix` to these DHT servers.
4. The DHT servers find the 20 closest `peerid`s to `KeyPrefix` in XOR distance (see [algorithm](#closest-keys-to-a-key-prefix)). Add these `peerid`s and their associated multiaddresses (if applicable) to the `message` that will be returned to Client.
5. The DHT servers search if there are entries matching `KeyPrefix` in their Provider Store.
6. For all entries `HASH2` of the Provider Store where `HASH2[:len(KeyPrefix)]==KeyPrefix`, add to `message` the following encrypted payload: `Enc(ServerKey, EncPeerID || TS || Signature || multiaddrs)`, for `multiaddrs` being the multiaddresses associated with `CPPeerID` (if applicable). DHT Servers can decide to put a maximal limit of returned Provider Record per request. If too many `HASH2` are matching `KeyPrefix`, they select randomly 128 matching provider records per request, and send a flag to Client to signal that the limit was reached. <!-- TODO: define flag-->
7. The DHT servers send `message` to Client.
8. Client computes `ServerKey = SHA256(bytes("CR_SERVERKEY") || MH)`.
9. Client tries to decrypt all returned encrypted payloads using `ServerKey`. If at least one encrypted payload can be decrypted, go to 12.
10. Client sends a DHT lookup request for `KeyPrefix` to the closest peers in XOR distance to `HASH2` that it received from the DHT servers.
11. Go to 4.
12. For each decrypted payload, Client decrypts `CPPeerID = Dec(MH, EncPeerID)`.
13. Client verifies that `Signature` verifies with `CPPeerID`: `Verify(CPPeerID, Signature, EncPeerID || TS)`.
14. Client checks that `TS` is still valid.
15. If none of the decrypted payloads is valid, go to 4.
16. If the decrypted payload doesn't include the `multiaddrs` associated with `CPPeerID`, Client performs a DHT `FindPeer` request to find the `multiaddrs` associated with `CPPeerID`.
17. Client sends a Bitswap request for `CID` to the Content Provider (known `CPPeerID` and `multiaddrs`).
18. Content Provider sends the requested content back to Client.

<!--
AKA Solution Proposal

Describe the proposed solution and list all changes made to the specs repository.

The resulting specification should be detailed enough to allow competing,
interoperable implementations.

When modifying an existing specification file, this section should provide a
summary of changes. When adding new specification files, list all of them.
-->
### Prefix length selection

The goal of DHT prefix requests is to provide [`k`-anonymity](https://en.wikipedia.org/wiki/K-anonymity) to content lookup, in addition to the pseudonimity gained from double hashing. Each DHT prefix lookup query returns an expected number of `k` Provider Records matching `KeyPrefix`, with `k` being a system parameter. The user should be able to define a custom `k` from the configuration files, according to their privacy needs. The default value `k = 8` is discussed in [Design rationale](#reader-privacy).

The prefix `l` is derived from `k` and the number of CIDs published to the DHT: $l \leftarrow{} log_2(\frac{\\#CIDs}{k})$. However, the total number of CIDs published to the DHT can be hard to approximate, and the initial `l` value can be determined by approximation and dichotomy. At the first startup, the node looks up for random keys starting with a `l = 26`. Then, by dichotomy it adapts `l` so that a lookup for a prefix of length `l` matches on average ~`k` Provider Records.

Each node keeps track of the number of `HASH2` matching the last `KeyPrefix` requested in the last 128 lookups. `a` is defined as the average number of matches for the last 128 requests. At any point in time, if $a \gt 2\times k$, then `l` should increase (`l = l + 1`), and if $a \lt \frac{k}{2}$, then `l` should decrease (`l = l - 1`). On node shutdown, `a` is saved on disk, allowing a quick restart with an accurate `l` value.

Note that DHT Servers can set an upperbound on the number of Provider Records they serve for each lookup request. So a too small `l` may result in not discovering the target Provider Record.

**Prefix magic numbers**
- `k`-anonymity privacy parameter, by default `k = 8`
- Size of moving average of number of Provider Records matching a prefix: `128`
- Initial prefix length: `26`. There are currently ~850M distinct CIDs published in the DHT ([source](https://pl-strflt.notion.site/2022-09-20-Hydras-Analysis-5db53b6af3e04a46aaf7a776e65ae97d)). $log_2(\frac{850M}{8})=26.663$. As the number of CIDs in the network grows exponentially, the prefix length is expected to decrease linearly for a constant `k`.

### _Closest_ keys to a key prefix

Computing the XOR distance between two binary bitstrings of different lengths isn't possible. Hence finding the N closest keys to a key prefix in the Kademlia keyspace doesn't make sense. We can however find the keys matching the prefix (e.g `prefix == key[:l]` for $key \in \{0, 1\}^{256}, prefix \in \{0, 1\}^{l}, l \leq 256$), and the keys _close_ from matching the prefix. Randomness is used as tie breaker.

The following pseudo-code defines the algorithm to find `N` keys matching or _close_ from matching a prefix. The main idea is to truncate the leaves of the Kademlia trie to the length of the prefix `l`. If `M` keys match prefix, for $M \ge N$, then `N` keys must be picked at random among the `M` candidates. If `M` keys match prefix, for $M \lt N$, we must still find `Q = N - M` keys. We iterate on the truncated Kademlia leaves of depth `l` ordered by XOR distance to `prefix`, starting from the closest. Supposing there are `P` keys in the current truncated Kademlia leaf, and that we are missing `Q` keys, if $P \ge Q$, we select `Q` keys at random among the `P` candidates, otherwise, if $P \lt Q$ we take the `P` keys, set `Q = Q - P` and iterate on the following leaf until we find `N` keys.

```
func closest_to_match(prefix, N, all_keys) {
	selected_keys = []
	l = len(prefix)   // len(prefix) if the bit length of the prefix

	// iterate on all prefixes of length l from closest to furthest from 'prefix'
	for counter = 0; len(selected_keys) < N && counter < 2**l; counter += 1 {

		leaf = prefix XOR binary(counter, l)
		// binary(x, l) gives the binary representation of a number x, on l bits

		// get all keys matching to the prefix 'leaf'
		matching_keys = find_matching_keys(leaf, all_keys) 

		// add at most (N-len(selected_keys)) to selected_keys
		if len(matching_keys) <= N - len(selected_keys) {
			selected_keys += matching_keys
		} else {
			random_selection = select_N_random(matching_keys, N - len(selected_keys))
			selected_keys += random_selection
		}
	}
	return selected_keys
}
```


## Test fixtures


<!--
List relevant CIDs. Describe how implementations can use them to determine
specification compliance. This section can be skipped if IPIP does not deal
with the way IPFS handles content-addressed data, or the modified specification
file already includes this information.
-->

## Design rationale

### Cryptographic algorithms

**SHA256**

SHA256 is the algorithm currently in use in IPFS to generate 256-bits digests used as Kademlia identifiers. Note that SHA256 refers to the algorithm of [SHA2](https://en.wikipedia.org/wiki/SHA-2) algorithm with a 256 bits digest size.

A future change of Cryptographic Hash Function will require a _DHT Migration_ as the Provider Records _location_ in the Kademlia keyspace will change, for they are defined by the Hash Function. It means that all Provider Records must be published using both the new and the old hash function for the transition period. We want to avoid performing theses migrations as much as possible, but we must be ready for it as it is likely to happen in the lifespan of IPFS.

Changing the Hash function used to derive `ServerKey` requires the DHT Server to support multiple Provider Records indexed by a different `ServerKey` for the same `HASH2` for the migration period.

**AESGCM**

[AESGCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) (Advanced Encryption Standard in Galois/Counter Mode) is a AEAD (Authenticated Encryption with Associated Data) mode of operation for symmetric-key cryptographic block ciphers which is widely adopted for its performance. It takes as input an Initialization Vector (IV) that needs to be unique (Nonce) for each encryption performed with the same key. This algorithm was selected for its securty, its performance and its large industry adoption. 

The nonce size is set to `12` (default for AES GCM). AESGCM is used with encryption keys of 256 bits (SHA256 digests in this context).

A change in the encryption algorithm of the Provider Record implies that the Content Providers must publish 2 Provider Records, one with each encryption scheme. The Client and the DHT Server learn which encryption algorithm has been used by the Content Provider from the `varint` contained in `EncPeerID`. When a new encryption algorithm DHT servers may need to store multiple Provider Records in its Provider Store for the same `HASH2` and the same `CPPeerID`. We restrict the number of Provider Record for each pair (`HASH2`, `CPPeerID`) to `3` (the `varint`s must be distinct), in order to allow some flexibility, while keeping the potential number of _garbage_ Provider Records published by hostile nodes low. 

A change in the encryption algorithm used between the DHT Server and the Client (Lookup step 7.) means that the Client and the DHT Server must negociate the encryption algorithm, as long as it still uses a 256-bits key.

**Signature scheme**

TODO

### Provider Store

The data structure of the DHT Servers' Provider Store is a nested dictionary/map whose structure is: `HASH2` -> `ServerKey` -> `CPPeerID` -> [`EncPeerID`, `TS`, `Signature`].

The same `HASH2` always produces the same `ServerKey` (as long as the same Hashing Algorithm was used), as both `HASH2` and `ServerKey` result in a deterministic hash operation on `MH` prepended with a constant prefix. However, a misbehaving node could publish an advertisement for `HASH2` while not knowing `MH`, and forge a random `ServerKey`. The DHT Server not knowing `MH` cannot determine which `ServerKey` is the one associated with `HASH2`, and hence need to keep all different `ServerKey`s. However, the number of forged `ServerKey`s is expected to be small as the Client aren't able to decrypt payload encrypted with a forged `ServerKey`, and detect that the Provider Record isn't legitimate. The only reason a misbehaving peer would want to publish forged `ServerKey`s is to exhaust the storage resources of a specific target DHT Server.

Content can be provider by multiple Content Providers, hence `HASH2` -> `ServerKey` points to potentially multiple `CPPeerID`s, each Content Provider having its own Provider Record. As the `CPPeerID` is obtained from the open libp2p connection, we assume that it is not possible to impersonate another `CPPeerID`. Each Content Provider can have a single Provider Record for each `HASH2`, and for each available `varint`. During a migration, we expect to have multiple Provider Records for the same pair (`HASH2`, `CPPeerID`), the Provider Store keeps 1 Provider Records for each distinct (`HASH2`, `CPPeerID`, `varint`) with a maximum of `3` per pair (`HASH2`, `CPeerID`). If there are more than 3 candidates, the ones with the lowest `TS` are discarded. 
When a Content Provider republishes a Provider Record, the DHT Server only keeps the valid Provider Record whose `TS` is the largest value, for the given `varint`. We expect to have a single `varint` in use most of the time. DHT Servers drop all Provider Records from published by the same `CPPeerID` with the same `HASH2` but multiple different `ServerKey`s. A well behaving node can compute the right `ServerKey` and doesn't try to exhaust the storage resources of the DHT Server. Only a misbehaving node forges invalid `ServerKey`s, and if multiple `ServerKey`s are associated with the same (`HASH2`, `CPPeerID`) it implies that at least one of the two `ServerKey` is incorrect, so the Content Provider is misbehaving.

<!--
The rationale fleshes out the specification by describing what motivated
the design and why particular design decisions were made.

Provide evidence of rough consensus and working code within the community,
and discuss important objections or concerns raised during discussion.
-->

### User benefit

<!--
How will end users benefit from this work?
-->

### Reader Privacy

**`k`-anonymity**

Default parameter selection: `k = 8`

### Writer Privacy

### Provider Record Authenticity

### Provider Records Enumeration

Easier monitoring of the DHT, random key query

### Better Kademlia Routing Table Refresh

Get rid of 456 KB in the IPFS source code https://github.com/libp2p/go-libp2p-kbucket/blob/master/bucket_prefixmap.go

## Compatibility

Breaking change
<!--
Explain the upgrade considerations for existing implementations.
-->

## Security

Threat Model (or it should be in a distinct section)

DOS (sending the multiaddrs of the target peer for every served provider record) can be solved in the future with signed peer records.
<!--
Explain the security implications/considerations relevant to the proposed change.
-->

## Alternatives

This approach is a first fix to the DHT (low hanging fruit). Other alternative to add privacy in the DHT include Mixnets and ephemeral peerids.

Alternatives for migration:
- slow breaking change (give enough time so that only a _small_ number of participants break)
- DHT duplication
- Universal DHT (WIP).

<!--
Describe alternate designs that were considered and related work.
-->

## Open Questions

- Is it wise to encrypt the `CPPeerID` using `MH` directly? It would be possible to derive another identifier from `MH` (such as `Hash("SOME_CONSTANT" || MH)`). `MH` is the master identifier of the content, hence if it is revealed all other identifers can trivially be found. However, it is computationnaly impossible to recover `MH` from `Hash("SOME_CONSTANT" || MH)`.
- It may be fine to use `TS` as nonce, it spares bytes on the wire. However, if two Content Providers publish the same content at the same time (`TS` either in seconds or milliseconds), then the DHT Server may be able to forge a valid Provider Records for itself.
- Move to SHA3??

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
