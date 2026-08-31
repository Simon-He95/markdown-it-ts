// Find the most recent archived snapshot and compare normalized implementation ratios.
// Usage: node scripts/perf-check.mjs [--threshold=0.10]

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

function load(path) { return JSON.parse(readFileSync(path, 'utf8')) }

function pct(a, b) { return (a - b) / b }

function normalizedPct(current, currentAnchor, baseline, baselineAnchor) {
  return pct(current / currentAnchor, baseline / baselineAnchor)
}

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

function nodeMajor(payload) {
  return String(payload?.environment?.node ?? payload?.node ?? '').match(/^v?(\d+)/)?.[1] ?? ''
}

function comparableEnvironment(current, baseline) {
  return current?.environment?.platform === baseline?.environment?.platform
    && current?.environment?.cpu === baseline?.environment?.cpu
    && nodeMajor(current) === nodeMajor(baseline)
}

function main() {
  const args = process.argv.slice(2)
  const thArg = args.find(a => a.startsWith('--threshold='))
  const baseArg = args.find(a => a.startsWith('--base='))
  const useLatest = args.includes('--latest')
  const threshold = thArg ? parseFloat(thArg.split('=')[1]) : 0.10
  const minSignalArg = args.find(a => a.startsWith('--min-signal-ms='))
  const minSignalMs = minSignalArg ? parseFloat(minSignalArg.split('=')[1]) : 0.05
  const appendMinSignalArg = args.find(a => a.startsWith('--append-min-signal-ms='))
  const appendMinSignalMs = appendMinSignalArg ? parseFloat(appendMinSignalArg.split('=')[1]) : 3

  const latestPath = new URL('../docs/perf-latest.json', import.meta.url)
  let currentSha = ''
  try { currentSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch {}

  const histDir = new URL('../docs/perf-history/', import.meta.url)
  let files = []
  try { files = readdirSync(histDir).filter(f => f.endsWith('.json')) } catch {}
  if (!files.length) {
    console.log('No perf history found; skipping regression check.')
    process.exit(0)
  }
  // sort by mtime desc
  files.sort((a,b)=> statSync(join(histDir.pathname, b)).mtimeMs - statSync(join(histDir.pathname, a)).mtimeMs)
  const cur = load(latestPath)
  const currentVersion = resolveBenchmarkVersion(cur)
  const compatibleFiles = files.filter((file) => {
    try {
      const payload = load(new URL(file, histDir))
      return resolveBenchmarkVersion(payload) === currentVersion
    } catch {
      return false
    }
  })

  if (!baseArg && compatibleFiles.length === 0) {
    console.log(`No perf history found for benchmarkVersion=${currentVersion}; run \`pnpm run perf:accept\` to accept a fresh baseline.`)
    process.exit(0)
  }

  let basePath
  if (baseArg) {
    basePath = new URL(baseArg.split('=')[1], histDir)
  } else if (useLatest) {
    basePath = new URL(compatibleFiles[0], histDir) // pick most recent, even if same SHA
  } else {
    const pick = compatibleFiles.find(f => !currentSha || !f.includes(currentSha)) || compatibleFiles[0]
    basePath = new URL(pick, histDir)
  }

  const base = load(basePath)
  const baseVersion = resolveBenchmarkVersion(base)

  if (baseVersion !== currentVersion) {
    console.log(`Skipping perf check: latest benchmarkVersion=${currentVersion} but baseline is benchmarkVersion=${baseVersion}. Run \`pnpm run perf:accept\` to accept a new baseline.`)
    process.exit(0)
  }

  if (!comparableEnvironment(cur, base)) {
    console.log(`Skipping perf check because the current and baseline environments differ (current=${cur.environment?.platform}/${cur.environment?.cpu}/Node ${nodeMajor(cur)}, baseline=${base.environment?.platform}/${base.environment?.cpu}/Node ${nodeMajor(base)}).`)
    process.exit(0)
  }

  const curMap = new Map(cur.results.map(r => [`${r.size}-${r.scenario}`, r]))
  const baseMap = new Map(base.results.map(r => [`${r.size}-${r.scenario}`, r]))

  let regressions = 0
  let checkedMetrics = 0
  let skippedMetrics = 0
  for (const [k, c] of curMap.entries()) {
    const b = baseMap.get(k)
    if (!b || !isInternalScenario(c.scenario))
      continue
    const currentAnchor = curMap.get(`${c.size}-M1`)
    const baselineAnchor = baseMap.get(`${c.size}-M1`)
    if (!currentAnchor || !baselineAnchor)
      continue

    if (shouldCheckMetric(c.oneShotMs, b.oneShotMs, minSignalMs)) {
      checkedMetrics++
      if (normalizedPct(c.oneShotMs, currentAnchor.oneShotMs, b.oneShotMs, baselineAnchor.oneShotMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }

    if (shouldCheckMetric(c.appendWorkloadMs, b.appendWorkloadMs, appendMinSignalMs)) {
      checkedMetrics++
      if (normalizedPct(c.appendWorkloadMs, currentAnchor.appendWorkloadMs, b.appendWorkloadMs, baselineAnchor.appendWorkloadMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }
  }

  const curRenderMap = new Map((cur.renderComparisons || []).map(r => [`${r.size}-${r.scenario}`, r]))
  const baseRenderMap = new Map((base.renderComparisons || []).map(r => [`${r.size}-${r.scenario}`, r]))

  for (const [k, c] of curRenderMap.entries()) {
    const b = baseRenderMap.get(k)
    if (!b || (c.scenario !== 'TS_RENDER' && c.scenario !== 'TS_RENDER_ASYNC'))
      continue
    const currentAnchor = curRenderMap.get(`${c.size}-MD_RENDER`)
    const baselineAnchor = baseRenderMap.get(`${c.size}-MD_RENDER`)
    if (!currentAnchor || !baselineAnchor)
      continue

    if (shouldCheckMetric(c.renderMs, b.renderMs, minSignalMs)) {
      checkedMetrics++
      if (normalizedPct(c.renderMs, currentAnchor.renderMs, b.renderMs, baselineAnchor.renderMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }
  }

  const curStockAstMap = new Map((cur.stockAstJsonComparisons || []).map(r => [r.size, r]))
  const baseStockAstMap = new Map((base.stockAstJsonComparisons || []).map(r => [r.size, r]))

  for (const [size, c] of curStockAstMap.entries()) {
    if (shouldCheckMetric(c.tsAstJsonMs, c.oxParseMs, minSignalMs)) {
      checkedMetrics++
      if (pct(c.tsAstJsonMs, c.oxParseMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }

    const b = baseStockAstMap.get(size)
    if (!b)
      continue

    if (shouldCheckMetric(c.tsAstJsonMs, b.tsAstJsonMs, minSignalMs)) {
      checkedMetrics++
      if (normalizedPct(c.tsAstJsonMs, c.oxParseMs, b.tsAstJsonMs, b.oxParseMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }
  }


  if (regressions) {
    console.error(`Perf check failed: ${regressions} normalized metric(s) regressed beyond +${fmtPct(threshold)} vs ${basePath.pathname} (checked=${checkedMetrics}, skipped=${skippedMetrics}, minSignalMs=${minSignalMs}, appendMinSignalMs=${appendMinSignalMs})`)
    process.exit(1)
  } else {
    console.log(`Perf check passed vs ${basePath.pathname} using normalized implementation ratios (checked=${checkedMetrics}, skipped=${skippedMetrics}, minSignalMs=${minSignalMs}, appendMinSignalMs=${appendMinSignalMs})`)
  }
}

main()
