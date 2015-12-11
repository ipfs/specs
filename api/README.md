# IPFS API Spec

> Official spec of the APIs that ipfs implementations must conform to, as well as test suites to ensure they do.

> **WARNING** This is a work in *progress*. There be dragons.

The IPFS API code for apiary can be found in [ipfs/api](//github.com/ipfs/api).

The IPFS API has two levels. The first level is a general description based on function signatures and the second one is the transport specific description.

* [Level 1 Spec - Transport Agnostic](level1.md)
* Level 2 Spec - Transport Specific
  * [Level 2 CLI Spec](level2/cli.md)
  * [Level 2 HTTP(S) Spec](level2/http.md)
