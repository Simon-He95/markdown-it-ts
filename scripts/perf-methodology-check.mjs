import { existsSync, readFileSync } from 'node:fs'
import { getBenchmarkFingerprint, sha256 } from './perf-fingerprint.mjs'

const perfPath = new URL('../docs/perf-latest.json', import.meta.url)
const reportPath = new URL('../docs/perf-latest.md', import.meta.url)
const readmePaths = [
  new URL('../README.md', import.meta.url),
  new URL('../README.zh-CN.md', import.meta.url),
]
const perf = JSON.parse(readFileSync(perfPath, 'utf8'))
const report = readFileSync(reportPath, 'utf8')
const readmes = readmePaths.map(path => readFileSync(path, 'utf8'))
const failures = []

function fail(message) {
  failures.push(message)
}

function hasFiniteTimings(row) {
  return [
    row.parse?.markdownItTsMs,
    row.parse?.markdownItMs,
    row.parse?.oxContentMs,
    row.render?.markdownItTsMs,
    row.render?.markdownItMs,
    row.render?.oxContentMs,
  ].every(Number.isFinite)
}

function hasOptions(row, expected) {
  return Object.entries(expected).every(([key, value]) => row.oxOptions?.[key] === value)
}

if (perf.benchmarkVersion < 7)
  fail(`benchmarkVersion must be at least 7, received ${perf.benchmarkVersion}`)
if (perf.benchmarkFingerprint !== getBenchmarkFingerprint())
  fail('checked-in performance snapshot is stale relative to benchmark inputs or source files')
if (perf.reportSha256 !== sha256(report))
  fail('docs/perf-latest.md does not match the report recorded by docs/perf-latest.json')

if (perf.comparisonPolicy?.nativeApiOutputEquivalent !== false)
  fail('native API comparisons must be marked as non-equivalent output')
if (perf.comparisonPolicy?.stockAstJsonOutputEquivalent !== true)
  fail('stock AST JSON comparisons must be marked as equivalent output')
if (perf.comparisonPolicy?.tunedResultsAreHeadline !== false)
  fail('tuned/best-of results must not be marked as the headline comparison')

const rows = perf.nativeCorpusComparisons || []
const stockRows = rows.filter(row => row.corpusId === 'stock-subset')
const featureMixedRows = rows.filter(row => row.corpusId === 'feature-mixed')
const realWorldRows = rows.filter(row => row.corpusKind === 'real-world')

if (stockRows.length === 0)
  fail('stock-subset native API rows are missing')
if (featureMixedRows.length === 0)
  fail('feature-mixed native API rows are missing')
if (realWorldRows.length < 3)
  fail('expected at least three independently reported real-world files')

for (const row of rows) {
  if (!hasFiniteTimings(row))
    fail(`native corpus row ${row.corpusId} at ${row.size} chars has missing or non-finite timings`)
  if (row.parse?.equivalentOutput !== false)
    fail(`native corpus parse row ${row.corpusId} must be marked as non-equivalent output`)
  if (typeof row.render?.outputComparison?.equal !== 'boolean')
    fail(`native corpus row ${row.corpusId} is missing its HTML comparison`)
  if (row.measurement?.orderPolicy !== 'rotate-each-sample')
    fail(`native corpus row ${row.corpusId} must rotate implementation order for every sample`)
  if (!Number.isInteger(row.measurement?.samples) || row.measurement.samples < 3 || row.measurement.samples % 3 !== 0)
    fail(`native corpus row ${row.corpusId} must record at least three balanced samples`)
  if (!Number.isInteger(row.measurement?.iterationsPerSample) || row.measurement.iterationsPerSample < 1)
    fail(`native corpus row ${row.corpusId} must record iterations per sample`)
}

for (const row of stockRows) {
  if (row.parse?.path !== 'stock-fast')
    fail(`stock-subset parse path must be stock-fast at ${row.size} chars`)
  if (row.render?.path !== 'stock-fast')
    fail(`stock-subset render path must be stock-fast at ${row.size} chars`)
  if (Object.keys(row.oxOptions || {}).length !== 0)
    fail(`stock-subset must use default OX options at ${row.size} chars`)
}

for (const row of featureMixedRows) {
  if (!['general', 'full-chunk'].includes(row.parse?.path))
    fail(`feature-mixed parse path must be general or full-chunk at ${row.size} chars`)
  if (row.render?.path !== 'token-renderer')
    fail(`feature-mixed render path must be token-renderer at ${row.size} chars`)
  if (!hasOptions(row, { tables: true, strikethrough: true }))
    fail(`feature-mixed OX options must enable tables and strikethrough at ${row.size} chars`)
}

const corpusMetadata = perf.corpora || []
const corpusIds = corpusMetadata.map(corpus => corpus.id)
if (new Set(corpusIds).size !== corpusIds.length)
  fail('corpus metadata IDs must be unique')

for (const row of realWorldRows) {
  if (!row.sourcePath)
    fail(`real-world row ${row.corpusId} must retain its source path`)
  else if (!existsSync(new URL(`../${row.sourcePath}`, import.meta.url)))
    fail(`real-world source file does not exist: ${row.sourcePath}`)
  if (row.size <= 0)
    fail(`real-world row ${row.corpusId} must not be empty`)
  if (!['general', 'full-chunk'].includes(row.parse?.path))
    fail(`real-world row ${row.corpusId} must record a general parser path`)
  if (row.render?.path !== 'token-renderer')
    fail(`real-world row ${row.corpusId} must use the token renderer`)
  if (!hasOptions(row, { tables: true, strikethrough: true }))
    fail(`real-world row ${row.corpusId} must record aligned OX options`)

  const metadata = corpusMetadata.find(corpus => corpus.id === row.corpusId)
  if (!metadata?.provenance?.includes('MIT'))
    fail(`real-world row ${row.corpusId} must retain MIT provenance metadata`)
}

const equivalentRows = perf.stockAstJsonComparisons || []
if (equivalentRows.length === 0)
  fail('equivalent-output stock AST JSON rows are missing')
for (const row of equivalentRows) {
  if (![row.tsAstJsonMs, row.oxParseMs, row.oxParseJsonMs].every(Number.isFinite))
    fail(`equivalent-output AST JSON row ${row.size} has missing or non-finite timings`)
}

for (const required of [
  'Native API throughput by corpus',
  'not equivalent work',
  'specialized fast-path benchmark',
  'Equivalent-output stock-subset AST JSON',
]) {
  if (!report.includes(required))
    fail(`generated report is missing required methodology text: ${required}`)
}

const requiredReadmeText = [
  ['README.md', readmes[0], ['stock-subset', 'not equivalent output', 'feature-mixed', 'HTML equal?']],
  ['README.zh-CN.md', readmes[1], ['stock-subset', '不是等价输出', 'feature-mixed', 'HTML 相同？']],
]
for (const [name, content, requiredTexts] of requiredReadmeText) {
  for (const required of requiredTexts) {
    if (!content.includes(required))
      fail(`${name} is missing required methodology text: ${required}`)
  }
}

if (failures.length > 0) {
  console.error(`Benchmark methodology check failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Benchmark methodology check passed (${stockRows.length} stock-subset, ${featureMixedRows.length} feature-mixed, ${realWorldRows.length} real-world rows).`)
