#!/usr/bin/env node

// Run through `pnpm perf:profile` so dist is rebuilt before it is measured.
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'
import { getParseDiagnostics } from '../dist/experimental.js'
import MarkdownItOriginal from 'markdown-it'
import { parse as oxParse, parseAndRender as oxParseAndRender } from '@ox-content/napi'
import { firstDifference } from './perf-corpora.mjs'
import { FEATURE_STRESS_CORPORA, STOCK_BOUNDARY_CORPORA } from './perf-feature-corpora.mjs'

const targetChars = readPositiveInteger('MDTS_PROFILE_TARGET_CHARS', 100_000)
const requestedSamples = readPositiveInteger('MDTS_PROFILE_SAMPLES', 6)
const warmupsPerSample = readNonNegativeInteger('MDTS_PROFILE_WARMUPS', 1)
const selectedIds = new Set((process.env.MDTS_PROFILE_CASES || '').split(',').map(value => value.trim()).filter(Boolean))
const outputPath = process.env.MDTS_PROFILE_OUTPUT || ''

function readPositiveInteger(name, fallback) {
  const raw = process.env[name]
  if (raw == null || raw === '')
    return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer`)
  return value
}

function readNonNegativeInteger(name, fallback) {
  const raw = process.env[name]
  if (raw == null || raw === '')
    return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} must be a non-negative integer`)
  return value
}

function median(values) {
  const sorted = values.slice().sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function percentile(values, percentileValue) {
  const sorted = values.slice().sort((left, right) => left - right)
  if (sorted.length === 0)
    return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1))]
}

function rotate(values, offset) {
  if (values.length === 0)
    return values
  const start = ((offset % values.length) + values.length) % values.length
  return values.slice(start).concat(values.slice(0, start))
}

function measure(run, iterations) {
  const startedAt = performance.now()
  let result
  for (let iteration = 0; iteration < iterations; iteration++)
    result = run()
  return { ms: (performance.now() - startedAt) / iterations, result }
}

function measureRotatedGroup(runners, iterations) {
  const samples = Math.ceil(requestedSamples / runners.length) * runners.length
  const measurements = new Map(runners.map(runner => [runner.id, []]))
  const results = new Map()

  for (let sample = 0; sample < samples; sample++) {
    for (const runner of rotate(runners, sample)) {
      for (let warmup = 0; warmup < warmupsPerSample; warmup++)
        runner.run()
      const measured = measure(runner.run, iterations)
      measurements.get(runner.id).push(measured.ms)
      results.set(runner.id, measured.result)
    }
  }

  return {
    iterationsPerSample: iterations,
    orderPolicy: 'rotate-each-sample',
    samples,
    timings: Object.fromEntries(runners.map(runner => [runner.id, summarize(measurements.get(runner.id))])),
    results,
  }
}

function measureStable(run, iterations) {
  const values = []
  let result
  for (let sample = 0; sample < requestedSamples; sample++) {
    for (let warmup = 0; warmup < warmupsPerSample; warmup++)
      run()
    const measured = measure(run, iterations)
    values.push(measured.ms)
    result = measured.result
  }
  return { ...summarize(values), result }
}

function summarize(values) {
  return {
    medianMs: median(values),
    p95Ms: percentile(values, 0.95),
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
  }
}

function pickIterations(chars) {
  if (chars <= 5_000)
    return 100
  if (chars <= 20_000)
    return 40
  if (chars <= 50_000)
    return 20
  if (chars <= 100_000)
    return 10
  if (chars <= 250_000)
    return 5
  return 2
}

function countTokens(tokens) {
  let total = 0
  const stack = tokens.slice()
  while (stack.length > 0) {
    const token = stack.pop()
    if (!token)
      continue
    total++
    if (Array.isArray(token.children))
      stack.push(...token.children)
  }
  return total
}

function inspectStrategies(source) {
  const parseAttemptSamples = []
  const renderAttemptSamples = []
  let tokens = []
  let html = ''
  let parseDiagnostics
  let renderDiagnostics

  for (let iteration = 0; iteration < warmupsPerSample + requestedSamples; iteration++) {
    const parseEnv = {}
    const renderEnv = {}
    tokens = MarkdownIt().parse(source, parseEnv)
    html = MarkdownIt().render(source, renderEnv)
    parseDiagnostics = getParseDiagnostics(parseEnv)
    renderDiagnostics = getParseDiagnostics(renderEnv)

    if (iteration >= warmupsPerSample) {
      if (Number.isFinite(parseDiagnostics?.stockFast?.attemptMs))
        parseAttemptSamples.push(parseDiagnostics.stockFast.attemptMs)
      if (Number.isFinite(renderDiagnostics?.stockFast?.attemptMs))
        renderAttemptSamples.push(renderDiagnostics.stockFast.attemptMs)
    }
  }

  if (parseDiagnostics?.stockFast && parseAttemptSamples.length > 0)
    parseDiagnostics.stockFast.attemptMs = median(parseAttemptSamples)
  if (renderDiagnostics?.stockFast && renderAttemptSamples.length > 0)
    renderDiagnostics.stockFast.attemptMs = median(renderAttemptSamples)

  const renderStrategy = renderDiagnostics?.strategy
  return {
    html,
    parseDiagnostics,
    renderDiagnostics,
    parsePath: parseDiagnostics?.strategy?.path ?? 'unknown',
    renderPath: renderStrategy?.area === 'render' && renderStrategy.path === 'stock-fast'
      ? 'stock-fast'
      : 'token-renderer',
    tokenCount: tokens.length,
    recursiveTokenCount: countTokens(tokens),
  }
}

