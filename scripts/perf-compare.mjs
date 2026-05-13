// Compare two perf JSON snapshots and report deltas; exit non-zero on regressions
// Usage: node scripts/perf-compare.mjs <current-json> <baseline-json> [--threshold=0.10]

import { readFileSync } from 'node:fs'

function load(path) { return JSON.parse(readFileSync(path, 'utf8')) }

function keyOf(r) { return `${r.size}-${r.scenario}` }

function pct(a, b) { return (a - b) / b }

function fmtPct(x) { return (x * 100).toFixed(1) + '%' }

function isInternalScenario(id) {
  return /^S[1-5]$/.test(id)
}

function shouldCheckMetric(current, baseline, minSignalMs) {
  return Number.isFinite(current) && Number.isFinite(baseline) && Math.max(current, baseline) >= minSignalMs
}

function resolveBenchmarkVersion(payload) {
  return Number.isFinite(payload?.benchmarkVersion) ? payload.benchmarkVersion : 1
}

function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: node scripts/perf-compare.mjs <current-json> <baseline-json> [--threshold=0.10]')
    process.exit(2)
  }
  const cur = load(args[0])
  const base = load(args[1])
  const thArg = args.find(a => a.startsWith('--threshold='))
  const threshold = thArg ? parseFloat(thArg.split('=')[1]) : 0.10
  const minSignalArg = args.find(a => a.startsWith('--min-signal-ms='))
  const minSignalMs = minSignalArg ? parseFloat(minSignalArg.split('=')[1]) : 0.05
  const appendMinSignalArg = args.find(a => a.startsWith('--append-min-signal-ms='))
  const appendMinSignalMs = appendMinSignalArg ? parseFloat(appendMinSignalArg.split('=')[1]) : 3
  const allowBenchmarkVersionMismatch = args.includes('--allow-benchmark-version-mismatch')

  const currentVersion = resolveBenchmarkVersion(cur)
  const baseVersion = resolveBenchmarkVersion(base)
  if (currentVersion !== baseVersion) {
    const message = `Perf comparison refused: current benchmarkVersion=${currentVersion} but baseline benchmarkVersion=${baseVersion}.`
    if (allowBenchmarkVersionMismatch) {
      console.log(`${message} Skipping because --allow-benchmark-version-mismatch was provided.`)
      process.exit(0)
    }
    console.error(`${message} Update the baseline and rerun, or pass --allow-benchmark-version-mismatch only for intentional benchmark schema migrations.`)
    process.exit(1)
  }

  const curMap = new Map(cur.results.map(r => [keyOf(r), r]))
  const baseMap = new Map(base.results.map(r => [keyOf(r), r]))

  const rows = []
  let regressions = 0
  let checkedMetrics = 0
  let skippedMetrics = 0

  function accountMetric(check, reg) {
    if (check) {
      checkedMetrics++
      if (reg)
        regressions++
    }
    else {
      skippedMetrics++
    }
  }

  for (const [k, c] of curMap.entries()) {
    const b = baseMap.get(k)
    if (!b || !isInternalScenario(c.scenario)) continue
    const oneDelta = pct(c.oneShotMs, b.oneShotMs)
    const appDelta = pct(c.appendWorkloadMs, b.appendWorkloadMs)
    const lineDelta = pct(c.appendLineMs, b.appendLineMs)
    const replaceDelta = pct(c.replaceParagraphMs, b.replaceParagraphMs)

    const checkOne = shouldCheckMetric(c.oneShotMs, b.oneShotMs, minSignalMs)
    const checkApp = shouldCheckMetric(c.appendWorkloadMs, b.appendWorkloadMs, appendMinSignalMs)
    const checkLine = shouldCheckMetric(c.appendLineMs, b.appendLineMs, appendMinSignalMs)
    const checkReplace = shouldCheckMetric(c.replaceParagraphMs, b.replaceParagraphMs, minSignalMs)

    const regOne = checkOne && oneDelta > threshold
    const regApp = checkApp && appDelta > threshold
    const regLine = checkLine && lineDelta > threshold
    const regReplace = checkReplace && replaceDelta > threshold

    accountMetric(checkOne, regOne)
    accountMetric(checkApp, regApp)
    accountMetric(checkLine, regLine)
    accountMetric(checkReplace, regReplace)

    rows.push({
      key: k,
      size: c.size,
      scenario: c.scenario,
      oneDelta,
      appDelta,
      lineDelta,
      replaceDelta,
      regOne,
      regApp,
      regLine,
      regReplace,
      checkOne,
      checkApp,
      checkLine,
      checkReplace,
      cur: c,
      base: b,
    })
  }

  rows.sort((a,b)=> a.size - b.size || a.scenario.localeCompare(b.scenario))

  console.log('Perf comparison vs baseline')
  console.log('Threshold for regression: +' + fmtPct(threshold))
  console.log('| Size | Scenario | One Δ | Append(par) Δ | Append(line) Δ | Replace Δ |')
  console.log('|---:|:--|--:|--:|--:|--:|')
  for (const r of rows) {
    const one = r.checkOne ? (r.oneDelta >= 0 ? '+' : '') + fmtPct(r.oneDelta) : 'skip'
    const app = r.checkApp ? (r.appDelta >= 0 ? '+' : '') + fmtPct(r.appDelta) : 'skip'
    const line = r.checkLine ? (r.lineDelta >= 0 ? '+' : '') + fmtPct(r.lineDelta) : 'skip'
    const replace = r.checkReplace ? (r.replaceDelta >= 0 ? '+' : '') + fmtPct(r.replaceDelta) : 'skip'
    console.log(`| ${r.size} | ${r.scenario} | ${one}${r.regOne ? ' (!) ' : ' '}| ${app}${r.regApp ? ' (!) ' : ' '}| ${line}${r.regLine ? ' (!) ' : ' '}| ${replace}${r.regReplace ? ' (!) ' : ' '}|`)
  }

  const renderRows = []
  const curRenderMap = new Map((cur.renderComparisons || []).map(r => [`${r.size}-${r.scenario}`, r]))
  const baseRenderMap = new Map((base.renderComparisons || []).map(r => [`${r.size}-${r.scenario}`, r]))

  for (const [k, c] of curRenderMap.entries()) {
    const b = baseRenderMap.get(k)
    if (!b || c.scenario !== 'TS_RENDER')
      continue

    const renderDelta = pct(c.renderMs, b.renderMs)
    const checkRender = shouldCheckMetric(c.renderMs, b.renderMs, minSignalMs)
    const regRender = checkRender && renderDelta > threshold

    accountMetric(checkRender, regRender)

    renderRows.push({ size: c.size, scenario: c.scenario, renderDelta, checkRender, regRender })
  }

  renderRows.sort((a,b)=> a.size - b.size || a.scenario.localeCompare(b.scenario))

  if (renderRows.length) {
    console.log('| Size | Render Scenario | Render Δ |')
    console.log('|---:|:--|--:|')
    for (const r of renderRows) {
      const render = r.checkRender ? (r.renderDelta >= 0 ? '+' : '') + fmtPct(r.renderDelta) : 'skip'
      console.log(`| ${r.size} | ${r.scenario} | ${render}${r.regRender ? ' (!) ' : ' '}|`)
    }
  }

  console.log(`Checked markdown-it-ts scenarios only (checked=${checkedMetrics}, skipped=${skippedMetrics}, minSignalMs=${minSignalMs}, appendMinSignalMs=${appendMinSignalMs})`)

  if (regressions) {
    console.error(`Detected ${regressions} regression(s) exceeding threshold.`)
    process.exit(1)
  }
}

main()
