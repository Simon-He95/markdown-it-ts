// Generate a fresh performance report as docs/perf-latest.md
// Build first: npm run build
// Run: node scripts/perf-generate-report.mjs

import { performance } from 'node:perf_hooks'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import MarkdownIt from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

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

function pickIters(size) {
  // Increase iterations for small sizes to reduce timer noise
  if (size <= 5_000) return { oneIters: 30, appRepeats: 6 }
  if (size <= 20_000) return { oneIters: 20, appRepeats: 5 }
  if (size <= 50_000) return { oneIters: 10, appRepeats: 4 }
  if (size <= 100_000) return { oneIters: 6, appRepeats: 3 }
  return { oneIters: 4, appRepeats: 2 }
}

function fmt(ms) {
  // Keep very fast results visible instead of rounding to 0.00
  if (ms < 10) return `${ms.toFixed(4)}ms`
  return `${ms.toFixed(2)}ms`
}

const SIZES = [5_000, 20_000, 50_000, 100_000, 200_000]
const APP_STEPS = 6
const COLD_HOT_SIZES = [5_000, 20_000, 50_000, 100_000]
const COLD_HOT_ITERS = 10

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
    // Remark parse-only scenario (parse throughput, no HTML render)
    { id: 'R1', label: 'remark (parse only)', make: () => unified().use(remarkParse), type: 'remark' },
  ]
}

function runMatrix() {
  const scenarios = makeScenarios()
  const results = []

  for (const size of SIZES) {
    const paras = makeParasByChars(size)
    const doc = paras.join('')
    const appParts = splitParasIntoSteps(paras, APP_STEPS)
    const { oneIters, appRepeats } = pickIters(size)

    for (const sc of scenarios) {
      const md = sc.make()
  const envStream = { bench: true }
  const envOne = { bench: true }

      // one-shot
      // warmup
      if (sc.type.startsWith('stream')) md.stream.parse(doc, envStream)
      else if (sc.type === 'md-original') md.parse(doc, {})
      else if (sc.type === 'remark') md.parse(doc)
      else md.parse(doc, envOne)
      const one = measure(() => (
        sc.type.startsWith('stream') ? md.stream.parse(doc, envStream)
        : sc.type === 'md-original' ? md.parse(doc, {})
        : sc.type === 'remark' ? md.parse(doc)
        : md.parse(doc, envOne)
      ), oneIters)

      // append workload
      // warmup append sequence once (not timed)
      {
        let accWarm = ''
        const envAppendWarm = { bench: true }
        for (let i = 0; i < appParts.length; i++) {
          if (accWarm.length && accWarm.charCodeAt(accWarm.length - 1) !== 0x0A) accWarm += '\n'
          let piece = appParts[i]
          if (piece.length && piece.charCodeAt(piece.length - 1) !== 0x0A) piece += '\n'
          accWarm += piece
          if (sc.type === 'stream-no-cache-chunk') md.stream.reset()
          if (sc.type.startsWith('stream')) md.stream.parse(accWarm, envStream)
          else if (sc.type === 'md-original') md.parse(accWarm, {})
          else md.parse(accWarm, envAppendWarm)
        }
      }
  let appendMs = 0
  const envAppend = { bench: true }
      for (let rep = 0; rep < appRepeats; rep++) {
        let acc = ''
        for (let i = 0; i < appParts.length; i++) {
          if (acc.length && acc.charCodeAt(acc.length - 1) !== 0x0A) acc += '\n'
          let piece = appParts[i]
          if (piece.length && piece.charCodeAt(piece.length - 1) !== 0x0A) piece += '\n'
          acc += piece
    if (sc.type === 'stream-no-cache-chunk') md.stream.reset()
    const t = performance.now()
    if (sc.type.startsWith('stream')) md.stream.parse(acc, envStream)
    else if (sc.type === 'md-original') md.parse(acc, {})
    else if (sc.type === 'remark') md.parse(acc)
    else md.parse(acc, envAppend)
    appendMs += performance.now() - t
        }
      }
      appendMs = appendMs / appRepeats

      // LINE-level append workload (finer-grained than paragraph parts)
      const lineParts = splitLinesIntoSteps(doc, APP_STEPS * 3)
      let appendLineMs = 0
      for (let rep = 0; rep < Math.max(1, Math.floor(appRepeats / 2)); rep++) {
        let acc = ''
        for (let i = 0; i < lineParts.length; i++) {
          if (acc.length && acc.charCodeAt(acc.length - 1) !== 0x0A) acc += '\n'
          let piece = lineParts[i]
          if (piece.length && piece.charCodeAt(piece.length - 1) !== 0x0A) piece += '\n'
          acc += piece
          if (sc.type === 'stream-no-cache-chunk') md.stream.reset()
          const t = performance.now()
          if (sc.type.startsWith('stream')) md.stream.parse(acc, envStream)
          else if (sc.type === 'md-original') md.parse(acc, {})
          else if (sc.type === 'remark') md.parse(acc)
          else md.parse(acc, envAppend)
          appendLineMs += performance.now() - t
        }
      }
      appendLineMs = appendLineMs / Math.max(1, Math.floor(appRepeats / 2))

      // Paragraph-replace workload: repeatedly change the last paragraph (non-append)
      // This simulates in-place edits that should cause full reparses in stream mode.
      const parasCopy = paras.slice()
      const replaceRepeats = Math.max(2, Math.floor(appRepeats / 2))
      let replaceMs = 0
      for (let rep = 0; rep < replaceRepeats; rep++) {
        const altered = parasCopy.slice()
        const lastIdx = altered.length - 1
        altered[lastIdx] = altered[lastIdx] + `\n/* edit ${rep} */\n`
        const full = altered.join('')
        const t = performance.now()
        if (sc.type.startsWith('stream')) md.stream.parse(full, envStream)
        else if (sc.type === 'md-original') md.parse(full, {})
        else if (sc.type === 'remark') md.parse(full)
        else md.parse(full, envAppend)
        replaceMs += performance.now() - t
      }
      replaceMs = replaceMs / replaceRepeats

      const stat = {
        size,
        scenario: sc.id,
        label: sc.label,
  oneShotMs: one.ms / oneIters,
        appendWorkloadMs: appendMs,
        appendLineMs,
        replaceParagraphMs: replaceMs,
        lastMode: md.stream?.stats?.().lastMode || 'n/a',
        appendHits: md.stream?.stats?.().appendHits || 0,
        chunkInfoOne: (sc.type === 'full-chunk') ? (envOne.__mdtsChunkInfo || null) : (sc.type.startsWith('stream') ? (envStream.__mdtsChunkInfo || null) : null),
        chunkInfoAppendLast: (sc.type === 'full-chunk') ? (envAppend.__mdtsChunkInfo || null) : (sc.type.startsWith('stream') ? (envStream.__mdtsChunkInfo || null) : null),
      }
      results.push(stat)
    }
  }

  return results
}

