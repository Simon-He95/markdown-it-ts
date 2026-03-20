import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import MarkdownIt from 'markdown-it'
import MarkdownItTS from '../dist/index.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT_JSON = path.join(ROOT, 'docs', 'perf-family-hotspots.json')
const OUT_MD = path.join(ROOT, 'docs', 'perf-family-hotspots.md')
const TARGET_CHARS = 40_000

const FIXTURES = [
  { name: 'heading', relPath: 'test/fixtures/block-heading.md' },
  { name: 'lheading', relPath: 'test/fixtures/block-lheading.md' },
  { name: 'hr', relPath: 'test/fixtures/block-hr.md' },
  { name: 'blockquote_flat', relPath: 'test/fixtures/block-bq-flat.md' },
  { name: 'blockquote_nested', relPath: 'test/fixtures/block-bq-nested.md' },
  { name: 'list_flat', relPath: 'test/fixtures/block-list-flat.md' },
  { name: 'list_nested', relPath: 'test/fixtures/block-list-nested.md' },
  { name: 'fence', relPath: 'test/fixtures/block-fences.md' },
  { name: 'code_block', relPath: 'test/fixtures/block-code.md' },
  { name: 'table', relPath: 'test/fixtures/block-tables.md' },
  { name: 'reference_flat', relPath: 'test/fixtures/block-ref-flat.md' },
  { name: 'reference_nested', relPath: 'test/fixtures/block-ref-nested.md' },
  { name: 'reference_list', relPath: 'test/fixtures/block-ref-list.md' },
  { name: 'links_flat', relPath: 'test/fixtures/inline-links-flat.md' },
  { name: 'links_nested', relPath: 'test/fixtures/inline-links-nested.md' },
  { name: 'backticks', relPath: 'test/fixtures/inline-backticks.md' },
  { name: 'entity', relPath: 'test/fixtures/inline-entity.md' },
  { name: 'escape', relPath: 'test/fixtures/inline-escape.md' },
  { name: 'html_inline', relPath: 'test/fixtures/inline-html.md', options: { html: true } },
  { name: 'autolink', relPath: 'test/fixtures/inline-autolink.md' },
  { name: 'emphasis_flat', relPath: 'test/fixtures/inline-em-flat.md' },
  { name: 'emphasis_nested', relPath: 'test/fixtures/inline-em-nested.md' },
  { name: 'emphasis_worst', relPath: 'test/fixtures/inline-em-worst.md' },
  { name: 'newline', relPath: 'test/fixtures/inline-newlines.md' },
  { name: 'plain_text', relPath: 'test/fixtures/lorem1.txt' },
]

function repeatToSize(text, target = TARGET_CHARS) {
  let out = ''
  while (out.length < target) {
    out += text
    if (out.length < target && out.charCodeAt(out.length - 1) !== 0x0A)
      out += '\n'
  }
  return out
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function pickIterations(size) {
  if (size <= 20_000)
    return 48
  if (size <= 40_000)
    return 16
  return 8
}

function measure(fn, iterations) {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++)
    fn()
  return (performance.now() - t0) / iterations
}

function stableCompare(fnA, fnB, iterations, samples = 5, warmups = 2) {
  for (let i = 0; i < warmups; i++) {
    if ((i & 1) === 0) {
      fnA()
      fnB()
    }
    else {
      fnB()
      fnA()
    }
  }
  const aValues = []
  const bValues = []
  for (let i = 0; i < samples; i++) {
    if ((i & 1) === 0) {
      aValues.push(measure(fnA, iterations))
      bValues.push(measure(fnB, iterations))
    }
    else {
      bValues.push(measure(fnB, iterations))
      aValues.push(measure(fnA, iterations))
    }
  }
  return {
    left: median(aValues),
    right: median(bValues),
  }
}

function topHotspots(profile, limit = 8) {
  return Object.values(profile?.records ?? {})
    .sort((a, b) => b.inclusiveMs - a.inclusiveMs)
    .slice(0, limit)
    .map(record => ({
      chain: record.chain,
      name: record.name,
      calls: record.calls,
      hits: record.hits,
      inclusiveMs: Number(record.inclusiveMs.toFixed(4)),
      medianMs: Number(record.medianMs.toFixed(6)),
      maxMs: Number(record.maxMs.toFixed(6)),
      silentCalls: record.silentCalls,
      silentHits: record.silentHits,
      normalCalls: record.normalCalls,
      normalHits: record.normalHits,
    }))
}

function toMarkdown(rows) {
  const lines = []
  lines.push('# Parser Family Hotspots')
  lines.push('')
  lines.push('Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).')
  lines.push('')
  lines.push('| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |')
  lines.push('|:--|---:|---:|---:|:--|')
  for (const row of rows) {
    const top = row.hotspots[0]
    const label = top ? `${top.chain}.${top.name} (${top.inclusiveMs}ms)` : '-'
    lines.push(`| ${row.fixture} | ${row.tsMs.toFixed(4)} | ${row.mdMs.toFixed(4)} | ${row.ratio.toFixed(3)} | ${label} |`)
  }
  lines.push('')
  lines.push('## Detail')
  lines.push('')
  for (const row of rows) {
    lines.push(`### ${row.fixture}`)
    lines.push('')
    lines.push(`- Input chars: ${row.chars}`)
    lines.push(`- markdown-it-ts: ${row.tsMs.toFixed(4)}ms`)
    lines.push(`- markdown-it: ${row.mdMs.toFixed(4)}ms`)
    lines.push(`- Ratio: ${row.ratio.toFixed(3)}`)
    lines.push('')
    lines.push('| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |')
    lines.push('|:--|:--|---:|---:|---:|---:|---:|')
    for (const hotspot of row.hotspots) {
      lines.push(`| ${hotspot.chain} | ${hotspot.name} | ${hotspot.calls} | ${hotspot.hits} | ${hotspot.inclusiveMs.toFixed(4)} | ${hotspot.medianMs.toFixed(6)} | ${hotspot.maxMs.toFixed(6)} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

const rows = FIXTURES.map(({ name, relPath, options }, index) => {
  console.log(`[perf:families] ${index + 1}/${FIXTURES.length} ${name}`)
  const fixture = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
  const input = repeatToSize(fixture)
  const mdTs = MarkdownItTS(options ?? {})
  const mdIt = MarkdownIt(options ?? {})
  const iterations = pickIterations(input.length)

  const pair = stableCompare(
    () => mdTs.parse(input, {}),
    () => mdIt.parse(input, {}),
    iterations,
  )

  const profileEnv = {
    __mdtsProfileRules: {
      fixture: name,
      mode: 'full-default',
    },
  }
  mdTs.parse(input, profileEnv)

  return {
    fixture: name,
    chars: input.length,
    tsMs: Number(pair.left.toFixed(4)),
    mdMs: Number(pair.right.toFixed(4)),
    ratio: Number((pair.left / pair.right).toFixed(3)),
    hotspots: topHotspots(profileEnv.__mdtsRuleProfile),
    profile: profileEnv.__mdtsRuleProfile,
  }
})

rows.sort((a, b) => b.ratio - a.ratio)

const payload = {
  generatedAt: new Date().toISOString(),
  targetChars: TARGET_CHARS,
  rows,
}

fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`)
fs.writeFileSync(OUT_MD, `${toMarkdown(rows)}\n`)

console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_MD)}`)
