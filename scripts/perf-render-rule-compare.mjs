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

const args = process.argv.slice(2)
const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
const minSignalArg = args.find(arg => arg.startsWith('--min-signal-ms='))
const jsonOutArg = args.find(arg => arg.startsWith('--json-out='))
const failOnRegression = args.includes('--fail-on-regression')
const includeNoise = args.includes('--include-noise')

const REGRESSION_THRESHOLD = thresholdArg ? Math.max(0, Number.parseFloat(thresholdArg.split('=')[1]) || 0) : 0
const MIN_SIGNAL_MS = minSignalArg ? Math.max(0, Number.parseFloat(minSignalArg.split('=')[1]) || 0) : 0.02

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
  if (size <= 30_000)
    return 400
  if (size <= 80_000)
    return 200
  if (size <= 160_000)
    return 100
  return 50
}

function scaleIterationsForTokenCount(baseIterations, tokenCount) {
  if (tokenCount <= 2)
    return baseIterations * 12
  if (tokenCount <= 8)
    return baseIterations * 8
  if (tokenCount <= 32)
    return baseIterations * 4
  if (tokenCount <= 96)
    return baseIterations * 2
  return baseIterations
}

function countRenderTokens(tokens) {
  let count = 0
  for (let i = 0; i < tokens.length; i++) {
    count++
    const token = tokens[i]
    if (token.children && token.children.length > 0)
      count += countRenderTokens(token.children)
  }
  return count
}

function measure(fn, iterations) {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++)
    fn()
  return (performance.now() - t0) / iterations
}

function stablePairMeasure(fnA, fnB, iterations, samples = 11) {
  fnA()
  fnA()
  fnB()
  fnB()

  const valuesA = new Array(samples)
  const valuesB = new Array(samples)

  for (let i = 0; i < samples; i++) {
    if (i % 2 === 0) {
      valuesA[i] = measure(fnA, iterations)
      valuesB[i] = measure(fnB, iterations)
    }
    else {
      valuesB[i] = measure(fnB, iterations)
      valuesA[i] = measure(fnA, iterations)
    }
  }

  return {
    a: median(valuesA),
    b: median(valuesB),
  }
}

function loadCases() {
  return FIXTURES.map(({ name, relPath, options }) => {
    const fixture = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
    const input = repeatToSize(fixture)
    return { name, input, chars: input.length, options: options ?? {} }
  })
}

function normalizeTokenTypesForMarkdownIt(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'text_special')
      token.type = 'text'
    if (token.children && token.children.length > 0)
      normalizeTokenTypesForMarkdownIt(token.children)
  }
  return tokens
}

function renderTs(md, tokens) {
  return md.renderer.render(tokens, md.options, EMPTY_ENV)
}

function renderOriginal(md, tokens) {
  return md.renderer.render(tokens, md.options, EMPTY_ENV)
}

const EMPTY_ENV = {}

function shouldCheckRow(tokenCount, tsMs, mdMs) {
  if (tokenCount === 0)
    return { check: false, reason: 'zero-token' }

  if (Math.max(tsMs, mdMs) < MIN_SIGNAL_MS)
    return { check: false, reason: `sub-signal(<${MIN_SIGNAL_MS}ms)` }

  return { check: true, reason: 'checked' }
}

function main() {
  const cases = loadCases()
  const rows = cases.map(({ name, input, chars, options }) => {
    const mdTs = MarkdownItTS(options)
    const mdIt = MarkdownIt(options)

    const tsTokens = mdTs.parse(input, {})
    const mdTokens = normalizeTokenTypesForMarkdownIt(mdTs.parse(input, {}))
    const tsHtml = renderTs(mdTs, tsTokens)
    const mdHtml = renderOriginal(mdIt, mdTokens)

    if (tsHtml !== mdHtml)
      throw new Error(`Output mismatch for ${name}`)

    const tokenCount = countRenderTokens(tsTokens)
    const iterations = scaleIterationsForTokenCount(pickIterations(chars), tokenCount)
    const paired = stablePairMeasure(() => renderTs(mdTs, tsTokens), () => renderOriginal(mdIt, mdTokens), iterations)
    const tsMs = paired.a
    const mdMs = paired.b
    const ratio = tsMs / mdMs
    const check = shouldCheckRow(tokenCount, tsMs, mdMs)
    const regressionDelta = ratio - 1
    const isRegression = check.check && regressionDelta > REGRESSION_THRESHOLD

    return {
      type: name,
      chars,
      tokenCount,
      tsMs,
      mdMs,
      ratio,
      deltaPct: ((mdMs - tsMs) / mdMs) * 100,
      status: check.reason,
      checked: check.check,
      isRegression,
    }
  }).sort((a, b) => a.ratio - b.ratio)

  const visibleRows = includeNoise ? rows : rows.filter(row => row.checked)

  console.table(visibleRows.map(row => ({
    type: row.type,
    chars: row.chars,
    tokens: row.tokenCount,
    status: row.status,
    ts_ms: Number(row.tsMs.toFixed(4)),
    md_ms: Number(row.mdMs.toFixed(4)),
    ratio: Number(row.ratio.toFixed(3)),
    delta_pct: Number(row.deltaPct.toFixed(1)),
  })))

  const checkedRows = rows.filter(row => row.checked)
  const winners = checkedRows.filter(row => row.ratio < 1).length
  const regressions = checkedRows.filter(row => row.isRegression)
  const skipped = rows.length - checkedRows.length

  console.log(`Winning checked categories: ${winners}/${checkedRows.length}`)
  console.log(`Skipped noisy categories: ${skipped}/${rows.length} (use --include-noise to show all)`)

  if (jsonOutArg) {
    const jsonPath = jsonOutArg.split('=')[1]
    fs.writeFileSync(jsonPath, JSON.stringify({
      threshold: REGRESSION_THRESHOLD,
      minSignalMs: MIN_SIGNAL_MS,
      checkedCategories: checkedRows.length,
      skippedCategories: skipped,
      winningCategories: winners,
      regressions: regressions.map(row => row.type),
      rows,
    }, null, 2))
  }

  if (regressions.length > 0) {
    console.log(`Regressed checked categories: ${regressions.map(row => row.type).join(', ')}`)
    if (failOnRegression)
      process.exitCode = 1
  }
}

main()
