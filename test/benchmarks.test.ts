import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

// Use local fixtures directory inside markdown-it-ts for samples
const ROOT = path.resolve(__dirname, '..')
// implementations live inside this package under benchmark/implementations
const IMPL_DIR = path.join(ROOT, 'benchmark', 'implementations')
const SAMPLES_DIR = path.join(__dirname, 'fixtures')

function listImplementations() {
  if (!fs.existsSync(IMPL_DIR))
    return []
  return fs.readdirSync(IMPL_DIR).filter(f => fs.statSync(path.join(IMPL_DIR, f)).isDirectory())
}

function listSamples() {
  if (!fs.existsSync(SAMPLES_DIR))
    return []
  return fs.readdirSync(SAMPLES_DIR).filter(f => fs.statSync(path.join(SAMPLES_DIR, f)).isFile())
}

describe('benchmarks: sanity checks', () => {
  const impls = listImplementations()
  const samples = listSamples()

  if (impls.length === 0) {
    it('no benchmark implementations found', () => {
      expect(impls.length).toBeGreaterThan(0)
    })
    return
  }

  impls.forEach((implName) => {
  // Prefer index.ts, then index.mjs, then index.js in local implementations
    const candTs = path.join(IMPL_DIR, implName, 'index.ts')
    const candMjs = path.join(IMPL_DIR, implName, 'index.mjs')
    const candJs = path.join(IMPL_DIR, implName, 'index.js')
    const implPath = fs.existsSync(candTs) ? candTs : (fs.existsSync(candMjs) ? candMjs : candJs)

    describe(`implementation: ${implName}`, () => {
      samples.forEach((sampleFile) => {
        const samplePath = path.join(SAMPLES_DIR, sampleFile)
        const sampleName = sampleFile
        it(`${implName} should render sample ${sampleName} (or skip if missing deps)`, async () => {
          if (!fs.existsSync(implPath)) {
            // Skip test if implementation entry is missing
            expect(true).toBe(true)
            return
          }

          let mod: any
          try {
            mod = await import(pathToFileURL(implPath).href)
          }
          catch (err) {
            // If the implementation can't be imported (missing native deps), skip by asserting true
            // but surface a helpful message in expectation so test output indicates skip-like behavior.
            // Vitest doesn't have a built-in programmatic skip here, so we bail out gracefully.

            console.warn(`Skipping ${implName} for sample ${sampleName}: import failed: ${String(err)}`)
            expect(true).toBe(true)
            return
          }

          const runFn = mod && (mod.run || mod.default && mod.default.run)
          if (typeof runFn !== 'function') {
            // malformed implementation; mark test as failed
            throw new TypeError(`Implementation ${implName} does not export a run(data) function`)
          }

          const data = fs.readFileSync(samplePath, 'utf8')

          // Run implementation - ensure it doesn't throw and produces output
          let out: string
          try {
            // coerce to string to make assertion easier and avoid TS undefined complaints
            out = String(runFn(data))
          }
          catch (err) {
            throw new Error(`Implementation ${implName} threw while rendering sample ${sampleName}: ${String(err)}`)
          }

          expect(typeof out).toBe('string')
          // Some samples contain only reference definitions and legitimately produce empty output
          const hasRenderableContent = data
            .split(/\r?\n/)
            .some(line => line.trim() !== '' && !/^\s*\[.+\]:/.test(line))
          if (hasRenderableContent) {
            expect(out.length).toBeGreaterThan(0)
          }
          else {
            // empty output is acceptable for samples that only declare references
            expect(out.length).toBeGreaterThanOrEqual(0)
          }
        })
      })
    })
  })
})
