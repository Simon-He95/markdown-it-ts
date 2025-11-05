import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import MarkdownItTS from '../../src/index'
import MarkdownItJS from 'markdown-it'
import { describe, it, expect } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function readFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../fixtures', name), 'utf8')
}

function measureAverage(fn: (input: string) => void, input: string, iterations: number): number {
  // Warm up to mitigate first-call overheads
  for (let i = 0; i < 5; i++) {
    fn(input)
  }

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn(input)
  }
  const duration = performance.now() - start
  return duration / iterations
}

describe('markdown-it-ts parse performance parity', () => {
  const mdTs = MarkdownItTS()
  const mdJs = new MarkdownItJS()

  const scenarios: Array<{ name: string, text: string, iterations: number, tolerance: number }> = [
    { name: 'short', text: '# Hello world', iterations: 20000, tolerance: 2.0 },
    { name: 'medium', text: readFixture('inline-em-worst.md'), iterations: 5000, tolerance: 1.3 },
    { name: 'long', text: readFixture('lorem1.txt'), iterations: 1000, tolerance: 1.3 },
    {
      name: 'ultra-long',
      text: readFixture('lorem1.txt').repeat(20),
      iterations: 120,
      tolerance: 1.3,
    },
  ]

  for (const { name, text, iterations, tolerance } of scenarios) {
    it(`ts parser should match markdown-it performance for ${name} input`, () => {
      const tsTime = measureAverage((input) => mdTs.parse(input, {}), text, iterations)
      const jsTime = measureAverage((input) => mdJs.parse(input, {}), text, iterations)
      const ratio = tsTime / jsTime

      // Helpful diagnostics when investigating regressions
      console.info(
        `[parse-perf] ${name}: markdown-it-ts ${tsTime.toFixed(4)}ms vs markdown-it ${jsTime.toFixed(4)}ms (ratio ${ratio.toFixed(3)})`,
      )

      expect(tsTime).toBeLessThanOrEqual(jsTime * tolerance)
    })
  }
})
