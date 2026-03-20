// Tune default full/stream strategies on large parse-only workloads.
// Usage: npm run build && node scripts/tune-default-strategies.mjs

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import MarkdownIt, { UnboundedBuffer } from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'
import { createMarkdownExit as createMarkdownExitFactory } from 'markdown-exit'
import { parse as micromarkParse, preprocess as micromarkPreprocess, postprocess as micromarkPostprocess } from 'micromark'
import { unified } from 'unified'
import remarkParse from 'remark-parse'

const SIZES = [100_000, 500_000, 1_000_000, 5_000_000, 20_000_000]
const APP_STEPS = 6

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeParasByChars(targetChars) {
  const paras = []
  let doc = ''
  let i = 0
  while (doc.length < targetChars) {
    const p = para(i++)
    paras.push(p)
    doc += p
  }
  return { paras, doc }
}

function splitParasIntoSteps(paras, steps) {
  const per = Math.max(1, Math.floor(paras.length / steps))
  const parts = []
  for (let i = 0; i < steps - 1; i++) parts.push(paras.slice(i * per, (i + 1) * per).join(''))
  parts.push(paras.slice((steps - 1) * per).join(''))
  return parts
}

function splitByChars(src, size = 8192) {
  const parts = []
  for (let i = 0; i < src.length; i += size) parts.push(src.slice(i, i + size))
  return parts
}

function pickConfig(size) {
  if (size <= 100_000)
    return { oneIters: 10, oneSamples: 4, appendSamples: 3 }
  if (size <= 500_000)
    return { oneIters: 4, oneSamples: 3, appendSamples: 2 }
  if (size <= 1_000_000)
    return { oneIters: 2, oneSamples: 3, appendSamples: 3 }
  // 5M sits near our default-path SLA thresholds, so use odd sample counts to
  // reduce false regressions from occasional GC / scheduler spikes.
  if (size <= 5_000_000)
    return { oneIters: 1, oneSamples: 3, appendSamples: 3 }
  return { oneIters: 1, oneSamples: 1, appendSamples: 1 }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function rotate(items, offset) {
  if (items.length === 0)
    return items

  const start = ((offset % items.length) + items.length) % items.length
  return items.slice(start).concat(items.slice(0, start))
}

function snapshot(value) {
  if (value == null)
    return null
  return JSON.parse(JSON.stringify(value))
}

function strategySignature(info, chunkInfo, unboundedInfo, stats) {
  const path = info?.path ?? 'none'
  const reason = info?.reason ?? 'none'
  const chunkChars = chunkInfo?.maxChunkChars ?? 0
  const chunkLines = chunkInfo?.maxChunkLines ?? 0
  const chunkCount = chunkInfo?.count ?? chunkInfo?.parsedChunks ?? 0
  const unboundedMode = unboundedInfo?.mode ?? 'none'
  const lastMode = stats?.lastMode ?? 'none'
  return [
    path,
    reason,
    `${chunkChars}x${chunkLines}x${chunkCount}`,
    unboundedMode,
    lastMode,
  ].join('|')
}

function fmt(ms) {
  return ms < 10 ? `${ms.toFixed(4)}ms` : `${ms.toFixed(2)}ms`
}

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

function makeFullCandidates() {
  return [
    { id: 'full-default', label: 'full default', make: () => MarkdownIt({ stream: false }), type: 'mdts', defaultEligible: true, defaultCandidate: true },
    { id: 'full-plain', label: 'full plain', make: () => MarkdownIt({ stream: false }), type: 'mdts' },
    { id: 'full-auto', label: 'full auto chunk', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true }), type: 'mdts', defaultEligible: true },
    { id: 'full-20k-12', label: 'full 20k/150 x12', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 20_000, fullChunkSizeLines: 150, fullChunkMaxChunks: 12 }), type: 'mdts', defaultEligible: true },
    { id: 'full-32k-16', label: 'full 32k/350 x16', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 32_000, fullChunkSizeLines: 350, fullChunkMaxChunks: 16 }), type: 'mdts', defaultEligible: true },
    { id: 'full-64k-16', label: 'full 64k/700 x16', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 64_000, fullChunkSizeLines: 700, fullChunkMaxChunks: 16 }), type: 'mdts', defaultEligible: true },
    { id: 'iterable-auto', label: 'iterable auto', make: () => MarkdownIt({ stream: false }), type: 'mdts-iterable' },
    { id: 'iterable-sink', label: 'iterable sink', make: () => MarkdownIt({ stream: false }), type: 'mdts-iterable-sink' },
  ]
}

