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

const FIXTURE_DIR = path.join(repoRoot, 'test', 'fixtures')

const SCENARIOS = [
  {
    name: 'parse-emphasis-heavy',
    input: readFixture('inline-em-worst.md').repeat(4),
    parseIterations: 1800,
    renderIterations: 240,
  },
  {
    name: 'parse-escaped-punct',
    input: Array.from({ length: 3500 }, (_, i) => `chunk-${i}\\! value _x_ ~~y~~`).join(' '),
    parseIterations: 180,
    renderIterations: 90,
  },
  {
    name: 'render-mixed-blocks',
    input: readFixture('lorem1.txt').repeat(8),
    parseIterations: 120,
    renderIterations: 48,
  },
  {
    name: 'render-fences',
    input: Array.from({ length: 220 }, (_, i) => `\`\`\`ts data-id=${i}\nconst value = ${i}\nconsole.log(value)\n\`\`\``).join('\n\n'),
    parseIterations: 90,
    renderIterations: 90,
  },
]

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8')
}

function run(cmd, args, cwd, extra = {}) {
  const result = spawnSync(cmd, args, {
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
    throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}\n${detail}`)
  }

  return result
}

function ensureBuilt(dir) {
  run('pnpm', ['run', 'build'], dir, { stdio: 'inherit' })
}

function setupBaseline(ref) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-it-ts-baseline-'))
  const archiveDir = path.join(tempRoot, 'repo')
  fs.mkdirSync(archiveDir)

  const archive = run('git', ['archive', '--format=tar', ref], repoRoot, { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 })
  run('tar', ['-xf', '-', '-C', archiveDir], repoRoot, { input: archive.stdout })

  const repoNodeModules = path.join(repoRoot, 'node_modules')
  if (fs.existsSync(repoNodeModules)) {
    fs.symlinkSync(repoNodeModules, path.join(archiveDir, 'node_modules'), 'dir')
  }

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

function measureAverage(fn, iterations, warmups = 4) {
  for (let i = 0; i < warmups; i++)
    fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++)
    fn()
  return (performance.now() - start) / iterations
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
      currentMs = measureAverage(currentFn, iterations, 0)
      baselineMs = measureAverage(baselineFn, iterations, 0)
    }
    else {
      baselineMs = measureAverage(baselineFn, iterations, 0)
      currentMs = measureAverage(currentFn, iterations, 0)
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

async function main() {
  console.log(`Building current workspace and baseline ref ${baselineRef}...`)
  ensureBuilt(repoRoot)
  const { tempRoot, archiveDir } = setupBaseline(baselineRef)

  try {
    const [CurrentMarkdownIt, BaselineMarkdownIt] = await Promise.all([
      loadMarkdownIt(repoRoot, `current-${Date.now()}`),
      loadMarkdownIt(archiveDir, `baseline-${Date.now()}`),
    ])

    const parseRatiosByScenario = new Map(SCENARIOS.map(scenario => [scenario.name, []]))
    const renderRatiosByScenario = new Map(SCENARIOS.map(scenario => [scenario.name, []]))

    for (let round = 0; round < rounds; round++) {
      if (rounds > 1)
        console.log(`\nRound ${round + 1}/${rounds}`)

      for (let scenarioIndex = 0; scenarioIndex < SCENARIOS.length; scenarioIndex++) {
        const scenario = SCENARIOS[scenarioIndex]
        const currentMd = CurrentMarkdownIt()
        const baselineMd = BaselineMarkdownIt()
        const currentHtml = currentMd.render(scenario.input)
        const baselineHtml = baselineMd.render(scenario.input)

        if (currentHtml !== baselineHtml) {
          throw new Error(`Output mismatch for scenario ${scenario.name}`)
        }

        const parseMeasured = measurePaired(
          () => currentMd.parse(scenario.input, {}),
          () => baselineMd.parse(scenario.input, {}),
          scenario.parseIterations,
          (round + scenarioIndex) % 2 === 0,
        )
        parseRatiosByScenario.get(scenario.name).push(parseMeasured.ratio)

        const currentTokens = currentMd.parse(scenario.input, {})
        const baselineTokens = baselineMd.parse(scenario.input, {})

        const renderMeasured = measurePaired(
          () => currentMd.renderer.render(currentTokens, currentMd.options, {}),
          () => baselineMd.renderer.render(baselineTokens, baselineMd.options, {}),
          scenario.renderIterations,
          (round + scenarioIndex + 1) % 2 === 0,
        )
        renderRatiosByScenario.get(scenario.name).push(renderMeasured.ratio)

        console.log(`\n[${scenario.name}]`)
        console.log(`  parse  current=${formatMs(parseMeasured.currentMedianMs)} baseline=${formatMs(parseMeasured.baselineMedianMs)} paired-ratio=${parseMeasured.ratio.toFixed(3)}`)
        console.log(`  render current=${formatMs(renderMeasured.currentMedianMs)} baseline=${formatMs(renderMeasured.baselineMedianMs)} paired-ratio=${renderMeasured.ratio.toFixed(3)}`)
      }
    }

    const parseScenarioRatios = new Map([...parseRatiosByScenario].map(([name, values]) => [name, median(values)]))
    const renderScenarioRatios = new Map([...renderRatiosByScenario].map(([name, values]) => [name, median(values)]))
    const parseSummary = summarize([...parseScenarioRatios.values()])
    const renderSummary = summarize([...renderScenarioRatios.values()])
    const scenarioFailures = [
      ...[...parseScenarioRatios].filter(([, ratio]) => ratio > 1 + scenarioThreshold).map(([name, ratio]) => `parse ${name}=${ratio.toFixed(3)}`),
      ...[...renderScenarioRatios].filter(([, ratio]) => ratio > 1 + scenarioThreshold).map(([name, ratio]) => `render ${name}=${ratio.toFixed(3)}`),
    ]

    console.log('\nSummary')
    console.log(`  rounds=${rounds}`)
    console.log(`  parse  geometric-mean of per-scenario median ratios=${parseSummary.ratio.toFixed(3)} (${formatChange(parseSummary.ratio)})`)
    console.log(`  render geometric-mean of per-scenario median ratios=${renderSummary.ratio.toFixed(3)} (${formatChange(renderSummary.ratio)})`)
    console.log(`  regression threshold=+${(threshold * 100).toFixed(1)}%`)
    console.log(`  per-scenario regression threshold=+${(scenarioThreshold * 100).toFixed(1)}%`)

    const parsePass = parseSummary.ratio <= 1 + threshold
    const renderPass = renderSummary.ratio <= 1 + threshold

    if (!parsePass || !renderPass || scenarioFailures.length > 0) {
      const failures = [
        !parsePass ? `parse ratio ${parseSummary.ratio.toFixed(3)} regressed beyond +${(threshold * 100).toFixed(1)}% vs ${baselineRef}` : null,
        !renderPass ? `render ratio ${renderSummary.ratio.toFixed(3)} regressed beyond +${(threshold * 100).toFixed(1)}% vs ${baselineRef}` : null,
        scenarioFailures.length > 0 ? `per-scenario regressions beyond +${(scenarioThreshold * 100).toFixed(1)}%: ${scenarioFailures.join(', ')}` : null,
      ].filter(Boolean)
      throw new Error(failures.join('; '))
    }
  }
  finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nPerf comparison failed: ${error.message}`)
  process.exitCode = 1
})
