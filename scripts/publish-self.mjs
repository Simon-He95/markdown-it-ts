#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const spec = `${pkg.name}@${pkg.version}`
const tarball = join('/tmp/mdts-pack', `${pkg.name}-${pkg.version}.tgz`)

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' })
}

function output(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

try {
  output('npm', ['whoami'])
}
catch {
  console.error('npm is not logged in. Run `npm login` first, then rerun this script.')
  process.exit(1)
}

try {
  const publishedVersion = output('npm', ['view', spec, 'version'])
  if (publishedVersion === pkg.version) {
    console.error(`${spec} is already published.`)
    process.exit(1)
  }
}
catch (error) {
  const stderr = String(error.stderr || '')
  if (!stderr.includes('E404')) {
    process.stderr.write(stderr)
    process.exit(error.status || 1)
  }
}

run('pnpm', ['run', 'prepublishOnly'])

if (!existsSync(tarball)) {
  console.error(`Expected tarball not found: ${tarball}`)
  process.exit(1)
}

run('npm', [
  'publish',
  tarball,
  '--access',
  'public',
  '--ignore-scripts',
  '--provenance=false',
])
