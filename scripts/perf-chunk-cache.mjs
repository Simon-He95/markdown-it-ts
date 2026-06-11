// Benchmark: CachedStreamParser vs StreamParser vs full parse
// Run: node scripts/perf-chunk-cache.mjs
import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'
import { chunkedParse, getParseDiagnostics } from '../dist/experimental.js'
import { CachedStreamParser } from '../dist/stream/cached.js'

const TRUST_CORE_RULES = { assumeCoreRulesOnly: true }

// ---- helpers ----

function fmt(ms) { return `${ms.toFixed(2)}ms` }
function pct(a, b) {
  if (a === 0 && b === 0) return 'same'
  if (a === 0) return '∞'
  return `${((a / b - 1) * 100).toFixed(1)}%`
}
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
    `evictions=${chunkCache.evictions}`,
    chunkCache.fallbackReason ? `fallback=${chunkCache.fallbackReason}` : null,
  ].filter(Boolean).join(' ')
}

function measure(label, fn, iters = 100) {
  // Warmup
  fn()
  const times = []
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now()
    fn()
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const min = times[0]
  console.log(`  ${label.padEnd(28)} min=${min.toFixed(3)}ms  med=${median.toFixed(3)}ms`)
  return { min, med: median }
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

function runRepeatedMiddleEdits(label, src, parse, edits = 100) {
  const paragraphs = Math.max(1, (src.match(/## Section /g) || []).length)
  const positions = [10, Math.floor(paragraphs / 2), Math.max(0, paragraphs - 10)]
  return measure(label, () => {
    for (let i = 0; i < edits; i++) {
      const pos = positions[i % positions.length]
      parse(src.replace(`## Section ${pos}`, `## Section ${pos} edit ${i}`))
    }
  }, 5)
}

// ---- test sizes ----

const SCENARIOS = [
  { name: '5k chars', paragraphs: 60, template: i => `## Section ${i}\n\nParagraph content line.\n\n` },
  { name: '20k chars', paragraphs: 250, template: i => `## Section ${i}\n\nParagraph content line.\n\n` },
  { name: '100k chars', template: null, paragraphs: 1200 },
  { name: '500k chars', template: null, paragraphs: 6000 },
]

// ---- run ----

console.log('=== CachedStreamParser vs StreamParser Benchmark ===\n')

for (const scenario of SCENARIOS) {
  console.log(`--- ${scenario.name} ---`)

  const src = makeDoc(scenario.paragraphs, scenario.template)
  console.log(`  doc: ${src.length} chars, ~${src.split('\n').length} lines`)

  // 1. Full parse (one-shot baseline)
  const md = MarkdownIt()
  measure('full parse (one-shot)', () => md.parse(src, {}), 20)

  // 2. StreamParser: same source hit
  const mdStream = MarkdownIt({ stream: true })
  mdStream.stream.parse(src, {})
  measure('stream: same src (cache hit)', () => mdStream.stream.parse(src, {}), 200)

  // 3. StreamParser: append workload (5 appends)
  {
    const mdS = MarkdownIt({ stream: true })
    const half = src.length >> 1
    const breakPos = src.lastIndexOf('\n\n', half)
    const prefix = src.slice(0, breakPos + 2)
    const suffix = src.slice(breakPos + 2)

    mdS.stream.parse(prefix, {})
    measure('stream: append (5x)', () => {
      let cur = prefix
      for (let i = 0; i < 5; i++) {
        cur += suffix.slice((suffix.length / 5 * i) | 0, (suffix.length / 5 * (i + 1)) | 0)
        if (!cur.endsWith('\n')) cur += '\n'
        mdS.stream.parse(cur, {})
      }
    }, 20)
  }

  // 4. CachedStreamParser: same source hit
  {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    parser.parse(src, {}, mdC)
    measure('cached: same src (cache hit)', () => parser.parse(src, {}, mdC), 200)
  }

  // 5. CachedStreamParser: append workload
  {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const half = src.length >> 1
    const breakPos = src.lastIndexOf('\n\n', half)
    const prefix = src.slice(0, breakPos + 2)
    const suffix = src.slice(breakPos + 2)

    parser.parse(prefix, {}, mdC)
    measure('cached: append (5x)', () => {
      let cur = prefix
      for (let i = 0; i < 5; i++) {
        cur += suffix.slice((suffix.length / 5 * i) | 0, (suffix.length / 5 * (i + 1)) | 0)
        if (!cur.endsWith('\n')) cur += '\n'
        parser.parse(cur, {}, mdC)
      }
    }, 20)
  }

  // 6. CachedStreamParser: non-append edit (20% of doc re-parsed)
  {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)

    parser.parse(src, {}, mdC)

    // Modify middle 20% of the source
    const editStart = (src.length * 0.4) | 0
    const editEnd = (src.length * 0.6) | 0
    let editId = 0

    measure('cached: middle edit', () => {
      const edited = src.slice(0, editStart) + `EDITED CONTENT HERE ${editId++}\n\n` + src.slice(editEnd)
      parser.parse(edited, {}, mdC)
    }, 10)
  }

  // 7. Repeated middle edits: compare the workload chunk cache is meant for.
  {
    const mdFull = MarkdownIt()
    runRepeatedMiddleEdits('full: 100 middle edits', src, next => mdFull.parse(next, {}), 2)
  }

  {
    const mdS = MarkdownIt({ stream: true })
    mdS.stream.parse(src, {})
    runRepeatedMiddleEdits('stream: 100 middle edits', src, next => mdS.stream.parse(next, {}), 2)
  }

  {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    const env = {}
    parser.parse(src, env, mdC)
    runRepeatedMiddleEdits('cached: 100 middle edits', src, next => parser.parse(next, env, mdC), 2)
    console.log(`  ${cacheSummary(env, parser.getStats())}`)
  }

  // 8. CachedStreamParser: same-source identity cache hit
  {
    const mdC = MarkdownIt()
    const parser = new CachedStreamParser(mdC.core, undefined, undefined, TRUST_CORE_RULES)
    parser.parse(src, {}, mdC)
    measure('cached: identity cache', () => parser.parse(src, {}, mdC), 20)
  }

  // 9. Vanilla chunkedParse for comparison
  {
    const mdC = MarkdownIt()
    measure('chunkedParse (one-shot)', () => chunkedParse(mdC, src, {}), 20)
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
