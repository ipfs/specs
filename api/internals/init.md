# IPFS Node Init Specification

> This is the specification for the steps performed when a new IPFS node is initialized.

*Note that initializing an IPFS node differs from initializing an IPFS repo. For more on repo initialization, read the [Repo specification](https://github.com/ipfs/specs/tree/master/repo).*

## Status

First draft.

For now, [`ipfs/go-ipfs/cmd/ipfs/init.go`](https://github.com/ipfs/go-ipfs/blob/master/cmd/ipfs/init.go) is the source of truth.

## Flags

There are some optional flags that may be supplied to `ipfs init`:

```
 -f|--force: whether to overwrite an existing repo config. Defaults to false.
 -e|--empty-repo: whether to add+pin ipfs info help files to the repo. Defaults to false.
 -b|--bits: # of bits to use in the generated RSA private key. Defaults to 2048.
```

## Initialization Sequence

### 1. Verify Initial Conditions

Before initialization can begin, the following must be true:

1. The above input flags are parsed and validated.
2. The [config file](https://github.com/ipfs/specs/tree/master/repo#config) has not been locked by an active daemon process.
3. The repo root is writeable.
4. The repo either doesn't exist and hasn't been initialized, or does already exist but the `--force` flag is supplied.

If all of these are satisfied, output `"initializing ipfs node at %s\n", repoRoot` to standard out and proceed.

### 2. Generate Repo Configuration

These are the steps to producing the default [config tree](https://github.com/ipfs/specs/tree/master/repo#config). The actual output format will depend on the repo backend (i.e. likely JSON if fs-repo). Check the specification for the relevant backend if unsure.

The following sections describe the various subtrees in the config and how to generate them. For simplicity and consistency, JSON will be used.

#### Identity

The RSA keypair must be >= 1024 bits.

Before beginning key generation, write `"generating %v-bit RSA keypair...", nbits` to standard out. (no newline)

Generate the keypair. If successful, append `"done\n"` to standard out.

The private key must be formatted as the base64 encoding of its bytes. It is currently stored unencrypted.

The PeerID must be formatted as

```json
Base58.Encode(Multihash('SHA2-256', PublicKey.Bytes))
```

Resulting in the following config tree entry:

```json
"Identity": {
	"PeerID": "<PeerID>",
	"PrivKey": "<PrivKey>"
}
```

Finally, write `"peer identity: %s\n", ident.PeerID` to standard out.

#### Bootstrap Peers

The default bootstrap peers form the following config tree:

```json
"Bootstrap": [
  "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
  "/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z",
  "/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
  "/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm",
  "/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
  "/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64",
  "/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd",
  "/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3",
  "/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx"
]
```

#### Version

This is the `"Version"` config subtree, which is just the key `"Current"`, which
evaluates to the IPFS program's current version literal (e.g. `"0.4.0-dev"`.

```json
"Version": {
  "Current": "v0.4.0-dev"
}
```

#### Miscellaneous

There are some other various static values that also must be included in the config tree:

```json
// setup the node's default addresses.
// Note: two swarm listen addrs, one tcp, one utp.
"Addresses": {
	"Swarm": [
		"/ip4/0.0.0.0/tcp/4001",
		"/ip6/::/tcp/4001"
	],
	"API": "/ip4/127.0.0.1/tcp/5001",
	"Gateway": "/ip4/127.0.0.1/tcp/8080"
},

"Discovery": {
	"MDNS": {
		"Enabled":  true,
		"Interval": 10,
	}
},

"Mounts": {
	"IPFS": "/ipfs",
	"IPNS": "/ipns"
},

"Ipns": {
	"ResolveCacheSize": 128,
},

"Gateway": {
	"RootRedirect": "",
	"Writable": false
},
```

### 3. Initialize the Repo

The exact process will depend on the repo backend ([fs-repo](https://github.com/ipfs/specs/tree/master/repo/fs-repo), mem-repo, s3-repo) being used.

If at this point the repo already exists, destroy it. We can do this safely because at this point either a) there is no pre-existing repo, or b) there is a repo, but `--force` was specified, giving permission for it to be wiped.

At this point the config tree should now be written to the repo.


### 4. Add Default Assets

The exact set of assets to include is the directory structure defined in [`go-ipfs/assets/init-doc`](https://github.com/ipfs/go-ipfs/tree/master/assets/init-doc).

If the flag `--empty-repo` was provided, this step should be skipped.

Otherwise, add the `init-doc` directory to the repo and pin them.

Finally, write
```
to get started, enter:

  ipfs cat /ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme
```

to standard out.


### 5. Initialize IPNS Record

Finally, bring up the newly initialized IPFS node and publish its public key's IPNS record to the empty directory:

```
/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn
```
