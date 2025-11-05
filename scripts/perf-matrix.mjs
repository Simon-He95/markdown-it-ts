// Performance matrix across modes and sizes
// Build first: npm run build
// Run: node scripts/perf-matrix.mjs

import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeParasByChars(targetChars) {
  const paras = []
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    const p = para(i++)
    paras.push(p)
    s += p
  }
  return paras
}

function splitParasIntoSteps(paras, steps) {
  const per = Math.max(1, Math.floor(paras.length / steps))
  const parts = []
  for (let i = 0; i < steps - 1; i++) parts.push(paras.slice(i * per, (i + 1) * per).join(''))
  parts.push(paras.slice((steps - 1) * per).join(''))
  return parts
}

function measure(fn, iters = 1) {
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

function fmt(ms) { return `${ms.toFixed(2)}ms` }

const SIZES = [5_000, 20_000, 50_000, 100_000]
const APP_STEPS = 6 // 1 initial + 5 appends

// Scenario builders
function makeMd_s1_stream_noCache_chunk() {
  return MarkdownIt({
    stream: true,
    streamChunkedFallback: true,
    streamChunkSizeChars: 10_000,
    streamChunkSizeLines: 200,
    streamChunkFenceAware: true,
  })
}

function makeMd_s2_stream_cache_noChunk() {
  return MarkdownIt({
    stream: true,
    streamChunkedFallback: false,
  })
}

function makeMd_s3_stream_cache_chunk() {
  return MarkdownIt({
    stream: true,
    streamChunkedFallback: true,
    streamChunkSizeChars: 10_000,
    streamChunkSizeLines: 200,
    streamChunkFenceAware: true,
  })
}

function makeMd_s4_full_chunk() {
  return MarkdownIt({
    stream: false,
    fullChunkedFallback: true,
    fullChunkThresholdChars: 20_000,
    fullChunkThresholdLines: 400,
    fullChunkSizeChars: 10_000,
    fullChunkSizeLines: 200,
    fullChunkFenceAware: true,
  })
}

function makeMd_s5_full_plain() {
  return MarkdownIt({ stream: false })
}

const scenarios = [
  { id: 'S1', label: 'stream ON, cache OFF, chunk ON', make: makeMd_s1_stream_noCache_chunk, type: 'stream-no-cache-chunk' },
  { id: 'S2', label: 'stream ON, cache ON, chunk OFF', make: makeMd_s2_stream_cache_noChunk, type: 'stream-cache' },
  { id: 'S3', label: 'stream ON, cache ON, chunk ON', make: makeMd_s3_stream_cache_chunk, type: 'stream-hybrid' },
  { id: 'S4', label: 'stream OFF, chunk ON', make: makeMd_s4_full_chunk, type: 'full-chunk' },
  { id: 'S5', label: 'stream OFF, chunk OFF', make: makeMd_s5_full_plain, type: 'full-plain' },
  { id: 'M1', label: 'markdown-it (baseline)', make: () => MarkdownItOriginal(), type: 'md-original' },
]

console.log('--- perf-matrix ---')
console.log('Sizes(chars)=', SIZES, 'append steps=', APP_STEPS)
console.log('Scenarios:', scenarios.map(s => `${s.id}:${s.label}`).join(' | '))

const results = []

for (const size of SIZES) {
  const paras = makeParasByChars(size)
  const doc = paras.join('')
  const appParts = splitParasIntoSteps(paras, APP_STEPS)

  for (const sc of scenarios) {
  const md = sc.make()
  // Reuse a single env for stream scenarios to avoid cache invalidation by object identity
  const envStream = { bench: true }

    // One-shot parse
    // For stream-no-cache, cache is irrelevant on first parse
  const one = measure(() => (
    sc.type.startsWith('stream') ? md.stream.parse(doc, envStream)
    : sc.type === 'md-original' ? md.parse(doc, {})
    : md.parse(doc, {})
  ))

    // Append workload: build progressively
    let acc = ''
    let appendMs = 0
    for (let i = 0; i < appParts.length; i++) {
      // ensure prefix ends with newline to satisfy append fast-path preconditions
      if (acc.length && acc.charCodeAt(acc.length - 1) !== 0x0A) acc += '\n'
      let piece = appParts[i]
      // ensure piece ends with newline as well
      if (piece.length && piece.charCodeAt(piece.length - 1) !== 0x0A) piece += '\n'
      acc += piece
      if (sc.type === 'stream-no-cache-chunk') {
        // reset to avoid cache before each parse
        md.stream?.reset?.()
      }
      const t = performance.now()
      if (sc.type.startsWith('stream')) {
        md.stream.parse(acc, envStream)
      } else if (sc.type === 'md-original') {
        md.parse(acc, {})
      } else {
        md.parse(acc, {})
      }
      appendMs += performance.now() - t
    }

    const stat = {
      size,
      scenario: sc.id,
      oneShotMs: one.ms,
      appendWorkloadMs: appendMs,
      lastMode: md.stream?.stats?.().lastMode,
      stats: md.stream?.stats?.() || null,
    }
    results.push(stat)

    const ah = stat.stats ? stat.stats.appendHits : null
    console.log(`${sc.id} size=${size} one=${fmt(one.ms)} appendTotal=${fmt(appendMs)} lastMode=${stat.lastMode} appendHits=${ah}`)
  }
}

// Summaries per size
function groupBy(arr, key) {
  const m = new Map()
  for (const it of arr) {
    const k = it[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(it)
  }
  return m
}

// Print markdown summary table
function printMarkdownTable(results) {
  const bySize = new Map()
  for (const r of results) {
    if (!bySize.has(r.size)) bySize.set(r.size, [])
    bySize.get(r.size).push(r)
  }
  const ids = ['S1','S2','S3','S4','S5','M1']
  const headers = ['Size (chars)', ...ids.map(id => `${id} one`), ...ids.map(id => `${id} append`)]
  console.log('\n| ' + headers.join(' | ') + ' |')
  console.log('|' + headers.map((_,i) => (i === 0 ? '---:' : '---:')).join('|') + '|')
  for (const size of Array.from(bySize.keys()).sort((a,b)=>a-b)) {
    const row = {}
    for (const r of bySize.get(size)) row[r.scenario] = r
    const ones = ids.map(id => row[id] ? fmt(row[id].oneShotMs) : '-')
    const apps = ids.map(id => row[id] ? fmt(row[id].appendWorkloadMs) : '-')
    const cols = [String(size), ...ones, ...apps]
    console.log(`| ${cols.join(' | ')} |`)
  }
}

printMarkdownTable(results)

console.log('\n--- best per size (one-shot) ---')
for (const [size, arr] of groupBy(results, 'size')) {
  const best = [...arr].sort((a,b) => a.oneShotMs - b.oneShotMs)[0]
  console.log(`size=${size}: best=${best.scenario} ${fmt(best.oneShotMs)}`)
}

console.log('\n--- best per size (append workload) ---')
for (const [size, arr] of groupBy(results, 'size')) {
  const best = [...arr].sort((a,b) => a.appendWorkloadMs - b.appendWorkloadMs)[0]
  console.log(`size=${size}: best=${best.scenario} ${fmt(best.appendWorkloadMs)}`)
}

// Export JSON if needed
if (process.env.PERF_JSON) {
  console.log('\nJSON=')
  console.log(JSON.stringify(results, null, 2))
}
