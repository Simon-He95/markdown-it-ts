import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function writeSnapshot(dir: string, name: string, benchmarkVersion: number) {
  const file = join(dir, name)
  writeFileSync(file, JSON.stringify({
    benchmarkVersion,
    results: [],
    renderComparisons: [],
  }))
  return file
}

describe('perf-compare', () => {
  it('fails closed when benchmark versions differ', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mdts-perf-compare-'))
    const current = writeSnapshot(dir, 'current.json', 6)
    const baseline = writeSnapshot(dir, 'baseline.json', 5)

    expect(() => {
      execFileSync('node', [
        'scripts/perf-compare.mjs',
        current,
        baseline,
      ], {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    }).toThrow()
  })

  it('allows benchmark version mismatch only when explicitly requested', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mdts-perf-compare-'))
    const current = writeSnapshot(dir, 'current.json', 6)
    const baseline = writeSnapshot(dir, 'baseline.json', 5)

    expect(() => {
      execFileSync('node', [
        'scripts/perf-compare.mjs',
        current,
        baseline,
        '--allow-benchmark-version-mismatch',
      ], {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    }).not.toThrow()
  })
})
