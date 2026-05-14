import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics } from '../../src/experimental'
import { StreamParser } from '../../src/stream/parser'

describe('stream parser global-state cache', () => {
  it('treats cached null global state as a known value', () => {
    const md = MarkdownIt({ stream: true })
    const parser = new StreamParser(md.core)
    const env: Record<string, unknown> = {}

    ;(parser as any).cache = {
      src: '[ref]: https://example.com\n\n',
      tokens: [],
      env,
      globalStateReason: null,
    }

    parser.parse('Paragraph without definitions.\n\n', env, md)

    expect(getParseDiagnostics(env)?.strategy).toMatchObject({
      path: 'stream-full',
      reason: 'small-non-append',
    })
  })
})
