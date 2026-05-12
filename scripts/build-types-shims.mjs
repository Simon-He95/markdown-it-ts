import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

const root = 'dist'
const shimPath = join(root, 'shims.d.ts')

if (!existsSync(root)) {
  throw new Error('dist does not exist. Run tsdown before build-types-shims.')
}

writeFileSync(
  shimPath,
  [
    "declare module 'mdurl'",
    "declare module 'punycode'",
    "declare module 'linkify-it'",
    "declare module 'uc.micro'",
    "declare module 'punycode.js' {",
    '  export function toASCII(domain: string): string',
    '  export function toUnicode(domain: string): string',
    '  export function encode(input: string): string',
    '  export function decode(input: string): string',
    '}',
    '',
  ].join('\n'),
)

function toPosixPath(path) {
  return path.split(sep).join('/')
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(file)
      continue
    }

    if (!entry.isFile() || !file.endsWith('.d.ts') || entry.name === 'shims.d.ts')
      continue

    const rel = toPosixPath(relative(dirname(file), shimPath))
    const ref = `/// <reference path="${rel}" />\n`
    const text = readFileSync(file, 'utf8')

    if (!text.startsWith(ref))
      writeFileSync(file, ref + text)
  }
}

walk(root)
