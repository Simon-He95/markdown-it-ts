import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'

console.log('='.repeat(70))
console.log('Testing Stream Parser with Different Document Sizes')
console.log('='.repeat(70))

const paragraph = `# Section Header

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

## Subsection

More content with **bold** and *italic* text. Here's a list:

- Item one
- Item two  
- Item three

\`\`\`javascript
function example() {
  return "code block"
}
\`\`\`

Another paragraph with [a link](https://example.com) and more text.

`

function testWithSize(multiplier: number) {
  const doc = paragraph.repeat(multiplier)
  const paragraphs = doc.split(/\n{2,}/).filter(p => p.trim())

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`Document: ${multiplier}x paragraphs (${doc.length} chars, ${paragraphs.length} blocks)`)
  console.log('─'.repeat(70))

  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  // Warm up
  mdWithStream.stream.parse(doc.slice(0, 100))
  mdWithoutStream.parse(doc.slice(0, 100))

  // Test stream
  let rolling = ''
  const streamStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithStream.stream.parse(rolling)
  }
  const streamTime = performance.now() - streamStart

  // Test without stream
  rolling = ''
  const normalStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithoutStream.parse(rolling)
  }
  const normalTime = performance.now() - normalStart

  const stats = mdWithStream.stream.stats()
  const ratio = streamTime / normalTime
  const improvement = (1 - ratio) * 100

  console.log(`Stream:        ${streamTime.toFixed(2)}ms`)
  console.log(`Without:       ${normalTime.toFixed(2)}ms`)
  console.log(`Ratio:         ${ratio.toFixed(2)}x`)
  console.log(`Stats:         ${stats.appendHits} append, ${stats.fullParses} full`)

  if (ratio < 1) {
    console.log(`✅ Stream is ${improvement.toFixed(1)}% FASTER`)
  }
  else {
    console.log(`❌ Stream is ${((ratio - 1) * 100).toFixed(1)}% SLOWER`)
  }

  return { streamTime, normalTime, ratio, stats }
}

// Test with increasing document sizes
const results = [
  testWithSize(1), // ~300 chars
  testWithSize(3), // ~900 chars
  testWithSize(5), // ~1500 chars
  testWithSize(10), // ~3000 chars
  testWithSize(20), // ~6000 chars
  testWithSize(50), // ~15000 chars
]

console.log(`\n${'='.repeat(70)}`)
console.log('Summary')
console.log('='.repeat(70))

const breakEvenPoint = results.find(r => r.ratio < 1)
if (breakEvenPoint) {
  console.log(`✅ Stream becomes faster at around ${breakEvenPoint.stats.total} blocks`)
}
else {
  console.log(`❌ Stream never becomes faster in these tests`)
}

console.log('\n📊 Trend:')
results.forEach((r, i) => {
  const size = [1, 3, 5, 10, 20, 50][i]
  const bar = '█'.repeat(Math.max(1, Math.round(r.ratio * 10)))
  console.log(`  ${size}x:  ${bar} ${r.ratio.toFixed(2)}x`)
})
