import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildDoc(targetChars: number) {
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    s += para(i++)
  }
  return s
}

function chunkString(src: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < src.length; i += size) {
    chunks.push(src.slice(i, i + size))
  }
  return chunks
}

async function* chunkAsync(src: string, size: number): AsyncGenerator<string> {
  for (let i = 0; i < src.length; i += size) {
    yield src.slice(i, i + size)
  }
}

describe('iterable parsing', () => {
  it('parses sync iterables without requiring a pre-joined source string', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt()
    const doc = buildDoc(300_000)
    const chunks = chunkString(doc, 137)
    const env: Record<string, unknown> = {}

    const tokens = md.parseIterable(chunks, env)

    expect(md.renderer.render(tokens, md.options, env))
      .toEqual(baseline.render(doc))
    expect((env as any).__mdtsUnboundedInfo?.parsedChunks).toBeGreaterThan(1)
  })

  it('parses async iterables and can render them directly', async () => {
    const md = MarkdownIt()
    const doc = buildDoc(120_000)

    const html = await md.renderAsyncIterable(chunkAsync(doc, 211), {})

    expect(html).toEqual(MarkdownIt().render(doc))
  })
})
