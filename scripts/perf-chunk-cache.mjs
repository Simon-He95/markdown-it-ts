// Benchmark: CachedStreamParser vs StreamParser vs full parse
// Run: node --expose-gc scripts/perf-chunk-cache.mjs
import { performance, PerformanceObserver } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'
import { chunkedParse, getParseDiagnostics } from '../dist/experimental.js'
import { CachedStreamParser } from '../dist/stream/cached.js'

const TRUST_CORE_RULES = { assumeCoreRulesOnly: true }
const RUN_DEEP_CHUNK_CACHE = process.env.MDTS_CHUNK_CACHE_DEEP === '1'

// ---- helpers ----

function fmt(ms) { return `${ms.toFixed(2)}ms` }
function fmtBytes(bytes) {
  const sign = bytes < 0 ? '-' : ''
  const n = Math.abs(bytes)
  if (n >= 1024 * 1024) return `${sign}${(n / 1024 / 1024).toFixed(2)}MiB`
  if (n >= 1024) return `${sign}${(n / 1024).toFixed(1)}KiB`
  return `${sign}${n}B`
}
function pct(a, b) {
  if (a === 0 && b === 0) return 'same'
  if (a === 0) return '∞'
  return `${((a / b - 1) * 100).toFixed(1)}%`
}

let gcCount = 0
let gcDuration = 0
const gcObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    gcCount++
    gcDuration += entry.duration
  }
})
gcObserver.observe({ entryTypes: ['gc'] })

function cacheSummary(env, stats) {
  const chunkCache = getParseDiagnostics(env)?.chunkCache
  if (!chunkCache)
    return 'chunkCache=n/a'
  return [
    `path=${chunkCache.path}`,
    `hits=${stats.chunkHits}`,
    `misses=${stats.chunkMisses}`,
    `table=${chunkCache.tableSize}`,
    `cachedChars=${chunkCache.totalCachedChars}`,
    `cachedTokenWeight=${chunkCache.totalCachedTokenWeight}`,
    `reusedChars=${chunkCache.reusedChars}`,
    `dirtyRangeChars=${chunkCache.dirtyRangeChars}`,
    `lastReparsedChars=${chunkCache.lastReparsedChars}`,
    `lastReparsedChunks=${chunkCache.lastReparsedChunks}`,
    `shiftedTokens=${chunkCache.shiftedTokenCount}`,
    `contentLookupCandidates=${chunkCache.contentLookupCandidates}`,
    `contentLookupComparisons=${chunkCache.contentLookupComparisons}`,
    `evictions=${chunkCache.evictions}`,
    chunkCache.fallbackReason ? `fallback=${chunkCache.fallbackReason}` : null,
  ].filter(Boolean).join(' ')
}

function measure(label, fn, iters = 100) {
  globalThis.gc?.()
  fn()
  globalThis.gc?.()
  const heapBefore = process.memoryUsage().heapUsed
  const gcBefore = gcCount
  const gcDurationBefore = gcDuration
  const times = []
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now()
    fn()
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  times.sort((a, b) => a - b)
  globalThis.gc?.()
  const heapDelta = process.memoryUsage().heapUsed - heapBefore
  const gcEvents = gcCount - gcBefore
  const gcMs = gcDuration - gcDurationBefore
  const median = times[Math.floor(times.length / 2)]
  const min = times[0]
  console.log(`  ${label.padEnd(28)} min=${min.toFixed(3)}ms  med=${median.toFixed(3)}ms  heapΔ=${fmtBytes(heapDelta)}  gc=${gcEvents}/${gcMs.toFixed(2)}ms`)
  return { min, med: median, heapDelta, gcEvents, gcMs }
}

function scaleIters(chars, small, medium, large, huge) {
  if (chars >= 500_000) return huge
  if (chars >= 100_000) return large
  if (chars >= 20_000) return medium
  return small
}

// ---- scenarios ----

function makeDoc(paragraphs, template = null) {
  if (template) {
    const parts = []
    for (let i = 0; i < paragraphs; i++) {
      parts.push(template(i))
    }
    return parts.join('')
  }
  // Default: each paragraph is ~80 chars, separated by blank line
  let s = ''
  for (let i = 0; i < paragraphs; i++) {
    s += `## Section ${i}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n`
  }
  return s
}

function makeWorstCaseList(items) {
  let s = ''
  for (let i = 0; i < items; i++) {
    s += `- very long list item ${i} with enough inline text, **emphasis**, [link](https://example.com/${i}), and code span content to stress chunkability without blank hard boundaries\n`
  }
  return s
}

function makeLargeGuardDoc(targetChars) {
  const filler = 'x'.repeat(70_000)
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    s += `Guard block ${i}\n${filler}\n\n`
    i++
  }
  return s
}

function findMiddleBoundary(src) {
  const pos = src.indexOf('\n\n', src.length >> 1)
  return pos === -1 ? (src.length >> 1) : pos + 2
}

