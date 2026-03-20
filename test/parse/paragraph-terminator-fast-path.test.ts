import MarkdownItOriginal from 'markdown-it'
import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

function expectRenderParity(src: string, options?: Record<string, unknown>) {
  const ours = MarkdownIt(options ?? {})
  const upstream = new MarkdownItOriginal(options ?? {})
  expect(ours.render(src)).toBe(upstream.render(src))
}

describe('paragraph terminator fast path', () => {
  it('keeps table termination intact when the candidate line contains pipes', () => {
    expectRenderParity('intro\nalpha | beta\n--- | ---\n1 | 2\n')
  })

  it('keeps list termination intact', () => {
    expectRenderParity('intro\n- item\n')
  })

  it('keeps blockquote termination intact', () => {
    expectRenderParity('intro\n> quote\n')
  })

  it('keeps html block termination intact', () => {
    expectRenderParity('intro\n<div>\nblock\n</div>\n', { html: true })
  })

  it('keeps atx heading termination intact', () => {
    expectRenderParity('intro\n# title\n')
  })

  it('keeps setext heading detection intact', () => {
    expectRenderParity('Title\n-----\n')
  })
})
