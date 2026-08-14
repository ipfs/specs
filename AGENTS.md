# Working on ipfs/specs

Guidance for anyone editing this repository, human or agent.

## Every CID and content path needs retrievable data

A specification that names a CID is making a promise: a reader can fetch it and
see what the text describes. That promise decays. Pinning services lapse, test
nodes get reinstalled, and a CID that resolved when the PR merged returns
nothing two years later. The reader is then stuck with a hash and no way to
check the spec against reality.

So: **a pull request that adds or changes a CID, or a content path such as
`/ipfs/<cid>/dir/file.html`, must attach a `.zip` containing CAR files that
cover it.** Attach the zip to the PR description, then link it from the spec
text as an HTTPS URL so readers can reach the data without the PR.

`.car` is not an allowed GitHub attachment type, so archive the CARs in a
`.zip`. The limit is 25 MB per attachment.

### How much data to include

Match the coverage to what the text asks of the reader.

| the spec says | ship |
| --- | --- |
| fetch this and verify your implementation against it | the complete DAG |
| this path resolves to that content | the blocks along that path |
| here is an example CID or URL | the root block, so the CID is provably real |

Partial CARs are acceptable and often preferred. A 1 GiB fixture whose point is
"the root has 1024 links" is fully served by a 51 KB CAR holding the root and
internal nodes. A directory listing example does not need the file contents.
See [Partial CARs](#partial-cars) below.

Two kinds of CID are exempt:

- Identity CIDs (`bafkqa…`), where the data is inside the CID string.
- CIDs that are deliberately unresolvable, such as blocked-content examples in
  a denylist spec. Label these in the text so a reader does not waste time
  trying to fetch them.

### Prefer an existing upstream CAR

Before generating a new fixture, check whether one already exists at a tagged
path in [ipfs/gateway-conformance][gwc], [ipld/codec-fixtures][cf], or
[ipfs/boxo][boxo]. Most fixtures in this repository already do. A link to a
tagged file in a real repository is more durable than an attachment, it is in
git, and CI can verify it. Link that instead of attaching a copy.

[gwc]: https://github.com/ipfs/gateway-conformance
[cf]: https://github.com/ipld/codec-fixtures
[boxo]: https://github.com/ipfs/boxo

## Producing CARs

### Full DAG

    ipfs dag export <cid> > fixture.car

### Partial CARs

For the blocks needed to resolve one path, ask your own kubo gateway for a
scoped CAR. `dag-scope=block` returns the path blocks plus the terminating
block. `dag-scope=entity` also returns the whole file or directory at the end
of the path.

    curl -o path.car \
      "http://127.0.0.1:8080/ipfs/<cid>/<path>?format=car&dag-scope=block"

Use your own node, not a public gateway. It fetches what it needs, you keep the
blocks locally, and the recipe does not depend on someone else's server staying
online.

To export whatever a local node happens to hold, skipping missing subtrees:

    ipfs dag export --local-only <cid> > partial.car   # kubo 0.43+

### Importing a partial CAR into kubo

A partial CAR holds an incomplete DAG on purpose, so root pinning cannot
succeed. Turn it off:

    ipfs dag import --pin-roots=false partial.car

On kubo 0.43 and later, `--local-only` does the same and states the intent:

    ipfs dag import --local-only partial.car

Plain `ipfs dag import` fails on a partial CAR with `pinning root ... FAILED`,
because the default pins each root and pinning walks the whole DAG. The blocks
are still imported when this happens.

### Verifying before you attach

Import into a scratch repository and confirm the CAR delivers what the spec
claims.

    export IPFS_PATH=$(mktemp -d)
    ipfs init --profile=test
    ipfs dag import --pin-roots=false fixture.car
    ipfs dag stat --offline <cid>          # full DAG: must succeed
    ipfs cat --offline /ipfs/<cid>/<path>  # partial: the documented path must resolve

## Every zip needs a README

A CAR file on its own tells a reader nothing about why it exists. Include a
`README.md` in the zip covering:

- one row per CAR: filename, CID, whether it is a full or partial DAG, and what
  it lets the reader verify
- for partial CARs, which paths or structural claims they cover, and what is
  deliberately absent
- what the payload is, in plain terms. "Pseudo-random bytes from a ChaCha20
  keystream" saves a reader from running `file` on it and guessing.
- how to regenerate the data, if it is generated rather than authored. Give the
  seed, the algorithm, and a runnable command.
- the import commands from above, including the `--pin-roots=false` note if any
  CAR is partial

[`ipip-0499-test-fixtures.zip`][example-zip] is a worked example of this
layout. It carries full CARs for the fixtures that fit, structure-only CARs for
the five oversized ones, a Go module that regenerates those five and checks
them against the published CIDs, and a README tying each file back to a row of
the [IPIP-0499](src/ipips/ipip-0499.md) fixture table.

[example-zip]: https://github.com/user-attachments/files/31088958/ipip-0499-test-fixtures.zip

## When data is too large to attach

Some DAGs run to gigabytes. Options, in order of preference:

1. Ship a partial CAR that covers the structural claim or the path in the text.
2. Ship code that regenerates the fixture, with the seed and parameters, plus a
   script that verifies the output CID matches. Keep it in the zip next to the
   CARs.
3. Say plainly in the spec that the CID is a large historical snapshot and only
   part of it is preserved.

Never leave a large CID in the text with nothing behind it.

## Keeping fixtures alive

Attaching a CAR protects the data. It does not keep the CID resolvable on the
IPFS network, which is what a reader will try first. Pin new fixtures somewhere
durable and give the pin a name that ties it back to the document, for example
`ipip-499_test-fixtures`.

When a fixture's definition changes, the CID changes. Re-pin the new CID and
update the attachment in the same PR. A stale pin under the right name is
indistinguishable from a healthy one until someone tries to fetch it.
