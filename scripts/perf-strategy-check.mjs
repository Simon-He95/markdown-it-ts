import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const STRATEGY_PATH = join(ROOT, 'docs', 'perf-large-defaults.json')
const MAX_DEFAULT_GAP = 0.10
const TARGET_JITTER_MS = 3

const ONE_SHOT_TARGETS = new Map([
  [1_000_000, 70],
  [5_000_000, 320],
])

const APPEND_TARGETS = new Map([
  [1_000_000, 100],
  [5_000_000, 450],
])

function main() {
  if (!existsSync(STRATEGY_PATH)) {
    console.error('perf-strategy-check: docs/perf-large-defaults.json not found. Run `pnpm run perf:strategies` first.')
    process.exit(1)
  }

  const payload = JSON.parse(readFileSync(STRATEGY_PATH, 'utf8'))
  const summary = payload.summary ?? []
  let failures = 0

  for (const row of summary) {
    if (row.size > 5_000_000)
      continue

    const fullGap = row.defaultFullGapPct
    if (Number.isFinite(fullGap) && fullGap > MAX_DEFAULT_GAP) {
      failures++
      console.error(`[perf-strategy-check] ${row.size} default one-shot gap ${(fullGap * 100).toFixed(1)}% exceeds ${(MAX_DEFAULT_GAP * 100).toFixed(1)}%`)
    }

    const streamGap = row.defaultStreamGapPct
    if (Number.isFinite(streamGap) && streamGap > MAX_DEFAULT_GAP) {
      failures++
      console.error(`[perf-strategy-check] ${row.size} default append gap ${(streamGap * 100).toFixed(1)}% exceeds ${(MAX_DEFAULT_GAP * 100).toFixed(1)}%`)
    }

    const oneShotTarget = ONE_SHOT_TARGETS.get(row.size)
    if (oneShotTarget !== undefined && Number.isFinite(row.defaultFull?.oneShotMs) && row.defaultFull.oneShotMs > oneShotTarget + TARGET_JITTER_MS) {
      failures++
      console.error(`[perf-strategy-check] ${row.size} default one-shot ${row.defaultFull.oneShotMs.toFixed(2)}ms exceeds ${oneShotTarget}ms target (+${TARGET_JITTER_MS}ms jitter)`)
    }

    const appendTarget = APPEND_TARGETS.get(row.size)
    if (appendTarget !== undefined && Number.isFinite(row.defaultStream?.appendWorkloadMs) && row.defaultStream.appendWorkloadMs > appendTarget + TARGET_JITTER_MS) {
      failures++
      console.error(`[perf-strategy-check] ${row.size} default append ${row.defaultStream.appendWorkloadMs.toFixed(2)}ms exceeds ${appendTarget}ms target (+${TARGET_JITTER_MS}ms jitter)`)
    }
  }

  if (failures > 0) {
    console.error(`perf-strategy-check failed with ${failures} issue(s).`)
    process.exit(1)
  }

  console.log('perf-strategy-check passed.')
}

main()
