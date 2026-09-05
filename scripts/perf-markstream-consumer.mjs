import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { FEATURE_STRESS_CORPORA } from './perf-feature-corpora.mjs'

// Inputs are Markstream parser bundles with markdown-it-ts externalized to the
// respective build. See docs/perf-markstream-consumer.md for preparation steps.
const args = process.argv.slice(2)
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const rounds = Number(option('rounds') ?? 5)
const warmups = Number(option('warmups') ?? 2)
const unit = index => `## 分析 ${index}\n\nParagraph **bold**, *emphasis*, \`code\`, 中文，以及 [link](https://example.com/${index}).\n\n- First item\n- Second item with $x+y$\n\n\`\`\`ts\nconst value = ${index}\n\`\`\`\n\n`
const prose = index => `Paragraph ${index} with **bold** and text.\n\n`
const table = index => `| name | value |\n| - | - |\n${Array.from({ length: 200 }, (_, row) => `| row ${row} | ${index + row} |\n`).join('')}\n`
const fence = index => `\`\`\`ts\n${`const value${index} = 42\n`.repeat(250)}\`\`\`\n\n`
let workloads = [
  ...Object.entries({ prose, mixed: unit, fence, table }).map(([name, make]) => ({
    name: `stream-${name}`,
    source: Array.from({ length: Math.ceil(16000 / make(0).length) }, (_, i) => make(i)).join(''),
    chunk: 32,
  })),
  ...[100_000, 1_000_000].map(size => ({
    name: `history-tail-${size}`,
    base: prose(0).repeat(Math.ceil(size / prose(0).length)),
    source: 'Live paragraph'.concat(' with more text'.repeat(30)),
    chunk: 15,
  })),
  ...Object.entries({ mixed: unit, table }).map(([name, make]) => ({
    name: `restore-${name}-100-messages`,
    messages: Array.from({ length: 100 }, (_, i) => make(i).repeat(Math.ceil(3000 / make(i).length))),
  })),
]

if (option('suite') === 'extended') {
  const families = [
    ...FEATURE_STRESS_CORPORA.map(corpus => [corpus.id, () => corpus.makeDocument(2000)]),
    ['math', () => '$$\n\\sum_{i=0}^{10} i^2\n$$\n\nInline $x+y$ and \\(z^2\\).\n\n'],
    ['html', () => '<details>\n<summary>Summary</summary>\n\n**Nested** [link](https://example.com).\n\n</details>\n\n'],
    ['containers', () => '::: warning\nImportant **details**\n\n- item\n- next\n:::\n\n'],
    ['references', () => 'See [reference][id] and note[^1].\n\n[id]: https://example.com\n\n[^1]: Footnote text.\n\n'],
    ['unicode-links', () => '文件名：README.md，股票代码：600000.SH。https://例子.测试/a 和 user@example.com，以及 ~~删除~~ ==高亮==。\n\n'],
    ['long-paragraph', () => 'An unfinished paragraph with **formatting** and 中文 '.repeat(60)],
    ['crlf', () => unit(0).replaceAll('\n', '\r\n')],
  ]
  for (const [name, make] of families) {
    const body = make()
    workloads.push({ name: `family-stream-${name}`, source: body.repeat(Math.ceil(6000 / body.length)), chunk: 97 })
    workloads.push({ name: `family-restore-${name}`, messages: Array.from({ length: 60 }, (_, i) => `Message ${i}\n\n${body.repeat(Math.ceil(2000 / body.length))}`) })
  }
  for (const [name, make] of Object.entries({ mixed: unit, table, fence })) {
    for (const chunk of [1, 8, 128, 512])
      workloads.push({ name: `chunks-${name}-${chunk}`, source: make(0).repeat(Math.ceil(2500 / make(0).length)), chunk })
  }
  for (const [name, options] of [
    ['source-map', { includeSourceMap: true }],
    ['transform', { transform: true }],
    ['no-reuse', { reuseStableTopLevelNodes: false }],
    ['sync', { streamParse: false }],
  ]) {
    workloads.push({ name: `options-${name}`, source: unit(0).repeat(30), chunk: 97, options })
    workloads.push({ name: `options-restore-${name}`, messages: Array.from({ length: 60 }, (_, i) => unit(i).repeat(15)), options })
  }
  const readme = readFileSync(option('readme') ? resolve(option('readme')) : new URL('../README.md', import.meta.url), 'utf8')
  workloads.push({ name: 'real-readme-stream', source: readme, chunk: 211 })
  workloads.push({ name: 'real-readme-restore', messages: Array(10).fill(readme) })
  const base = unit(0).repeat(20)
  workloads.push({ name: 'edits-and-final', updates: [
    [base, false], [base, false], [base + 'Tail **text', false],
    [base + 'Tail **text**', false], [base.replace('分析', 'Changed') + 'Tail', false],
    [base.slice(0, base.length / 2), false], [base, true], [base, true],
  ] })
}
if (option('cases'))
  workloads = workloads.filter(workload => new RegExp(option('cases')).test(workload.name))
assert(workloads.length > 0, 'No matching workloads')
const identityTransform = tokens => tokens

