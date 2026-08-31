import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { pathToFileURL, fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const baselineRef = args.find(arg => !arg.startsWith('--')) || 'HEAD'
const roundsArg = args.find(arg => arg.startsWith('--rounds='))
const rounds = roundsArg ? Math.max(1, Number.parseInt(roundsArg.split('=')[1], 10) || 1) : 1
const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
const threshold = thresholdArg ? Math.max(0, Number.parseFloat(thresholdArg.split('=')[1]) || 0) : 0.05
const scenarioThresholdArg = args.find(arg => arg.startsWith('--scenario-threshold='))
const scenarioThreshold = scenarioThresholdArg ? Math.max(0, Number.parseFloat(scenarioThresholdArg.split('=')[1]) || 0) : Math.max(threshold, 0.10)
const scenarioMinDeltaArg = args.find(arg => arg.startsWith('--scenario-min-delta-ms='))
const scenarioMinDeltaMs = scenarioMinDeltaArg ? Math.max(0, Number.parseFloat(scenarioMinDeltaArg.split('=')[1]) || 0) : 0.05

const STREAM_OPTIONS = {
  stream: true,
  streamChunkedFallback: false,
  streamOptimizationMinSize: 0,
}

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n- item ${n}-a\n- item ${n}-b\n- item ${n}-c\n\n`
}

function makePrefix(targetChars) {
  let text = ''
  let index = 0
  while (text.length < targetChars)
    text += para(index++)
  return `${text}### Live output\n\n`
}

function makeTailList(count, options = {}) {
  const loose = options.loose ?? false
  const ordered = options.ordered ?? false
  let out = ''
  for (let i = 0; i < count; i++) {
    const index = i + 1
    out += ordered ? `${index}. item ${index}` : `- item ${index}`
    out += loose ? '\n\n' : '\n'
  }
  return out
}

function makeTailTable(count, options = {}) {
  const aligned = options.aligned ?? false
  let out = '| column a | column b |\n'
  out += aligned ? '|:-----------|-----------:|\n' : '|------------|------------|\n'
  for (let i = 0; i < count; i++) {
    const index = i + 1
    out += `| row ${index} | value ${index} |\n`
  }
  return out
}

const SHARED_PREFIX = makePrefix(60_000)

