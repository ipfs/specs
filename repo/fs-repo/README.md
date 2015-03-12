# IPFS fs-repo version 1 Spec
Author[s]: [Juan Benet](github.com/jbenet)

Reviewer[s]:
* * *

The [Spec](../../) for the fs-repo IPFS repository.

This spec defines `fs-repo` version `1`, its formats, and semantics.
The repo interface is defined [here](../).

## Definition

`fs-repo` is a filesystem implementation of the IPFS [repo](../).

<center>
<img src="fs-repo.png?" width="256" />
</center>


## Contents

![](../ipfs-repo-contents.png?)

```
.ipfs/
├── api             <--- running daemon api addr
├── blocks/         <--- objects stored directly on disk
│   └── aa          <--- prefix namespacing like git
│       └── aa      <--- N tiers
├── config          <--- config file (json or toml)
├── hooks/          <--- hook scripts
├── keys/           <--- cryptographic keys
│   ├── id.pri      <--- identity private key
│   └── id.pub      <--- identity public key
├── datastore/      <--- datastore
├── logs/           <--- 1 or more files (log rotate)
│   └── events.log  <--- can be tailed
├── repo.lock       <--- mutex for repo
└── version         <--- version file
```

### api

`api` is a file that exists only if there is currently a live api listening
for requests. This is used when the `repo.lock` prevents access. Clients may
opt to use the api service, or wait untill the process holding `repo.lock`
exits. The file's content is the api multiaddr

```
> cat .ipfs/api
/ip4/127.0.0.1/tcp/5001
```

Notes:
- The API server must remove the api file before releasing the `repo.lock`.
- It is not enough to use the `config` file, as the API addr of a daemon may
  have been overridden via ENV or flag.

### blocks/

The `block/` component contains the raw data representing all IPFS objects
stored locally, whether pinned or cached. This component is controlled by the `
datastore`. For example, it may be stored within a leveldb instance in `
datastore/`, or it may be stored entirely with independent files, like git.

In the default case, the user uses fs-datastore for all `/blocks` so the
objects are stored in individual files. In other cases, `/blocks` may even be
stored remotely

- [blocks/ with an fs-datastore](#blocks-with-an-fs-datastore)

### config

The `config` file is a JSON or TOML file that contains the tree of
configuration variables. It MUST only be changed while holding the
`repo.lock`, or potentially lose edits.

### hooks/

The `hooks` directory contains exectuable scripts to be called on specific
events to alter ipfs node behavior.

Currently available hooks:

```
none
```

### keys/


The `keys` directory holds all the keys the node has access to. The keys
are named with their hash, and an extension describing what type of key
they are. The only specially-named key is `id.{pub, sec}`

```
<key>.pub is a public key
<key>.pri is a private key
<key>.sym is a symmetric secret key
```

### datastore/

The `datastore` directory contains the data for a leveldb instance used to
store operation data for the IPFS node. If the user uses a `boltdb` datastore
instead, the directory will be named `boltdb`. Thus the data files of each
database will not clash.

TODO: consider whether all should just be named `leveldb/`

### logs/

IPFS implementations put event log files inside the `logs/` directory. The
latest log file is `logs/events`. Others, rotated out may exist, with a
timestamp of their creation. For example:



### repo.lock

`repo.lock` prevents concurrent access to the repo. Its content is the PID
of the process currently holding the lock. This allows clients to detect
a failed lock cleanup.

```
> cat .ipfs/repo.lock
42
> ps | grep "ipfs daemon"
42 ttys000   79:05.83 ipfs daemon
```

### version

The `version` file contains the repo implementation name and version

```
> cat version
fs-repo: 1
```

_Any_ fs-repo implementation of _any_ versions MUST be able to read the
`version` file. It MUST NOT change between versions.

## Datastore

Both the `/blocks` and `/datastore` directories are controlled by the
`datastore` component of the repo.

## Notes

### Location

The `fs-repo` can be located anywhere on the filesystem. By default
clients should search for a repo in:

```
~/.ipfs
```

Users can tell IPFS programs to look elsewhere with the env var:

```
IPFS_PATH=/path/to/repo
```

### blocks/ with an fs-datastore

![](fs-datastore.png)

Each object is stored in its own file. The filename is the hash of the object.
The files are nested in directories whose names are prefixes of the hash, as
in `.git/objects`.

For example:
```sh
# multihashes
1220fe389b55ea958590769f9046b0f7268bca90a92e4a9f45cbb30930f4bf89269d # sha2
1114f623e0ec7f8719fb14a18838d2a3ef4e550b5e53 # sha1

# locations of the blocks
.ipfs/blocks/1114/f6/23/e0ec7f8719fb14a18838d2a3ef4e550b5e53
.ipfs/blocks/1220/fe/38/9b55ea958590769f9046b0f7268bca90a92e4a9f45cbb30930f4bf89269d
```

**Important Notes:**
- the hashes are encoded in hex, not the usual base58, because some
  filesystems are case insensitive.
- the multihash prefix is two bytes, which would waste two directory levels,
  thus these are combined into one.
- the git `idx` and `pack` file could be used to coalesce objects


### Reading without the `repo.lock`

Programs MUST hold the `repo.lock` while reading and writing most files in the
repo. The only two exceptions are:

- `repo.lock` - so clients may check for it
- `api` - so clients may use the API