function measureColdHot() {
  // Align TS config with the main fast scenario (stream ON, cache ON, chunk ON)
  const impls = [
    { id: 'TS', label: 'markdown-it-ts (stream+chunk)', type: 'ts', make: () => MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkSizeChars: 10_000, streamChunkSizeLines: 200, streamChunkFenceAware: true }) },
    { id: 'MD', label: 'markdown-it (baseline)', type: 'md-original', make: () => MarkdownItOriginal() },
    { id: 'RM', label: 'remark (parse only)', type: 'remark', make: () => unified().use(remarkParse) },
  ]

  const coldHot = []

  for (const size of COLD_HOT_SIZES) {
    const doc = makeParasByChars(size).join('')
    for (const impl of impls) {
      // cold: new instance, single parse, no warmup
      const coldInst = impl.make()
      const coldRunner = () => (
        impl.type === 'remark'
          ? coldInst.parse(doc)
          : impl.type === 'md-original'
            ? coldInst.parse(doc, {})
            : coldInst.parse(doc, {})
      )
      const coldMs = measure(coldRunner, 1).ms

      // hot: new instance, warmup, then average
      const hotInst = impl.make()
      const hotRunner = () => (
        impl.type === 'remark'
          ? hotInst.parse(doc)
          : impl.type === 'md-original'
            ? hotInst.parse(doc, {})
            : hotInst.parse(doc, {})
      )
      measure(hotRunner, 3) // warmup
      const hotMs = measure(hotRunner, COLD_HOT_ITERS).ms / COLD_HOT_ITERS

      coldHot.push({ size, ...impl, coldMs, hotMs })
    }
  }

  return coldHot
}

