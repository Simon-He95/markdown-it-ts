import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'

const longDoc = `# Heading

This is a paragraph with some text.

## Subheading

More content here with **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log('Hello world')
\`\`\`

Another paragraph after code block.
`

function testStreamPerformance() {
  const mdWithStream = MarkdownIt({ stream: true })
  mdWithStream.stream.resetStats()

  let rolling = ''
  const start = performance.now()

  for (const char of longDoc) {
    rolling += char
    mdWithStream.stream.parse(rolling)
  }

  const streamTime = performance.now() - start
  const stats = mdWithStream.stream.stats()

  console.log('Stream Performance:')
  console.log(`  Time: ${streamTime.toFixed(2)}ms`)
  console.log(`  Total parses: ${stats.total}`)
  console.log(`  Cache hits: ${stats.cacheHits}`)
  console.log(`  Append hits: ${stats.appendHits}`)
  console.log(`  Full parses: ${stats.fullParses}`)
  console.log(`  Cache hit rate: ${((stats.cacheHits / stats.total) * 100).toFixed(1)}%`)
  console.log(`  Append hit rate: ${((stats.appendHits / stats.total) * 100).toFixed(1)}%`)

  return streamTime
}

function testWithoutStreamPerformance() {
  const mdWithoutStream = MarkdownIt({ stream: false })

  let rolling = ''
  const start = performance.now()

  for (const char of longDoc) {
    rolling += char
    mdWithoutStream.parse(rolling)
  }

  const normalTime = performance.now() - start

  console.log('\nWithout Stream Performance:')
  console.log(`  Time: ${normalTime.toFixed(2)}ms`)
  console.log(`  Total parses: ${longDoc.length}`)

  return normalTime
}

console.log(`Testing with document of ${longDoc.length} characters\n`)
console.log('='.repeat(50))

const streamTime = testStreamPerformance()
const normalTime = testWithoutStreamPerformance()

console.log(`\n${'='.repeat(50)}`)
console.log('\nComparison:')
console.log(`  Stream: ${streamTime.toFixed(2)}ms`)
console.log(`  Without Stream: ${normalTime.toFixed(2)}ms`)
console.log(`  Ratio: ${(streamTime / normalTime).toFixed(2)}x`)
console.log(`  ${streamTime > normalTime ? '❌ Stream is SLOWER' : '✅ Stream is FASTER'}`)
