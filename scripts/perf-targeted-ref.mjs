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
const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
const rounds = roundsArg ? Math.max(1, Number.parseInt(roundsArg.split('=')[1], 10) || 1) : 15
const threshold = thresholdArg ? Number.parseFloat(thresholdArg.split('=')[1]) : 0.10

const APP_STEPS = 6

const TARGETS = [
  { kind: 'append', scenario: 'S2', size: 100_000 },
  { kind: 'append', scenario: 'S2', size: 1_000_000 },
  { kind: 'append', scenario: 'S3', size: 1_000_000 },
  { kind: 'one', scenario: 'S5', size: 200_000 },
  { kind: 'render', scenario: 'TS_RENDER', size: 100_000 },
  { kind: 'render', scenario: 'TS_RENDER', size: 1_000_000 },
]

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeParasByChars(targetChars) {
  const paras = []
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    const p = para(i++)
    paras.push(p)
    s += p
  }
  return paras
}

function splitParasIntoSteps(paras, steps) {
  const per = Math.max(1, Math.floor(paras.length / steps))
  const parts = []
  for (let i = 0; i < steps - 1; i++) parts.push(paras.slice(i * per, (i + 1) * per).join(''))
  parts.push(paras.slice((steps - 1) * per).join(''))
  return parts
}

function normalizeAppendPiece(acc, piece) {
  let next = acc
  if (next.length && next.charCodeAt(next.length - 1) !== 0x0A)
    next += '\n'

  let normalizedPiece = piece
  if (normalizedPiece.length && normalizedPiece.charCodeAt(normalizedPiece.length - 1) !== 0x0A)
    normalizedPiece += '\n'

  return next + normalizedPiece
}

function pickIters(size) {
  if (size <= 100_000)
    return { oneIters: 16, appendIters: 3, renderIters: 16 }
  if (size <= 200_000)
    return { oneIters: 10, appendIters: 2, renderIters: 10 }
  if (size <= 500_000)
    return { oneIters: 4, appendIters: 1, renderIters: 4 }
  return { oneIters: 2, appendIters: 1, renderIters: 2 }
}

function createScenario(MarkdownIt, id) {
  switch (id) {
    case 'S2':
      return { md: MarkdownIt({ stream: true, streamChunkedFallback: false }), type: 'stream-cache' }
    case 'S3':
      return {
        md: MarkdownIt({
          stream: true,
          streamChunkedFallback: true,
          streamChunkSizeChars: 10_000,
          streamChunkSizeLines: 200,
          streamChunkFenceAware: true,
        }),
        type: 'stream-hybrid',
      }
    case 'S5':
      return { md: MarkdownIt({ stream: false }), type: 'full-plain' }
    case 'TS_RENDER':
      return { md: MarkdownIt(), type: 'render' }
    default:
      throw new Error(`Unknown targeted scenario ${id}`)
  }
}

function resetScenario(entry) {
  if (entry.type.startsWith('stream'))
    entry.md.stream.reset()
}

function runParseScenario(entry, input, envStream, envPlain) {
  if (entry.type.startsWith('stream'))
    return entry.md.stream.parse(input, envStream)
  return entry.md.parse(input, envPlain)
}

function measureAverage(fn, iters, warmups = 2) {
  for (let i = 0; i < warmups; i++)
    fn()

  const t0 = performance.now()
  for (let i = 0; i < iters; i++)
    fn()
  return (performance.now() - t0) / iters
}

function measureOneShot(MarkdownIt, target, doc) {
  const entry = createScenario(MarkdownIt, target.scenario)
  const envStream = { bench: true }
  const envPlain = { bench: true }
  return measureAverage(() => {
    resetScenario(entry)
    runParseScenario(entry, doc, envStream, envPlain)
  }, pickIters(target.size).oneIters)
}

function measureAppend(MarkdownIt, target, parts) {
  const entry = createScenario(MarkdownIt, target.scenario)
  return measureAverage(() => {
    resetScenario(entry)
    let acc = ''
    const envStream = { bench: true }
    const envPlain = { bench: true }
    for (let i = 0; i < parts.length; i++) {
      acc = normalizeAppendPiece(acc, parts[i])
      runParseScenario(entry, acc, envStream, envPlain)
    }
  }, pickIters(target.size).appendIters, 1)
}

function measureRender(MarkdownIt, target, doc) {
  const entry = createScenario(MarkdownIt, target.scenario)
  return measureAverage(() => {
    entry.md.render(doc)
  }, pickIters(target.size).renderIters)
}