function measureRenderComparisons() {
  const impls = [
    { id: 'TS_RENDER', label: 'markdown-it-ts.render', type: 'ts', make: () => MarkdownIt() },
    { id: 'MD_RENDER', label: 'markdown-it.render', type: 'md-original', make: () => MarkdownItOriginal() },
    { id: 'RM_RENDER', label: 'remark+rehype', type: 'remark', make: () => unified().use(remarkParse).use(remarkRehype).use(rehypeStringify) },
  ]

  const results = []
  for (const size of SIZES) {
    const doc = makeParasByChars(size).join('')
    const { oneIters } = pickIters(size)
    for (const impl of impls) {
      const inst = impl.make()
      const runner = () => (
        impl.type === 'remark'
          ? inst.processSync(doc).toString()
          : inst.render(doc)
      )
      runner(); runner(); runner()
      const { ms } = measure(runner, oneIters)
      results.push({ size, scenario: impl.id, label: impl.label, renderMs: ms / oneIters })
    }
  }

  return results
}

function toMarkdown(results, coldHot) {
  const lines = []
  lines.push('# Performance Report (latest run)')
  lines.push('')
  const ids = ['S1','S2','S3','S4','S5','M1']
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
  lines.push('')
  lines.push('## Render throughput (markdown → HTML)')
  lines.push('')
  lines.push('This measures end-to-end markdown → HTML rendering throughput across markdown-it-ts, upstream markdown-it, and remark+rehype (parse + stringify). Lower is better.')
  lines.push('')
  const renderBySize = groupBy(renderComparisons, 'size')
  lines.push('| Size (chars) | markdown-it-ts.render | markdown-it.render | remark+rehype |')
  lines.push('|---:|---:|---:|---:|')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const get = (id) => arr.find(r => r.scenario === id)?.renderMs
    const ts = get('TS_RENDER')
    const mdRender = get('MD_RENDER')
    const remarkRender = get('RM_RENDER')
    lines.push(`| ${size} | ${ts != null ? fmt(ts) : '-'} | ${mdRender != null ? fmt(mdRender) : '-'} | ${remarkRender != null ? fmt(remarkRender) : '-'} |`)
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
  lines.push('Render vs remark+rehype:')
  for (const [size, arr] of Array.from(renderBySize.entries()).sort((a, b) => a[0] - b[0])) {
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const remarkRender = arr.find(r => r.scenario === 'RM_RENDER')
    if (!ts || !remarkRender) continue
    const ratio = remarkRender.renderMs / ts.renderMs
    lines.push(`- ${Number(size).toLocaleString()} chars: ${fmt(ts.renderMs)} vs ${fmt(remarkRender.renderMs)} → ${ratio.toFixed(2)}× faster`)
  }
  lines.push('')
  // Best-of TS vs baseline summary
  lines.push('## Best-of markdown-it-ts vs markdown-it (baseline)')
  lines.push('')
  lines.push('| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |')
  lines.push('|---:|---:|---:|---:|---:|---:|---:|:--|')
  // group by size
  const bySize2 = groupBy(results, 'size')
  const isTsScenario = (id) => id !== 'M1'
  for (const [size, arr] of Array.from(bySize2.entries()).sort((a,b)=>a[0]-b[0])) {
    const tsOnly = arr.filter(r => isTsScenario(r.scenario))
    const baseline = arr.find(r => r.scenario === 'M1')
    if (!baseline) continue
    const bestTsOne = [...tsOnly].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const bestTsApp = [...tsOnly].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    const oneRatio = bestTsOne.oneShotMs / baseline.oneShotMs
    const appRatio = bestTsApp.appendWorkloadMs / baseline.appendWorkloadMs
    lines.push(`| ${size} | ${fmt(bestTsOne.oneShotMs)} | ${fmt(baseline.oneShotMs)} | ${(oneRatio).toFixed(2)}x | ${fmt(bestTsApp.appendWorkloadMs)} | ${fmt(baseline.appendWorkloadMs)} | ${(appRatio).toFixed(2)}x | ${bestTsOne.scenario}/${bestTsApp.scenario} |`)
  }
  lines.push('')
  lines.push('- One ratio < 1.00 means markdown-it-ts best one-shot is faster than baseline.')
  lines.push('- Append ratio < 1.00 highlights stream cache optimizations (fast-path appends).')
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
const payload = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  results,
  coldHot,
  renderComparisons,
}
writeFileSync(new URL('../docs/perf-latest.json', import.meta.url), JSON.stringify(payload, null, 2))

// Optionally store a history snapshot keyed by short git SHA if available
try {
  const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  if (sha) {
    const histDir = new URL('../docs/perf-history/', import.meta.url)
    if (!existsSync(histDir)) mkdirSync(histDir, { recursive: true })
    writeFileSync(new URL(`./perf-${sha}.json`, histDir), JSON.stringify(payload, null, 2))
  }
} catch {}

console.log('Wrote docs/perf-latest.md and docs/perf-latest.json')
