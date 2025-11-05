import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'

/**
 * Debounced stream parser wrapper for real-time editing scenarios.
 *
 * When user types character-by-character, it's inefficient to parse on every keystroke.
 * This wrapper debounces parse calls to balance responsiveness and performance.
 *
 * @example
 * ```typescript
 * const md = MarkdownIt({ stream: true })
 * const debouncedParser = new DebouncedStreamParser(md, 100) // 100ms debounce
 *
 * editor.on('change', (text) => {
 *   debouncedParser.parse(text, (tokens) => {
 *     // Render tokens
 *     renderMarkdown(tokens)
 *   })
 * })
 * ```
 */
export class DebouncedStreamParser {
  private md: MarkdownIt
  private debounceMs: number
  private timeoutId: NodeJS.Timeout | null = null
  private pendingCallback: ((tokens: Token[]) => void) | null = null
  private lastText: string = ''
  private lastTokens: Token[] = []

  /**
   * @param md - MarkdownIt instance with stream enabled
   * @param debounceMs - Milliseconds to wait before parsing (default: 150ms)
   */
  constructor(md: MarkdownIt, debounceMs = 150) {
    this.md = md
    this.debounceMs = debounceMs
  }

  /**
   * Parse text with debouncing. Callback is called with the parsed tokens.
   *
   * @param text - Markdown text to parse
   * @param callback - Called with tokens when parsing completes
   * @param immediate - If true, parse immediately without debouncing
   */
  parse(text: string, callback: (tokens: Token[]) => void, immediate = false): void {
    // If text hasn't changed, return cached tokens immediately
    if (text === this.lastText) {
      callback(this.lastTokens)
      return
    }

    this.pendingCallback = callback

    if (immediate) {
      this.executeParse(text)
      return
    }

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    // Set new timeout
    this.timeoutId = setTimeout(() => {
      this.executeParse(text)
    }, this.debounceMs)
  }

  /**
   * Cancel any pending parse operation
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.pendingCallback = null
  }

  /**
   * Force immediate parse, bypassing debounce
   */
  flush(text: string): Token[] {
    this.cancel()
    this.executeParse(text)
    return this.lastTokens
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.cancel()
    this.md.stream.reset()
    this.lastText = ''
    this.lastTokens = []
  }

  private executeParse(text: string): void {
    this.lastText = text
    this.lastTokens = this.md.stream.parse(text)

    if (this.pendingCallback) {
      this.pendingCallback(this.lastTokens)
      this.pendingCallback = null
    }

    this.timeoutId = null
  }

  /**
   * Get parser statistics
   */
  getStats() {
    return this.md.stream.stats()
  }
}

/**
 * Throttled stream parser wrapper - limits parse frequency.
 * Unlike debouncing, throttling ensures parsing happens at regular intervals
 * even during continuous typing.
 *
 * @example
 * ```typescript
 * const md = MarkdownIt({ stream: true })
 * const throttledParser = new ThrottledStreamParser(md, 200) // Parse at most every 200ms
 *
 * editor.on('change', (text) => {
 *   throttledParser.parse(text, (tokens) => {
 *     renderMarkdown(tokens)
 *   })
 * })
 * ```
 */
export class ThrottledStreamParser {
  private md: MarkdownIt
  private throttleMs: number
  private lastParseTime = 0
  private timeoutId: NodeJS.Timeout | null = null
  private pendingText: string | null = null
  private pendingCallback: ((tokens: Token[]) => void) | null = null
  private lastTokens: Token[] = []

  constructor(md: MarkdownIt, throttleMs = 200) {
    this.md = md
    this.throttleMs = throttleMs
  }

  parse(text: string, callback: (tokens: Token[]) => void): void {
    const now = Date.now()
    const timeSinceLastParse = now - this.lastParseTime

    // If enough time has passed, parse immediately
    if (timeSinceLastParse >= this.throttleMs) {
      this.executeParse(text, callback)
      return
    }

    // Otherwise, schedule parse for later
    this.pendingText = text
    this.pendingCallback = callback

    if (!this.timeoutId) {
      const remainingTime = this.throttleMs - timeSinceLastParse
      this.timeoutId = setTimeout(() => {
        if (this.pendingText && this.pendingCallback) {
          this.executeParse(this.pendingText, this.pendingCallback)
        }
        this.timeoutId = null
        this.pendingText = null
        this.pendingCallback = null
      }, remainingTime)
    }
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.pendingText = null
    this.pendingCallback = null
  }

  reset(): void {
    this.cancel()
    this.md.stream.reset()
    this.lastParseTime = 0
    this.lastTokens = []
  }

  private executeParse(text: string, callback: (tokens: Token[]) => void): void {
    this.lastParseTime = Date.now()
    this.lastTokens = this.md.stream.parse(text)
    callback(this.lastTokens)
  }

  getStats() {
    return this.md.stream.stats()
  }
}
