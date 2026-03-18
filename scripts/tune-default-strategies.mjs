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
    return { oneIters: 2, oneSamples: 3, appendSamples: 2 }
  if (size <= 5_000_000)
    return { oneIters: 1, oneSamples: 2, appendSamples: 1 }
  return { oneIters: 1, oneSamples: 1, appendSamples: 1 }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function measureStable(fn, iters, samples) {
  const values = []
  let result
  for (let sample = 0; sample < samples; sample++) {
    const t0 = performance.now()
    for (let i = 0; i < iters; i++) result = fn()
    values.push((performance.now() - t0) / iters)
  }
  return { ms: median(values), result }
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
    { id: 'full-plain', label: 'full plain', make: () => MarkdownIt({ stream: false }), type: 'mdts' },
    { id: 'full-auto', label: 'full auto chunk', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true }), type: 'mdts' },
    { id: 'full-20k-12', label: 'full 20k/150 x12', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 20_000, fullChunkSizeLines: 150, fullChunkMaxChunks: 12 }), type: 'mdts' },
    { id: 'full-32k-16', label: 'full 32k/350 x16', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 32_000, fullChunkSizeLines: 350, fullChunkMaxChunks: 16 }), type: 'mdts' },
    { id: 'full-64k-16', label: 'full 64k/700 x16', make: () => MarkdownIt({ stream: false, fullChunkedFallback: true, fullChunkAdaptive: false, fullChunkThresholdChars: 0, fullChunkSizeChars: 64_000, fullChunkSizeLines: 700, fullChunkMaxChunks: 16 }), type: 'mdts' },
    { id: 'iterable-auto', label: 'iterable auto', make: () => MarkdownIt({ stream: false }), type: 'mdts-iterable' },
    { id: 'iterable-sink', label: 'iterable sink', make: () => MarkdownIt({ stream: false }), type: 'mdts-iterable-sink' },
  ]
}

function makeStreamCandidates() {
  return [
    { id: 'stream-cache', label: 'stream cache only', make: () => MarkdownIt({ stream: true, streamChunkedFallback: false }), type: 'mdts-stream' },
    { id: 'stream-auto', label: 'stream auto chunk', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true }), type: 'mdts-stream' },
    { id: 'stream-20k-24', label: 'stream 20k/200 x24', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 20_000, streamChunkSizeLines: 200, streamChunkMaxChunks: 24 }), type: 'mdts-stream' },
    { id: 'stream-32k-16', label: 'stream 32k/350 x16', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 32_000, streamChunkSizeLines: 350, streamChunkMaxChunks: 16 }), type: 'mdts-stream' },
    { id: 'stream-64k-32', label: 'stream 64k/700 x32', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkAdaptive: false, streamChunkSizeChars: 64_000, streamChunkSizeLines: 700, streamChunkMaxChunks: 32 }), type: 'mdts-stream' },
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

