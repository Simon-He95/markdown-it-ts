import { performance } from 'node:perf_hooks'
import MarkdownIt from '../dist/index.js'
import { createDeltaStream, StreamBuffer } from '../dist/experimental.js'

function makeDoc(repeats) {
  let out = ''
  for (let i = 0; i < repeats; i++) {
    out += `Paragraph ${i} with **bold** text and inline code.\n\n`
    if (i % 12 === 0) {
      out += '```ts\n'
      out += `const value${i} = ${i}\n`
      out += '```\n\n'
    }
  }
  return out
}

function splitDeltas(src, size) {
  const chunks = []
  for (let i = 0; i < src.length; i += size)
    chunks.push(src.slice(i, i + size))
  return chunks
}

function timeScenario(name, run) {
  const samples = []
  const start = performance.now()
  const result = run((sample) => samples.push(sample))
  const totalMs = performance.now() - start
  samples.sort((a, b) => a - b)
  const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0
  return {
    scenario: name,
    totalMs,
    p50ChunkMs: p50,
    p95ChunkMs: p95,
    maxChunkMs: samples[samples.length - 1] ?? 0,
    ...result,
  }
}

const src = makeDoc(800)
const deltas = splitDeltas(src, 48)

const results = [
  timeScenario('full-render-growing-string', (sample) => {
    const md = MarkdownIt()
    let text = ''
    for (const delta of deltas) {
      text += delta
      const start = performance.now()
      md.render(text)
      sample(performance.now() - start)
    }
    return {}
  }),
  timeScenario('stream-buffer-boundary', (sample) => {
    const md = MarkdownIt({ stream: true })
    const buffer = new StreamBuffer(md)
    for (const delta of deltas) {
      buffer.feed(delta)
      const start = performance.now()
      buffer.flushIfBoundary()
      sample(performance.now() - start)
    }
    const start = performance.now()
    buffer.flushForce()
    sample(performance.now() - start)
    return md.stream.stats()
  }),
  timeScenario('stream-parse-growing-string', (sample) => {
    const md = MarkdownIt({ stream: true })
    let text = ''
    for (const delta of deltas) {
      text += delta
      const start = performance.now()
      md.stream.parse(text)
      sample(performance.now() - start)
    }
    return md.stream.stats()
  }),
  timeScenario('delta-native', (sample) => {
    const md = MarkdownIt({ stream: true })
    const stream = createDeltaStream(md)
    for (const delta of deltas) {
      const start = performance.now()
      stream.feed(delta)
      sample(performance.now() - start)
    }
    const start = performance.now()
    stream.flush({ final: true })
    sample(performance.now() - start)
    return stream.stats()
  }),
]

console.log(JSON.stringify({
  chars: src.length,
  deltas: deltas.length,
  results,
}, null, 2))