function run(parser, workload, verify = false) {
  const digest = verify ? createHash('sha256') : null
  let wallMs = 0
  let cpuUs = 0
  let commits = 0
  let visits = 0
  const metrics = {}
  const retained = []
  const heapBefore = process.memoryUsage().heapUsed
  const parse = (source, md, final) => {
    const options = { final, reuseStableTopLevelNodes: true, parserMetrics: metrics, ...workload.options }
    if (options.transform)
      options.preTransformTokens = identityTransform
    const startedCpu = process.cpuUsage()
    const start = performance.now()
    const nodes = parser.parseMarkdownToStructure(source, md, options)
    wallMs += performance.now() - start
    const cpu = process.cpuUsage(startedCpu)
    cpuUs += cpu.user + cpu.system
    commits++
    visits += nodes.length
    if (workload.messages)
      retained.push(nodes)
    // Serialization is outside the timed/CPU region and disabled during samples.
    digest?.update(JSON.stringify(nodes))
  }
  let streamStats
  if (workload.updates) {
    const md = parser.getMarkdown('edits')
    for (const [source, final] of workload.updates)
      parse(source, md, final)
  }
  else if (workload.messages) {
    for (const [index, source] of workload.messages.entries()) {
      const start = performance.now()
      const cpu = process.cpuUsage()
      const md = parser.getMarkdown(`history-${index}`)
      wallMs += performance.now() - start
      const created = process.cpuUsage(cpu)
      cpuUs += created.user + created.system
      parse(source, md, true)
    }
  }
  else {
    const md = parser.getMarkdown('stream')
    const base = workload.base ?? ''
    if (base)
      parser.parseMarkdownToStructure(base, md, { final: false, reuseStableTopLevelNodes: true })
    for (let end = workload.chunk; end < workload.source.length + workload.chunk; end += workload.chunk)
      parse(base + workload.source.slice(0, end), md, false)
    streamStats = md.stream.stats()
  }
  return { name: workload.name, wallMs, cpuMs: cpuUs / 1000, heapDeltaBytes: process.memoryUsage().heapUsed - heapBefore, retainedMessages: retained.length, commits, visits, metrics, streamStats, digest: digest?.digest('hex') }
}

if (option('worker')) {
  const parser = await import(pathToFileURL(resolve(option('worker'))).href)
  const verify = args.includes('--verify')
  if (!verify) {
    for (let warmup = 0; warmup < warmups; warmup++) {
      for (const workload of workloads)
        run(parser, workload)
    }
  }
  const results = workloads.map(workload => {
    globalThis.gc?.()
    return run(parser, workload, verify)
  })
  console.log(JSON.stringify(results))
}
else {
  const variants = ['baseline', 'candidate', 'combined'].filter(name => option(name))
  assert(variants.includes('baseline') && variants.includes('candidate'), 'Pass --baseline=<parser.mjs> and --candidate=<parser.mjs>; optionally --combined=<parser.mjs>')
  assert(Number.isInteger(rounds) && rounds > 0, '--rounds must be a positive integer')
  const samples = Object.fromEntries(variants.map(name => [name, []]))
  const script = fileURLToPath(import.meta.url)
  function child(variant, verify) {
    const result = spawnSync(process.execPath, ['--expose-gc', script, `--worker=${resolve(option(variant))}`, `--warmups=${warmups}`, ...args.filter(arg => arg.startsWith('--suite=') || arg.startsWith('--cases=') || arg.startsWith('--readme=')), ...(verify ? ['--verify'] : [])], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const expected = child('baseline', true)
  for (const variant of variants.slice(1)) {
    const actual = child(variant, true)
    assert.deepEqual(actual.map(row => [row.name, row.commits, row.visits, row.digest]), expected.map(row => [row.name, row.commits, row.visits, row.digest]), `${variant}: structured output changed`)
  }
  console.error('Every intermediate structured output matches the baseline.')
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 ? [...variants].reverse() : variants
    for (const variant of order)
      samples[variant].push(child(variant, false))
    console.error(`Round ${round + 1}/${rounds}`)
  }
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
  const summary = workloads.map((workload, index) => {
    const row = { name: workload.name }
    for (const variant of variants) {
      const results = samples[variant].map(round => round[index])
      row[variant] = {
        wallMs: median(results.map(result => result.wallMs)),
        cpuMs: median(results.map(result => result.cpuMs)),
        tokenizeMs: median(results.map(result => result.metrics.tokenizeMs)),
        processTokensMs: median(results.map(result => result.metrics.processTokensMs)),
      }
    }
    return row
  })
  const sha256 = value => createHash('sha256').update(value).digest('hex')
  const report = {
    benchmarkVersion: 2, suite: option('suite') ?? 'default', cases: option('cases'), warmups,
    generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`, cpu: os.cpus()[0]?.model, rounds,
    variants: Object.fromEntries(variants.map(name => [name, resolve(option(name))])),
    bundleHashes: Object.fromEntries(variants.map(name => [name, sha256(readFileSync(resolve(option(name))))])),
    workloadHashes: Object.fromEntries(workloads.map(workload => [workload.name, sha256(JSON.stringify(workload))])),
    parity: true, summary, samples,
  }
  if (option('output'))
    writeFileSync(resolve(option('output')), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(summary, null, 2))
}