function benchmarkScenario(factory, type, doc, docChunks, appParts, benchConfig) {
  const impl = { instance: factory(), type }
  const env = { bench: true }
  const one = measureStable(() => {
    resetIfNeeded(impl)
    return runParse(impl, doc, env, docChunks)
  }, benchConfig.oneIters, benchConfig.oneSamples)

  if (type === 'mdts-unbounded' || type === 'mdts-unbounded-sink') {
    const appendRuns = []
    for (let sample = 0; sample < benchConfig.appendSamples; sample++) {
      const runEnv = { bench: true }
      const buffer = new UnboundedBuffer(impl.instance, type === 'mdts-unbounded-sink'
        ? { mode: 'stream', retainTokens: false, onChunkTokens: () => {} }
        : { mode: 'stream' })
      let elapsed = 0
      for (let i = 0; i < appParts.length; i++) {
        const slices = splitByChars(appParts[i])
        const t0 = performance.now()
        for (let j = 0; j < slices.length; j++) {
          buffer.feed(slices[j])
          buffer.flushAvailable(runEnv)
        }
        buffer.flushIfBoundary(runEnv)
        elapsed += performance.now() - t0
      }
      const t1 = performance.now()
      buffer.flushForce(runEnv)
      elapsed += performance.now() - t1
      appendRuns.push(elapsed)
    }

    return {
      oneShotMs: one.ms,
      appendWorkloadMs: median(appendRuns),
      chunkInfo: env.__mdtsUnboundedInfo ?? null,
      stats: null,
    }
  }

  const appendRuns = []
  for (let sample = 0; sample < benchConfig.appendSamples; sample++) {
    resetIfNeeded(impl)
    let acc = ''
    let elapsed = 0
    for (let i = 0; i < appParts.length; i++) {
      acc += appParts[i]
      const t0 = performance.now()
      runParse(impl, acc, env, splitByChars(acc))
      elapsed += performance.now() - t0
    }
    appendRuns.push(elapsed)
  }

  return {
    oneShotMs: one.ms,
    appendWorkloadMs: median(appendRuns),
    chunkInfo: env.__mdtsChunkInfo ?? null,
    stats: impl.instance.stream?.stats?.() ?? null,
  }
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

function benchmarkWithOptionalAppend(candidate, doc, docChunks, appParts, benchConfig, size) {
  if (shouldSkipScenario(candidate.type, size)) {
    return {
      oneShotMs: null,
      appendWorkloadMs: null,
      chunkInfo: null,
      stats: null,
      skippedScenario: true,
    }
  }

  if (!shouldSkipAppend(candidate.type, size))
    return benchmarkScenario(candidate.make, candidate.type, doc, docChunks, appParts, benchConfig)

  const impl = { instance: candidate.make(), type: candidate.type }
  const env = { bench: true }
  const one = measureStable(() => runParse(impl, doc, env, docChunks), benchConfig.oneIters, benchConfig.oneSamples)
  return {
    oneShotMs: one.ms,
    appendWorkloadMs: null,
    chunkInfo: env.__mdtsChunkInfo ?? null,
    stats: impl.instance.stream?.stats?.() ?? null,
    skippedAppend: true,
  }
}

function chunkNote(info, stats) {
  if (info)
    return `chunks=${info.count ?? info.parsedChunks ?? '?'}`
  if (stats)
    return `mode=${stats.lastMode}`
  return '-'
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
    lines.push(`- markdown-it append: ${row.baselines['markdown-it']?.appendWorkloadMs != null ? fmt(row.baselines['markdown-it'].appendWorkloadMs) : 'skipped'}`)
    lines.push(`- markdown-exit append: ${row.baselines['markdown-exit']?.appendWorkloadMs != null ? fmt(row.baselines['markdown-exit'].appendWorkloadMs) : 'skipped'}`)
    lines.push(`- remark append: ${row.baselines.remark?.appendWorkloadMs != null ? fmt(row.baselines.remark.appendWorkloadMs) : 'skipped'}`)
    lines.push(`- micromark append: ${row.baselines.micromark?.appendWorkloadMs != null ? fmt(row.baselines.micromark.appendWorkloadMs) : 'skipped'}`)
    lines.push('')
    lines.push('| Group | Scenario | One-shot | Append workload | Notes |')
    lines.push('|:--|:--|---:|---:|:--|')
    for (const item of row.full) {
      lines.push(`| full | ${item.id} | ${fmt(item.oneShotMs)} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | ${chunkNote(item.chunkInfo, item.stats)} |`)
    }
    for (const item of row.stream) {
      const note = chunkNote(item.chunkInfo, item.stats)
      lines.push(`| stream | ${item.id} | ${fmt(item.oneShotMs)} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | ${note} |`)
    }
    for (const item of row.baselineList) {
      lines.push(`| baseline | ${item.id} | ${item.oneShotMs != null ? fmt(item.oneShotMs) : 'skipped'} | ${item.appendWorkloadMs != null ? fmt(item.appendWorkloadMs) : 'skipped'} | - |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

const summary = []

for (const size of SIZES) {
  const { paras, doc } = makeParasByChars(size)
  const docChunks = splitByChars(doc)
  const appParts = splitParasIntoSteps(paras, APP_STEPS)
  const benchConfig = pickConfig(size)

  const full = makeFullCandidates().map((candidate) => {
    console.log(`[${size}] full ${candidate.id}`)
    return {
      id: candidate.id,
      label: candidate.label,
      ...benchmarkWithOptionalAppend(candidate, doc, docChunks, appParts, benchConfig, size),
    }
  })

  const stream = makeStreamCandidates().map((candidate) => {
    console.log(`[${size}] stream ${candidate.id}`)
    return {
      id: candidate.id,
      label: candidate.label,
      ...benchmarkWithOptionalAppend(candidate, doc, docChunks, appParts, benchConfig, size),
    }
  })

  const baselineList = makeBaselines().map((candidate) => {
    console.log(`[${size}] baseline ${candidate.id}`)
    return {
      id: candidate.id,
      label: candidate.label,
      ...benchmarkWithOptionalAppend(candidate, doc, docChunks, appParts, benchConfig, size),
    }
  })

  const baselines = Object.fromEntries(baselineList.map(item => [item.id, item]))
  const bestFull = [...full].sort((a, b) => (a.oneShotMs ?? Number.POSITIVE_INFINITY) - (b.oneShotMs ?? Number.POSITIVE_INFINITY))[0]
  const bestStream = [...stream].sort((a, b) => (a.appendWorkloadMs ?? Number.POSITIVE_INFINITY) - (b.appendWorkloadMs ?? Number.POSITIVE_INFINITY))[0]

  summary.push({
    size,
    bestFull,
    bestStream,
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

console.log('Wrote docs/perf-large-defaults.md and docs/perf-large-defaults.json')
