// Find the most recent archived snapshot and compare it against docs/perf-latest.json
// Usage: node scripts/perf-check.mjs [--threshold=0.10]

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

function load(path) { return JSON.parse(readFileSync(path, 'utf8')) }

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

  const curMap = new Map(cur.results.map(r => [`${r.size}-${r.scenario}`, r]))
  const baseMap = new Map(base.results.map(r => [`${r.size}-${r.scenario}`, r]))

  let regressions = 0
  let checkedMetrics = 0
  let skippedMetrics = 0
  for (const [k, c] of curMap.entries()) {
    const b = baseMap.get(k)
    if (!b || !isInternalScenario(c.scenario))
      continue

    if (shouldCheckMetric(c.oneShotMs, b.oneShotMs, minSignalMs)) {
      checkedMetrics++
      if (pct(c.oneShotMs, b.oneShotMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }

    if (shouldCheckMetric(c.appendWorkloadMs, b.appendWorkloadMs, appendMinSignalMs)) {
      checkedMetrics++
      if (pct(c.appendWorkloadMs, b.appendWorkloadMs) > threshold)
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
    if (!b || c.scenario !== 'TS_RENDER')
      continue

    if (shouldCheckMetric(c.renderMs, b.renderMs, minSignalMs)) {
      checkedMetrics++
      if (pct(c.renderMs, b.renderMs) > threshold)
        regressions++
    }
    else {
      skippedMetrics++
    }
  }

  if (regressions) {
    console.error(`Perf check failed: ${regressions} metric(s) regressed beyond +${fmtPct(threshold)} vs ${basePath.pathname} (checked=${checkedMetrics}, skipped=${skippedMetrics}, minSignalMs=${minSignalMs}, appendMinSignalMs=${appendMinSignalMs})`)
    process.exit(1)
  } else {
    console.log(`Perf check passed vs ${basePath.pathname} (checked=${checkedMetrics}, skipped=${skippedMetrics}, minSignalMs=${minSignalMs}, appendMinSignalMs=${appendMinSignalMs})`)
  }
}

main()
