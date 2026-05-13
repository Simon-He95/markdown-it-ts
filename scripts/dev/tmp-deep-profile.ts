import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'

// Create a larger document to see if benefits emerge at scale
const paragraph = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

`

const bigDoc = paragraph.repeat(20)

console.log('='.repeat(60))
console.log('Large Document Test (20 paragraphs)')
console.log('='.repeat(60))

function testBigDocument() {
  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  const paragraphs = bigDoc.split(/\n{2,}/).filter(p => p.trim())

  console.log(`Total paragraphs: ${paragraphs.length}`)
  console.log(`Total chars: ${bigDoc.length}\n`)

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

  console.log('Results:')
  console.log(`  Stream: ${streamTime.toFixed(2)}ms`)
  console.log(`  Without Stream: ${normalTime.toFixed(2)}ms`)
  console.log(`  Ratio: ${(streamTime / normalTime).toFixed(2)}x`)
  console.log(`\nStream Stats:`)
  console.log(`  Total: ${stats.total}`)
  console.log(`  Cache hits: ${stats.cacheHits}`)
  console.log(`  Append hits: ${stats.appendHits}`)
  console.log(`  Full parses: ${stats.fullParses}`)
  console.log(`\n${streamTime > normalTime ? '❌ Stream is SLOWER' : '✅ Stream is FASTER'}`)

  if (streamTime > normalTime) {
    console.log(`\nStream is ${((streamTime / normalTime - 1) * 100).toFixed(1)}% slower`)
  }
  else {
    console.log(`\nStream is ${((1 - streamTime / normalTime) * 100).toFixed(1)}% faster`)
  }
}

testBigDocument()

console.log(`\n${'='.repeat(60)}`)
console.log('Profiling individual operations')
console.log('='.repeat(60))

// Let's profile what's actually taking time
function profileOperations() {
  const mdWithStream = MarkdownIt({ stream: true })
  mdWithStream.stream.resetStats()

  const p1 = 'First paragraph.\n\n'
  const p2 = `${p1}Second paragraph.\n\n`
  const p3 = `${p2}Third paragraph.\n\n`

  console.log('\nOperation breakdown:')

  let start = performance.now()
  mdWithStream.stream.parse(p1)
  console.log(`1. Parse p1: ${(performance.now() - start).toFixed(4)}ms`)

  start = performance.now()
  mdWithStream.stream.parse(p2)
  console.log(`2. Parse p1+p2: ${(performance.now() - start).toFixed(4)}ms`)

  start = performance.now()
  mdWithStream.stream.parse(p3)
  console.log(`3. Parse p1+p2+p3: ${(performance.now() - start).toFixed(4)}ms`)

  const stats = mdWithStream.stream.stats()
  console.log(`\nStats: ${stats.fullParses} full, ${stats.appendHits} append, ${stats.cacheHits} cache`)

  console.log('\nCompare to direct parsing:')
  const mdNormal = MarkdownIt()

  start = performance.now()
  mdNormal.parse(p1)
  console.log(`1. Parse p1: ${(performance.now() - start).toFixed(4)}ms`)

  start = performance.now()
  mdNormal.parse(p2)
  console.log(`2. Parse p1+p2: ${(performance.now() - start).toFixed(4)}ms`)

  start = performance.now()
  mdNormal.parse(p3)
  console.log(`3. Parse p1+p2+p3: ${(performance.now() - start).toFixed(4)}ms`)
}

profileOperations()