function verifyTarget(CurrentMarkdownIt, BaselineMarkdownIt, target, doc, parts) {
  const currentEntry = createScenario(CurrentMarkdownIt, target.scenario)
  const baselineEntry = createScenario(BaselineMarkdownIt, target.scenario)

  if (target.kind === 'render') {
    const currentHtml = currentEntry.md.render(doc)
    const baselineHtml = baselineEntry.md.render(doc)
    if (currentHtml !== baselineHtml)
      throw new Error(`${targetName(target)} render output mismatch`)
    return { currentStats: null, baselineStats: null }
  }

  const currentEnvStream = {}
  const currentEnvPlain = {}
  const baselineEnvStream = {}
  const baselineEnvPlain = {}
  let currentTokens
  let baselineTokens
  if (target.kind === 'append') {
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      acc = normalizeAppendPiece(acc, parts[i])
      currentTokens = runParseScenario(currentEntry, acc, currentEnvStream, currentEnvPlain)
      baselineTokens = runParseScenario(baselineEntry, acc, baselineEnvStream, baselineEnvPlain)
    }
  }
  else {
    currentTokens = runParseScenario(currentEntry, doc, currentEnvStream, currentEnvPlain)
    baselineTokens = runParseScenario(baselineEntry, doc, baselineEnvStream, baselineEnvPlain)
  }

  const currentEnv = currentEntry.type.startsWith('stream') ? currentEnvStream : currentEnvPlain
  const baselineEnv = baselineEntry.type.startsWith('stream') ? baselineEnvStream : baselineEnvPlain
  const currentHtml = currentEntry.md.renderer.render(currentTokens, currentEntry.md.options, currentEnv)
  const baselineHtml = baselineEntry.md.renderer.render(baselineTokens, baselineEntry.md.options, baselineEnv)
  if (currentHtml !== baselineHtml)
    throw new Error(`${targetName(target)} parse output mismatch`)

  return {
    currentStats: currentEntry.md.stream?.stats?.() ?? null,
    baselineStats: baselineEntry.md.stream?.stats?.() ?? null,
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1)
  return sorted[index]
}

function formatMs(value) {
  return value < 10 ? `${value.toFixed(4)}ms` : `${value.toFixed(2)}ms`
}

function targetName(target) {
  return `${target.scenario} ${target.kind} ${target.size.toLocaleString()}`
}

function formatStats(stats) {
  if (!stats)
    return null

  const tailHits = stats.tailHits ?? 0
  const unboundedAppendHits = stats.unboundedAppendHits ?? 0
  return `mode=${stats.lastMode} append=${stats.appendHits} unboundedAppend=${unboundedAppendHits} tail=${tailHits}`
}

function run(cmd, commandArgs, cwd, extra = {}) {
  const result = spawnSync(cmd, commandArgs, {
    cwd,
    encoding: extra.encoding ?? 'utf8',
    stdio: extra.stdio ?? 'pipe',
    input: extra.input,
    maxBuffer: extra.maxBuffer ?? 512 * 1024 * 1024,
  })

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .map(value => Buffer.isBuffer(value) ? value.toString('utf8') : value)
      .join('\n')
    throw new Error(`${cmd} ${commandArgs.join(' ')} failed in ${cwd}\n${detail}`)
  }

  return result
}

function ensureBuilt(dir) {
  run('pnpm', ['run', 'build'], dir, { stdio: 'inherit' })
}

function setupBaseline(ref) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-it-ts-targeted-baseline-'))
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

function measureTarget(MarkdownIt, target, doc, parts) {
  if (target.kind === 'append')
    return measureAppend(MarkdownIt, target, parts)
  if (target.kind === 'render')
    return measureRender(MarkdownIt, target, doc)
  return measureOneShot(MarkdownIt, target, doc)
}

async function main() {
  console.log(`Building current workspace and baseline ref ${baselineRef}...`)
  ensureBuilt(repoRoot)
  const { tempRoot, archiveDir } = setupBaseline(baselineRef)

  try {
    const [CurrentMarkdownIt, BaselineMarkdownIt] = await Promise.all([
      loadMarkdownIt(repoRoot, `current-targeted-${Date.now()}`),
      loadMarkdownIt(archiveDir, `baseline-targeted-${Date.now()}`),
    ])

    let failures = 0
    for (const target of TARGETS) {
      const paras = makeParasByChars(target.size)
      const doc = paras.join('')
      const parts = splitParasIntoSteps(paras, APP_STEPS)
      const verification = verifyTarget(CurrentMarkdownIt, BaselineMarkdownIt, target, doc, parts)

      const currentSamples = []
      const baselineSamples = []
      for (let round = 0; round < rounds; round++) {
        if (round % 2 === 0) {
          currentSamples.push(measureTarget(CurrentMarkdownIt, target, doc, parts))
          baselineSamples.push(measureTarget(BaselineMarkdownIt, target, doc, parts))
        }
        else {
          baselineSamples.push(measureTarget(BaselineMarkdownIt, target, doc, parts))
          currentSamples.push(measureTarget(CurrentMarkdownIt, target, doc, parts))
        }
      }

      const currentMedian = median(currentSamples)
      const baselineMedian = median(baselineSamples)
      const currentP95 = percentile(currentSamples, 95)
      const baselineP95 = percentile(baselineSamples, 95)
      const ratio = currentMedian / baselineMedian
      const delta = (ratio - 1) * 100
      const regressed = ratio > 1 + threshold

      if (regressed)
        failures += 1

      console.log(`\n[${targetName(target)}] ${regressed ? 'REGRESSION' : 'ok'}`)
      console.log(`  current  median=${formatMs(currentMedian)} p95=${formatMs(currentP95)}`)
      console.log(`  baseline median=${formatMs(baselineMedian)} p95=${formatMs(baselineP95)}`)
      console.log(`  ratio=${ratio.toFixed(3)} delta=${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`)
      const currentStats = formatStats(verification.currentStats)
      const baselineStats = formatStats(verification.baselineStats)
      if (currentStats || baselineStats) {
        console.log(`  current stats: ${currentStats ?? '-'}`)
        console.log(`  baseline stats: ${baselineStats ?? '-'}`)
      }
    }

    if (failures > 0)
      throw new Error(`${failures} targeted perf scenario(s) exceeded ${(threshold * 100).toFixed(1)}% regression threshold`)
  }
  finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nTargeted perf comparison failed: ${error.message}`)
  process.exitCode = 1
})
