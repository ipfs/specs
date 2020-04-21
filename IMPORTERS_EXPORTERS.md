# ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) Data Importers & Exporters

**Authors(s)**:
- David Dias
- Juan Benet

* * *

**Abstract**

IPFS Data Importing spec describes the several importing mechanisms used by IPFS that can be also be reused by other systems. An importing mechanism is composed by one or more chunkers and data format layouts.

Lots of discussions around this topic, some of them here:

- https://github.com/ipfs/notes/issues/204
- https://github.com/ipfs/notes/issues/216
- https://github.com/ipfs/notes/issues/205
- https://github.com/ipfs/notes/issues/144

# Table of contents

- [Introduction]()
- [Requirements]()
- [Architecture]()
- [Interfaces]()
- [Implementations]()
- [References]()

## Introduction

Importing data into IPFS can be done in a variety of ways. These are use-case specific, produce different datastructures, produce different graph topologies, and so on. These are not strictly needed in an IPFS implementation, but definitely make it more useful.

These data importing primitives are really just tools on top of IPLD, meaning that these can be generic and separate from IPFS itself.

Essentially, data importing is divided into two parts:

- Layouts - The graph topologies in which data is going to be structured and represented, there can include:
  - balanced graphs, simpler to implement
  - trickledag, a custom graph optimized for seeking
  - live stream
  - database indices
  - and so on
- Splitters - The chunking algorithms applied to each file, these can be:
  - fixed size chunking (also known as dumb chunking)
  - rabin fingerprinting
  - dedicated format chunking, these require knowledge of the format and typically only work with certain time of files (e.g. video, audio, images, etc)
  - special datastructures chunking, formats like, tar, pdf, doc, container and/org vm images fall into this category

### Goals

- Have a set of primitives to digest, chunk and parse files, so that different chunkers can be replaced/added without any trouble.

## Requirements

These are a set of requirements (or guidelines) of the expectations that need to be fulfilled for a layout or a splitter:

- a layout should expose an API encoder/decoder like, that is, able to convert data to its format and convert it back to the original format
- a layout should contain a clear unambiguous representation of the data that gets converted to its format
- a layout can leverage one or more splitting strategies, applying the best strategy depending on the data format (dedicated format chunking)
- a splitter can be:
  - agnostic - chunks any data format in the same way
  - dedicated - only able to chunk specific data formats
- a splitter should expose also a encoder/decoder like API
- a splitter, once fed with data, should yield chunks to be added to layout or another layout of itself
- an importer is a aggregate of layouts and splitters

## Architecture

```bash
              ┌───────────┐        ┌──────────┐
┌──────┐      │           │        │          │        ┌───────────────┐
│ DATA │━━━━━▶│  chunker  │━━━━━━━▶│  layout  │━━━━━━━▶│ DATA formated │
└──────┘      │           │        │          │        └───────────────┘
              └───────────┘        └──────────┘
             ▲                                 ▲
             └─────────────────────────────────┘
                          Importer
```

- `chunkers or splitters` algorithms that read a stream and produce a series of chunks. for our purposes should be deterministic on the stream. divided into:
  - `universal chunkers` which work on any streams given to them. (eg size, rabin, etc). should work roughly equally well across inputs.
  - `specific chunkers` which work on specific types of files (tar splitter, mp4 splitter, etc). special purpose but super useful for big files and special types of data.
- `layouts or topologies` graph topologies (eg balanced vs trickledag vs ext4, ... etc)
- `importer` is a process that reads in some data (single file, set of files, archive, db, etc), and outputs a dag. may use many chunkers. may use many layouts.

## Interfaces

#### splitters

#### layout

#### importer

## Implementations

#### chunker

- go-chunk https://github.com/jbenet/go-chunk

#### layout

#### importer

## References
