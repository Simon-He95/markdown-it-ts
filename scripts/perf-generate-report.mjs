// Generate a fresh performance report as docs/perf-latest.md
// Build first: npm run build
// Run: node scripts/perf-generate-report.mjs

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import MarkdownIt from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'

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

function measure(fn, iters = 1) {
  const t0 = performance.now()
  let res
  for (let i = 0; i < iters; i++) res = fn()
  const t1 = performance.now()
  return { ms: t1 - t0, res }
}

function fmt(ms) { return `${ms.toFixed(2)}ms` }

const SIZES = [5_000, 20_000, 50_000, 100_000]
const APP_STEPS = 6

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
  ]
}

function runMatrix() {
  const scenarios = makeScenarios()
  const results = []

  for (const size of SIZES) {
    const paras = makeParasByChars(size)
    const doc = paras.join('')
    const appParts = splitParasIntoSteps(paras, APP_STEPS)

    for (const sc of scenarios) {
      const md = sc.make()
      const envStream = { bench: true }

      // one-shot
      const one = measure(() => (
        sc.type.startsWith('stream') ? md.stream.parse(doc, envStream)
        : sc.type === 'md-original' ? md.parse(doc, {})
        : md.parse(doc, {})
      ))

      // append workload
      let acc = ''
      let appendMs = 0
      for (let i = 0; i < appParts.length; i++) {
        if (acc.length && acc.charCodeAt(acc.length - 1) !== 0x0A) acc += '\n'
        let piece = appParts[i]
        if (piece.length && piece.charCodeAt(piece.length - 1) !== 0x0A) piece += '\n'
        acc += piece
        if (sc.type === 'stream-no-cache-chunk') md.stream.reset()
        const t = performance.now()
  if (sc.type.startsWith('stream')) md.stream.parse(acc, envStream)
  else if (sc.type === 'md-original') md.parse(acc, {})
  else md.parse(acc, {})
        appendMs += performance.now() - t
      }

      const stat = {
        size,
        scenario: sc.id,
        label: sc.label,
        oneShotMs: one.ms,
        appendWorkloadMs: appendMs,
        lastMode: md.stream?.stats?.().lastMode || 'n/a',
        appendHits: md.stream?.stats?.().appendHits || 0,
      }
      results.push(stat)
    }
  }

  return results
}

function toMarkdown(results) {
  const lines = []
  lines.push('# Performance Report (latest run)')
  lines.push('')
  const ids = ['S1','S2','S3','S4','S5','M1']
  lines.push('| Size (chars) | ' + ids.map(id => `${id} one`).join(' | ') + ' | ' + ids.map(id => `${id} append`).join(' | ') + ' |')
  lines.push('|---:|' + ids.map(()=> '---:').join('|') + '|' + ids.map(()=> '---:').join('|') + '|')
  const bySize = new Map()
  for (const r of results) {
    if (!bySize.has(r.size)) bySize.set(r.size, {})
    bySize.get(r.size)[r.scenario] = r
  }
  for (const size of Array.from(bySize.keys()).sort((a,b)=>a-b)) {
    const row = bySize.get(size)
    const oneVals = ids.map(id => row[id]?.oneShotMs ?? Number.POSITIVE_INFINITY)
    const appVals = ids.map(id => row[id]?.appendWorkloadMs ?? Number.POSITIVE_INFINITY)
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
    lines.push(`| ${size} | ${oneCells.join(' | ')} | ${appCells.join(' | ')} |`)
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
const md = toMarkdown(results)
writeFileSync(new URL('../docs/perf-latest.md', import.meta.url), md)
console.log('Wrote docs/perf-latest.md')
