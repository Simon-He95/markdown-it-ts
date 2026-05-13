import { describe, expect, it } from 'vitest'
import markdownit, { chunkedParse } from '../../src/index'
import { parseStringUnbounded } from '../../src/stream/unbounded'

describe('global markdown state env cleanup across APIs', () => {
  it('marks plain render definitions so the next plain render can clear them', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const withDefinition = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')

    md.render(withDefinition, env)

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })

  it('clears mdts-owned references when switching from chunkedParse to plain render', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const withDefinition = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')

    chunkedParse(md, withDefinition, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })

  it('clears mdts-owned references when switching from parseStringUnbounded to plain render', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const withDefinition = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')

    parseStringUnbounded(md, withDefinition, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })

  it('clears mdts-owned references when switching from parseIterable to plain render', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    md.parseIterable([
      '[x][ref]\n\n',
      '[ref]: https://old.example\n',
    ], env)

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })

  it('clears mdts-owned references when switching from parseAsyncIterable to plain render', async () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    async function* chunks() {
      yield '[x][ref]\n\n'
      yield '[ref]: https://old.example\n'
    }

    await md.parseAsyncIterable(chunks(), env)

    const withoutDefinition = '[x][ref]\n'
    const html = md.render(withoutDefinition, env)

    expect(html).toBe(md.render(withoutDefinition))
    expect(html).not.toContain('https://old.example')
  })

  it('clears mdts-owned references before renderInline', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const withDefinition = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')

    chunkedParse(md, withDefinition, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })

    const html = md.renderInline('[x][ref]', env)

    expect(html).toBe(md.renderInline('[x][ref]'))
    expect(html).not.toContain('https://old.example')
  })
})
