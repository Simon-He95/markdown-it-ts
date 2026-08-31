import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'

const HISTORY_SIZES = [1_000_000, 5_000_000, 20_000_000]
const UPDATE_COUNT = 50
const HISTORY_BLOCK = '## User\n\nHistory paragraph with **bold** text.\n\n## Assistant\n\nStable response.\n\n'
const DELTA = 'Streaming response paragraph.\n\n'
const TAIL_DELTAS = [' keeps', ' streaming', ' with detail', '.\n']

function makeHistory(size) {
  return HISTORY_BLOCK.repeat(Math.ceil(size / HISTORY_BLOCK.length)).slice(0, size - 2) + '\n\n'
}

function median(values) {
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

function measureUpdates(base, appendDelta) {
  const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
  const env = {}
  const restoreStartedAt = performance.now()
  md.stream.parse(base, env)
  const coldRestoreMs = performance.now() - restoreStartedAt

  let snapshotRestoreMs
  if (appendDelta) {
    const snapshot = md.stream.snapshot()
    md.stream.reset()
    const snapshotStartedAt = performance.now()
    md.stream.restore(snapshot)
    snapshotRestoreMs = performance.now() - snapshotStartedAt
  }

  let source = base
  const startedAt = performance.now()
  for (let i = 0; i < UPDATE_COUNT; i++) {
    if (appendDelta) {
      md.stream.append(DELTA, env)
    }
    else {
      source += DELTA
      md.stream.parse(source, env)
    }
  }
  return {
    updateMs: performance.now() - startedAt,
    coldRestoreMs,
    snapshotRestoreMs,
  }
}

function measureTailUpdates(base, appendDelta) {
  const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
  const env = {}
  let source = `${base}Live paragraph`
  md.stream.parse(source, env)

  const startedAt = performance.now()
  for (const delta of TAIL_DELTAS) {
    if (appendDelta) {
      md.stream.append(delta, env)
    }
    else {
      source += delta
      md.stream.parse(source, env)
    }
  }
  return performance.now() - startedAt
}

console.log(`History stream benchmark (${UPDATE_COUNT} updates, median of 3 rounds)`)

for (const size of HISTORY_SIZES) {
  const base = makeHistory(size)
  const fullSourceSamples = []
  const deltaSamples = []
  const coldRestoreSamples = []
  const snapshotRestoreSamples = []
  const fullTailSamples = []
  const deltaTailSamples = []

  for (let round = 0; round < 3; round++) {
    globalThis.gc?.()
    fullSourceSamples.push(measureUpdates(base, false).updateMs)
    globalThis.gc?.()
    const delta = measureUpdates(base, true)
    deltaSamples.push(delta.updateMs)
    coldRestoreSamples.push(delta.coldRestoreMs)
    snapshotRestoreSamples.push(delta.snapshotRestoreMs)
    globalThis.gc?.()
    fullTailSamples.push(measureTailUpdates(base, false))
    globalThis.gc?.()
    deltaTailSamples.push(measureTailUpdates(base, true))
  }

  const fullSourceMs = median(fullSourceSamples)
  const deltaMs = median(deltaSamples)
  console.log(JSON.stringify({
    historyChars: size,
    fullSourceMs,
    deltaMs,
    speedup: fullSourceMs / deltaMs,
    coldRestoreMs: median(coldRestoreSamples),
    snapshotRestoreMs: median(snapshotRestoreSamples),
    fullTailMs: median(fullTailSamples),
    deltaTailMs: median(deltaTailSamples),
    tailSpeedup: median(fullTailSamples) / median(deltaTailSamples),
  }))
}