function makeStreamCandidates() {
  return [
    { id: 'stream-default', label: 'stream default', make: () => MarkdownIt({ stream: true }), type: 'mdts-stream', defaultEligible: true, defaultCandidate: true },
    { id: 'stream-cache', label: 'stream cache only', make: () => MarkdownIt({ stream: true, streamChunkedFallback: false }), type: 'mdts-stream' },
    { id: 'stream-auto', label: 'stream auto chunk', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true }), type: 'mdts-stream', defaultEligible: true },
    { id: 'stream-20k-24', label: 'stream 20k/200 x24', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 20_000, streamChunkSizeLines: 200, streamChunkMaxChunks: 24 }), type: 'mdts-stream', defaultEligible: true },
    { id: 'stream-32k-16', label: 'stream 32k/350 x16', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 32_000, streamChunkSizeLines: 350, streamChunkMaxChunks: 16 }), type: 'mdts-stream', defaultEligible: true },
    { id: 'stream-64k-32', label: 'stream 64k/700 x32', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 64_000, streamChunkSizeLines: 700, streamChunkMaxChunks: 32 }), type: 'mdts-stream', defaultEligible: true },
    { id: 'unbounded-auto', label: 'unbounded auto', make: () => MarkdownIt({ stream: false }), type: 'mdts-unbounded' },
    { id: 'unbounded-sink', label: 'unbounded sink', make: () => MarkdownIt({ stream: false }), type: 'mdts-unbounded-sink' },
  ]
}

function makeBaselines() {
  return [
    { id: 'markdown-it', label: 'markdown-it', make: () => MarkdownItOriginal(), type: 'md' },
    { id: 'markdown-exit', label: 'markdown-exit', make: () => createMarkdownExitFactory(), type: 'exit' },
    { id: 'remark', label: 'remark', make: () => unified().use(remarkParse), type: 'remark' },
    { id: 'micromark', label: 'micromark', make: createMicromarkParseOnly, type: 'micromark' },
  ]
}

function runParse(impl, input, env, inputChunks) {
  if (impl.type === 'mdts-stream')
    return impl.instance.stream.parse(input, env)
  if (impl.type === 'mdts-iterable')
    return impl.instance.parseIterable(inputChunks ?? [input], env)
  if (impl.type === 'mdts-iterable-sink')
    return impl.instance.parseIterableToSink(inputChunks ?? [input], () => {}, env)
  if (impl.type === 'mdts-unbounded') {
    const buffer = new UnboundedBuffer(impl.instance, { mode: 'stream' })
    for (const chunk of (inputChunks ?? [input])) {
      buffer.feed(chunk)
      buffer.flushAvailable(env)
    }
    return buffer.flushForce(env)
  }
  if (impl.type === 'mdts-unbounded-sink') {
    const buffer = new UnboundedBuffer(impl.instance, {
      mode: 'stream',
      retainTokens: false,
      onChunkTokens: () => {},
    })
    for (const chunk of (inputChunks ?? [input])) {
      buffer.feed(chunk)
      buffer.flushAvailable(env)
    }
    return buffer.flushForce(env)
  }
  if (impl.type === 'md')
    return impl.instance.parse(input, {})
  return impl.instance.parse(input)
}

function resetIfNeeded(impl) {
  if (impl.type === 'mdts-stream')
    impl.instance.stream.reset()
}

function captureDiagnostics(env, impl) {
  return {
    strategyInfo: snapshot(env.__mdtsStrategyInfo ?? null),
    chunkInfo: snapshot(env.__mdtsChunkInfo ?? null),
    unboundedInfo: snapshot(env.__mdtsUnboundedInfo ?? null),
    stats: snapshot(impl.instance.stream?.stats?.() ?? null),
  }
}

function runOneShotSample(impl, doc, docChunks, iters) {
  let diagnostics = { strategyInfo: null, chunkInfo: null, unboundedInfo: null, stats: null }
  const t0 = performance.now()
  for (let i = 0; i < iters; i++) {
    resetIfNeeded(impl)
    const env = { bench: true }
    runParse(impl, doc, env, docChunks)
    diagnostics = captureDiagnostics(env, impl)
  }
  return {
    ms: (performance.now() - t0) / iters,
    ...diagnostics,
  }
}

