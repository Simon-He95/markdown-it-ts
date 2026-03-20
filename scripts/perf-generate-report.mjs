// Generate a fresh performance report as docs/perf-latest.md
// Build first: npm run build
// Run: node scripts/perf-generate-report.mjs

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import MarkdownIt from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'
import { createMarkdownExit as createMarkdownExitFactory } from 'markdown-exit'
import { micromark, parse as micromarkParse, preprocess as micromarkPreprocess, postprocess as micromarkPostprocess } from 'micromark'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const PERF_BENCHMARK_VERSION = 5

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeParasByChars(targetChars) {
  const paras = []
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    const p = para(i++)
    paras.push(p)
    s += p
  }
  return paras
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

function rotate(items, offset) {
  if (items.length === 0)
    return items

  const start = ((offset % items.length) + items.length) % items.length
  return items.slice(start).concat(items.slice(0, start))
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
    // Parse-only using micromark's preprocess + parse + postprocess pipeline (no HTML compile).
    { id: 'MM1', label: 'micromark (parse only)', make: createMicromarkParseOnly, type: 'micromark-parse' },
    // Remark parse-only scenario (parse throughput, no HTML render)
    { id: 'R1', label: 'remark (parse only)', make: () => unified().use(remarkParse), type: 'remark' },
  ]
}

function resetScenario(sc, md) {
  if (sc.type.startsWith('stream'))
    md.stream.reset()
}

function runParseScenario(sc, md, input, envStream, envPlain) {
  if (sc.type.startsWith('stream'))
    return md.stream.parse(input, envStream)
  if (sc.type === 'md-original')
    return md.parse(input, {})
  if (sc.type === 'md-exit')
    return md.parse(input)
  if (sc.type === 'remark')
    return md.parse(input)
  return md.parse(input, envPlain)
}

function createBenchEnvs() {
  return {
    stream: { bench: true },
    plain: { bench: true },
  }
}

function normalizeAppendPiece(acc, piece) {
  let next = acc
  if (next.length && next.charCodeAt(next.length - 1) !== 0x0A)
    next += '\n'

  let normalizedPiece = piece
  if (normalizedPiece.length && normalizedPiece.charCodeAt(normalizedPiece.length - 1) !== 0x0A)
    normalizedPiece += '\n'

  return next + normalizedPiece
}

function measureScenarioOneShot(entry, doc, iters) {
  let lastEnvs = createBenchEnvs()
  const ms = measure(() => {
    resetScenario(entry.sc, entry.md)
    lastEnvs = createBenchEnvs()
    runParseScenario(entry.sc, entry.md, doc, lastEnvs.stream, lastEnvs.plain)
  }, iters).ms / iters

  entry.chunkInfoOne = entry.sc.type === 'full-chunk'
    ? (lastEnvs.plain.__mdtsChunkInfo || null)
    : (entry.sc.type.startsWith('stream') ? (lastEnvs.stream.__mdtsChunkInfo || null) : null)

  return ms
}

