CLI - Command Line Interface
============================

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Commands

- `> ipfs commands`

## Daemon

- `> ipfs daemon`
- `> ipfs id`
- `> ipfs init`
- `> ipfs log`
- `> ipfs log level`
- `> ipfs log tail`
- `> ipfs diag`
- `> ipfs diag net`
- `> ipfs diag sys`
- `> ipfs stats`
- `> ipfs stats bw`
- `> ipfs update`
- `> ipfs version`

## DAG

- `> ipfs dag get`
- `> ipfs dag put`

#### `ipfs dag get <[cid, cid+path]>`

The `dag get` call will be able to fetch nodes and resolve paths, the options for this command are:

**Options:**
- `--local-resolve` - It will try to resolve everything it can within the scope of the first object, returning the last value it could + the remainerPath

#### `ipfs dag put <node>`

The `dag put` call will store a single node at each time and return its respective CID

**Options:**
- `--format` - The multicodec of the format (dag-pb, dag-cbor, etc)
- `--hash-alg` - The hash algorithm to be used
- `--input-enc` - The input encoding of how the object is being passed. This is just a requirement to make sense of a blob of characters from a CLI context.

## Files

> discussion:
> - https://github.com/ipfs/specs/issues/98
> - https://github.com/ipfs/specs/issues/88

- `> ipfs files add`
- `> ipfs files cat`
- `> ipfs files get`
- `> ipfs files ls`
- `> ipfs files cp`
- `> ipfs files ls`
- `> ipfs files mkdir`
- `> ipfs files mv`
- `> ipfs files read`
- `> ipfs files rm`
- `> ipfs files stat`
- `> ipfs files write`
- `> ipfs tar`
- `> ipfs tar add`
- `> ipfs tar cat`

## Bitswap

- `> ipfs bitswap`
- `> ipfs bitswap stat`
- `> ipfs bitswap unwant`
- `> ipfs bitswap wantlist`

## Block

- `> ipfs block`
- `> ipfs block get`
- `> ipfs block put`
- `> ipfs block stat`

## Bootstrap

- `> ipfs bootstrap`
- `> ipfs bootstrap add`
- `> ipfs bootstrap list`
- `> ipfs bootstrap rm`

## Config

- `> ipfs config`
- `> ipfs config edit`
- `> ipfs config replace`
- `> ipfs config show`

## Name

- `> ipfs dns`
- `> ipfs name publish`
- `> ipfs name resolve`
- `> ipfs resolve`

## DHT

- `> ipfs dht`
- `> ipfs dht findpeer`
- `> ipfs dht findprovs`
- `> ipfs dht get`
- `> ipfs dht put`
- `> ipfs dht query`

## Object

- `> ipfs object data`
- `> ipfs object get`
- `> ipfs object links`
- `> ipfs object new`
- `> ipfs object patch`
- `> ipfs object patch add-link`
- `> ipfs object patch append-data`
- `> ipfs object patch rm-link`
- `> ipfs object patch set-data`
- `> ipfs object put`
- `> ipfs object stat`

## Pinning

- `> ipfs pin add`
- `> ipfs pin ls`
- `> ipfs pin rm`

## Network

- `> ipfs ping`
- `> ipfs swarm`
- `> ipfs swarm addrs`
- `> ipfs swarm addrs local`
- `> ipfs swarm connect`
- `> ipfs swarm disconnect`
- `> ipfs swarm filters`
- `> ipfs swarm filters add`
- `> ipfs swarm filters rm`
- `> ipfs swarm peers`

## Repo

- `> ipfs refs`
- `> ipfs refs local`
- `> ipfs repo`
- `> ipfs repo gc`

## Misc

- `> ipfs tour`
- `> ipfs tour list`
- `> ipfs tour next`
- `> ipfs tour restart`
