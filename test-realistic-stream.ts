import { describe, expect, it } from 'vitest'
import MarkdownIt from './src/index'

describe('stream parser - realistic scenarios', () => {
  it('should be faster for large documents with incremental updates', () => {
    const mdWithStream = MarkdownIt({ stream: true })
    const mdWithoutStream = MarkdownIt({ stream: false })

    // Build a large base document first
    const largeParagraph = '# Heading\n\nLorem ipsum dolor sit amet.\n\n'
    const baseDoc = largeParagraph.repeat(20) // ~1500 chars

    mdWithStream.stream.parse(baseDoc)
    mdWithoutStream.parse(baseDoc)

    // Now add new content incrementally
    const iterations = 50
    let rolling = baseDoc

    const streamStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      rolling += `## Section ${i}\n\nNew content block ${i}.\n\n`
      mdWithStream.stream.parse(rolling)
    }
    const streamTime = performance.now() - streamStart

    rolling = baseDoc
    const normalStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      rolling += `## Section ${i}\n\nNew content block ${i}.\n\n`
      mdWithoutStream.parse(rolling)
    }
    const normalTime = performance.now() - normalStart

    console.log(`Stream: ${streamTime.toFixed(2)}ms, Without: ${normalTime.toFixed(2)}ms`)
    console.log(`Stream is ${((1 - streamTime / normalTime) * 100).toFixed(1)}% faster`)

    // Stream should be significantly faster for this scenario
    expect(streamTime).toBeLessThan(normalTime * 0.5)
  })

  it('correctness: char-by-char should match reference (even if slow)', () => {
    const mdWithStream = MarkdownIt({ stream: true })
    const longDoc = `# Test\n\nParagraph.\n\n`

    let rolling = ''
    for (const char of longDoc) {
      rolling += char
      const streamTokens = mdWithStream.stream.parse(rolling)
      const referenceTokens = MarkdownIt().parse(rolling)
      expect(streamTokens).toEqual(referenceTokens)
    }
  })
})
