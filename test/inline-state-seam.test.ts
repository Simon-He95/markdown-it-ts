import { describe, expect, it } from 'vitest'
import markdownit from '../src/index'

// markdown-it exposes the inline state class as a public member
// (`ParserInline.prototype.State = StateInline`, constructed with `new this.State(...)`,
// and typed as `State: typeof StateInline` in @types/markdown-it). Plugins rely on it to
// subclass the inline state — markdown-it-cjk-friendly swaps `scanDelims`, others override
// `pushPending`/`push` or `tokenize` — so it has to exist and actually be used.
describe('md.inline.State seam', () => {
  it('exposes the inline state class like markdown-it does', () => {
    const md = markdownit() as any

    expect(typeof md.inline.State).toBe('function')

    const state = new md.inline.State('text', md, {}, [])
    expect(state).toBeInstanceOf(md.inline.State)
    expect(typeof state.scanDelims).toBe('function')
  })

  it('honours a scanDelims override from a State subclass', () => {
    const md = markdownit() as any

    class ForceDelimitersState extends md.inline.State {
      public scanDelims(start: number, _canSplitWord: boolean) {
        const marker = this.src.charCodeAt(start)
        let pos = start
        while (pos < this.posMax && this.src.charCodeAt(pos) === marker)
          pos++
        return { can_open: true, can_close: true, length: pos - start }
      }
    }

    md.inline.State = ForceDelimitersState

    // Both cases stay literal under the stock flanking rules (`。`/`「` are punctuation),
    // so they only pair when the override is actually consulted.
    expect(md.render('说明**「A」**。')).toBe('<p>说明<strong>「A」</strong>。</p>\n')
    expect(md.render('说明~~「A」~~。')).toBe('<p>说明<s>「A」</s>。</p>\n')
  })

  it('does not let the plain-text fast path skip a replaced State', () => {
    const md = markdownit() as any

    class TaggingState extends md.inline.State {
      public pushPending() {
        const token = super.pushPending()
        token.meta = { viaState: true }
        return token
      }
    }

    md.inline.State = TaggingState

    const tokens = md.parse('plain text without punctuation', {})
    const inline = tokens.find((token: any) => token.type === 'inline')

    expect(inline.children).toHaveLength(1)
    expect(inline.children[0]).toMatchObject({ type: 'text', content: 'plain text without punctuation' })
    expect(inline.children[0].meta).toEqual({ viaState: true })
  })

  it('keeps the default fast paths for an untouched instance', () => {
    const md = markdownit() as any

    expect(md.inline.State).toBe(markdownit().inline.State)
    expect(md.render('说明**「A」**。')).toBe('<p>说明**「A」**。</p>\n')
  })
})