function measureLiveHeapDeltaWithResultAfterGc(run) {
  if (typeof globalThis.gc !== 'function')
    return null

  const deltas = []
  for (let sample = 0; sample < 3; sample++) {
    globalThis.gc()
    const before = process.memoryUsage().heapUsed
    let result = run()
    globalThis.gc()
    const after = process.memoryUsage().heapUsed
    deltas.push(after - before)
    result = null
    globalThis.gc()
  }
  return median(deltas)
}

function benchmarkCorpus(corpus, lane) {
  const source = corpus.makeDocument(targetChars)
  const oxOptions = lane === 'feature-stress' ? { tables: true, strikethrough: true } : undefined
  const iterations = pickIterations(source.length)
  const strategies = inspectStrategies(source)

  if (strategies.parsePath !== corpus.expectedParsePath) {
    throw new Error(`${corpus.id}: expected parse path ${corpus.expectedParsePath}, received ${strategies.parsePath}`)
  }
  if (strategies.renderPath !== corpus.expectedRenderPath) {
    throw new Error(`${corpus.id}: expected render path ${corpus.expectedRenderPath}, received ${strategies.renderPath}`)
  }

  const tsParser = MarkdownIt()
  const tsParserWithoutStockFast = MarkdownIt().use(() => {})
  const markdownItParser = MarkdownItOriginal()
  const parseGroup = measureRotatedGroup([
    { id: 'markdownItTs', run: () => tsParser.parse(source) },
    { id: 'markdownItTsWithoutStockFast', run: () => tsParserWithoutStockFast.parse(source) },
    { id: 'markdownIt', run: () => markdownItParser.parse(source) },
    { id: 'oxContent', run: () => oxParse(source, oxOptions) },
  ], iterations)

  const renderOnlyMd = MarkdownIt()
  const renderOnlyTokens = renderOnlyMd.parse(source)
  const tokenRender = measureStable(
    () => renderOnlyMd.renderer.render(renderOnlyTokens, renderOnlyMd.options, {}),
    iterations,
  )

  const tsRenderer = MarkdownIt()
  const tsRendererWithoutStockFast = MarkdownIt().use(() => {})
  const markdownItRenderer = MarkdownItOriginal()
  const renderGroup = measureRotatedGroup([
    { id: 'markdownItTs', run: () => tsRenderer.render(source) },
    { id: 'markdownItTsWithoutStockFast', run: () => tsRendererWithoutStockFast.render(source) },
    { id: 'markdownIt', run: () => markdownItRenderer.render(source) },
    { id: 'oxContent', run: () => oxParseAndRender(source, oxOptions).html },
  ], iterations)

  const tokenHtml = renderOnlyMd.renderer.render(renderOnlyTokens, renderOnlyMd.options, {})
  const directHtml = tsRenderer.render(source)
  const withoutStockFastHtml = tsRendererWithoutStockFast.render(source)
  if (tokenHtml !== directHtml)
    throw new Error(`${corpus.id}: markdown-it-ts parse + token render output differs from render()`)
  if (withoutStockFastHtml !== directHtml)
    throw new Error(`${corpus.id}: disabling stock-fast changes markdown-it-ts render output`)

  const repeatedHtml = tsRenderer.render(source)
  if (repeatedHtml !== directHtml)
    throw new Error(`${corpus.id}: markdown-it-ts render output is not deterministic`)

  const oxHtml = oxParseAndRender(source, oxOptions).html
  const liveHeapDeltaWithTokensAfterGcBytes = measureLiveHeapDeltaWithResultAfterGc(() => tsParser.parse(source))

  return {
    id: corpus.id,
    label: corpus.label,
    lane,
    description: corpus.description,
    chars: source.length,
    bytes: Buffer.byteLength(source),
    iterationsPerSample: iterations,
    samples: parseGroup.samples,
    orderPolicy: parseGroup.orderPolicy,
    parse: {
      timings: parseGroup.timings,
      path: strategies.parsePath,
      diagnostics: strategies.parseDiagnostics,
      topLevelTokenCount: strategies.tokenCount,
      recursiveTokenCount: strategies.recursiveTokenCount,
      liveHeapDeltaWithTokensAfterGcBytes,
      stockFastDeltaMs: parseGroup.timings.markdownItTs.medianMs - parseGroup.timings.markdownItTsWithoutStockFast.medianMs,
    },
    render: {
      timings: renderGroup.timings,
      tokenRenderer: {
        medianMs: tokenRender.medianMs,
        p95Ms: tokenRender.p95Ms,
      },
      stockFastDeltaMs: renderGroup.timings.markdownItTs.medianMs - renderGroup.timings.markdownItTsWithoutStockFast.medianMs,
      path: strategies.renderPath,
      diagnostics: strategies.renderDiagnostics,
      htmlChars: directHtml.length,
      parseThenRenderEqualsDirect: true,
      deterministic: true,
      oxOutputComparison: firstDifference(directHtml, oxHtml),
    },
    oxOptions: oxOptions ?? {},
  }
}

