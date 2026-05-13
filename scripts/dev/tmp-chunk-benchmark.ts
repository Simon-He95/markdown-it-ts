import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'
import { chunkedParse, splitIntoChunks } from './src/stream/chunked'

function runCase(name: string, text: string) {
  const md = MarkdownIt({ stream: false })

  // Full parse
  const t1 = performance.now()
  md.parse(text)
  const full = performance.now() - t1

  // Chunked parse - try a few chunk sizes
  const sizes = [5000, 10000, 20000]
  const results: Array<{ size: number, time: number, chunks: number }> = []

  for (const size of sizes) {
    const t2 = performance.now()
    const tokens = chunkedParse(md, text, {}, { maxChunkChars: size, maxChunkLines: Math.round(size / 50), fenceAware: true })
    const time = performance.now() - t2
    const chunks = splitIntoChunks(text, { maxChunkChars: size, maxChunkLines: Math.round(size / 50), fenceAware: true }).length
    // slight use of tokens to avoid dead-code elimination
    if (tokens.length < 0)
      console.log('noop')
    results.push({ size, time, chunks })
  }

  // Stream append-by-paragraph (idealized for appends)
  const mdStream = MarkdownIt({ stream: true })
  const paragraphs = text.split(/\n{2,}/)
  let rolling = ''
  const sStart = performance.now()
  for (const p of paragraphs) {
    rolling += `${p}\n\n`
    mdStream.stream.parse(rolling)
  }
  const stream = performance.now() - sStart

  console.log(`\nCase: ${name}`)
  console.log(`  Full     : ${full.toFixed(2)}ms`)
  for (const r of results) {
    console.log(`  Chunked  : ${r.time.toFixed(2)}ms (size~${r.size}, chunks=${r.chunks})`)
  }
  console.log(`  Stream++ : ${stream.toFixed(2)}ms (append-by-paragraph)\n`)
}

function buildDoc(multiplier: number): string {
  const paragraph = `# Title\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.\n\n- item 1\n- item 2\n- item 3\n\n\`\`\`js\nconsole.log('hello')\n\`\`\`\n\n`
  return paragraph.repeat(multiplier)
}

const docs = [
  { name: 'Small ~5KB', text: buildDoc(10) },
  { name: 'Medium ~10KB', text: buildDoc(20) },
  { name: 'Large ~25KB', text: buildDoc(50) },
  { name: 'XL ~50KB', text: buildDoc(100) },
  { name: 'XXL ~100KB', text: buildDoc(200) },
]

for (const d of docs) runCase(d.name, d.text)
