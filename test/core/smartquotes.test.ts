import { describe, expect, it } from 'vitest'
import { State } from '../../src/parse/state'
import { smartquotes } from '../../src/rules/core/smartquotes'

describe('core smartquotes', () => {
  it('converts straight quotes to typographic quotes across children', () => {
    const state = new State('')
    state.tokens = [
      {
        type: 'inline',
        children: [
          { type: 'text', content: 'She said "Hello', level: 0 },
          { type: 'text', content: ' world" and', level: 0 },
          { type: 'text', content: ' it\'s fine', level: 0 },
        ],
        level: 0,
      } as any,
    ]

    smartquotes(state as any)

    const inline = state.tokens[0] as any
    expect(inline.children.map((c: any) => c.content).join('')).toBe(
      'She said “Hello world” and it‘s fine',
    )
  })
})