function measureScenarioAppend(entry, parts, repeatCount = 1) {
  let totalMs = 0
  let lastEnvs = createBenchEnvs()
  for (let seq = 0; seq < repeatCount; seq++) {
    resetScenario(entry.sc, entry.md)
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc = normalizeAppendPiece(acc, parts[i])
      if (entry.sc.type === 'stream-no-cache-chunk')
        entry.md.stream.reset()
      lastEnvs = createBenchEnvs()
      const t = performance.now()
      runParseScenario(entry.sc, entry.md, acc, lastEnvs.stream, lastEnvs.plain)
      totalMs += performance.now() - t
    }
  }

  entry.chunkInfoAppendLast = entry.sc.type === 'full-chunk'
    ? (lastEnvs.plain.__mdtsChunkInfo || null)
    : (entry.sc.type.startsWith('stream') ? (lastEnvs.stream.__mdtsChunkInfo || null) : null)
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
    acc = normalizeAppendPiece(acc, parts[i])
    if (sc.type === 'stream-no-cache-chunk')
      md.stream.reset()
    const envs = createBenchEnvs()
    runParseScenario(sc, md, acc, envs.stream, envs.plain)
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
    const paras = makeParasByChars(size)
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
            acc = normalizeAppendPiece(acc, appParts[i])
            if (sc.type === 'stream-no-cache-chunk')
              md.stream.reset()
            const t = performance.now()
            runParseScenario(sc, md, acc, envStream, envAppend)
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
            acc = normalizeAppendPiece(acc, lineParts[i])
            if (sc.type === 'stream-no-cache-chunk')
              md.stream.reset()
            const t = performance.now()
            runParseScenario(sc, md, acc, envStream, envAppend)
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
        chunkInfoOne: (sc.type === 'full-chunk') ? (envOne.__mdtsChunkInfo || null) : (sc.type.startsWith('stream') ? (envStream.__mdtsChunkInfo || null) : null),
        chunkInfoAppendLast: (sc.type === 'full-chunk') ? (envAppend.__mdtsChunkInfo || null) : (sc.type.startsWith('stream') ? (envStream.__mdtsChunkInfo || null) : null),
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
    { id: 'MM', label: 'micromark (parse only)', type: 'micromark-parse', make: createMicromarkParseOnly },
    { id: 'RM', label: 'remark (parse only)', type: 'remark', make: () => unified().use(remarkParse) },
    { id: 'EX', label: 'markdown-exit', type: 'md-exit', make: () => createMarkdownExitFactory() },
  ]

  const coldHot = []

  for (const size of COLD_HOT_SIZES) {
    const doc = makeParasByChars(size).join('')
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

function measureRenderComparisons() {
  const impls = [
    { id: 'TS_RENDER', label: 'markdown-it-ts.render', type: 'ts', make: () => MarkdownIt() },
    { id: 'MD_RENDER', label: 'markdown-it.render', type: 'md-original', make: () => MarkdownItOriginal() },
    { id: 'MM_RENDER', label: 'micromark (CommonMark)', type: 'micromark', make: () => micromark },
    { id: 'RM_RENDER', label: 'remark+rehype', type: 'remark', make: () => unified().use(remarkParse).use(remarkRehype).use(rehypeStringify) },
    { id: 'EX_RENDER', label: 'markdown-exit', type: 'md-exit', make: () => createMarkdownExitFactory() },
  ]

  const results = []
  for (let sizeIndex = 0; sizeIndex < SIZES.length; sizeIndex++) {
    const size = SIZES[sizeIndex]
    const doc = makeParasByChars(size).join('')
    const { oneIters, stableSamples } = pickIters(size)
    for (const impl of rotate(impls.filter(impl => !shouldSkipRenderImplAtSize(impl, size)), sizeIndex)) {
      const inst = impl.make()
      const runner = () => (
        impl.type === 'remark'
          ? inst.processSync(doc).toString()
          : impl.type === 'micromark'
            ? inst(doc)
            : impl.type === 'md-exit'
              ? inst.render(doc)
              : inst.render(doc)
      )
      runner(); runner(); runner()
      const { ms } = measureStableWarm(runner, oneIters, stableSamples, 1)
      results.push({ size, scenario: impl.id, label: impl.label, renderMs: ms })
    }
  }

  return results
}

function toMarkdown(results, coldHot) {
  const lines = []
  lines.push('# Performance Report (latest run)')
  lines.push('')
  lines.push('Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.')
  lines.push('')
  const ids = ['S1','S2','S3','S4','S5','M1','E1','MM1']
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
  lines.push('Best (one-shot) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.oneShotMs)} (${best.label})`)
  }
  lines.push('')
  lines.push('Best (append workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.appendWorkloadMs)} (${best.label})`)    
  }
  lines.push('')
  lines.push('Best (line-append workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.appendLineMs-b.appendLineMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.appendLineMs)} (${best.label})`)    
  }
  lines.push('')
  lines.push('Best (replace-paragraph workload) per size:')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.replaceParagraphMs-b.replaceParagraphMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.replaceParagraphMs)} (${best.label})`)    
  }
  lines.push('')
  // Recommendations by majority wins
  const winsOne = new Map()
  const winsApp = new Map()
  for (const [size, arr] of groupBy(results, 'size')) {
    const oneBest = [...arr].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const appBest = [...arr].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    winsOne.set(oneBest.scenario, (winsOne.get(oneBest.scenario)||0)+1)
    winsApp.set(appBest.scenario, (winsApp.get(appBest.scenario)||0)+1)
  }
  function fmtWins(map){ return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join(', ') }
  lines.push('Recommendations (by majority across sizes):')
  lines.push(`- One-shot: ${fmtWins(winsOne)}`)
  lines.push(`- Append-heavy: ${fmtWins(winsApp)}`)
  lines.push('')
  lines.push('Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).')
  lines.push('Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.')
  lines.push('')
  lines.push('## Render API throughput (markdown → HTML)')
  lines.push('')
  lines.push('This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.')
  lines.push('It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.')
  lines.push('')
  const renderBySize = groupBy(renderComparisons, 'size')
  lines.push('| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |')
  lines.push('|---:|---:|---:|---:|---:|---:|')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const get = (id) => arr.find(r => r.scenario === id)?.renderMs
    const ts = get('TS_RENDER')
    const mdRender = get('MD_RENDER')
    const micromarkRender = get('MM_RENDER')
    const remarkRender = get('RM_RENDER')
    const exitRender = get('EX_RENDER')
    lines.push(`| ${size} | ${ts != null ? fmt(ts) : '-'} | ${mdRender != null ? fmt(mdRender) : '-'} | ${micromarkRender != null ? fmt(micromarkRender) : '-'} | ${remarkRender != null ? fmt(remarkRender) : '-'} | ${exitRender != null ? fmt(exitRender) : '-'} |`)
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
  lines.push('## Best-of markdown-it-ts vs markdown-it (baseline)')
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
  lines.push('Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。')
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
const renderComparisons = measureRenderComparisons()
const md = toMarkdown(results, coldHot, renderComparisons)
writeFileSync(new URL('../docs/perf-latest.md', import.meta.url), md)

// Also write a machine-readable JSON for regression checks
let gitSha = null
try {
  gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null
}
catch {}

const payload = {
  benchmarkVersion: PERF_BENCHMARK_VERSION,
  generatedAt: new Date().toISOString(),
  node: process.version,
  gitSha,
  results,
  coldHot,
  renderComparisons,
}
writeFileSync(new URL('../docs/perf-latest.json', import.meta.url), JSON.stringify(payload, null, 2))

console.log('Wrote docs/perf-latest.md and docs/perf-latest.json')