function runAppendSample(impl, doc, docChunks, appParts) {
  if (impl.type === 'mdts-unbounded' || impl.type === 'mdts-unbounded-sink') {
    const env = { bench: true }
    const buffer = new UnboundedBuffer(impl.instance, impl.type === 'mdts-unbounded-sink'
      ? { mode: 'stream', retainTokens: false, onChunkTokens: () => {} }
      : { mode: 'stream' })
    let elapsed = 0
    for (let i = 0; i < appParts.length; i++) {
      const slices = splitByChars(appParts[i])
      const t0 = performance.now()
      for (let j = 0; j < slices.length; j++) {
        buffer.feed(slices[j])
        buffer.flushAvailable(env)
      }
      buffer.flushIfBoundary(env)
      elapsed += performance.now() - t0
    }
    const t1 = performance.now()
    buffer.flushForce(env)
    elapsed += performance.now() - t1
    return {
      ms: elapsed,
      ...captureDiagnostics(env, impl),
    }
  }

  resetIfNeeded(impl)
  const env = { bench: true }
  let acc = ''
  let elapsed = 0
  for (let i = 0; i < appParts.length; i++) {
    acc += appParts[i]
    const t0 = performance.now()
    runParse(impl, acc, env, splitByChars(acc))
    elapsed += performance.now() - t0
  }
  return {
    ms: elapsed,
    ...captureDiagnostics(env, impl),
  }
}

function warmCandidate(entry, doc, docChunks, appParts, size) {
  if (shouldSkipScenario(entry.candidate.type, size))
    return
  runOneShotSample(entry.impl, doc, docChunks, 1)
  if (!shouldSkipAppend(entry.candidate.type, size))
    runAppendSample(entry.impl, doc, docChunks, appParts)
}

function benchmarkCandidateGroup(candidates, doc, docChunks, appParts, benchConfig, size, groupLabel) {
  const entries = candidates.map(candidate => ({
    candidate,
    impl: { instance: candidate.make(), type: candidate.type },
    oneShotRuns: [],
    appendRuns: [],
    strategyInfo: null,
    chunkInfo: null,
    unboundedInfo: null,
    stats: null,
  }))

  for (const entry of entries) {
    console.log(`[${size}] warm ${groupLabel} ${entry.candidate.id}`)
    warmCandidate(entry, doc, docChunks, appParts, size)
  }

  for (let sample = 0; sample < benchConfig.oneSamples; sample++) {
    for (const entry of rotate(entries, sample)) {
      if (shouldSkipScenario(entry.candidate.type, size))
        continue
      console.log(`[${size}] ${groupLabel} ${entry.candidate.id} one-shot sample ${sample + 1}/${benchConfig.oneSamples}`)
      const run = runOneShotSample(entry.impl, doc, docChunks, benchConfig.oneIters)
      entry.oneShotRuns.push(run.ms)
      entry.strategyInfo = run.strategyInfo
      entry.chunkInfo = run.chunkInfo
      entry.unboundedInfo = run.unboundedInfo
      entry.stats = run.stats
    }
  }

  for (let sample = 0; sample < benchConfig.appendSamples; sample++) {
    for (const entry of rotate(entries, sample + 1)) {
      if (shouldSkipScenario(entry.candidate.type, size) || shouldSkipAppend(entry.candidate.type, size))
        continue
      console.log(`[${size}] ${groupLabel} ${entry.candidate.id} append sample ${sample + 1}/${benchConfig.appendSamples}`)
      const run = runAppendSample(entry.impl, doc, docChunks, appParts)
      entry.appendRuns.push(run.ms)
      entry.strategyInfo = run.strategyInfo
      entry.chunkInfo = run.chunkInfo
      entry.unboundedInfo = run.unboundedInfo
      entry.stats = run.stats
    }
  }

  return entries.map((entry) => {
    const skippedScenario = shouldSkipScenario(entry.candidate.type, size)
    const skippedAppend = !skippedScenario && shouldSkipAppend(entry.candidate.type, size)
    return {
      id: entry.candidate.id,
      label: entry.candidate.label,
      defaultEligible: !!entry.candidate.defaultEligible,
      defaultCandidate: !!entry.candidate.defaultCandidate,
      oneShotMs: skippedScenario ? null : median(entry.oneShotRuns),
      appendWorkloadMs: skippedScenario || skippedAppend ? null : median(entry.appendRuns),
      chunkInfo: entry.chunkInfo,
      unboundedInfo: entry.unboundedInfo,
      strategyInfo: entry.strategyInfo,
      strategySignature: strategySignature(entry.strategyInfo, entry.chunkInfo, entry.unboundedInfo, entry.stats),
      stats: entry.stats,
      skippedScenario: skippedScenario || undefined,
      skippedAppend: skippedAppend || undefined,
    }
  })
}

