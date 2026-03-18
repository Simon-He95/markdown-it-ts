import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildDoc(targetChars: number) {
  let s = ''
  let i = 0
  while (s.length < targetChars)
    s += para(i++)
  return s
}

function buildLineDoc(lines: number) {
  let s = ''
  for (let i = 0; i < lines; i++)
    s += `line ${i}\n`
  return s
}

const AGGRESSIVE_AUTO_UNBOUNDED = {
  autoUnboundedThresholdChars: 200_000,
  autoUnboundedThresholdLines: 5_000,
} as const

describe('auto unbounded full parse', () => {
  it('keeps medium one-shot inputs on the plain path by default', () => {
    const md = MarkdownIt()
    const doc = buildDoc(350_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect((env as any).__mdtsUnboundedInfo).toBeUndefined()
  })

  it('does not switch just because a small document has many short lines', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt({ autoUnbounded: false })
    const doc = buildLineDoc(3_000)
    const env: Record<string, unknown> = {}

    const html = md.render(doc, env)

    expect(html).toBe(baseline.render(doc))
    expect((env as any).__mdtsUnboundedInfo).toBeUndefined()
  })

  it('uses the internal unbounded path once the default thresholds are exceeded', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt({ autoUnbounded: false })
    const doc = buildDoc(4_200_000)
    const env: Record<string, unknown> = {}

    const html = md.render(doc, env)

    expect(html).toBe(baseline.render(doc))
    expect((env as any).__mdtsUnboundedInfo?.parsedChunks).toBeGreaterThan(1)
    expect((env as any).__mdtsUnboundedInfo?.committedChars).toBe(doc.length)
  })

  it('also applies to stream.parse full-document fallbacks for large one-shot inputs', () => {
    const md = MarkdownIt({
      stream: true,
      streamChunkedFallback: false,
      ...AGGRESSIVE_AUTO_UNBOUNDED,
    })
    const baseline = MarkdownIt({ autoUnbounded: false })
    const doc = buildDoc(350_000)
    const env: Record<string, unknown> = {}

    const tokens = md.stream.parse(doc, env)

    expect(md.renderer.render(tokens, md.options, env))
      .toBe(baseline.render(doc))
    expect((env as any).__mdtsUnboundedInfo?.parsedChunks).toBeGreaterThan(1)
  })

  it('also applies when callers go through md.stream.parse() with stream mode disabled', () => {
    const md = MarkdownIt(AGGRESSIVE_AUTO_UNBOUNDED)
    const baseline = MarkdownIt({ autoUnbounded: false })
    const doc = buildDoc(350_000)
    const env: Record<string, unknown> = {}

    const tokens = md.stream.parse(doc, env)

    expect(md.renderer.render(tokens, md.options, env))
      .toBe(baseline.render(doc))
    expect((env as any).__mdtsUnboundedInfo?.parsedChunks).toBeGreaterThan(1)
  })

  it('can be disabled explicitly', () => {
    const md = MarkdownIt({ autoUnbounded: false })
    const doc = buildDoc(350_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect((env as any).__mdtsUnboundedInfo).toBeUndefined()
  })
})
