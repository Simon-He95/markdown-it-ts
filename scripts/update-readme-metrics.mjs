// Update README metric example bullets from docs/perf-latest.json
// Usage: node scripts/update-readme-metrics.mjs

import { readFileSync, writeFileSync } from 'node:fs'

const perfPath = new URL('../docs/perf-latest.json', import.meta.url)
const readmePaths = [
  new URL('../README.md', import.meta.url),
  new URL('../README.zh-CN.md', import.meta.url),
]

function loadJson(p) { return JSON.parse(readFileSync(p, 'utf8')) }

function formatMs(ms) {
  if (ms < 10) return `${ms.toFixed(4)}ms`
  return `${ms.toFixed(2)}ms`
}
function formatFx(baseline, ts) { return (baseline / ts).toFixed(1) + '×' }
function formatFrac(baseline, ts) { return (ts / baseline).toFixed(2) + '×' }

function pickBestTsBy(arr, field) {
  const tsOnly = arr.filter(r => r.scenario !== 'M1')
  return tsOnly.sort((a,b)=> a[field] - b[field])[0]
}

function getBySize(results) {
  const map = new Map()
  for (const r of results) {
    if (!map.has(r.size)) map.set(r.size, [])
    map.get(r.size).push(r)
  }
  return map
}

function buildOneExamples(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const base = arr.find(r => r.scenario === 'M1')
    const bestTs = pickBestTsBy(arr, 'oneShotMs')
    const l = `- ${size.toLocaleString()} chars: ${formatMs(bestTs.oneShotMs)} vs ${formatMs(base.oneShotMs)} → ~${formatFx(base.oneShotMs, bestTs.oneShotMs)} faster (${formatFrac(base.oneShotMs, bestTs.oneShotMs)} time)`
    lines.push(l)
  }
  return lines
}

function buildAppendExamples(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const base = arr.find(r => r.scenario === 'M1')
    const bestTs = pickBestTsBy(arr, 'appendWorkloadMs')
    const l = `- ${size.toLocaleString()} chars: ${formatMs(bestTs.appendWorkloadMs)} vs ${formatMs(base.appendWorkloadMs)} → ~${formatFx(base.appendWorkloadMs, bestTs.appendWorkloadMs)} faster (${formatFrac(base.appendWorkloadMs, bestTs.appendWorkloadMs)} time)`
    lines.push(l)
  }
  return lines
}

function buildRemarkOneExamples(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const bestTs = pickBestTsBy(arr, 'oneShotMs')
    const remark = arr.find(r => r.scenario === 'R1')
    if (!remark) continue
    const l = `- ${size.toLocaleString()} chars: ${formatMs(bestTs.oneShotMs)} vs ${formatMs(remark.oneShotMs)} → ${formatFx(remark.oneShotMs, bestTs.oneShotMs)} faster`
    lines.push(l)
  }
  return lines
}

function buildRemarkAppendExamples(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const bestTs = pickBestTsBy(arr, 'appendWorkloadMs')
    const remark = arr.find(r => r.scenario === 'R1')
    if (!remark) continue
    const l = `- ${size.toLocaleString()} chars: ${formatMs(bestTs.appendWorkloadMs)} vs ${formatMs(remark.appendWorkloadMs)} → ${formatFx(remark.appendWorkloadMs, bestTs.appendWorkloadMs)} faster`
    lines.push(l)
  }
  return lines
}

function buildRenderVsMarkdownIt(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const baseline = arr.find(r => r.scenario === 'MD_RENDER')
    if (!ts || !baseline) continue
    const l = `- ${size.toLocaleString()} chars: ${formatMs(ts.renderMs)} vs ${formatMs(baseline.renderMs)} → ~${formatFx(baseline.renderMs, ts.renderMs)} faster`
    lines.push(l)
  }
  return lines
}

function buildRenderVsRemark(bySize, sizes) {
  const lines = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    const ts = arr.find(r => r.scenario === 'TS_RENDER')
    const remark = arr.find(r => r.scenario === 'RM_RENDER')
    if (!ts || !remark) continue
    const l = `- ${size.toLocaleString()} chars: ${formatMs(ts.renderMs)} vs ${formatMs(remark.renderMs)} → ~${formatFx(remark.renderMs, ts.renderMs)} faster`
    lines.push(l)
  }
  return lines
}