function shouldSkipAppend(type, size) {
  if ((type === 'remark' || type === 'micromark') && size > 500_000)
    return true
  return false
}

function shouldSkipScenario(type, size) {
  if ((type === 'remark' || type === 'micromark') && size > 500_000)
    return true
  return false
}

function chunkNote(strategyInfo, info, stats) {
  const parts = []
  if (strategyInfo?.path)
    parts.push(strategyInfo.path)
  if (info)
    parts.push(`chunks=${info.count ?? info.parsedChunks ?? '?'}`)
  if (stats?.lastMode && stats.lastMode !== 'idle')
    parts.push(`mode=${stats.lastMode}`)
  return parts.length > 0 ? parts.join(' ') : '-'
}

function relativeGap(candidate, best, key) {
  if (candidate?.[key] == null || best?.[key] == null || best[key] <= 0)
    return null
  if (candidate.strategySignature && best.strategySignature && candidate.strategySignature === best.strategySignature)
    return 0
  return (candidate[key] - best[key]) / best[key]
}

function toMarkdown(summary) {
  const lines = []
  lines.push('# Large Strategy Tuning')
  lines.push('')
  lines.push('Sizes: 100k, 500k, 1M, 5M, 20M chars. Lower is better.')
  lines.push('Default API note: for normal string inputs, keep using `md.parse(src)` / `md.render(src)` and let the library auto-select the internal large-input path. `iterable-*` / `unbounded-*` rows are included as advanced explicit chunk-stream baselines, not as required public APIs for ordinary callers.')
  lines.push('')

  for (const row of summary) {
    lines.push(`## ${row.size.toLocaleString()} chars`)
    lines.push('')
    lines.push(`- Fastest measured full parse: ${row.bestFull.id} ${fmt(row.bestFull.oneShotMs)}`)
    lines.push(`- Fastest measured incremental append: ${row.bestStream.id} ${fmt(row.bestStream.appendWorkloadMs)}`)
    lines.push(`- Default one-shot path: ${row.defaultFull.id} ${fmt(row.defaultFull.oneShotMs)}${row.defaultFullGapPct != null ? ` (${(row.defaultFullGapPct * 100).toFixed(1)}% vs best default-eligible)` : ''}`)
    lines.push(`- Default append path: ${row.defaultStream.id} ${fmt(row.defaultStream.appendWorkloadMs)}${row.defaultStreamGapPct != null ? ` (${(row.defaultStreamGapPct * 100).toFixed(1)}% vs best default-eligible)` : ''}`)
    lines.push(`- markdown-it append: ${row.baselines['markdown-it']?.appendWorkloadMs != null ? fmt(row.baselines['markdown-it'].appendWorkloadMs) : 'skipped'}`)
    lines.push(`- markdown-exit append: ${row.baselines['markdown-exit']?.appendWorkloadMs != null ? fmt(row.baselines['markdown-exit'].appendWorkloadMs) : 'skipped'}`)
    lines.push(`- remark append: ${row.baselines.remark?.appendWorkloadMs != null ? fmt(row.baselines.remark.appendWorkloadMs) : 'skipped'}`)
    lines.push(`- micromark append: ${row.baselines.micromark?.appendWorkloadMs != null ? fmt(row.baselines.micromark.appendWorkloadMs) : 'skipped'}`)
    lines.push('')
    lines.push('| Group | Scenario | One-shot | Append workload | Notes |')
    lines.push('|:--|:--|---:|---:|:--|')
    for (const item of row.full) {
      lines.push(`| full | ${item.id} | ${fmt(item.oneShotMs)} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | ${chunkNote(item.strategyInfo, item.chunkInfo, item.stats)} |`)
    }
    for (const item of row.stream) {
      const note = chunkNote(item.strategyInfo, item.chunkInfo, item.stats)
      lines.push(`| stream | ${item.id} | ${fmt(item.oneShotMs)} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | ${note} |`)
    }
    for (const item of row.baselineList) {
      lines.push(`| baseline | ${item.id} | ${item.oneShotMs != null ? fmt(item.oneShotMs) : 'skipped'} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | - |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function toStrategyMarkdown(summary) {
  const lines = []
  lines.push('# Parse Strategy Matrix')
  lines.push('')
  lines.push('This matrix captures the recommended default parser strategy by input size and workload.')
  lines.push('')
  lines.push('| Size | Default one-shot | Best default-eligible one-shot | Default append | Best default-eligible append |')
  lines.push('|---:|:--|:--|:--|:--|')
  for (const row of summary) {
    lines.push(`| ${row.size.toLocaleString()} | ${row.defaultFull.id} (${fmt(row.defaultFull.oneShotMs)}) | ${row.bestFullDefaultEligible.id} (${fmt(row.bestFullDefaultEligible.oneShotMs)}) | ${row.defaultStream.id} (${fmt(row.defaultStream.appendWorkloadMs)}) | ${row.bestStreamDefaultEligible.id} (${fmt(row.bestStreamDefaultEligible.appendWorkloadMs)}) |`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- One-shot `md.parse(src)` should stay within 10% of the best default-eligible full-parse strategy.')
  lines.push('- Append-heavy `md.stream.parse(src)` should stay within 10% of the best default-eligible stream strategy.')
  lines.push('- `iterable-*` and `unbounded-* sink` remain advanced baselines and are not treated as required default paths.')
  return lines.join('\n')
}

const summary = []

for (const size of SIZES) {
  const { paras, doc } = makeParasByChars(size)
  const docChunks = splitByChars(doc)
  const appParts = splitParasIntoSteps(paras, APP_STEPS)
  const benchConfig = pickConfig(size)

  const fullCandidates = makeFullCandidates()
  const full = benchmarkCandidateGroup(fullCandidates, doc, docChunks, appParts, benchConfig, size, 'full')

  const streamCandidates = makeStreamCandidates()
  const stream = benchmarkCandidateGroup(streamCandidates, doc, docChunks, appParts, benchConfig, size, 'stream')

  const baselineList = benchmarkCandidateGroup(makeBaselines(), doc, docChunks, appParts, benchConfig, size, 'baseline')

  const baselines = Object.fromEntries(baselineList.map(item => [item.id, item]))
  const bestFull = [...full].sort((a, b) => (a.oneShotMs ?? Number.POSITIVE_INFINITY) - (b.oneShotMs ?? Number.POSITIVE_INFINITY))[0]
  const bestStream = [...stream].sort((a, b) => (a.appendWorkloadMs ?? Number.POSITIVE_INFINITY) - (b.appendWorkloadMs ?? Number.POSITIVE_INFINITY))[0]
  const bestFullDefaultEligible = full
    .filter(item => item.defaultEligible && item.oneShotMs != null)
    .sort((a, b) => (a.oneShotMs ?? Number.POSITIVE_INFINITY) - (b.oneShotMs ?? Number.POSITIVE_INFINITY))[0]
  const bestStreamDefaultEligible = stream
    .filter(item => item.defaultEligible && item.appendWorkloadMs != null)
    .sort((a, b) => (a.appendWorkloadMs ?? Number.POSITIVE_INFINITY) - (b.appendWorkloadMs ?? Number.POSITIVE_INFINITY))[0]
  const defaultFull = full.find(item => item.defaultCandidate) ?? full[0]
  const defaultStream = stream.find(item => item.defaultCandidate) ?? stream[0]
  const defaultFullGapPct = relativeGap(defaultFull, bestFullDefaultEligible, 'oneShotMs')
  const defaultStreamGapPct = relativeGap(defaultStream, bestStreamDefaultEligible, 'appendWorkloadMs')

  summary.push({
    size,
    bestFull,
    bestStream,
    bestFullDefaultEligible,
    bestStreamDefaultEligible,
    defaultFull,
    defaultStream,
    defaultFullGapPct,
    defaultStreamGapPct,
    full,
    stream,
    baselines,
    baselineList,
  })
}

const payload = {
  generatedAt: new Date().toISOString(),
  sizes: SIZES,
  summary,
}

writeFileSync(new URL('../docs/perf-large-defaults.json', import.meta.url), JSON.stringify(payload, null, 2))
writeFileSync(new URL('../docs/perf-large-defaults.md', import.meta.url), toMarkdown(summary))
writeFileSync(new URL('../docs/parse-strategy-matrix.md', import.meta.url), toStrategyMarkdown(summary))

console.log('Wrote docs/perf-large-defaults.md, docs/perf-large-defaults.json, and docs/parse-strategy-matrix.md')
