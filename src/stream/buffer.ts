import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'

/**
 * Accumulates input and calls stream.parse at safe block boundaries.
 *
 * @experimental This helper is intended for append-heavy editing flows and is
 * not part of the markdown-it compatibility surface.
 */
export class StreamBuffer {
  private md: MarkdownIt
  private text = ''
  private lastFlushedLength = 0

  constructor(md: MarkdownIt) {
    this.md = md
    if (!this.md.stream)
      throw new Error('StreamBuffer requires a MarkdownIt instance')
  }

  // Append new input (characters or chunks)
  feed(chunk: string): void {
    if (!chunk)
      return
    this.text += chunk
  }

  // Try flush if we are at a safe block boundary that the stream fast-path supports
  // Returns latest tokens if flushed, else null.
  flushIfBoundary(): Token[] | null {
    // If stream disabled, just full-parse and mark flushed
    if (!this.md.stream.enabled) {
      const tokens = this.md.parse(this.text)
      this.lastFlushedLength = this.text.length
      return tokens
    }

    const prevLen = this.lastFlushedLength
    const totalLen = this.text.length
    if (totalLen <= prevLen)
      return null

    const prev = this.text.slice(0, prevLen)
    const segment = this.text.slice(prevLen)

    // If nothing flushed yet, allow first flush when current buffer
    // ends with a newline to establish a clean baseline.
    if (prevLen === 0) {
      if (segment.charCodeAt(segment.length - 1) !== 0x0A)
        return null
      const tokens = this.md.stream.parse(this.text)
      this.lastFlushedLength = this.text.length
      return tokens
    }

    // Safe boundary rules matching StreamParser.getAppendedSegment:
    // - prev must end with newline
    // - appended must end with newline and contain at least two newlines
    if (!prev || prev.charCodeAt(prev.length - 1) !== 0x0A)
      return null

    if (segment.charCodeAt(segment.length - 1) !== 0x0A)
      return null

    let newlineCount = 0
    for (let i = 0; i < segment.length && newlineCount < 2; i++) {
      if (segment.charCodeAt(i) === 0x0A)
        newlineCount++
    }
    if (newlineCount < 2)
      return null

    const tokens = this.md.stream.parse(this.text)
    this.lastFlushedLength = this.text.length
    return tokens
  }

  // Force flush regardless of boundary; ensures final state is parsed
  flushForce(): Token[] {
    const tokens = this.md.stream.parse(this.text)
    this.lastFlushedLength = this.text.length
    return tokens
  }

  // Accessors
  getText(): string { return this.text }
  getTokens(): Token[] { return this.md.stream.peek() }
  stats() { return this.md.stream.stats() }
}
