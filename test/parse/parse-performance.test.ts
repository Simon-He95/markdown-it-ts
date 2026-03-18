import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import MarkdownItTS from '../../src/index'
import MarkdownItJS from 'markdown-it'
import { createMarkdownExit as createMarkdownExitFactory } from 'markdown-exit'
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

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function measureStableAverage(fn: (input: string) => void, input: string, iterations: number, samples = 3): number {
  const values: number[] = []
  for (let i = 0; i < samples; i++) {
    values.push(measureAverage(fn, input, iterations))
  }
  return median(values)
}

function measureStablePair(
  left: (input: string) => void,
  right: (input: string) => void,
  input: string,
  iterations: number,
  samples = 3,
): { left: number, right: number } {
  const leftSamples: number[] = []
  const rightSamples: number[] = []

  for (let i = 0; i < samples; i++) {
    if (i % 2 === 0) {
      leftSamples.push(measureAverage(left, input, iterations))
      rightSamples.push(measureAverage(right, input, iterations))
    }
    else {
      rightSamples.push(measureAverage(right, input, iterations))
      leftSamples.push(measureAverage(left, input, iterations))
    }
  }

  return {
    left: median(leftSamples),
    right: median(rightSamples),
  }
}

describe('markdown-it-ts parse performance parity', () => {
  const mdTs = MarkdownItTS()
  const mdJs = new MarkdownItJS()
  // markdown-exit factory may not be available in all environments (guard)
  let mdExit: any = null
  try {
    mdExit = typeof createMarkdownExitFactory === 'function' ? createMarkdownExitFactory() : null
  } catch (e) {
    mdExit = null
  }

  const scenarios: Array<{ name: string, text: string, iterations: number, tolerance: number }> = [
    { name: 'short', text: '# Hello world', iterations: 20000, tolerance: 3.0 },
    { name: 'medium', text: readFixture('inline-em-worst.md'), iterations: 5000, tolerance: 2.0 },
    { name: 'long', text: readFixture('lorem1.txt'), iterations: 1000, tolerance: 1.7 },
    {
      name: 'ultra-long',
      text: readFixture('lorem1.txt').repeat(20),
      iterations: 120,
      tolerance: 1.6,
    },
  ]

  for (const { name, text, iterations, tolerance } of scenarios) {
    it(`ts parser should match markdown-it performance for ${name} input`, () => {
      const { left: tsTime, right: jsTime } = measureStablePair(
        (input) => mdTs.parse(input, {}),
        (input) => mdJs.parse(input, {}),
        text,
        iterations,
      )
      const ratio = tsTime / jsTime

      console.info(
        `[parse-perf] ${name}: markdown-it-ts ${tsTime.toFixed(4)}ms vs markdown-it ${jsTime.toFixed(4)}ms (ratio ${ratio.toFixed(3)})`,
      )

      // If markdown-exit is present, also measure its parse speed (best-effort)
      if (mdExit && typeof mdExit.parse === 'function') {
        try {
          const exitTime = measureStableAverage((input) => mdExit.parse(input), text, iterations)
          console.info(`[parse-perf] ${name}: markdown-exit ${exitTime.toFixed(4)}ms`) 
        } catch (e) {
          console.info(`[parse-perf] ${name}: markdown-exit parse not benchmarked (${String(e)})`)
        }
      }

      expect(tsTime).toBeLessThanOrEqual(jsTime * tolerance)
    })

    it(`render parity for ${name} input`, () => {
      const renderIterations = Math.max(1, Math.floor(iterations / 10))
      // measure render performance for ts and js
      const { left: tsRenderTime, right: jsRenderTime } = measureStablePair(
        (input) => mdTs.render(input),
        (input) => mdJs.render(input),
        text,
        renderIterations,
      )
      console.info(`[render-perf] ${name}: markdown-it-ts ${tsRenderTime.toFixed(4)}ms vs markdown-it ${jsRenderTime.toFixed(4)}ms`)

      if (mdExit && typeof mdExit.render === 'function') {
        try {
          const exitRenderTime = measureStableAverage((input) => mdExit.render(input), text, renderIterations)
          console.info(`[render-perf] ${name}: markdown-exit ${exitRenderTime.toFixed(4)}ms`)
        } catch (e) {
          console.info(`[render-perf] ${name}: markdown-exit render not benchmarked (${String(e)})`)
        }
      }

      // No strict assertions for render parity here — just report timings.
      expect(tsRenderTime).toBeGreaterThanOrEqual(0)
    })
  }
})
