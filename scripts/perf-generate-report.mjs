// Generate a fresh performance report as docs/perf-latest.md
// Build first: npm run build
// Run: node scripts/perf-generate-report.mjs

import { performance } from 'node:perf_hooks'
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import os from 'node:os'
import MarkdownIt from '../dist/index.js'
import { getParseDiagnostics, parseStockFastAstJson } from '../dist/experimental.js'
import MarkdownItOriginal from 'markdown-it'
import {
  IncrementalMarkdownParser as OxIncrementalMarkdownParser,
  parse as oxParse,
  parseAndRender as oxParseAndRender,
} from '@ox-content/napi'
import { createMarkdownExit as createMarkdownExitFactory } from 'markdown-exit'
import {
  FEATURE_MIXED_CORPUS,
  REAL_WORLD_CORPUS_FILES,
  STOCK_SUBSET_CORPUS,
  firstDifference,
  makeFeatureMixedDocument,
  makeStockSubsetParts,
} from './perf-corpora.mjs'
import { getBenchmarkFingerprint, sha256 } from './perf-fingerprint.mjs'
import { micromark, parse as micromarkParse, preprocess as micromarkPreprocess, postprocess as micromarkPostprocess } from 'micromark'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const PERF_BENCHMARK_VERSION = 7

function safeGitCommit(args = ['rev-parse', 'HEAD']) {
  try {
    return execSync(`git ${args.join(' ')}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'unknown'
  }
  catch {
    return 'unknown'
  }
}

function getPerfEnvironment() {
  const cpus = os.cpus()
  return {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    commit: safeGitCommit(),
  }
}

function makeStockSubsetByChars(targetChars) {
  return makeStockSubsetParts(targetChars)
}

function splitParasIntoSteps(paras, steps) {
  const per = Math.max(1, Math.floor(paras.length / steps))
  const parts = []
  for (let i = 0; i < steps - 1; i++) parts.push(paras.slice(i * per, (i + 1) * per).join(''))
  parts.push(paras.slice((steps - 1) * per).join(''))
  return parts
}

function splitLinesIntoSteps(text, steps) {
  const lines = text.split('\n')
  const per = Math.max(1, Math.floor(lines.length / steps))
  const parts = []
  for (let i = 0; i < steps - 1; i++) parts.push(lines.slice(i * per, (i + 1) * per).join('\n') + '\n')
  parts.push(lines.slice((steps - 1) * per).join('\n') + '\n')
  return parts
}

function measure(fn, iters = 1) {
  // Runs fn() iters times and returns total ms and last result
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

async function measureAsync(fn, iters = 1) {
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = await fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function measureStable(fn, iters = 1, samples = 3) {
  const measurements = []
  let res
  for (let sample = 0; sample < samples; sample++) {
    const run = measure(fn, iters)
    measurements.push(run.ms / iters)
    res = run.res
  }
  return { ms: median(measurements), res }
}

function measureStableWarm(fn, iters = 1, samples = 3, warmupsPerSample = 1) {
  const measurements = []
  let res
  for (let sample = 0; sample < samples; sample++) {
    for (let warm = 0; warm < warmupsPerSample; warm++)
      fn()
    const run = measure(fn, iters)
    measurements.push(run.ms / iters)
    res = run.res
  }
  return { ms: median(measurements), res }
}

async function measureStableWarmAsync(fn, iters = 1, samples = 3, warmupsPerSample = 1) {
  const measurements = []
  let res
  for (let sample = 0; sample < samples; sample++) {
    for (let warm = 0; warm < warmupsPerSample; warm++)
      await fn()
    const run = await measureAsync(fn, iters)
    measurements.push(run.ms / iters)
    res = run.res
  }
  return { ms: median(measurements), res }
}

function rotate(items, offset) {
  if (items.length === 0)
    return items

  const start = ((offset % items.length) + items.length) % items.length
  return items.slice(start).concat(items.slice(0, start))
}

function measureRotatedWarmGroup(runners, iters, requestedSamples, warmupsPerSample = 1) {
  if (runners.length === 0)
    throw new Error('measureRotatedWarmGroup requires at least one runner')

  const samples = Math.ceil(requestedSamples / runners.length) * runners.length
  const measurements = new Map(runners.map(runner => [runner.id, []]))

  for (let sample = 0; sample < samples; sample++) {
    for (const runner of rotate(runners, sample)) {
      for (let warm = 0; warm < warmupsPerSample; warm++)
        runner.run()
      const measured = measure(runner.run, iters).ms / iters
      measurements.get(runner.id).push(measured)
    }
  }

  return {
    orderPolicy: 'rotate-each-sample',
    samples,
    timings: Object.fromEntries(
      runners.map(runner => [runner.id, median(measurements.get(runner.id))]),
    ),
  }
}

function pickIters(size) {
  // Increase iterations for small sizes to reduce timer noise
  if (size <= 5_000) return { oneIters: 120, appRepeats: 6, stableSamples: 5, appendSequenceIters: 6, appendLineSequenceIters: 4, replaceSequenceIters: 8 }
  if (size <= 20_000) return { oneIters: 60, appRepeats: 5, stableSamples: 5, appendSequenceIters: 5, appendLineSequenceIters: 4, replaceSequenceIters: 6 }
  if (size <= 50_000) return { oneIters: 30, appRepeats: 4, stableSamples: 5, appendSequenceIters: 4, appendLineSequenceIters: 3, replaceSequenceIters: 5 }
  if (size <= 100_000) return { oneIters: 16, appRepeats: 4, stableSamples: 5, appendSequenceIters: 3, appendLineSequenceIters: 2, replaceSequenceIters: 4 }
  if (size <= 200_000) return { oneIters: 10, appRepeats: 4, stableSamples: 5, appendSequenceIters: 2, appendLineSequenceIters: 2, replaceSequenceIters: 3 }
  if (size <= 500_000) return { oneIters: 4, appRepeats: 3, stableSamples: 4, appendSequenceIters: 1, appendLineSequenceIters: 1, replaceSequenceIters: 2 }
  return { oneIters: 2, appRepeats: 2, stableSamples: 3, appendSequenceIters: 1, appendLineSequenceIters: 1, replaceSequenceIters: 1 }
}

function fmt(ms) {
  // Keep very fast results visible instead of rounding to 0.00
  if (ms < 10) return `${ms.toFixed(4)}ms`
  return `${ms.toFixed(2)}ms`
}

function formatNumber(value, digits = 2) {
  return value.toFixed(digits).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
}

function describeComparison(baseline, candidate, { speedDigits = 2, percentDigits = 1 } = {}) {
  const percent = Math.abs((1 - candidate / baseline) * 100)
  if (candidate <= baseline) {
    return `${formatNumber(baseline / candidate, speedDigits)}× faster, ${formatNumber(percent, percentDigits)}% less time`
  }
  return `${formatNumber(candidate / baseline, speedDigits)}× slower, ${formatNumber(percent, percentDigits)}% more time`
}

const SIZES = [5_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000]
const APP_STEPS = 6
const COLD_HOT_SIZES = [5_000, 20_000, 50_000, 100_000]
const COLD_HOT_ITERS = 10
const HEAVY_PARSE_ONLY_MAX_SIZE = 200_000
const HEAVY_RENDER_MAX_SIZE = 200_000

function createMicromarkParseOnly() {
  const parser = micromarkParse()
  return {
    parse(value) {
      const doc = parser.document()
      const pre = micromarkPreprocess()
      doc.write(pre(value, 'utf8', true))
      return micromarkPostprocess(doc.events)
    },
  }
}

function makeScenarios() {
  function s1() { return MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkSizeChars: 10_000, streamChunkSizeLines: 200, streamChunkFenceAware: true }) }
  function s2() { return MarkdownIt({ stream: true, streamChunkedFallback: false }) }
  function s3() { return MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkSizeChars: 10_000, streamChunkSizeLines: 200, streamChunkFenceAware: true }) }
  function s4() { return MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkThresholdChars: 20_000, fullChunkThresholdLines: 400, fullChunkSizeChars: 10_000, fullChunkSizeLines: 200, fullChunkFenceAware: true }) }
  function s5() { return MarkdownIt({ stream: false }) }
  return [
    { id: 'S1', label: 'stream ON, cache OFF, chunk ON', make: s1, type: 'stream-no-cache-chunk' },
    { id: 'S2', label: 'stream ON, cache ON, chunk OFF', make: s2, type: 'stream-cache' },
    { id: 'S3', label: 'stream ON, cache ON, chunk ON', make: s3, type: 'stream-hybrid' },
    { id: 'S4', label: 'stream OFF, chunk ON', make: s4, type: 'full-chunk' },
    { id: 'S5', label: 'stream OFF, chunk OFF', make: s5, type: 'full-plain' },
    { id: 'M1', label: 'markdown-it (baseline)', make: () => MarkdownItOriginal(), type: 'md-original' },
    { id: 'E1', label: 'markdown-exit', make: () => createMarkdownExitFactory(), type: 'md-exit' },
    { id: 'OX1', label: '@ox-content/napi (parse only)', make: () => ({ parser: new OxIncrementalMarkdownParser() }), type: 'ox-content' },
    { id: 'OXJ', label: '@ox-content/napi (parse + JSON.parse)', make: () => ({ parser: new OxIncrementalMarkdownParser() }), type: 'ox-content-json' },
    // Parse-only using micromark's preprocess + parse + postprocess pipeline (no HTML compile).
    { id: 'MM1', label: 'micromark (parse only)', make: createMicromarkParseOnly, type: 'micromark-parse' },
    // Remark parse-only scenario (parse throughput, no HTML render)
    { id: 'R1', label: 'remark (parse only)', make: () => unified().use(remarkParse), type: 'remark' },
  ]
}

function resetScenario(sc, md) {
  if (sc.type.startsWith('stream'))
    md.stream.reset()
  if (sc.type === 'ox-content' || sc.type === 'ox-content-json')
    md.parser.reset()
}

function runParseScenario(sc, md, input, envStream, envPlain) {
  if (sc.type.startsWith('stream'))
    return md.stream.parse(input, envStream)
  if (sc.type === 'md-original')
    return md.parse(input)
  if (sc.type === 'md-exit')
    return md.parse(input)
  if (sc.type === 'ox-content')
    return oxParse(input)
  if (sc.type === 'ox-content-json')
    return JSON.parse(oxParse(input).ast)
  if (sc.type === 'remark')
    return md.parse(input)
  if (sc.type === 'full-plain')
    return md.parse(input)
  return md.parse(input, envPlain)
}

function runAppendParseScenario(sc, md, acc, piece, isFinal, envStream, envPlain) {
  if (sc.type === 'ox-content')
    return md.parser.append(piece, { isFinal })
  if (sc.type === 'ox-content-json')
    return JSON.parse(md.parser.append(piece, { isFinal }).ast)
  return runParseScenario(sc, md, acc, envStream, envPlain)
}

function createBenchEnvs() {
  return {
    stream: { bench: true },
    plain: { bench: true },
  }
}

function normalizeAppendStep(acc, piece) {
  let next = acc
  let prefix = ''
  if (next.length && next.charCodeAt(next.length - 1) !== 0x0A)
    prefix = '\n'

  let normalizedPiece = piece
  if (normalizedPiece.length && normalizedPiece.charCodeAt(normalizedPiece.length - 1) !== 0x0A)
    normalizedPiece += '\n'

  return { next: next + prefix + normalizedPiece, piece: prefix + normalizedPiece }
}

function measureScenarioOneShot(entry, doc, iters) {
  let lastEnvs = createBenchEnvs()
  const ms = measure(() => {
    resetScenario(entry.sc, entry.md)
    lastEnvs = createBenchEnvs()
    runParseScenario(entry.sc, entry.md, doc, lastEnvs.stream, lastEnvs.plain)
  }, iters).ms / iters

  entry.chunkInfoOne = entry.sc.type === 'full-chunk'
    ? (getParseDiagnostics(lastEnvs.plain)?.chunk || null)
    : (entry.sc.type.startsWith('stream') ? (getParseDiagnostics(lastEnvs.stream)?.chunk || null) : null)

  return ms
}

function measureScenarioAppend(entry, parts, repeatCount = 1) {
  let totalMs = 0
  let lastEnvs = createBenchEnvs()
  for (let seq = 0; seq < repeatCount; seq++) {
    resetScenario(entry.sc, entry.md)
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const step = normalizeAppendStep(acc, parts[i])
      acc = step.next
      if (entry.sc.type === 'stream-no-cache-chunk')
        entry.md.stream.reset()
      lastEnvs = createBenchEnvs()
      const t = performance.now()
      runAppendParseScenario(entry.sc, entry.md, acc, step.piece, i === parts.length - 1, lastEnvs.stream, lastEnvs.plain)
      totalMs += performance.now() - t
    }
  }

  entry.chunkInfoAppendLast = entry.sc.type === 'full-chunk'
    ? (getParseDiagnostics(lastEnvs.plain)?.chunk || null)
    : (entry.sc.type.startsWith('stream') ? (getParseDiagnostics(lastEnvs.stream)?.chunk || null) : null)
  entry.lastMode = entry.md.stream?.stats?.().lastMode || 'n/a'
  entry.appendHits = entry.md.stream?.stats?.().appendHits || 0

  return totalMs / repeatCount
}

function measureScenarioReplace(entry, paras, repeatCount = 1, sampleIndex = 0) {
  let totalMs = 0
  const lastIdx = paras.length - 1

  for (let seq = 0; seq < repeatCount; seq++) {
    resetScenario(entry.sc, entry.md)
    const altered = paras.slice()
    altered[lastIdx] = `${altered[lastIdx]}\n/* edit ${sampleIndex}-${seq} */\n`
    const full = altered.join('')
    const envs = createBenchEnvs()
    const t = performance.now()
    runParseScenario(entry.sc, entry.md, full, envs.stream, envs.plain)
    totalMs += performance.now() - t
  }

  entry.lastMode = entry.md.stream?.stats?.().lastMode || entry.lastMode || 'n/a'
  entry.appendHits = entry.md.stream?.stats?.().appendHits || entry.appendHits || 0

  return totalMs / repeatCount
}

function warmAppendScenario(sc, md, parts) {
  resetScenario(sc, md)
  let acc = ''
  for (let i = 0; i < parts.length; i++) {
    const step = normalizeAppendStep(acc, parts[i])
    acc = step.next
    if (sc.type === 'stream-no-cache-chunk')
      md.stream.reset()
    const envs = createBenchEnvs()
    runAppendParseScenario(sc, md, acc, step.piece, i === parts.length - 1, envs.stream, envs.plain)
  }
}

function shouldSkipScenarioAtSize(sc, size) {
  return size > HEAVY_PARSE_ONLY_MAX_SIZE
    && (sc.type === 'remark' || sc.type === 'micromark-parse')
}

function shouldSkipRenderImplAtSize(impl, size) {
  return size > HEAVY_RENDER_MAX_SIZE
    && (impl.type === 'remark' || impl.type === 'micromark')
}

function runMatrix() {
  const scenarios = makeScenarios()
  const results = []

  for (let sizeIndex = 0; sizeIndex < SIZES.length; sizeIndex++) {
    const size = SIZES[sizeIndex]
    const paras = makeStockSubsetByChars(size)
    const doc = paras.join('')
    const appParts = splitParasIntoSteps(paras, APP_STEPS)
    const { oneIters, appRepeats, stableSamples, appendSequenceIters, appendLineSequenceIters, replaceSequenceIters } = pickIters(size)
    const lineParts = splitLinesIntoSteps(doc, APP_STEPS * 3)
    const lineRepeats = Math.max(2, Math.floor(appRepeats / 2))
    const replaceRepeats = Math.max(2, Math.floor(appRepeats / 2))
    const activeScenarios = rotate(
      scenarios.filter(sc => !shouldSkipScenarioAtSize(sc, size)),
      sizeIndex,
    )

    for (const sc of activeScenarios) {
      const md = sc.make()
      const envStream = { bench: true }
      const envOne = { bench: true }
      const envAppend = { bench: true }

      const oneRunner = () => {
        resetScenario(sc, md)
        return runParseScenario(sc, md, doc, envStream, envOne)
      }
      oneRunner()
      oneRunner()
      const one = measureStableWarm(oneRunner, oneIters, stableSamples, 1)

      warmAppendScenario(sc, md, appParts)
      const appendSamples = []
      for (let rep = 0; rep < appRepeats; rep++) {
        warmAppendScenario(sc, md, appParts)
        let repMs = 0
        for (let seq = 0; seq < appendSequenceIters; seq++) {
          resetScenario(sc, md)
          let acc = ''
          for (let i = 0; i < appParts.length; i++) {
            const step = normalizeAppendStep(acc, appParts[i])
            acc = step.next
            if (sc.type === 'stream-no-cache-chunk')
              md.stream.reset()
            const t = performance.now()
            runAppendParseScenario(sc, md, acc, step.piece, i === appParts.length - 1, envStream, envAppend)
            repMs += performance.now() - t
          }
        }
        appendSamples.push(repMs / appendSequenceIters)
      }
      const appendMs = median(appendSamples)

      warmAppendScenario(sc, md, lineParts)
      const appendLineSamples = []
      for (let rep = 0; rep < lineRepeats; rep++) {
        warmAppendScenario(sc, md, lineParts)
        let repMs = 0
        for (let seq = 0; seq < appendLineSequenceIters; seq++) {
          resetScenario(sc, md)
          let acc = ''
          for (let i = 0; i < lineParts.length; i++) {
            const step = normalizeAppendStep(acc, lineParts[i])
            acc = step.next
            if (sc.type === 'stream-no-cache-chunk')
              md.stream.reset()
            const t = performance.now()
            runAppendParseScenario(sc, md, acc, step.piece, i === lineParts.length - 1, envStream, envAppend)
            repMs += performance.now() - t
          }
        }
        appendLineSamples.push(repMs / appendLineSequenceIters)
      }
      const appendLineMs = median(appendLineSamples)

      const parasCopy = paras.slice()
      const replaceSamples = []
      for (let rep = 0; rep < replaceRepeats; rep++) {
        resetScenario(sc, md)
        const alteredWarm = parasCopy.slice()
        alteredWarm[alteredWarm.length - 1] = `${alteredWarm[alteredWarm.length - 1]}\n/* warm ${rep} */\n`
        runParseScenario(sc, md, alteredWarm.join(''), envStream, envAppend)

        let repMs = 0
        for (let seq = 0; seq < replaceSequenceIters; seq++) {
          resetScenario(sc, md)
          const altered = parasCopy.slice()
          const lastIdx = altered.length - 1
          altered[lastIdx] = `${altered[lastIdx]}\n/* edit ${rep}-${seq} */\n`
          const full = altered.join('')
          const t = performance.now()
          runParseScenario(sc, md, full, envStream, envAppend)
          repMs += performance.now() - t
        }
        replaceSamples.push(repMs / replaceSequenceIters)
      }
      const replaceMs = median(replaceSamples)

      results.push({
        size,
        scenario: sc.id,
        label: sc.label,
        oneShotMs: one.ms,
        appendWorkloadMs: appendMs,
        appendLineMs,
        replaceParagraphMs: replaceMs,
        lastMode: md.stream?.stats?.().lastMode || 'n/a',
        appendHits: md.stream?.stats?.().appendHits || 0,
        chunkInfoOne: (sc.type === 'full-chunk') ? (getParseDiagnostics(envOne)?.chunk || null) : (sc.type.startsWith('stream') ? (getParseDiagnostics(envStream)?.chunk || null) : null),
        chunkInfoAppendLast: (sc.type === 'full-chunk') ? (getParseDiagnostics(envAppend)?.chunk || null) : (sc.type.startsWith('stream') ? (getParseDiagnostics(envStream)?.chunk || null) : null),
        parsePathOne: normalizeParsePath(getParseDiagnostics(sc.type.startsWith('stream') ? envStream : envOne)?.strategy?.path),
        parseReasonOne: getParseDiagnostics(sc.type.startsWith('stream') ? envStream : envOne)?.strategy?.reason ?? null,
      })
    }
  }

  return results
}

function measureColdHot() {
  // Align TS config with the main fast scenario (stream ON, cache ON, chunk ON)
  const impls = [
    { id: 'TS', label: 'markdown-it-ts (stream+chunk)', type: 'ts', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkSizeChars: 10_000, streamChunkSizeLines: 200, streamChunkFenceAware: true }) },
    { id: 'MD', label: 'markdown-it (baseline)', type: 'md-original', make: () => MarkdownItOriginal() },
    { id: 'OX', label: '@ox-content/napi (parse only)', type: 'ox-content', make: () => null },
    { id: 'OXJ', label: '@ox-content/napi (parse + JSON.parse)', type: 'ox-content-json', make: () => null },
    { id: 'MM', label: 'micromark (parse only)', type: 'micromark-parse', make: createMicromarkParseOnly },
    { id: 'RM', label: 'remark (parse only)', type: 'remark', make: () => unified().use(remarkParse) },
    { id: 'EX', label: 'markdown-exit', type: 'md-exit', make: () => createMarkdownExitFactory() },
  ]

  const coldHot = []

  for (const size of COLD_HOT_SIZES) {
    const doc = makeStockSubsetByChars(size).join('')
    for (const impl of impls) {
      const coldSamples = []
      const hotSamples = []

      for (let sample = 0; sample < 3; sample++) {
        const coldInst = impl.make()
        const coldRunner = () => (
          impl.type === 'remark'
            ? coldInst.parse(doc)
            : impl.type === 'md-original'
              ? coldInst.parse(doc, {})
              : impl.type === 'ox-content'
                ? oxParse(doc)
                : impl.type === 'ox-content-json'
                  ? JSON.parse(oxParse(doc).ast)
                : impl.type === 'ts'
                  ? (coldInst.stream.reset(), coldInst.stream.parse(doc, {}))
                  : coldInst.parse(doc, {})
        )
        coldSamples.push(measure(coldRunner, 1).ms)

        const hotInst = impl.make()
        const hotRunner = () => (
          impl.type === 'remark'
            ? hotInst.parse(doc)
            : impl.type === 'md-original'
              ? hotInst.parse(doc, {})
              : impl.type === 'ox-content'
                ? oxParse(doc)
                : impl.type === 'ox-content-json'
                  ? JSON.parse(oxParse(doc).ast)
                : impl.type === 'ts'
                  ? (hotInst.stream.reset(), hotInst.stream.parse(doc, {}))
                  : hotInst.parse(doc, {})
        )
        measure(hotRunner, 3)
        hotSamples.push(measure(hotRunner, COLD_HOT_ITERS).ms / COLD_HOT_ITERS)
      }

      coldHot.push({ size, ...impl, coldMs: median(coldSamples), hotMs: median(hotSamples) })
    }
  }

  return coldHot
}

async function measureRenderComparisons() {
  const impls = [
    { id: 'TS_RENDER', label: 'markdown-it-ts.render', type: 'ts', make: () => MarkdownIt() },
    { id: 'TS_RENDER_ASYNC', label: 'markdown-it-ts.renderAsync', type: 'ts-async', make: () => MarkdownIt() },
    { id: 'MD_RENDER', label: 'markdown-it.render', type: 'md-original', make: () => MarkdownItOriginal() },
    { id: 'OX_RENDER', label: '@ox-content/napi', type: 'ox-content', make: () => oxParseAndRender },
    { id: 'MM_RENDER', label: 'micromark (CommonMark)', type: 'micromark', make: () => micromark },
    { id: 'RM_RENDER', label: 'remark+rehype', type: 'remark', make: () => unified().use(remarkParse).use(remarkRehype).use(rehypeStringify) },
    { id: 'EX_RENDER', label: 'markdown-exit', type: 'md-exit', make: () => createMarkdownExitFactory() },
  ]

  const results = []
  for (let sizeIndex = 0; sizeIndex < SIZES.length; sizeIndex++) {
    const size = SIZES[sizeIndex]
    const doc = makeStockSubsetByChars(size).join('')
    const { oneIters, stableSamples } = pickIters(size)
    for (const impl of rotate(impls.filter(impl => !shouldSkipRenderImplAtSize(impl, size)), sizeIndex)) {
      const inst = impl.make()
      const runner = () => (
        impl.type === 'remark'
          ? inst.processSync(doc).toString()
          : impl.type === 'micromark'
            ? inst(doc)
            : impl.type === 'ox-content'
              ? inst(doc).html
              : impl.type === 'md-exit'
                ? inst.render(doc)
                : inst.render(doc)
      )
      if (impl.type === 'ts-async') {
        const asyncRunner = () => inst.renderAsync(doc)
        await asyncRunner(); await asyncRunner(); await asyncRunner()
        const { ms } = await measureStableWarmAsync(asyncRunner, oneIters, stableSamples, 1)
        results.push({ size, scenario: impl.id, label: impl.label, renderMs: ms })
        continue
      }

      runner(); runner(); runner()
      const { ms } = measureStableWarm(runner, oneIters, stableSamples, 1)
      results.push({ size, scenario: impl.id, label: impl.label, renderMs: ms })
    }
  }

  return results
}

function normalizeParsePath(path) {
  return path === 'plain' ? 'general' : (path ?? 'unknown')
}

function inspectMarkdownItStrategies(doc) {
  const parseEnv = {}
  MarkdownIt().parse(doc, parseEnv)
  const parseStrategy = getParseDiagnostics(parseEnv)?.strategy

  const renderEnv = {}
  MarkdownIt().render(doc, renderEnv)
  const renderStrategy = getParseDiagnostics(renderEnv)?.strategy

  return {
    parsePath: normalizeParsePath(parseStrategy?.path),
    parseReason: parseStrategy?.reason ?? 'unknown',
    renderPath: renderStrategy?.area === 'render' && renderStrategy.path === 'stock-fast'
      ? 'stock-fast'
      : 'token-renderer',
    renderFallbackParsePath: renderStrategy?.area === 'parse'
      ? normalizeParsePath(renderStrategy.path)
      : null,
  }
}

function measureNativeCorpusEntry(corpus, doc, oxOptions = undefined) {
  const { oneIters, stableSamples } = pickIters(doc.length)
  const strategies = inspectMarkdownItStrategies(doc)
  const tsParser = MarkdownIt()
  const tsRenderer = MarkdownIt()
  const markdownItParser = MarkdownItOriginal()
  const markdownItRenderer = MarkdownItOriginal()

  const parseGroup = measureRotatedWarmGroup([
    { id: 'markdownItTsMs', run: () => tsParser.parse(doc) },
    { id: 'markdownItMs', run: () => markdownItParser.parse(doc) },
    { id: 'oxContentMs', run: () => oxParse(doc, oxOptions) },
  ], oneIters, stableSamples)
  const renderGroup = measureRotatedWarmGroup([
    { id: 'markdownItTsMs', run: () => tsRenderer.render(doc) },
    { id: 'markdownItMs', run: () => markdownItRenderer.render(doc) },
    { id: 'oxContentMs', run: () => oxParseAndRender(doc, oxOptions).html },
  ], oneIters, stableSamples)

  const tsHtml = tsRenderer.render(doc)
  const oxHtml = oxParseAndRender(doc, oxOptions).html

  return {
    corpusId: corpus.id,
    corpusLabel: corpus.label,
    corpusKind: corpus.kind,
    sourcePath: corpus.path ?? null,
    size: doc.length,
    targetSize: corpus.targetSize ?? null,
    measurement: {
      iterationsPerSample: oneIters,
      samples: parseGroup.samples,
      orderPolicy: parseGroup.orderPolicy,
    },
    parse: {
      ...parseGroup.timings,
      markdownItTsOutput: 'mutable markdown-it-compatible Token[]',
      oxContentOutput: 'object containing an mdast JSON string',
      equivalentOutput: false,
      path: strategies.parsePath,
      reason: strategies.parseReason,
    },
    render: {
      ...renderGroup.timings,
      path: strategies.renderPath,
      fallbackParsePath: strategies.renderFallbackParsePath,
      outputComparison: firstDifference(tsHtml, oxHtml),
    },
    oxOptions: oxOptions ?? {},
  }
}

function measureNativeCorpusComparisons() {
  const comparisons = []

  for (const targetSize of SIZES) {
    const doc = makeStockSubsetByChars(targetSize).join('')
    comparisons.push(measureNativeCorpusEntry({ ...STOCK_SUBSET_CORPUS, targetSize }, doc))
  }

  for (const targetSize of [5_000, 20_000, 50_000, 100_000, 200_000]) {
    const doc = makeFeatureMixedDocument(targetSize)
    comparisons.push(measureNativeCorpusEntry(
      { ...FEATURE_MIXED_CORPUS, targetSize },
      doc,
      { tables: true, strikethrough: true },
    ))
  }

  for (const corpus of REAL_WORLD_CORPUS_FILES) {
    const doc = readFileSync(new URL(`../${corpus.path}`, import.meta.url), 'utf8')
    comparisons.push(measureNativeCorpusEntry(
      corpus,
      doc,
      { tables: true, strikethrough: true },
    ))
  }

  return comparisons
}

function measureStockAstJsonComparisons() {
  const comparisons = []

  for (let sizeIndex = 0; sizeIndex < SIZES.length; sizeIndex++) {
    const size = SIZES[sizeIndex]
    const doc = makeStockSubsetByChars(size).join('')
    const { oneIters, stableSamples } = pickIters(size)

    const ast = parseStockFastAstJson(doc)
    if (ast === null)
      throw new Error(`parseStockFastAstJson returned null for ${size} chars`)

    const oxAst = oxParse(doc).ast
    if (ast !== oxAst)
      throw new Error(`parseStockFastAstJson output mismatch for ${size} chars`)

    const ts = measureStableWarm(() => parseStockFastAstJson(doc), oneIters, stableSamples, 1)
    const ox = measureStableWarm(() => oxParse(doc), oneIters, stableSamples, 1)
    const oxJson = measureStableWarm(() => JSON.parse(oxParse(doc).ast), oneIters, stableSamples, 1)

    comparisons.push({
      size,
      tsAstJsonMs: ts.ms,
      oxParseMs: ox.ms,
      oxParseJsonMs: oxJson.ms,
    })
  }

  return comparisons
}

function markdownExcerpt(value) {
  return value.replaceAll('`', '\\`').replaceAll('\r', '\\r').replaceAll('\n', '\\n')
}

function appendNativeCorpusReport(lines, comparisons) {
  lines.push('## Native API throughput by corpus')
  lines.push('')
  lines.push('These rows use fixed configurations: default `MarkdownIt().parse()` / `MarkdownIt().render()`, upstream `markdown-it` defaults, and `@ox-content/napi` native parse/render APIs. The feature-mixed and real-world OX rows enable `tables` and `strikethrough` to more closely match markdown-it defaults. Implementation order rotates for every sample to avoid assigning a stable warmup, GC, or CPU-state advantage to one library.')
  lines.push('')
  lines.push('Parse output is **not equivalent work**: markdown-it-ts returns mutable markdown-it-compatible `Token[]`, while OX returns an object containing an mdast JSON string. These rows describe native API throughput only and are not ranked into an overall winner.')
  lines.push('')

  for (const corpusId of ['stock-subset', 'feature-mixed']) {
    const rows = comparisons.filter(row => row.corpusId === corpusId)
    const corpus = corpusId === 'stock-subset' ? STOCK_SUBSET_CORPUS : FEATURE_MIXED_CORPUS
    lines.push(`### ${corpus.label}`)
    lines.push('')
    lines.push(corpus.description)
    lines.push(corpus.repetition)
    if (corpusId === 'stock-subset')
      lines.push('This is a specialized fast-path benchmark, not a proxy for general Markdown performance.')
    lines.push('')
    lines.push('| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |')
    lines.push('|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|')
    for (const row of rows) {
      lines.push(`| ${row.size.toLocaleString()} | ${fmt(row.parse.markdownItTsMs)} | ${fmt(row.parse.markdownItMs)} | ${fmt(row.parse.oxContentMs)} | ${row.parse.path} | ${fmt(row.render.markdownItTsMs)} | ${fmt(row.render.markdownItMs)} | ${fmt(row.render.oxContentMs)} | ${row.render.path} | ${row.render.outputComparison.equal ? 'yes' : 'no'} |`)
    }
    lines.push('')

    const outputComparison = rows[0]?.render.outputComparison
    if (outputComparison && !outputComparison.equal) {
      lines.push(`First recorded HTML difference at index ${outputComparison.firstDifferenceIndex}:`)
      lines.push('')
      lines.push(`- markdown-it-ts: \`${markdownExcerpt(outputComparison.leftExcerpt)}\``)
      lines.push(`- @ox-content/napi: \`${markdownExcerpt(outputComparison.rightExcerpt)}\``)
      lines.push('')
    }
  }

  const realWorldRows = comparisons.filter(row => row.corpusKind === 'real-world')
  lines.push('### Repository-owned real-world documents')
  lines.push('')
  lines.push('Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.')
  lines.push('')
  lines.push('| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |')
  lines.push('|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|')
  for (const row of realWorldRows) {
    lines.push(`| ${row.corpusLabel} | ${row.size.toLocaleString()} | ${fmt(row.parse.markdownItTsMs)} | ${fmt(row.parse.markdownItMs)} | ${fmt(row.parse.oxContentMs)} | ${row.parse.path} | ${fmt(row.render.markdownItTsMs)} | ${fmt(row.render.markdownItMs)} | ${fmt(row.render.oxContentMs)} | ${row.render.path} | ${row.render.outputComparison.equal ? 'yes' : 'no'} |`)
  }
  lines.push('')
  lines.push("Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.")
  lines.push('')
}

function toMarkdown(results, coldHot, environment, stockAstJsonComparisons, nativeCorpusComparisons) {
  const lines = []
  lines.push('# Performance Report (latest run)')
  lines.push('')
  lines.push('## Environment')
  lines.push('')
  lines.push(`- Generated at: ${environment.generatedAt}`)
  lines.push(`- Node.js: ${environment.node}`)
  lines.push(`- Platform: ${environment.platform}`)
  lines.push(`- CPU: ${environment.cpu}`)
  lines.push(`- CPU count: ${environment.cpuCount}`)
  lines.push(`- Commit: ${environment.commit}`)
  lines.push('')
  lines.push('## Corpus and comparison policy')
  lines.push('')
  lines.push(`- \`${STOCK_SUBSET_CORPUS.id}\`: ${STOCK_SUBSET_CORPUS.description} ${STOCK_SUBSET_CORPUS.repetition}`)
  lines.push(`- \`${FEATURE_MIXED_CORPUS.id}\`: ${FEATURE_MIXED_CORPUS.description} ${FEATURE_MIXED_CORPUS.repetition}`)
  lines.push('- `real-world`: repository-owned MIT-licensed documents, reported per file.')
  lines.push('- Fixed-configuration native API, tuned/best-of, and equivalent-output results are kept separate. Do not combine these sections into a general library ranking.')
  lines.push('')
  appendNativeCorpusReport(lines, nativeCorpusComparisons)
  lines.push('## Tuned / best-of stock-subset matrix')
  lines.push('')
  lines.push('The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.')
  lines.push('')
  lines.push('Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.')
  lines.push('External parser rows use each library\'s native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi\'s AST JSON string to show the cost of materializing a JavaScript object tree.')
  lines.push('')
  const ids = ['S1','S2','S3','S4','S5','M1','E1','OX1','OXJ','MM1']
  lines.push('| Size (chars) | ' + ids.map(id => `${id} one`).join(' | ') + ' | ' + ids.map(id => `${id} append(par)`).join(' | ') + ' | ' + ids.map(id => `${id} append(line)`).join(' | ') + ' | ' + ids.map(id => `${id} replace`).join(' | ') + ' |')
  lines.push('|---:|' + ids.map(()=> '---:').join('|') + '|' + ids.map(()=> '---:').join('|') + '|' + ids.map(()=> '---:').join('|') + '|' + ids.map(()=> '---:').join('|') + '|')
  const bySize = new Map()
  for (const r of results) {
    if (!bySize.has(r.size)) bySize.set(r.size, {})
    bySize.get(r.size)[r.scenario] = r
  }
  for (const size of Array.from(bySize.keys()).sort((a,b)=>a-b)) {
    const row = bySize.get(size)
    const oneVals = ids.map(id => row[id]?.oneShotMs ?? Number.POSITIVE_INFINITY)
    const appVals = ids.map(id => row[id]?.appendWorkloadMs ?? Number.POSITIVE_INFINITY)
    const lineAppVals = ids.map(id => row[id]?.appendLineMs ?? Number.POSITIVE_INFINITY)
    const replaceVals = ids.map(id => row[id]?.replaceParagraphMs ?? Number.POSITIVE_INFINITY)
    const oneMin = Math.min(...oneVals)
    const appMin = Math.min(...appVals)
    const oneCells = ids.map((id, i) => {
      const v = row[id]?.oneShotMs
      if (v == null) return '-'
      const cell = fmt(v)
      return v === oneMin ? `**${cell}**` : cell
    })
    const appCells = ids.map((id, i) => {
      const v = row[id]?.appendWorkloadMs
      if (v == null) return '-'
      const cell = fmt(v)
      return v === appMin ? `**${cell}**` : cell
    })
    const lineAppCells = ids.map((id, i) => {
      const v = row[id]?.appendLineMs
      if (v == null) return '-'
      const cell = fmt(v)
      const isMin = v === Math.min(...lineAppVals)
      return isMin ? `**${cell}**` : cell
    })
    const replaceCells = ids.map((id, i) => {
      const v = row[id]?.replaceParagraphMs
      if (v == null) return '-'
      const cell = fmt(v)
      const isMin = v === Math.min(...replaceVals)
      return isMin ? `**${cell}**` : cell
    })
    lines.push(`| ${size} | ${oneCells.join(' | ')} | ${appCells.join(' | ')} | ${lineAppCells.join(' | ')} | ${replaceCells.join(' | ')} |`)
  }
  lines.push('')
  lines.push('Best markdown-it-ts configuration (one-shot) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = arr.filter(row => row.scenario.startsWith('S')).sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.oneShotMs)} (${best.label})`)
  }
  lines.push('')
  lines.push('Best markdown-it-ts configuration (append workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = arr.filter(row => row.scenario.startsWith('S')).sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.appendWorkloadMs)} (${best.label})`)    
  }
  lines.push('')
  lines.push('Best markdown-it-ts configuration (line-append workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = arr.filter(row => row.scenario.startsWith('S')).sort((a,b)=>a.appendLineMs-b.appendLineMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.appendLineMs)} (${best.label})`)    
  }
  lines.push('')
  lines.push('Best markdown-it-ts configuration (replace-paragraph workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = arr.filter(row => row.scenario.startsWith('S')).sort((a,b)=>a.replaceParagraphMs-b.replaceParagraphMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.replaceParagraphMs)} (${best.label})`)    
  }
  lines.push('')
  // Recommendations by majority wins
  const winsOne = new Map()
  const winsApp = new Map()
  for (const [size, arr] of groupBy(results, 'size')) {
    const tsRows = arr.filter(row => row.scenario.startsWith('S'))
    const oneBest = [...tsRows].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const appBest = [...tsRows].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    winsOne.set(oneBest.scenario, (winsOne.get(oneBest.scenario)||0)+1)
    winsApp.set(appBest.scenario, (winsApp.get(appBest.scenario)||0)+1)
  }
  function fmtWins(map){ return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join(', ') }
  lines.push('markdown-it-ts tuning recommendations (by majority across sizes):')
  lines.push(`- One-shot: ${fmtWins(winsOne)}`)
  lines.push(`- Append-heavy: ${fmtWins(winsApp)}`)
  lines.push('')
  lines.push('Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).')
  lines.push('Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.')
  lines.push('')
  lines.push('## Specialized stock-subset render API throughput (markdown → HTML)')
  lines.push('')
  lines.push('This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.')
  lines.push('It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.')
  lines.push('')
  const renderBySize = groupBy(renderComparisons, 'size')
  lines.push('| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |')
  lines.push('|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const get = (id) => arr.find(r => r.scenario === id)?.renderMs
    const ts = get('TS_RENDER')
    const tsAsync = get('TS_RENDER_ASYNC')
    const mdRender = get('MD_RENDER')
    const oxRender = get('OX_RENDER')
    const micromarkRender = get('MM_RENDER')
    const remarkRender = get('RM_RENDER')
    const exitRender = get('EX_RENDER')
    lines.push(`| ${size} | ${ts != null ? fmt(ts) : '-'} | ${tsAsync != null ? fmt(tsAsync) : '-'} | ${mdRender != null ? fmt(mdRender) : '-'} | ${oxRender != null ? fmt(oxRender) : '-'} | ${micromarkRender != null ? fmt(micromarkRender) : '-'} | ${remarkRender != null ? fmt(remarkRender) : '-'} | ${exitRender != null ? fmt(exitRender) : '-'} |`)
  }
  lines.push('')
  lines.push('Render vs markdown-it:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const mdRender = arr.find(r => r.scenario === 'MD_RENDER')
    if (!ts || !mdRender) continue
    const ratio = mdRender.renderMs / ts.renderMs
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(mdRender.renderMs)} → ${ratio.toFixed(2)}× faster`)
  }
  lines.push('')
  lines.push('Render vs @ox-content/napi:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const oxRender = arr.find(r => r.scenario === 'OX_RENDER')
    if (!ts || !oxRender) continue
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(oxRender.renderMs)} → ${describeComparison(oxRender.renderMs, ts.renderMs)}`)
  }
  lines.push('')
  lines.push('RenderAsync vs @ox-content/napi:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER_ASYNC')
    const oxRender = arr.find(r => r.scenario === 'OX_RENDER')
    if (!ts || !oxRender) continue
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(oxRender.renderMs)} → ${describeComparison(oxRender.renderMs, ts.renderMs)}`)
  }
  lines.push('')
  lines.push('Render vs micromark:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const micro = arr.find(r => r.scenario === 'MM_RENDER')
    if (!ts || !micro) continue
    const ratio = micro.renderMs / ts.renderMs
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(micro.renderMs)} → ${ratio.toFixed(2)}× faster`)
  }
  lines.push('')
  lines.push('Render vs remark+rehype:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const remarkRender = arr.find(r => r.scenario === 'RM_RENDER')
    if (!ts || !remarkRender) continue
    const ratio = remarkRender.renderMs / ts.renderMs
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(remarkRender.renderMs)} → ${ratio.toFixed(2)}× faster`)
  }
    lines.push('')
    lines.push('Render vs markdown-exit:')
    for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
      const ts = arr.find(r => r.scenario === 'TS_RENDER')
      const exitRender = arr.find(r => r.scenario === 'EX_RENDER')
      if (!ts || !exitRender) continue
      const ratio = exitRender.renderMs / ts.renderMs
      lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(exitRender.renderMs)} → ${ratio.toFixed(2)}× faster`)
    }
  lines.push('')
  // Best-of TS vs baseline summary
  lines.push('## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)')
  lines.push('')
  lines.push('| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |')
  lines.push('|---:|---:|---:|:--|---:|---:|:--|:--|')
  // group by size
  const bySize2 = groupBy(results, 'size')
  const isTsScenario = (id) => id.startsWith('S')
  for (const [size, arr] of Array.from(bySize2.entries()).sort((a,b)=>a[0]-b[0])) {
    const tsOnly = arr.filter(r => isTsScenario(r.scenario))
    const baseline = arr.find(r => r.scenario === 'M1')
    if (!baseline) continue
    const bestTsOne = [...tsOnly].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const bestTsApp = [...tsOnly].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    const oneComparison = describeComparison(baseline.oneShotMs, bestTsOne.oneShotMs)
    const appendComparison = describeComparison(baseline.appendWorkloadMs, bestTsApp.appendWorkloadMs)
    lines.push(`| ${size} | ${fmt(bestTsOne.oneShotMs)} | ${fmt(baseline.oneShotMs)} | ${oneComparison} | ${fmt(bestTsApp.appendWorkloadMs)} | ${fmt(baseline.appendWorkloadMs)} | ${appendComparison} | ${bestTsOne.scenario}/${bestTsApp.scenario} |`)
  }
  lines.push('')
  lines.push('- Comparison columns are written from markdown-it-ts against the markdown-it baseline.')
  lines.push('- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.')
  lines.push('')
  lines.push('## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)')
  lines.push('')
  lines.push('Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.')
  lines.push('')
  lines.push('| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |')
  lines.push('|---:|---:|---:|:--|---:|---:|:--|:--|')
  for (const [size, arr] of Array.from(bySize2.entries()).sort((a,b)=>a[0]-b[0])) {
    const tsOnly = arr.filter(r => isTsScenario(r.scenario))
    const ox = arr.find(r => r.scenario === 'OX1')
    if (!ox) continue
    const bestTsOne = [...tsOnly].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const bestTsApp = [...tsOnly].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    const oneComparison = describeComparison(ox.oneShotMs, bestTsOne.oneShotMs)
    const appendComparison = describeComparison(ox.appendWorkloadMs, bestTsApp.appendWorkloadMs)
    lines.push(`| ${size} | ${fmt(bestTsOne.oneShotMs)} | ${fmt(ox.oneShotMs)} | ${oneComparison} | ${fmt(bestTsApp.appendWorkloadMs)} | ${fmt(ox.appendWorkloadMs)} | ${appendComparison} | ${bestTsOne.scenario}/${bestTsApp.scenario} |`)
  }
  lines.push('')
  lines.push('- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.')
  lines.push('')
  lines.push('If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:')
  lines.push('')
  lines.push('| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |')
  lines.push('|---:|---:|---:|:--|')
  for (const [size, arr] of Array.from(bySize2.entries()).sort((a,b)=>a[0]-b[0])) {
    const tsOnly = arr.filter(r => isTsScenario(r.scenario))
    const oxJson = arr.find(r => r.scenario === 'OXJ')
    if (!oxJson) continue
    const bestTsOne = [...tsOnly].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const oneComparison = describeComparison(oxJson.oneShotMs, bestTsOne.oneShotMs)
    lines.push(`| ${size} | ${fmt(bestTsOne.oneShotMs)} | ${fmt(oxJson.oneShotMs)} | ${oneComparison} |`)
  }
  lines.push('')
  if (stockAstJsonComparisons.length > 0) {
    lines.push('## Equivalent-output stock-subset AST JSON')
    lines.push('')
    lines.push('This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.')
    lines.push('')
    lines.push('| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |')
    lines.push('|---:|---:|---:|:--|---:|')
    for (const row of stockAstJsonComparisons) {
      lines.push(`| ${row.size} | ${fmt(row.tsAstJsonMs)} | ${fmt(row.oxParseMs)} | ${describeComparison(row.oxParseMs, row.tsAstJsonMs)} | ${fmt(row.oxParseJsonMs)} |`)
    }
    lines.push('')
  }
  // Optional diagnostic: chunk info if present
  const hasChunkInfo = results.some(r => r.chunkInfoOne || r.chunkInfoAppendLast)
  if (hasChunkInfo) {
    lines.push('')
    lines.push('### Diagnostic: Chunk Info (if chunked)')
    lines.push('')
    lines.push('| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |')
    lines.push('|---:|---:|---:|---:|---:|---:|---:|')
    const bySize3 = groupBy(results, 'size')
    for (const [size, arr] of Array.from(bySize3.entries()).sort((a,b)=>a[0]-b[0])) {
      const r = Object.fromEntries(arr.map(x => [x.scenario, x]))
      const c = (x) => x ? String(x.count) : '-'
      lines.push(`| ${size} | ${c(r.S1?.chunkInfoOne)} | ${c(r.S3?.chunkInfoOne)} | ${c(r.S4?.chunkInfoOne)} | ${c(r.S1?.chunkInfoAppendLast)} | ${c(r.S3?.chunkInfoAppendLast)} | ${c(r.S4?.chunkInfoAppendLast)} |`)
    }
  }
  lines.push('')
  lines.push('## Cold vs Hot (one-shot)')
  lines.push('')
  lines.push('Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs across markdown-it-ts and external baselines.')
  lines.push('')
  const grouped = groupBy(coldHot, 'size')
  for (const [size, rows] of Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])) {
    lines.push(`#### ${Number(size).toLocaleString()} chars`)
    lines.push('')
    lines.push('| Impl | Cold | Hot |')
    lines.push('|:--|---:|---:|')
    for (const row of rows.sort((a, b) => a.label.localeCompare(b.label))) {
      lines.push(`| ${row.label} | ${fmt(row.coldMs)} | ${fmt(row.hotMs)} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function groupBy(arr, key) {
  const m = new Map()
  for (const it of arr) {
    const k = it[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(it)
  }
  return m
}

const results = runMatrix()
const coldHot = measureColdHot()
const renderComparisons = await measureRenderComparisons()
const stockAstJsonComparisons = measureStockAstJsonComparisons()
const nativeCorpusComparisons = measureNativeCorpusComparisons()
const environment = getPerfEnvironment()
const md = toMarkdown(results, coldHot, environment, stockAstJsonComparisons, nativeCorpusComparisons)
writeFileSync(new URL('../docs/perf-latest.md', import.meta.url), md)
const benchmarkFingerprint = getBenchmarkFingerprint()

// Also write a machine-readable JSON for regression checks
const shortCommit = environment.commit === 'unknown'
  ? safeGitCommit(['rev-parse', '--short', 'HEAD'])
  : environment.commit.slice(0, 7)

const payload = {
  benchmarkVersion: PERF_BENCHMARK_VERSION,
  benchmarkFingerprint,
  reportSha256: sha256(md),
  generatedAt: environment.generatedAt,
  node: environment.node,
  gitSha: shortCommit === 'unknown' ? null : shortCommit,
  environment,
  results,
  coldHot,
  renderComparisons,
  stockAstJsonComparisons,
  nativeCorpusComparisons,
  corpora: [STOCK_SUBSET_CORPUS, FEATURE_MIXED_CORPUS, ...REAL_WORLD_CORPUS_FILES],
  comparisonPolicy: {
    nativeApiOutputEquivalent: false,
    stockAstJsonOutputEquivalent: true,
    tunedResultsAreHeadline: false,
  },
}
writeFileSync(new URL('../docs/perf-latest.json', import.meta.url), JSON.stringify(payload, null, 2))

console.log('Wrote docs/perf-latest.md and docs/perf-latest.json')
