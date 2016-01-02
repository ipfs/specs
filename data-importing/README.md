RFC - IPFS Data Importing
=========================

Authors:

Reviewers:


> tl;dr; This document presents how data is chunked and represented inside the IPFS network.

* * *

# Abstract

IPFS Data Importing spec describes the several importing mechanisms used by IPFS that can be also be reused by other systems. An importing mechanism is composed by one or more chunkers and data format layouts.

# Status of this spec

> **This spec is a Work In Progress (WIP).**

# Organization of this document

This RFC is organized by chapters described on the *Table of contents* section.

# Table of contents

- [%N%. Introduction]()
- [%N%. Requirements]()
- [%N%. Architecture]()
- [%N%. Interfaces]()
- [%N%. Implementations]()
- [%N%. References]()

# Introduction

### Goals

- Have a set of primitives to digest, chunk and parse files, so that different chunkers can be replaced/added without any trouble.

# Requirements

# Architecture

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

- `chunkers or splitters`  algorithms that read a stream and produce a series of chunks. for our purposes should be deterministic on the stream. divided into:
  - `universal chunkers` which work on any streams given to them. (eg size, rabin, etc). should work roughly equally well across inputs.
  - `specific chunkers` which work on specific types of files (tar splitter, mp4 splitter, etc). special purpose but super useful for big files and special types of data.
- `layouts or topologies` graph topologies (eg balanced vs trickledag vs ext4, ... etc)
- `importer` is a process that reads in some data (single file, set of files, archive, db, etc), and outputs a dag. may use many chunkers. may use many layouts.

# Interfaces

#### chunker (splitters)

#### layout (topologies)

#### importer

# Implementations

#### chunker

- go-chunk https://github.com/jbenet/go-chunk

#### layout

#### importer

# References