function formatMs(value) {
  return value < 10 ? `${value.toFixed(4)}ms` : `${value.toFixed(2)}ms`
}

function formatSignedMs(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatMs(value)}`
}

function printLane(rows, lane, title) {
  console.log(`\n## ${title}\n`)
  console.log('| Case | Chars | TS parse | Stock parse Δ | markdown-it parse | OX parse | Parse path | Stock attempt | Tokens | TS token render | TS end-to-end | Stock render Δ | OX end-to-end | Render path |')
  console.log('|:--|---:|---:|---:|---:|---:|:--|---:|---:|---:|---:|---:|---:|:--|')
  for (const row of rows.filter(candidate => candidate.lane === lane)) {
    const attempt = row.parse.diagnostics?.stockFast?.attemptMs
    console.log(`| ${row.id} | ${row.chars.toLocaleString()} | ${formatMs(row.parse.timings.markdownItTs.medianMs)} | ${formatSignedMs(row.parse.stockFastDeltaMs)} | ${formatMs(row.parse.timings.markdownIt.medianMs)} | ${formatMs(row.parse.timings.oxContent.medianMs)} | ${row.parse.path} | ${attempt == null ? 'n/a' : formatMs(attempt)} | ${row.parse.recursiveTokenCount.toLocaleString()} | ${formatMs(row.render.tokenRenderer.medianMs)} | ${formatMs(row.render.timings.markdownItTs.medianMs)} | ${formatSignedMs(row.render.stockFastDeltaMs)} | ${formatMs(row.render.timings.oxContent.medianMs)} | ${row.render.path} |`)
  }
}

const allCorpora = [
  ...FEATURE_STRESS_CORPORA.map(corpus => ({ ...corpus, lane: 'feature-stress' })),
  ...STOCK_BOUNDARY_CORPORA.map(corpus => ({ ...corpus, lane: 'stock-boundary' })),
]
const unknownIds = [...selectedIds].filter(id => !allCorpora.some(corpus => corpus.id === id))
if (unknownIds.length > 0)
  throw new Error(`Unknown profile case(s): ${unknownIds.join(', ')}`)

const selectedCorpora = selectedIds.size > 0
  ? allCorpora.filter(corpus => selectedIds.has(corpus.id))
  : allCorpora
const rows = selectedCorpora.map(corpus => benchmarkCorpus(corpus, corpus.lane))
const report = {
  benchmark: 'feature-profile',
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cpuCount: os.cpus().length,
    gcExposed: typeof globalThis.gc === 'function',
  },
  config: {
    targetChars,
    requestedSamples,
    warmupsPerSample,
    selectedCases: [...selectedIds],
  },
  rows,
}

console.log('# Feature profile')
console.log(`\nNode ${report.environment.node}; ${report.environment.platform}; ${report.environment.cpu}; GC exposed: ${report.environment.gcExposed ? 'yes' : 'no'}.`)
console.log(`Target chars: ${targetChars.toLocaleString()}; requested samples: ${requestedSamples}; warmups per sample: ${warmupsPerSample}.`)
console.log('Stock Δ is stock-fast enabled minus the same implementation with stock-fast disabled; negative values are faster.')
console.log('Live heap JSON values retain the returned token array during post-GC measurement; they are not allocation or GC-pause metrics.')
printLane(rows, 'feature-stress', 'General Markdown feature stress')
printLane(rows, 'stock-boundary', 'Stock-fast boundary and cache behavior')

console.log('\nStock diagnostics:')
for (const row of rows.filter(candidate => candidate.parse.diagnostics?.stockFast || candidate.render.diagnostics?.stockFast)) {
  console.log(`- ${row.id}: parse=${JSON.stringify(row.parse.diagnostics?.stockFast ?? null)} render=${JSON.stringify(row.render.diagnostics?.stockFast ?? null)}`)
}

if (outputPath) {
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`\nWrote ${outputPath}`)
}
