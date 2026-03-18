import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import MarkdownIt from 'markdown-it'
import MarkdownItTS from '../dist/index.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_CHARS = 120_000

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
    if (out.length < target && out.charCodeAt(out.length - 1) !== 0x0A) {
      out += '\n'
    }
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
  if (size <= 30_000)
    return 120
  if (size <= 80_000)
    return 60
  if (size <= 160_000)
    return 24
  return 12
}

function measure(fn, iterations) {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  return (performance.now() - t0) / iterations
}

function stableCompare(fnA, fnB, iterations, samples = 9) {
  fnA()
  fnB()
  fnA()
  fnB()

  const aValues = new Array(samples)
  const bValues = new Array(samples)

  for (let i = 0; i < samples; i++) {
    if ((i & 1) === 0) {
      aValues[i] = measure(fnA, iterations)
      bValues[i] = measure(fnB, iterations)
    }
    else {
      bValues[i] = measure(fnB, iterations)
      aValues[i] = measure(fnA, iterations)
    }
  }

  return [median(aValues), median(bValues)]
}

function loadCases() {
  const filterArg = process.argv[2]
  const filters = filterArg
    ? new Set(filterArg.split(',').map(part => part.trim()).filter(Boolean))
    : null

  return FIXTURES
    .filter(({ name }) => !filters || filters.has(name))
    .map(({ name, relPath, options }) => {
    const fixture = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
    const input = repeatToSize(fixture)
    return { name, input, chars: input.length, options: options ?? {} }
  })
}

function main() {
  const cases = loadCases()
  const rows = cases.map(({ name, input, chars, options }) => {
    const mdTs = MarkdownItTS(options)
    const mdIt = MarkdownIt(options)
    const iterations = pickIterations(chars)
    const [tsMs, mdMs] = stableCompare(
      () => mdTs.parse(input, {}),
      () => mdIt.parse(input, {}),
      iterations,
    )
    const ratio = tsMs / mdMs
    return {
      type: name,
      chars,
      tsMs,
      mdMs,
      ratio,
      deltaPct: ((mdMs - tsMs) / mdMs) * 100,
    }
  }).sort((a, b) => a.ratio - b.ratio)

  console.table(rows.map(row => ({
    type: row.type,
    chars: row.chars,
    ts_ms: Number(row.tsMs.toFixed(4)),
    md_ms: Number(row.mdMs.toFixed(4)),
    ratio: Number(row.ratio.toFixed(3)),
    delta_pct: Number(row.deltaPct.toFixed(1)),
  })))

  const winners = rows.filter(row => row.ratio < 1).length
  console.log(`Winning categories: ${winners}/${rows.length}`)
}

main()