const SCENARIOS = [
  {
    name: 'tail-paragraph-append',
    iterations: 24,
    create() {
      const seed = `${SHARED_PREFIX}Live paragraph`
      const pieces = [' keeps', ' streaming', ' with more detail', ' until completion.\n']
      const updates = []
      let doc = seed
      for (const piece of pieces) {
        doc += piece
        updates.push(doc)
      }
      return { base: seed, updates, finalDoc: doc }
    },
  },
  {
    name: 'tail-softbreak-append',
    iterations: 24,
    create() {
      const seed = `${SHARED_PREFIX}Live paragraph\n`
      const pieces = ['continues', ' on the', ' next streamed', ' line']
      const updates = []
      let doc = seed
      for (const piece of pieces) {
        doc += piece
        updates.push(doc)
      }
      return { base: seed, updates, finalDoc: doc }
    },
  },
  {
    name: 'tail-new-paragraph-after-blank-line',
    iterations: 24,
    create() {
      const seed = `${SHARED_PREFIX}Stable intro.\n\n`
      const pieces = ['Fresh', ' paragraph', ' keeps', ' streaming']
      const updates = []
      let doc = seed
      for (const piece of pieces) {
        doc += piece
        updates.push(doc)
      }
      return { base: seed, updates, finalDoc: doc }
    },
  },
  {
    name: 'tail-after-heading-boundary',
    iterations: 24,
    create() {
      const seed = `${SHARED_PREFIX}# Live heading\n`
      const pieces = ['Follow-up', ' paragraph', ' keeps', ' streaming']
      const updates = []
      let doc = seed
      for (const piece of pieces) {
        doc += piece
        updates.push(doc)
      }
      return { base: seed, updates, finalDoc: doc }
    },
  },
  {
    name: 'tail-open-fence',
    iterations: 18,
    create() {
      const seed = `${SHARED_PREFIX}\`\`\`ts\n`
      const pieces = ['const value = 1\n', 'console.log(value)\n', 'console.log(value + 1)\n', '```\n']
      const updates = []
      let doc = seed
      for (const piece of pieces) {
        doc += piece
        updates.push(doc)
      }
      return { base: seed, updates, finalDoc: doc }
    },
  },
  {
    name: 'tail-list-extension',
    iterations: 20,
    create() {
      const seed = `${SHARED_PREFIX}- item one\n\n`
      const versions = [
        `${seed}- item two`,
        `${seed}- item two with more detail`,
        `${seed}- item two with more detail\n\n- item three`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-large-list-append',
    iterations: 14,
    create() {
      const seed = `${SHARED_PREFIX}${makeTailList(160)}`
      const versions = [
        `${seed}- item 161\n`,
        `${seed}- item 161\n- item 162\n`,
        `${seed}- item 161\n- item 162\n- item 163\n`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-tight-list-item-append',
    iterations: 22,
    create() {
      const seed = `${SHARED_PREFIX}- item one\n`
      const versions = [
        `${seed}- item two\n`,
        `${seed}- item two\n- item three\n`,
        `${seed}- item two\n- item three\n- item four\n`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-large-ordered-list-append',
    iterations: 14,
    create() {
      const seed = `${SHARED_PREFIX}${makeTailList(160, { ordered: true })}`
      const versions = [
        `${seed}161. item 161\n`,
        `${seed}161. item 161\n162. item 162\n`,
        `${seed}161. item 161\n162. item 162\n163. item 163\n`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-large-table-append',
    iterations: 14,
    create() {
      const seed = `${SHARED_PREFIX}${makeTailTable(160, { aligned: true })}`
      const versions = [
        `${seed}| row 161 | value 161 |\n`,
        `${seed}| row 161 | value 161 |\n| row 162 | value 162 |\n`,
        `${seed}| row 161 | value 161 |\n| row 162 | value 162 |\n| row 163 | value 163 |\n`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-ordered-list-append',
    iterations: 22,
    create() {
      const seed = `${SHARED_PREFIX}1. first item\n`
      const versions = [
        `${seed}2. second item\n`,
        `${seed}2. second item\n3. third item\n`,
        `${seed}2. second item\n3. third item\n4. fourth item\n`,
      ]
      return { base: seed, updates: versions, finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-setext-upgrade',
    iterations: 24,
    create() {
      const versions = [
        `${SHARED_PREFIX}Streaming title\n`,
        `${SHARED_PREFIX}Streaming title\n-----\n`,
        `${SHARED_PREFIX}Streaming title\n=====\n`,
        `${SHARED_PREFIX}Streaming title\n-----\n`,
      ]
      return { base: versions[0], updates: versions.slice(1), finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-replace-last-paragraph',
    iterations: 28,
    create() {
      const versions = [
        `${SHARED_PREFIX}Tail paragraph revision zero.\n`,
        `${SHARED_PREFIX}Tail paragraph revision one with fresher wording.\n`,
        `${SHARED_PREFIX}Tail paragraph revision two with even more detail.\n`,
        `${SHARED_PREFIX}Tail paragraph revision three and final polishing pass.\n`,
      ]
      return { base: versions[0], updates: versions.slice(1), finalDoc: versions[versions.length - 1] }
    },
  },
  {
    name: 'tail-huge-history-paragraph-append',
    iterations: 6,
    create() {
      const seed = `${makePrefix(1_500_000)}Live paragraph`
      const updates = [
        `${seed} keeps`,
        `${seed} keeps streaming`,
        `${seed} keeps streaming.\n`,
      ]
      return { base: seed, updates, finalDoc: updates[updates.length - 1] }
    },
  },
  {
    name: 'huge-append-reference-definition-fallback',
    iterations: 4,
    create() {
      const base = `${makePrefix(800_000)}See [x][id]\n\n`
      const finalDoc = `${base}[id]: https://example.com\n\n`
      return { base, updates: [finalDoc], finalDoc }
    },
  },
]

const DIRECT_API_SCENARIOS = [
  {
    name: 'delta-block-append',
    kind: 'delta-block',
    iterations: 4,
    create() {
      const base = makePrefix(250_000)
      const deltas = Array.from({ length: 12 }, (_, index) => `Streaming response ${index}.\n\n`)
      return { base, deltas, finalDoc: base + deltas.join('') }
    },
  },
  {
    name: 'delta-active-tail',
    kind: 'delta-tail',
    iterations: 8,
    create() {
      const base = `${makePrefix(250_000)}Live paragraph`
      const deltas = [' keeps', ' streaming', ' with detail', '.\n']
      return { base, deltas, finalDoc: base + deltas.join('') }
    },
  },
  {
    name: 'snapshot-restore',
    kind: 'snapshot',
    iterations: 24,
    create() {
      const base = makePrefix(250_000)
      return { base, deltas: [], finalDoc: base }
    },
  },
]

function run(cmd, commandArgs, cwd, extra = {}) {
  const result = spawnSync(cmd, commandArgs, {
    cwd,
    encoding: extra.encoding ?? 'utf8',
    stdio: extra.stdio ?? 'pipe',
    input: extra.input,
    maxBuffer: extra.maxBuffer ?? 64 * 1024 * 1024,
  })

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .map((value) => Buffer.isBuffer(value) ? value.toString('utf8') : value)
      .join('\n')
    throw new Error(`${cmd} ${commandArgs.join(' ')} failed in ${cwd}\n${detail}`)
  }

  return result
}

function ensureBuilt(dir) {
  run('pnpm', ['run', 'build'], dir, { stdio: 'inherit' })
}

function setupBaseline(ref) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-it-ts-stream-baseline-'))
  const archiveDir = path.join(tempRoot, 'repo')
  fs.mkdirSync(archiveDir)

  const archive = run('git', ['archive', '--format=tar', ref], repoRoot, { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 })
  run('tar', ['-xf', '-', '-C', archiveDir], repoRoot, { input: archive.stdout })

  const repoNodeModules = path.join(repoRoot, 'node_modules')
  if (fs.existsSync(repoNodeModules))
    fs.symlinkSync(repoNodeModules, path.join(archiveDir, 'node_modules'), 'dir')

  ensureBuilt(archiveDir)
  return { tempRoot, archiveDir }
}

async function loadMarkdownIt(dir, tag) {
  const moduleUrl = pathToFileURL(path.join(dir, 'dist', 'index.js')).href + `?${tag}`
  const mod = await import(moduleUrl)
  return mod.default
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function measureAverageValue(fn, iterations, warmups = 4) {
  for (let i = 0; i < warmups; i++)
    fn()

  let total = 0
  for (let i = 0; i < iterations; i++)
    total += fn()
  return total / iterations
}

function measurePaired(currentFn, baselineFn, iterations, currentFirst, samples = 7) {
  for (let i = 0; i < 4; i++) {
    currentFn()
    baselineFn()
  }

  const currentSamples = []
  const baselineSamples = []
  const ratios = []

  for (let sample = 0; sample < samples; sample++) {
    let currentMs
    let baselineMs
    if ((sample % 2 === 0) === currentFirst) {
      currentMs = measureAverageValue(currentFn, iterations, 0)
      baselineMs = measureAverageValue(baselineFn, iterations, 0)
    }
    else {
      baselineMs = measureAverageValue(baselineFn, iterations, 0)
      currentMs = measureAverageValue(currentFn, iterations, 0)
    }
    currentSamples.push(currentMs)
    baselineSamples.push(baselineMs)
    ratios.push(currentMs / baselineMs)
  }

  return {
    currentMedianMs: median(currentSamples),
    baselineMedianMs: median(baselineSamples),
    ratio: median(ratios),
  }
}

function formatMs(value) {
  return `${value.toFixed(4)}ms`
}

function geometricMean(values) {
  const safe = values.filter(value => Number.isFinite(value) && value > 0)
  return Math.exp(safe.reduce((sum, value) => sum + Math.log(value), 0) / safe.length)
}

function summarize(ratios) {
  const ratio = geometricMean(ratios)
  return { ratio }
}

function formatChange(ratio) {
  const percent = Math.abs((1 - ratio) * 100).toFixed(2)
  return ratio <= 1 ? `${percent}% faster` : `${percent}% slower`
}

function runSequence(md, scenario) {
  md.stream.reset()
  const env = {}
  let tokens = md.stream.parse(scenario.base, env)
  for (const update of scenario.updates)
    tokens = md.stream.parse(update, env)
  return { tokens, env, stats: md.stream.stats() }
}

function runIncrementalOnly(md, scenario) {
  md.stream.reset()
  const env = {}
  md.stream.parse(scenario.base, env)
  const start = performance.now()
  let tokens = md.stream.peek()
  for (const update of scenario.updates)
    tokens = md.stream.parse(update, env)
  const ms = performance.now() - start
  return { ms, tokens, env, stats: md.stream.stats() }
}

function runDirectSequence(md, scenarioConfig, scenario) {
  md.stream.reset()
  const env = {}
  let source = scenario.base
  let tokens = md.stream.parse(source, env)
  md.stream.resetStats()

  if (scenarioConfig.kind === 'snapshot') {
    const snapshot = typeof md.stream.snapshot === 'function' ? md.stream.snapshot() : null
    md.stream.reset()
    tokens = snapshot && typeof md.stream.restore === 'function'
      ? md.stream.restore(snapshot)
      : md.stream.parse(source, env)
  }
  else {
    for (const delta of scenario.deltas) {
      source += delta
      tokens = typeof md.stream.append === 'function'
        ? md.stream.append(delta, env)
        : md.stream.parse(source, env)
    }
  }

  return { tokens, env, stats: md.stream.stats() }
}

function runDirectOnly(md, scenario) {
  md.stream.reset()
  const env = {}
  md.stream.parse(scenario.base, env)
  md.stream.resetStats()
  let source = scenario.base
  let tokens = md.stream.peek()
  const start = performance.now()
  for (const delta of scenario.deltas) {
    source += delta
    tokens = typeof md.stream.append === 'function'
      ? md.stream.append(delta, env)
      : md.stream.parse(source, env)
  }
  return { ms: performance.now() - start, tokens, env, stats: md.stream.stats() }
}

function prepareSnapshotMeasure(md, scenario) {
  md.stream.reset()
  const env = {}
  md.stream.parse(scenario.base, env)
  const snapshot = typeof md.stream.snapshot === 'function' ? md.stream.snapshot() : null
  return () => {
    md.stream.reset()
    const start = performance.now()
    if (snapshot && typeof md.stream.restore === 'function')
      md.stream.restore(snapshot)
    else
      md.stream.parse(scenario.base, env)
    return performance.now() - start
  }
}

function verifyDirectScenario(scenarioConfig, CurrentMarkdownIt, BaselineMarkdownIt, scenario) {
  const currentMd = CurrentMarkdownIt(STREAM_OPTIONS)
  const baselineMd = BaselineMarkdownIt(STREAM_OPTIONS)
  const current = runDirectSequence(currentMd, scenarioConfig, scenario)
  const baseline = runDirectSequence(baselineMd, scenarioConfig, scenario)
  const currentHtml = currentMd.renderer.render(current.tokens, currentMd.options, current.env)
  const baselineHtml = baselineMd.renderer.render(baseline.tokens, baselineMd.options, baseline.env)

  if (currentHtml !== currentMd.render(scenario.finalDoc, {}))
    throw new Error(`Current direct API output mismatch for scenario ${scenarioConfig.name}`)
  if (baselineHtml !== baselineMd.render(scenario.finalDoc, {}))
    throw new Error(`Baseline direct API output mismatch for scenario ${scenarioConfig.name}`)
  if (currentHtml !== baselineHtml)
    throw new Error(`Current/baseline direct API output mismatch for scenario ${scenarioConfig.name}`)
  if (scenarioConfig.kind === 'delta-block' && current.stats.appendHits <= 0)
    throw new Error(`Current direct API scenario ${scenarioConfig.name} did not hit append mode`)
  if (scenarioConfig.kind === 'delta-tail' && current.stats.tailHits <= 0)
    throw new Error(`Current direct API scenario ${scenarioConfig.name} did not hit tail mode`)
  if (scenarioConfig.kind === 'snapshot' && typeof currentMd.stream.restore !== 'function')
    throw new Error('Current build does not expose snapshot restore')

  return { currentStats: current.stats, baselineStats: baseline.stats }
}

function verifyScenario(name, CurrentMarkdownIt, BaselineMarkdownIt, scenario) {
  const currentMd = CurrentMarkdownIt(STREAM_OPTIONS)
  const baselineMd = BaselineMarkdownIt(STREAM_OPTIONS)

  const current = runSequence(currentMd, scenario)
  const baseline = runSequence(baselineMd, scenario)

  const currentHtml = currentMd.renderer.render(current.tokens, currentMd.options, current.env)
  const baselineHtml = baselineMd.renderer.render(baseline.tokens, baselineMd.options, baseline.env)
  const currentFullHtml = currentMd.render(scenario.finalDoc, {})
  const baselineFullHtml = baselineMd.render(scenario.finalDoc, {})

  if (currentHtml !== currentFullHtml)
    throw new Error(`Current stream output mismatch for scenario ${name}`)
  if (baselineHtml !== baselineFullHtml)
    throw new Error(`Baseline stream output mismatch for scenario ${name}`)
  if (currentHtml !== baselineHtml)
    throw new Error(`Current/baseline output mismatch for scenario ${name}`)

  return { currentStats: current.stats, baselineStats: baseline.stats }
}

async function main() {
  console.log(`Building current workspace and baseline ref ${baselineRef}...`)
  ensureBuilt(repoRoot)
  const { tempRoot, archiveDir } = setupBaseline(baselineRef)

  try {
    const [CurrentMarkdownIt, BaselineMarkdownIt] = await Promise.all([
      loadMarkdownIt(repoRoot, `current-stream-${Date.now()}`),
      loadMarkdownIt(archiveDir, `baseline-stream-${Date.now()}`),
    ])

    const measurementsByScenario = new Map(SCENARIOS.map(scenario => [scenario.name, []]))
    const directMeasurementsByScenario = new Map(DIRECT_API_SCENARIOS.map(scenario => [scenario.name, []]))

    for (let round = 0; round < rounds; round++) {
      if (rounds > 1)
        console.log(`\nRound ${round + 1}/${rounds}`)

      for (let scenarioIndex = 0; scenarioIndex < SCENARIOS.length; scenarioIndex++) {
        const scenarioConfig = SCENARIOS[scenarioIndex]
        const scenario = scenarioConfig.create()
        const verification = verifyScenario(scenarioConfig.name, CurrentMarkdownIt, BaselineMarkdownIt, scenario)

        const currentMd = CurrentMarkdownIt(STREAM_OPTIONS)
        const baselineMd = BaselineMarkdownIt(STREAM_OPTIONS)

        const measured = measurePaired(
          () => runIncrementalOnly(currentMd, scenario).ms,
          () => runIncrementalOnly(baselineMd, scenario).ms,
          scenarioConfig.iterations,
          (round + scenarioIndex) % 2 === 0,
        )
        measurementsByScenario.get(scenarioConfig.name).push(measured)

        const currentTailHits = verification.currentStats.tailHits ?? 0
        const baselineTailHits = verification.baselineStats.tailHits ?? 0

        console.log(`\n[${scenarioConfig.name}]`)
        console.log(`  current=${formatMs(measured.currentMedianMs)} baseline=${formatMs(measured.baselineMedianMs)} paired-ratio=${measured.ratio.toFixed(3)}`)
        console.log(`  current stats lastMode=${verification.currentStats.lastMode} appendHits=${verification.currentStats.appendHits} tailHits=${currentTailHits}`)
        console.log(`  baseline stats lastMode=${verification.baselineStats.lastMode} appendHits=${verification.baselineStats.appendHits} tailHits=${baselineTailHits}`)
      }

      for (let scenarioIndex = 0; scenarioIndex < DIRECT_API_SCENARIOS.length; scenarioIndex++) {
        const scenarioConfig = DIRECT_API_SCENARIOS[scenarioIndex]
        const scenario = scenarioConfig.create()
        const verification = verifyDirectScenario(scenarioConfig, CurrentMarkdownIt, BaselineMarkdownIt, scenario)
        const currentMd = CurrentMarkdownIt(STREAM_OPTIONS)
        const baselineMd = BaselineMarkdownIt(STREAM_OPTIONS)
        const currentFn = scenarioConfig.kind === 'snapshot'
          ? prepareSnapshotMeasure(currentMd, scenario)
          : () => runDirectOnly(currentMd, scenario).ms
        const baselineFn = scenarioConfig.kind === 'snapshot'
          ? prepareSnapshotMeasure(baselineMd, scenario)
          : () => runDirectOnly(baselineMd, scenario).ms
        const measured = measurePaired(
          currentFn,
          baselineFn,
          scenarioConfig.iterations,
          (round + scenarioIndex) % 2 === 0,
        )
        directMeasurementsByScenario.get(scenarioConfig.name).push(measured)

        console.log(`\n[${scenarioConfig.name}]`)
        console.log(`  current=${formatMs(measured.currentMedianMs)} baseline=${formatMs(measured.baselineMedianMs)} paired-ratio=${measured.ratio.toFixed(3)}`)
        console.log(`  current stats lastMode=${verification.currentStats.lastMode} appendHits=${verification.currentStats.appendHits} tailHits=${verification.currentStats.tailHits ?? 0}`)
      }
    }

    const scenarioResults = new Map([...measurementsByScenario].map(([name, values]) => [name, {
      ratio: median(values.map(value => value.ratio)),
      deltaMs: median(values.map(value => value.currentMedianMs - value.baselineMedianMs)),
    }]))
    const directScenarioResults = new Map([...directMeasurementsByScenario].map(([name, values]) => [name, {
      ratio: median(values.map(value => value.ratio)),
      deltaMs: median(values.map(value => value.currentMedianMs - value.baselineMedianMs)),
    }]))
    const summary = summarize([...scenarioResults.values()].map(value => value.ratio))
    const directSummary = summarize([...directScenarioResults.values()].map(value => value.ratio))
    const scenarioFailures = [
      ...[...scenarioResults].filter(([, result]) => result.ratio > 1 + scenarioThreshold && result.deltaMs > scenarioMinDeltaMs),
      ...[...directScenarioResults].filter(([, result]) => result.ratio > 1 + scenarioThreshold && result.deltaMs > scenarioMinDeltaMs),
    ]
    console.log('\nSummary')
    console.log(`  rounds=${rounds}`)
    console.log(`  geometric-mean of per-scenario median ratios=${summary.ratio.toFixed(3)} (${formatChange(summary.ratio)})`)
    console.log(`  direct API geometric-mean of per-scenario median ratios=${directSummary.ratio.toFixed(3)} (${formatChange(directSummary.ratio)})`)
    console.log(`  regression threshold=+${(threshold * 100).toFixed(1)}%`)
    console.log(`  per-scenario regression threshold=+${(scenarioThreshold * 100).toFixed(1)}%`)
    console.log(`  per-scenario minimum absolute regression=${scenarioMinDeltaMs.toFixed(4)}ms`)

    if (summary.ratio > 1 + threshold || directSummary.ratio > 1 + threshold || scenarioFailures.length > 0) {
      const failures = [
        summary.ratio > 1 + threshold ? `stream incremental ratio ${summary.ratio.toFixed(3)} regressed beyond +${(threshold * 100).toFixed(1)}% vs ${baselineRef}` : null,
        directSummary.ratio > 1 + threshold ? `direct API ratio ${directSummary.ratio.toFixed(3)} regressed beyond +${(threshold * 100).toFixed(1)}% vs ${baselineRef}` : null,
        scenarioFailures.length > 0 ? `per-scenario regressions beyond +${(scenarioThreshold * 100).toFixed(1)}% and +${scenarioMinDeltaMs.toFixed(4)}ms: ${scenarioFailures.map(([name, result]) => `${name}=${result.ratio.toFixed(3)} (+${result.deltaMs.toFixed(4)}ms)`).join(', ')}` : null,
      ].filter(Boolean)
      throw new Error(failures.join('; '))
    }
  }
  finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nStream perf comparison failed: ${error.message}`)
  process.exitCode = 1
})
