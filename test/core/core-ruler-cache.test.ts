import { describe, expect, it, vi } from 'vitest'
import MarkdownIt from '../../src'

describe('core ruler cache invalidation', () => {
  it('uses core rules added after the first parse', () => {
    const md = MarkdownIt()

    md.parse('before')

    const env: Record<string, unknown> = {}

    md.core.ruler.after('inline', 'late_core_rule', (state: any) => {
      state.env.lateCoreRuleRan = true
    })

    md.parse('after', env)

    expect(env.lateCoreRuleRan).toBe(true)
  })

  it('uses replaced, disabled, and re-enabled core rules after warm cache', () => {
    const md = MarkdownIt()

    md.parse('warm cache')

    md.core.ruler.after('inline', 'mutable_core_rule', (state: any) => {
      state.env.marker = 'initial'
    })

    const env1: Record<string, unknown> = {}
    md.parse('first', env1)
    expect(env1.marker).toBe('initial')

    md.core.ruler.at('mutable_core_rule', (state: any) => {
      state.env.marker = 'replaced'
    })

    const env2: Record<string, unknown> = {}
    md.parse('second', env2)
    expect(env2.marker).toBe('replaced')

    md.core.ruler.disable('mutable_core_rule')

    const env3: Record<string, unknown> = {}
    md.parse('third', env3)
    expect(env3.marker).toBeUndefined()

    md.core.ruler.enable('mutable_core_rule')

    const env4: Record<string, unknown> = {}
    md.parse('fourth', env4)
    expect(env4.marker).toBe('replaced')
  })

  it('keeps named rule lookup out of the normal parser hot path', () => {
    const md = MarkdownIt()

    const coreNamedRules = vi.spyOn(md.core.ruler, 'getNamedRules')
    const blockNamedRules = vi.spyOn(md.block.ruler, 'getNamedRules')
    const inlineNamedRules = vi.spyOn(md.inline.ruler, 'getNamedRules')
    const inline2NamedRules = vi.spyOn(md.inline.ruler2, 'getNamedRules')

    md.parse('# Title\n\nParagraph with [link](https://example.com) and **strong** text.')

    expect(coreNamedRules).not.toHaveBeenCalled()
    expect(blockNamedRules).not.toHaveBeenCalled()
    expect(inlineNamedRules).not.toHaveBeenCalled()
    expect(inline2NamedRules).not.toHaveBeenCalled()
  })

  it('still records rule profiles when profiling is requested', () => {
    const md = MarkdownIt()
    const env: any = { __mdtsProfileRules: true }

    md.parse('# Title\n\nParagraph with **strong** text.', env)

    expect(env.__mdtsRuleProfile).toBeDefined()
    expect(env.__mdtsRuleProfile.records['core:block'].calls).toBeGreaterThan(0)
  })
})