function runRepeatedMiddleEdits(label, src, parse, edits = 100, iters = 5) {
  const paragraphs = Math.max(1, (src.match(/## Section /g) || []).length)
  const positions = [10, Math.floor(paragraphs / 2), Math.max(0, paragraphs - 10)]
  return measure(label, () => {
    for (let i = 0; i < edits; i++) {
      const pos = positions[i % positions.length]
      parse(src.replace(`## Section ${pos}`, `## Section ${pos} edit ${i}`))
    }
  }, iters)
}

function runLargeMiddleInsertGuard(targetChars) {
  const mdC = MarkdownIt({ experimental: { streamChunkCacheMinChunkChars: 64_000 } })
  const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
  const env = {}
  const src = makeLargeGuardDoc(targetChars)
  const insertAt = findMiddleBoundary(src)
  parser.parse(src, env, mdC)
  parser.parse(
    `${src.slice(0, insertAt)}Large middle insert guard paragraph.\n\n${src.slice(insertAt)}`,
    env,
    mdC,
  )

  const stats = parser.getStats()
  const chunkCache = getParseDiagnostics(env)?.chunkCache
  const failures = []
  if (!chunkCache)
    failures.push('missing chunk cache diagnostics')
  else {
    if (chunkCache.fallbackReason)
      failures.push(`fallbackReason=${chunkCache.fallbackReason}`)
    if (chunkCache.tableSize <= 0)
      failures.push(`tableSize=${chunkCache.tableSize}`)
  }
  if (stats.lastReusedChars <= stats.lastReparsedChars)
    failures.push(`lastReusedChars=${stats.lastReusedChars} lastReparsedChars=${stats.lastReparsedChars}`)

  if (failures.length > 0)
    throw new Error(`large middle insert chunk-cache guard failed: ${failures.join(', ')}`)

  console.log(`  cached: large middle insert guard (${src.length} chars) ✓ ${cacheSummary(env, stats)}`)
}

// ---- test sizes ----

const SCENARIOS = [
  { name: '5k chars', paragraphs: 60, template: i => `## Section ${i}\n\nParagraph content line.\n\n` },
  { name: '20k chars', paragraphs: 250, template: i => `## Section ${i}\n\nParagraph content line.\n\n` },
  { name: '100k chars', template: null, paragraphs: 1200 },
  { name: '500k chars', template: null, paragraphs: 6000 },
  { name: '1M chars', template: null, paragraphs: 12000 },
]

// ---- run ----

console.log('=== CachedStreamParser vs StreamParser Benchmark ===\n')

for (const scenario of SCENARIOS) {
  console.log(`--- ${scenario.name} ---`)

  const src = makeDoc(scenario.paragraphs, scenario.template)
  console.log(`  doc: ${src.length} chars, ~${src.split('\n').length} lines`)
  const fullIters = scaleIters(src.length, 20, 12, 6, 2)
  const cacheHitIters = scaleIters(src.length, 200, 80, 20, 5)
  const appendIters = scaleIters(src.length, 20, 8, 2, 1)
  const appendSteps = scaleIters(src.length, 5, 5, 2, 1)
  const editIters = scaleIters(src.length, 10, 5, 2, 1)
  const repeatedEdits = scaleIters(src.length, 10, 8, 4, 2)
  const repeatedIters = 1
  const runDirectCachedDetails = RUN_DEEP_CHUNK_CACHE || src.length <= 150_000

  // 1. Full parse (one-shot baseline)
  const md = MarkdownIt()
  measure('full parse (one-shot)', () => md.parse(src, {}), fullIters)

  // 2. StreamParser: same source hit
  const mdStream = MarkdownIt({ stream: true })
  const streamCacheEnv = {}
  mdStream.stream.parse(src, streamCacheEnv)
  measure('stream: same src (cache hit)', () => mdStream.stream.parse(src, streamCacheEnv), cacheHitIters)

  // 3. StreamParser: append workload (5 appends)
  {
    const mdS = MarkdownIt({ stream: true })
    const half = src.length >> 1
    const breakPos = src.lastIndexOf('\n\n', half)
    const prefix = src.slice(0, breakPos + 2)
    const suffix = src.slice(breakPos + 2)

    const env = {}
    mdS.stream.parse(prefix, env)
    measure(`stream: append (${appendSteps}x)`, () => {
      mdS.stream.reset()
      mdS.stream.parse(prefix, env)
      let cur = prefix
      for (let i = 0; i < appendSteps; i++) {
        cur += suffix.slice((suffix.length / appendSteps * i) | 0, (suffix.length / appendSteps * (i + 1)) | 0)
        if (!cur.endsWith('\n')) cur += '\n'
        mdS.stream.parse(cur, env)
      }
    }, appendIters)
  }

  // 4. CachedStreamParser: same source hit
  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}
    parser.parse(src, env, mdC)
    measure('cached: same src (cache hit)', () => parser.parse(src, env, mdC), cacheHitIters)
  }

  // 5. CachedStreamParser: append workload
  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const half = src.length >> 1
    const breakPos = src.lastIndexOf('\n\n', half)
    const prefix = src.slice(0, breakPos + 2)
    const suffix = src.slice(breakPos + 2)

    const env = {}
    parser.parse(prefix, env, mdC)
    measure(`cached: append (${appendSteps}x)`, () => {
      parser.reset()
      parser.parse(prefix, env, mdC)
      let cur = prefix
      for (let i = 0; i < appendSteps; i++) {
        cur += suffix.slice((suffix.length / appendSteps * i) | 0, (suffix.length / appendSteps * (i + 1)) | 0)
        if (!cur.endsWith('\n')) cur += '\n'
        parser.parse(cur, env, mdC)
      }
    }, appendIters)
  }

  // 6. CachedStreamParser: non-append edit (20% of doc re-parsed)
  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}

    parser.parse(src, env, mdC)

    // Modify middle 20% of the source
    const editStart = (src.length * 0.4) | 0
    const editEnd = (src.length * 0.6) | 0
    let editId = 0

    measure('cached: middle edit', () => {
      const edited = src.slice(0, editStart) + `EDITED CONTENT HERE ${editId++}\n\n` + src.slice(editEnd)
      parser.parse(edited, env, mdC)
    }, editIters)
  }

  // 6b. CachedStreamParser: middle insert with dirty/reused-char stats
  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}
    const paragraphs = Math.max(1, (src.match(/## Section /g) || []).length)
    const marker = `## Section ${Math.floor(paragraphs / 2)}`
    const insertAt = src.indexOf(marker)

    parser.parse(src, env, mdC)
    let editId = 0
    measure('cached: middle insert', () => {
      const inserted = `Inserted middle paragraph ${editId++} with stable text for cache stats.\n\n`
      parser.parse(src.slice(0, insertAt) + inserted + src.slice(insertAt), env, mdC)
    }, editIters)
    console.log(`  ${cacheSummary(env, parser.getStats())}`)
  }
  else {
    console.log('  cached: direct details skipped (set MDTS_CHUNK_CACHE_DEEP=1)')
  }

  if (!runDirectCachedDetails && src.length >= 500_000)
    runLargeMiddleInsertGuard(src.length)

  // 7. Repeated middle edits: compare the workload chunk cache is meant for.
  {
    const mdFull = MarkdownIt()
    runRepeatedMiddleEdits(`full: ${repeatedEdits} middle edits`, src, next => mdFull.parse(next, {}), repeatedEdits, repeatedIters)
  }

  {
    const mdS = MarkdownIt({ stream: true })
    const env = {}
    mdS.stream.parse(src, env)
    runRepeatedMiddleEdits(`stream: ${repeatedEdits} middle edits`, src, next => mdS.stream.parse(next, env), repeatedEdits, repeatedIters)
  }

  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}
    parser.parse(src, env, mdC)
    runRepeatedMiddleEdits(`cached: ${repeatedEdits} middle edits`, src, next => parser.parse(next, env, mdC), repeatedEdits, repeatedIters)
    console.log(`  ${cacheSummary(env, parser.getStats())}`)
  }

  // 8. CachedStreamParser: same-source identity cache hit
  if (runDirectCachedDetails) {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}
    parser.parse(src, env, mdC)
    measure('cached: identity cache', () => parser.parse(src, env, mdC), cacheHitIters)
  }

  // 9. Vanilla chunkedParse for comparison
  {
    const mdC = MarkdownIt()
    measure('chunkedParse (one-shot)', () => chunkedParse(mdC, src, {}), fullIters)
  }

  console.log()
}

