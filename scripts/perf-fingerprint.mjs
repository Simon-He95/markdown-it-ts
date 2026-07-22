import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'

const rootUrl = new URL('../', import.meta.url)
const explicitFiles = [
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.build.json',
  'scripts/perf-corpora.mjs',
  'scripts/perf-fingerprint.mjs',
  'scripts/perf-generate-report.mjs',
  'docs/architecture.md',
  'docs/development.md',
  'docs/security.md',
]

function listSourceFiles(relativeDirectory) {
  const entries = readdirSync(new URL(`${relativeDirectory}/`, rootUrl), { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = `${relativeDirectory}/${entry.name}`
    if (entry.isDirectory())
      files.push(...listSourceFiles(relativePath))
    else if (entry.isFile() && entry.name.endsWith('.ts'))
      files.push(relativePath)
  }

  return files
}

export function getBenchmarkFingerprint() {
  const files = [...explicitFiles, ...listSourceFiles('src')].sort()
  const hash = createHash('sha256')

  for (const relativePath of files) {
    hash.update(relativePath)
    hash.update('\0')
    const normalizedContent = readFileSync(new URL(relativePath, rootUrl), 'utf8').replaceAll('\r\n', '\n')
    hash.update(normalizedContent)
    hash.update('\0')
  }

  return hash.digest('hex')
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}
