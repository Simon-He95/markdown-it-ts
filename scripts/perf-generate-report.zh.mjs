// 生成中文版性能报告到 docs/perf-latest.zh-CN.md
// 先构建: npm run build
// 运行: node scripts/perf-generate-report.zh.mjs

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import MarkdownIt from '../dist/index.js'
import MarkdownItOriginal from 'markdown-it'

function para(n) {
  return `## 段落 ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
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
    { id: 'S1', label: '流式 开启, 关闭缓存, 开启分块', make: s1, type: 'stream-no-cache-chunk' },
    { id: 'S2', label: '流式 开启, 开启缓存, 关闭分块', make: s2, type: 'stream-cache' },
    { id: 'S3', label: '流式 开启, 开启缓存, 开启分块(混合)', make: s3, type: 'stream-hybrid' },
    { id: 'S4', label: '流式 关闭, 全量分块', make: s4, type: 'full-chunk' },
    { id: 'S5', label: '流式 关闭, 纯全量', make: s5, type: 'full-plain' },
    { id: 'M1', label: 'markdown-it（基线）', make: () => MarkdownItOriginal(), type: 'md-original' },
  ]
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

      // 一次性
      const one = measure(() => (
        sc.type.startsWith('stream') ? md.stream.parse(doc, envStream)
        : sc.type === 'md-original' ? md.parse(doc, {})
        : md.parse(doc, {})
      ))

      // 追加工作负载
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
  lines.push('# 性能报告（最新一次）')
  lines.push('')

  const ids = ['S1','S2','S3','S4','S5','M1']
  lines.push('| 字数 | ' + ids.map(id => `${id} 一次`).join(' | ') + ' | ' + ids.map(id => `${id} 追加`).join(' | ') + ' |')
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
    const oneCells = ids.map((id) => {
      const v = row[id]?.oneShotMs
      if (v == null) return '-'
      const cell = fmt(v)
      return v === oneMin ? `**${cell}**` : cell
    })
    const appCells = ids.map((id) => {
      const v = row[id]?.appendWorkloadMs
      if (v == null) return '-'
      const cell = fmt(v)
      return v === appMin ? `**${cell}**` : cell
    })
    lines.push(`| ${size} | ${oneCells.join(' | ')} | ${appCells.join(' | ')} |`)
  }

  lines.push('')
  lines.push('各规模下的最佳（一次性）：')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.oneShotMs)}（${best.label}）`)
  }

  lines.push('')
  lines.push('各规模下的最佳（追加工作负载）：')
  for (const [size, arr] of groupBy(results, 'size')) {
    const best = [...arr].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    lines.push(`- ${size}: ${best.scenario} ${fmt(best.appendWorkloadMs)}（${best.label}）`)
  }

  lines.push('')
  // 多数投票推荐
  const winsOne = new Map()
  const winsApp = new Map()
  for (const [size, arr] of groupBy(results, 'size')) {
    const oneBest = [...arr].sort((a,b)=>a.oneShotMs-b.oneShotMs)[0]
    const appBest = [...arr].sort((a,b)=>a.appendWorkloadMs-b.appendWorkloadMs)[0]
    winsOne.set(oneBest.scenario, (winsOne.get(oneBest.scenario)||0)+1)
    winsApp.set(appBest.scenario, (winsApp.get(appBest.scenario)||0)+1)
  }
  function fmtWins(map){ return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join('、') }
  lines.push('推荐（按不同规模的多数投票）：')
  lines.push(`- 一次性：${fmtWins(winsOne)}`)
  lines.push(`- 追加编辑：${fmtWins(winsApp)}`)

  lines.push('')
  lines.push('说明：当使用同一个 env 对象时，S2/S3 的 `appendHits` 应为 5（每次追加都会命中快路径）。')

  lines.push('')
  lines.push('## markdown-it-ts 最佳 vs markdown-it（基线）')
  lines.push('')
  lines.push('| 字数 | TS 最佳（一次） | 基线（一次） | 一次比例 | TS 最佳（追加） | 基线（追加） | 追加比例 | TS 场景（一次/追加） |')
  lines.push('|---:|---:|---:|---:|---:|---:|---:|:--|')
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
  lines.push('- 一次比例 < 1.00 表示 markdown-it-ts（最佳一次）快于基线。')
  lines.push('- 追加比例 < 1.00 表示流式缓存快路径的优势。')

  return lines.join('\n')
}

const results = runMatrix()
const md = toMarkdown(results)
writeFileSync(new URL('../docs/perf-latest.zh-CN.md', import.meta.url), md)
console.log('已写入 docs/perf-latest.zh-CN.md')
