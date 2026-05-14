import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { chunkedParse, EditableBuffer } from '../../src/experimental'
import { getKnownGlobalMarkdownState } from '../../src/parse/global_state'
import { parseStringUnbounded } from '../../src/stream/unbounded'

const srcWithReference = '[x][ref]\n\n[ref]: https://old.example\n'

describe('global markdown state cleanup on parse errors', () => {
  it('cleans env marker when chunked fallback parse throws', () => {
    const md = markdownit()

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    const env: Record<string, any> = {}

    expect(() => {
      chunkedParse(md, srcWithReference, env, {
        maxChunkChars: 10,
        maxChunkLines: 1,
      })
    }).toThrow('boom')

    expect(getKnownGlobalMarkdownState(env)).toBeNull()
  })

  it('cleans env marker when chunked global-state parsing throws', () => {
    const md = markdownit()

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    const env: Record<string, any> = {}

    expect(() => {
      chunkedParse(md, srcWithReference, env, {
        maxChunkChars: 10,
        maxChunkLines: 1,
        fallbackOnGlobalState: false,
      })
    }).toThrow('boom')

    expect(getKnownGlobalMarkdownState(env)).toBeNull()
  })

  it('cleans env marker when unbounded fallback parse throws', () => {
    const md = markdownit()

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    const env: Record<string, any> = {}

    expect(() => {
      parseStringUnbounded(md, srcWithReference, env, {
        maxChunkChars: 10,
        maxChunkLines: 1,
      })
    }).toThrow('boom')

    expect(getKnownGlobalMarkdownState(env)).toBeNull()
  })

  it('cleans env marker when unbounded global-state parsing throws', () => {
    const md = markdownit()

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    const env: Record<string, any> = {}

    expect(() => {
      parseStringUnbounded(md, srcWithReference, env, {
        maxChunkChars: 10,
        maxChunkLines: 1,
        fallbackOnGlobalState: false,
      })
    }).toThrow('boom')

    expect(getKnownGlobalMarkdownState(env)).toBeNull()
  })

  it('cleans env marker when editable full parse throws', () => {
    const md = markdownit()

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    const env: Record<string, any> = {}
    const buffer = new EditableBuffer(md, srcWithReference)

    expect(() => {
      buffer.parse(env)
    }).toThrow('boom')

    expect(getKnownGlobalMarkdownState(env)).toBeNull()
  })

  it('does not leak stale references into the next successful parse after an error', () => {
    const md = markdownit()
    const env: Record<string, any> = {}

    md.core.ruler.before('inline', 'throwing_rule', () => {
      throw new Error('boom')
    })

    expect(() => {
      chunkedParse(md, srcWithReference, env, {
        maxChunkChars: 10,
        maxChunkLines: 1,
      })
    }).toThrow('boom')

    md.core.ruler.disable('throwing_rule', true)

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })
})