function buildComparisonTable(bySize, sizes) {
  // Build a markdown table with columns: Scenario, Config, One-shot, Append(par), Append(line), Replace
  const header = ['| Scenario | Config summary | One-shot | Append (paragraph) | Append (line) | Replace (paragraph) |', '|:--|:--|---:|---:|---:|---:|']
  const rows = []
  for (const size of sizes) {
    const arr = bySize.get(size)
    if (!arr) continue
    // Order rows by scenario id for stable output
    const order = ['S1','S2','S3','S4','S5','M1']
    rows.push(`\n**${size.toLocaleString()} chars**\n`)
    rows.push('')
    rows.push(...header)
    for (const id of order) {
      const r = arr.find(x => x.scenario === id)
      if (!r) continue
      const cfg = r.label
      const one = r.oneShotMs != null ? formatMs(r.oneShotMs) : '-'
      const app = r.appendWorkloadMs != null ? formatMs(r.appendWorkloadMs) : '-'
      const lineApp = r.appendLineMs != null ? formatMs(r.appendLineMs) : '-'
      const repl = r.replaceParagraphMs != null ? formatMs(r.replaceParagraphMs) : '-'
      rows.push(`| ${id} | ${cfg} | ${one} | ${app} | ${lineApp} | ${repl} |`)
    }
    rows.push('')
  }
  return rows
}

function replaceBetween(content, startTag, endTag, newLines) {
  const startIdx = content.indexOf(startTag)
  const endIdx = content.indexOf(endTag)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return content
  const before = content.slice(0, startIdx + startTag.length)
  const after = content.slice(endIdx)
  const body = '\n' + newLines.join('\n') + '\n'
  return before + body + after
}

function buildColdHot(perf) {
  const rows = perf.coldHot ?? []
  const grouped = rows.reduce((m, r) => {
    if (!m.has(r.size)) m.set(r.size, [])
    m.get(r.size).push(r)
    return m
  }, new Map())
  const lines = []
  for (const [size, arr] of Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])) {
    lines.push(`#### ${Number(size).toLocaleString()} chars`)
    lines.push('')
    lines.push('| Impl | Cold | Hot |')
    lines.push('|:--|---:|---:|')
    for (const row of arr.sort((a, b) => a.label.localeCompare(b.label))) {
      lines.push(`| ${row.label} | ${formatMs(row.coldMs)} | ${formatMs(row.hotMs)} |`)
    }
    lines.push('')
  }
  return lines
}

function main() {
  const perf = loadJson(perfPath)
  const bySize = getBySize(perf.results)
  const renderBySize = getBySize(perf.renderComparisons || [])

  const oneSizes = [5000, 20000, 50000, 100000, 200000]
  const appendSizes = [5000, 20000, 50000, 100000, 200000]
  const renderSizes = [5000, 20000, 50000, 100000, 200000]

  const blocks = {
    one: buildOneExamples(bySize, oneSizes),
    append: buildAppendExamples(bySize, appendSizes),
    remarkOne: buildRemarkOneExamples(bySize, oneSizes),
    remarkAppend: buildRemarkAppendExamples(bySize, appendSizes),
    renderMd: buildRenderVsMarkdownIt(renderBySize, renderSizes),
    renderRemark: buildRenderVsRemark(renderBySize, renderSizes),
    comparison: buildComparisonTable(bySize, oneSizes),
  }

  for (const path of readmePaths) {
    const content = readFileSync(path, 'utf8')
    const updated = applyBlocks(content, blocks)
    writeFileSync(path, updated)
  }

  console.log('README metrics updated in', readmePaths.map(p => p.pathname).join(', '))
}

function applyBlocks(content, blocks) {
  const startOne = '<!-- perf-auto:one-examples:start -->'
  const endOne = '<!-- perf-auto:one-examples:end -->'
  const startApp = '<!-- perf-auto:append-examples:start -->'
  const endApp = '<!-- perf-auto:append-examples:end -->'
  const startRemarkOne = '<!-- perf-auto:remark-one:start -->'
  const endRemarkOne = '<!-- perf-auto:remark-one:end -->'
  const startRemarkApp = '<!-- perf-auto:remark-append:start -->'
  const endRemarkApp = '<!-- perf-auto:remark-append:end -->'
  const startRenderMd = '<!-- perf-auto:render-md:start -->'
  const endRenderMd = '<!-- perf-auto:render-md:end -->'
  const startRenderRemark = '<!-- perf-auto:render-remark:start -->'
  const endRenderRemark = '<!-- perf-auto:render-remark:end -->'
  const startComparison = '<!-- perf-auto:comparison:start -->'
  const endComparison = '<!-- perf-auto:comparison:end -->'

  let updated = content
  updated = replaceBetween(updated, startOne, endOne, blocks.one)
  updated = replaceBetween(updated, startApp, endApp, blocks.append)
  updated = replaceBetween(updated, startRemarkOne, endRemarkOne, blocks.remarkOne)
  updated = replaceBetween(updated, startRemarkApp, endRemarkApp, blocks.remarkAppend)
  updated = replaceBetween(updated, startRenderMd, endRenderMd, blocks.renderMd)
  updated = replaceBetween(updated, startRenderRemark, endRenderRemark, blocks.renderRemark)
  updated = replaceBetween(updated, startComparison, endComparison, blocks.comparison)
  return updated
}

main()
