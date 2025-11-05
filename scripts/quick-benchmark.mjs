// Quick benchmark: full parse vs initial chunked + append fast-path
// Usage:
//   1) Build first: npm run build (or pnpm build)
//   2) Run:        node scripts/quick-benchmark.mjs

import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'

function repeatPara(n) {
  const p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n'
  return p.repeat(n)
}

function measure(fn, iters = 1) {
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

function fmt(n) {
  return `${n.toFixed(2)} ms`
}

function makeDoc(paras) {
  return '# Title\n\n' + repeatPara(paras)
}

// Sizes tuned to typically exceed 2x chunk size default (2 * 10000 chars ~ 20k)
const BIG_PARAS = 800 // ~> should be > 20k chars
const APPENDS = 5

// Scenario 1: Full parse only
const mdFull = MarkdownIt()
const bigDoc = makeDoc(BIG_PARAS)
const full = measure(() => mdFull.parse(bigDoc, {}))

// Scenario 2: Hybrid - initial chunked + append fast-path
const mdHybrid = MarkdownIt({
  stream: true,
  streamChunkedFallback: true,
  streamChunkSizeChars: 10_000,
  streamChunkSizeLines: 200,
  streamChunkFenceAware: true,
})

const first = measure(() => mdHybrid.parse(bigDoc, {}))
let evolving = bigDoc
const app = measure(() => {
  for (let i = 0; i < APPENDS; i++) {
    evolving += `\nParagraph ${i + 1}.\n\n`
    mdHybrid.parse(evolving, {})
  }
})

const stats = mdHybrid.stream.stats()

console.log('--- quick-benchmark ---')
console.log('Doc size (chars):', bigDoc.length)
console.log('Full parse (1x):', fmt(full.ms))
console.log('Hybrid first parse:', fmt(first.ms), `(lastMode=${stats.lastMode})`)
console.log(`Hybrid ${APPENDS} appends:`, fmt(app.ms))
console.log('Counts:', {
  total: stats.total,
  appendHits: stats.appendHits,
  fullParses: stats.fullParses,
  chunkedParses: stats.chunkedParses || 0,
})