// ---- worst-case chunkability ----
console.log('--- Worst-case chunkability: long list without hard boundaries ---')
{
  const src = makeWorstCaseList(3500)
  console.log(`  doc: ${src.length} chars, ~${src.split('\n').length} lines`)
  const md = MarkdownIt()
  measure('full parse (one-shot)', () => md.parse(src, {}), 10)

  const mdC = MarkdownIt()
  const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
  const env = {}
  parser.parse(src, env, mdC)
  let editId = 0
  measure('cached: middle edit', () => {
    parser.parse(src.replace('very long list item 1750', `edited long list item ${editId++}`), env, mdC)
  }, 10)
  console.log(`  ${cacheSummary(env, parser.getStats())}`)
  console.log()
}

// ---- correctness smoke test ----
console.log('--- Correctness smoke test ---')
{
  const md = MarkdownIt()
  const parser = new CachedStreamParser(md.core, undefined, undefined, TRUST_CORE_RULES)
  const src = '# Hello\n\nWorld\n\n- a\n- b\n\n```js\ncode\n```\n\nMore.\n'

  const tokens = parser.parse(src, {}, md)
  const html = md.renderer.render(tokens, md.options, {})
  const expected = md.render(src)

  if (html === expected) {
    console.log('  ✓ CachedStreamParser output matches md.render()')
  } else {
    console.log('  ✗ MISMATCH!')
    console.log('  Expected:', expected.slice(0, 200))
    console.log('  Got:     ', html.slice(0, 200))
  }
}

console.log('\n=== Done ===')
