import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'

const longDoc = `# Heading

This is a paragraph with some text.

## Subheading

More content here with **bold** and *italic* text.
`

console.log('='.repeat(60))
console.log('Scenario 1: Character-by-character input (worst case)')
console.log('='.repeat(60))

function testCharByChar() {
  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  let rolling = ''

  const streamStart = performance.now()
  for (const char of longDoc) {
    rolling += char
    mdWithStream.stream.parse(rolling)
  }
  const streamTime = performance.now() - streamStart

  rolling = ''
  const normalStart = performance.now()
  for (const char of longDoc) {
    rolling += char
    mdWithoutStream.parse(rolling)
  }
  const normalTime = performance.now() - normalStart

  const stats = mdWithStream.stream.stats()

  console.log(`\nWith Stream: ${streamTime.toFixed(2)}ms`)
  console.log(`Without Stream: ${normalTime.toFixed(2)}ms`)
  console.log(`Ratio: ${(streamTime / normalTime).toFixed(2)}x`)
  console.log(`Cache hits: ${stats.cacheHits}, Append hits: ${stats.appendHits}`)
  console.log(`Result: ${streamTime > normalTime ? '❌ Stream is SLOWER' : '✅ Stream is FASTER'}`)
}

testCharByChar()

console.log(`\n${'='.repeat(60)}`)
console.log('Scenario 2: Line-by-line input (better case)')
console.log('='.repeat(60))

function testLineByLine() {
  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  const lines = longDoc.split('\n')
  let rolling = ''

  const streamStart = performance.now()
  for (const line of lines) {
    rolling += `${line}\n`
    mdWithStream.stream.parse(rolling)
  }
  const streamTime = performance.now() - streamStart

  rolling = ''
  const normalStart = performance.now()
  for (const line of lines) {
    rolling += `${line}\n`
    mdWithoutStream.parse(rolling)
  }
  const normalTime = performance.now() - normalStart

  const stats = mdWithStream.stream.stats()

  console.log(`\nWith Stream: ${streamTime.toFixed(2)}ms`)
  console.log(`Without Stream: ${normalTime.toFixed(2)}ms`)
  console.log(`Ratio: ${(streamTime / normalTime).toFixed(2)}x`)
  console.log(`Cache hits: ${stats.cacheHits}, Append hits: ${stats.appendHits}`)
  console.log(`Result: ${streamTime > normalTime ? '❌ Stream is SLOWER' : '✅ Stream is FASTER'}`)
}

testLineByLine()

console.log(`\n${'='.repeat(60)}`)
console.log('Scenario 3: Paragraph-by-paragraph (best case)')
console.log('='.repeat(60))

function testParagraphByParagraph() {
  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  const paragraphs = longDoc.split('\n\n').filter(p => p.trim())
  let rolling = ''

  const streamStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithStream.stream.parse(rolling)
  }
  const streamTime = performance.now() - streamStart

  rolling = ''
  const normalStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithoutStream.parse(rolling)
  }
  const normalTime = performance.now() - normalStart

  const stats = mdWithStream.stream.stats()

  console.log(`\nWith Stream: ${streamTime.toFixed(2)}ms`)
  console.log(`Without Stream: ${normalTime.toFixed(2)}ms`)
  console.log(`Ratio: ${(streamTime / normalTime).toFixed(2)}x`)
  console.log(`Cache hits: ${stats.cacheHits}, Append hits: ${stats.appendHits}`)
  console.log(`Result: ${streamTime > normalTime ? '❌ Stream is SLOWER' : '✅ Stream is FASTER'}`)
}

testParagraphByParagraph()

console.log(`\n${'='.repeat(60)}`)
console.log('Analysis')
console.log('='.repeat(60))
console.log(`
The stream parser is designed for scenarios where:
1. Content is added in complete blocks (paragraphs/sections)
2. Previous content remains unchanged
3. New content is appended with proper line breaks

It is NOT optimized for:
1. Character-by-character input (like typing in real-time)
2. Small incremental changes
3. Edits in the middle of existing content

The overhead of cache management, condition checking, and token
manipulation makes it slower for scenarios it wasn't designed for.
`)
