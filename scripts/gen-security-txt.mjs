// Writes the RFC 9116 security.txt for specs.ipfs.tech into the build output.
//
// Expires is required and should be less than a year in the future [1], so it
// is derived from the build date rather than hardcoded and left to rot.
// Rounding to the first of the build month keeps rebuilds within a month
// byte-identical, which matters because the deployed CID covers this output.
//
// [1]: https://www.rfc-editor.org/rfc/rfc9116#section-2.5.5

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const outPath = process.argv[2] ?? 'out/.well-known/security.txt'
const now = new Date()
const expires = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), 1))

const body = `# Security contact for specs.ipfs.tech, in the format defined by RFC 9116.
# https://www.rfc-editor.org/rfc/rfc9116

Contact: mailto:security@ipfs.io
Expires: ${expires.toISOString().replace('.000Z', 'Z')}
Policy: https://github.com/ipfs/community/blob/master/SECURITY.md
Canonical: https://specs.ipfs.tech/.well-known/security.txt
Preferred-Languages: en
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, body)
