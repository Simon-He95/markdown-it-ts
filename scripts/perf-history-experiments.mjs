import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'

// Experiments only: this does not change the production parser or add a cache API.
if (!isMainThread) {
  const parser = await import(workerData.parserUrl)
  parentPort.on('message', messages => {
    parentPort.postMessage(messages.map((source, index) => parser.parseMarkdownToStructure(source, parser.getMarkdown(`history-${index}`), { final: true })))
  })
  parentPort.postMessage('ready')
}
else {
  const argument = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  assert(argument('parser'), 'Pass --parser=<externalized-markstream-parser.mjs>')
  const parserUrl = pathToFileURL(resolve(argument('parser'))).href
  const parser = await import(parserUrl)
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const unit = '# Answer\n\nText with **bold**, [link](https://example.com) and $x+y$.\n\n| a | b |\n| - | - |\n| one | two |\n\n```ts\nconst n = 1\n```\n\n'
  const results = []
  for (const [count, size] of [[100, 4000], [20, 100000]]) {
    const messages = Array.from({ length: count }, (_, index) => `Message ${index}\n\n${unit.repeat(Math.ceil(size / unit.length))}`)
    const expected = messages.map((source, index) => parser.parseMarkdownToStructure(source, parser.getMarkdown(`history-${index}`), { final: true }))
    const expectedHash = hash(expected)
    const serialized = JSON.stringify(expected)
    const workers = {}
    for (const concurrency of [1, 2, 4]) {
      const started = performance.now()
      workers[concurrency] = await Promise.all(Array.from({ length: concurrency }, () => new Promise((resolveWorker) => {
        const worker = new Worker(new URL(import.meta.url), { workerData: { parserUrl } })
        worker.once('message', () => resolveWorker(worker))
      })))
      results.push({ name: `${count}x${size}-worker-${concurrency}-startup`, wallMs: performance.now() - started })
    }
    const samples = {}
    for (let round = 0; round < 3; round++) {
      for (const mode of round % 2 ? ['clone', 'json', 'worker-4', 'worker-2', 'worker-1', 'sync'] : ['sync', 'worker-1', 'worker-2', 'worker-4', 'json', 'clone']) {
        globalThis.gc?.()
        const cpu = process.cpuUsage()
        const started = performance.now()
        let output
        if (mode === 'sync')
          output = messages.map((source, index) => parser.parseMarkdownToStructure(source, parser.getMarkdown(`history-${index}`), { final: true }))
        else if (mode === 'json')
          output = JSON.parse(serialized)
        else if (mode === 'clone')
          output = structuredClone(expected)
        else {
          const concurrency = Number(mode.slice(7))
          const batchSize = Math.ceil(messages.length / concurrency)
          output = (await Promise.all(workers[concurrency].map((worker, index) => new Promise((resolveBatch) => {
            worker.once('message', resolveBatch)
            worker.postMessage(messages.slice(index * batchSize, (index + 1) * batchSize))
          })))).flat()
        }
        const wallMs = performance.now() - started
        const consumed = process.cpuUsage(cpu)
        assert.equal(hash(output), expectedHash, mode)
        ;(samples[mode] ??= []).push({ wallMs, cpuMs: (consumed.user + consumed.system) / 1000 })
      }
    }
    const median = values => values.sort((a, b) => a - b)[1]
    for (const [mode, values] of Object.entries(samples)) {
      results.push({ name: `${count}x${size}-${mode}`, wallMs: median(values.map(value => value.wallMs)), cpuMs: median(values.map(value => value.cpuMs)), samples: values })
    }
    results.push({ name: `${count}x${size}-serialized-size`, markdownBytes: Buffer.byteLength(messages.join('')), nodesBytes: Buffer.byteLength(serialized) })
    await Promise.all(Object.values(workers).flat().map(worker => worker.terminate()))
  }
  let calls = 0
  const md = parser.getMarkdown('stateful-hook')
  const options = { final: true, postTransformNodes: nodes => [...nodes, { type: 'text', content: String(++calls), raw: '' }] }
  const first = parser.parseMarkdownToStructure('same source', md, options)
  const next = parser.parseMarkdownToStructure('same source', md, options)
  assert.notEqual(hash(first), hash(next))
  const report = { node: process.version, cpu: os.cpus()[0]?.model, defaultOutputParity: true, sourceOnlyCachePreservesStatefulHooks: false, results }
  if (argument('output'))
    writeFileSync(resolve(argument('output')), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}
