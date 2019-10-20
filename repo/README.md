# IPFS Repo Spec
Author[s]: [Juan Benet](github.com/jbenet)

Reviewer[s]:

* * *

The [Spec](../) for IPFS node repositories.

This spec defines an IPFS Repo, its contents, and its interface. It does
not specify how the repo data is actually stored, as that is done via
swappable implementations.

## Definition

A `repo` is the storage repository of an IPFS node. It is the subsystem that
actually stores the data ipfs nodes use. All IPFS objects are stored in
in a repo (similar to git).

There are many possible repo implementations, depending on the storage media
used. Most commonly, ipfs nodes use an [fs-repo](fs-repo).

Repo Implementations:
- [fs-repo](fs-repo) - stored in the os filesystem
- [mem-repo](mem-repo) - stored in process memory
- [s3-repo](s3-repo) - stored in amazon s3

<center>
<img src="ipfs-repo.png" width="256" />
</center>

## Repo Contents

The Repo stores a collection of [IPLD](../merkledag/ipld.md) objects that represent:

- keys - cryptographic keys, including node's identity
- config - node configuration and settings
- datastore - content stored locally, and indexing data
- logs - debugging and usage event logs
- hooks - scripts to run at predefined times (not yet implemented)

Note that the IPLD objects a repo stores are divided into:
- **state** (system, control plane) used for the node's internal state
- **content** (userland, data plane) which represent the user's cached and pinned data.

Additionally, the repo state must determine the following. These need not be IPLD objects, though it is of course encouraged:

- version - the repo version, required for safe migrations
- locks - process semaphores for correct concurrent access


![](ipfs-repo-contents.png?)

### version

Repo implementations may change over time, thus they MUST include a `version` recognizable across versions. Meaning that a tool MUST be able to read the `version` of a given repo type.

For example, the `fs-repo` simply includes a `version` file with the version number. This way, the repo contents can evolve over time but the version remains readable the same way across versions.

### datastore

IPFS nodes store some IPLD objects locally. These are either (a) **state objects** required for local operation -- such as the `config` and `keys` -- or (b) **content objects** used to represent data locally available. **Content objects** are either _pinned_ (stored until they are unpinned) or _cached_ (stored until the next repo garbage collection).

The name "datastore" comes from
[go-datastore](https://github.com/jbenet/go-datastore), a library for
swappable key-value stores. Like its name-sake, some repo implementations
feature swappable datastores, for example:
- an fs-repo with a leveldb datastore
- an fs-repo with a boltdb datastore
- an fs-repo with a union fs and leveldb datastore
- an fs-repo with an s3 datastore
- an s3-repo with a cached fs and s3 datastore

This makes it easy to change properties or performance characteristics of
a repo without an entirely new implementation.


### keys (state)

A Repo typically holds the keys a node has access to, for signing and for encryption. This includes:

- a special (private, public) key pair that defines the node's identity
- (private, public) key pairs
- symmetric keys

Some repos MAY support key-agent delegation, instead of storing the keys directly.

Keys are structured using the [multikey](https://github.com/jbenet/multikey) format, and are part of the [keychain](../keychain) datastructure. This means all keys are IPLD objects, and that they link to all the data needed to make sense of them, including parent keys, identities, and certificates.

### config (state)

The node's `config` (configuration) is a tree of variables, used to configure various aspects of operation. For example:
- the set of bootstrap peers IPFS uses to connect to the network
- the Swarm, API, and Gateway network listen addresses

It is recommended that `config` files avoid identifying information, so that they may be re-shared across multiple nodes.

**CHANGES**: today, implementations like go-ipfs store the peer-id and private key directly in the config. These will be removed and moved out.

### logs

A full IPFS node is complex. Many events can happen, and thus some ipfs
implementations capture event logs and (optionally) store them for user review
or debugging.

Logs MAY be stored directly as IPLD objects along with everything else, but this may be a problem if the logs

**NOTE**: go-ipfs no longer stores logs. it only emits them at a given route. This section is kept here in case other implementations may wish to store logs, though it may be removed in the future.

### locks

IPFS implementations may use multiple processes, or may disallow multiple
processes from using the same repo simultaneously. Others may disallow using
the same repo but may allow sharing _datastores_ simultaneously. This
synchronization is accomplished via _locks_.

All repos contain the following standard locks:
- `repo.lock` - prevents concurrent access to the repo. Must be held to _read_ or _write_.

### hooks (TODO)

Like git, IPFS nodes will allow `hooks`, a set of user configurable scripts
to run at predefined moments in ipfs operations. This makes it easy
to customize the behavior of ipfs nodes without changing the implementations
themselves.

## Notes

#### A Repo uniquely identifies an IPFS Node

A repository uniquely identifies a node. Running two different ipfs programs
with identical repositories -- and thus identical identities -- WILL cause
problems.

Datastores MAY be shared -- with proper synchronization -- though note that sharing datastore access MAY erode privacy.

#### Repo implementation changes MUST include migrations

**DO NOT BREAK USERS' DATA.** This is critical. Thus, any changes to a repo's implementation **MUST** be accompanied by a **SAFE** migration tool.

See https://github.com/jbenet/go-ipfs/issues/537 and
https://github.com/jbenet/random-ideas/issues/33

#### Repo Versioning

A repo version is a single incrementing integer. All versions are considered
non-compatible. Repos of different versions MUST be run through the
appropriate migration tools before use.
