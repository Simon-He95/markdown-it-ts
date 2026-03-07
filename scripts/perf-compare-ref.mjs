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

  const archive = run('git', ['archive', '--format=tar', ref], repoRoot, { encoding: 'buffer' })
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

function measureMedian(fn, iterations, rounds = 7) {
  const samples = []
  for (let i = 0; i < rounds; i++)
    samples.push(measureAverage(fn, iterations))
  return { medianMs: median(samples), samples }
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

async function main() {
  console.log(`Building current workspace and baseline ref ${baselineRef}...`)
  ensureBuilt(repoRoot)
  const { tempRoot, archiveDir } = setupBaseline(baselineRef)

  try {
    const [CurrentMarkdownIt, BaselineMarkdownIt] = await Promise.all([
      loadMarkdownIt(repoRoot, `current-${Date.now()}`),
      loadMarkdownIt(archiveDir, `baseline-${Date.now()}`),
    ])

    const parseRatios = []
    const renderRatios = []

    for (let round = 0; round < rounds; round++) {
      if (rounds > 1)
        console.log(`\nRound ${round + 1}/${rounds}`)

      for (const scenario of SCENARIOS) {
        const currentMd = CurrentMarkdownIt()
        const baselineMd = BaselineMarkdownIt()
        const currentHtml = currentMd.render(scenario.input)
        const baselineHtml = baselineMd.render(scenario.input)

        if (currentHtml !== baselineHtml) {
          throw new Error(`Output mismatch for scenario ${scenario.name}`)
        }

        const currentParse = measureMedian(() => {
          currentMd.parse(scenario.input, {})
        }, scenario.parseIterations)
        const baselineParse = measureMedian(() => {
          baselineMd.parse(scenario.input, {})
        }, scenario.parseIterations)
        const parseRatio = currentParse.medianMs / baselineParse.medianMs
        parseRatios.push(parseRatio)

        const currentTokens = currentMd.parse(scenario.input, {})
        const baselineTokens = baselineMd.parse(scenario.input, {})

        const currentRender = measureMedian(() => {
          currentMd.renderer.render(currentTokens, currentMd.options, {})
        }, scenario.renderIterations)
        const baselineRender = measureMedian(() => {
          baselineMd.renderer.render(baselineTokens, baselineMd.options, {})
        }, scenario.renderIterations)
        const renderRatio = currentRender.medianMs / baselineRender.medianMs
        renderRatios.push(renderRatio)

        console.log(`\n[${scenario.name}]`)
        console.log(`  parse  current=${formatMs(currentParse.medianMs)} baseline=${formatMs(baselineParse.medianMs)} ratio=${parseRatio.toFixed(3)}`)
        console.log(`  render current=${formatMs(currentRender.medianMs)} baseline=${formatMs(baselineRender.medianMs)} ratio=${renderRatio.toFixed(3)}`)
      }
    }

    const parseSummary = summarize(parseRatios)
    const renderSummary = summarize(renderRatios)

    console.log('\nSummary')
    console.log(`  rounds=${rounds}`)
    console.log(`  parse  geometric-mean ratio=${parseSummary.ratio.toFixed(3)} (${parseSummary.delta >= 0 ? '+' : ''}${parseSummary.delta.toFixed(2)}% faster)`)
    console.log(`  render geometric-mean ratio=${renderSummary.ratio.toFixed(3)} (${renderSummary.delta >= 0 ? '+' : ''}${renderSummary.delta.toFixed(2)}% faster)`)

    const parsePass = parseSummary.ratio < 1
    const renderPass = renderSummary.ratio < 1

    if (!parsePass || !renderPass) {
      const failures = [
        !parsePass ? `parse ratio ${parseSummary.ratio.toFixed(3)} is not faster than ${baselineRef}` : null,
        !renderPass ? `render ratio ${renderSummary.ratio.toFixed(3)} is not faster than ${baselineRef}` : null,
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
