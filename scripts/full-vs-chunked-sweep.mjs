// Sweep full parse vs chunked (non-stream) to find rough break-evens
// Build first: npm run build
// Run: node scripts/full-vs-chunked-sweep.mjs

import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeDoc(blocks) {
  let s = ''
  for (let i = 0; i < blocks; i++) s += para(i)
  return s
}

function measure(fn, iters = 1) {
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

function fmt(ms) { return `${ms.toFixed(2)} ms` }

const SIZES = [8, 16, 24, 32, 40, 60, 80] // number of blocks
const CHARS = [8000, 10000, 12000, 16000]
const LINES = [150, 200, 250, 300]
const MAXCHUNKS = [undefined, 8, 16, 32]

console.log('--- full-vs-chunked sweep (non-stream) ---')
console.log('Sizes(blocks)=', SIZES, 'chars=', CHARS, 'lines=', LINES, 'maxChunks=', MAXCHUNKS)

for (const blocks of SIZES) {
  const doc = makeDoc(blocks)
  const mdFull = MarkdownIt({ stream: false })
  const full = measure(() => mdFull.parse(doc, {}))

  // Track best chunked config
  let best = null

  for (const maxChunkChars of CHARS) {
    for (const maxChunkLines of LINES) {
      for (const maxChunks of MAXCHUNKS) {
        const mdChunk = MarkdownIt({
          stream: false,
          fullChunkedFallback: true,
          fullChunkThresholdChars: 0, // force
          fullChunkSizeChars: maxChunkChars,
          fullChunkSizeLines: maxChunkLines,
          fullChunkFenceAware: true,
          fullChunkMaxChunks: maxChunks,
        })
        const m = measure(() => mdChunk.parse(doc, {}))
        if (!best || m.ms < best.ms) {
          best = { ms: m.ms, maxChunkChars, maxChunkLines, maxChunks }
        }
      }
    }
  }

  console.log(`blocks=${blocks} charLen=${doc.length} -> full=${fmt(full.ms)} bestChunked=${fmt(best.ms)} cfg=`, best)
}
