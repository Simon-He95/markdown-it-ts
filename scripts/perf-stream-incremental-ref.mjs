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

  const archive = run('git', ['archive', '--format=tar', ref], repoRoot, { encoding: 'buffer' })
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

function measureMedianValue(fn, iterations, samples = 7) {
  const values = []
  for (let i = 0; i < samples; i++)
    values.push(measureAverageValue(fn, iterations))
  return { medianMs: median(values), samples: values }
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
  const delta = (1 - ratio) * 100
  return { ratio, delta }
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

    const ratios = []

    for (let round = 0; round < rounds; round++) {
      if (rounds > 1)
        console.log(`\nRound ${round + 1}/${rounds}`)

      for (const scenarioConfig of SCENARIOS) {
        const scenario = scenarioConfig.create()
        const verification = verifyScenario(scenarioConfig.name, CurrentMarkdownIt, BaselineMarkdownIt, scenario)

        const currentMd = CurrentMarkdownIt(STREAM_OPTIONS)
        const baselineMd = BaselineMarkdownIt(STREAM_OPTIONS)

        const currentMeasured = measureMedianValue(() => {
          return runIncrementalOnly(currentMd, scenario).ms
        }, scenarioConfig.iterations)

        const baselineMeasured = measureMedianValue(() => {
          return runIncrementalOnly(baselineMd, scenario).ms
        }, scenarioConfig.iterations)

        const ratio = currentMeasured.medianMs / baselineMeasured.medianMs
        ratios.push(ratio)

        const currentTailHits = verification.currentStats.tailHits ?? 0
        const baselineTailHits = verification.baselineStats.tailHits ?? 0

        console.log(`\n[${scenarioConfig.name}]`)
        console.log(`  current=${formatMs(currentMeasured.medianMs)} baseline=${formatMs(baselineMeasured.medianMs)} ratio=${ratio.toFixed(3)}`)
        console.log(`  current stats lastMode=${verification.currentStats.lastMode} appendHits=${verification.currentStats.appendHits} tailHits=${currentTailHits}`)
        console.log(`  baseline stats lastMode=${verification.baselineStats.lastMode} appendHits=${verification.baselineStats.appendHits} tailHits=${baselineTailHits}`)
      }
    }

    const summary = summarize(ratios)
    console.log('\nSummary')
    console.log(`  rounds=${rounds}`)
    console.log(`  geometric-mean ratio=${summary.ratio.toFixed(3)} (${summary.delta >= 0 ? '+' : ''}${summary.delta.toFixed(2)}% faster)`)

    if (summary.ratio >= 1) {
      throw new Error(`stream incremental ratio ${summary.ratio.toFixed(3)} is not faster than ${baselineRef}`)
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
