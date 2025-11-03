import { describe, expect, it } from 'vitest'
import { State } from '../../src/parse/state'
import { text_join } from '../../src/rules/core/text_join'

describe('core text_join', () => {
  it('joins adjacent text children into single text node', () => {
    const state = new State('')
    state.tokens = [
      {
        type: 'inline',
        children: [
          { type: 'text', content: 'hello', level: 0 },
          { type: 'text', content: ' ', level: 0 },
          { type: 'text', content: 'world', level: 0 },
        ],
        level: 0,
      } as any,
    ]

    text_join(state as any)

    const inline = state.tokens[0] as any
    expect(inline.children.length).toBe(1)
    expect(inline.children[0].type).toBe('text')
    expect(inline.children[0].content).toBe('hello world')
  })
})
