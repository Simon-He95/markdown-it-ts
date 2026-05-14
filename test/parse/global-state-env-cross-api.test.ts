import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { chunkedParse } from '../../src/experimental'
import { parse, parseInline } from '../../src/parse'
import { parseStringUnbounded } from '../../src/stream/unbounded'

function hasLinkOpen(tokens: any[]): boolean {
  const inline = tokens.find(token => token.type === 'inline')
  return !!inline?.children?.some((child: any) => child.type === 'link_open')
}

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

  it('preserves user-added references between marked plain renders', () => {
    const md = markdownit()
    const env: Record<string, any> = {}

    md.render('[old][old]\n\n[old]: https://old.example\n', env)

    env.references.MANUAL = {
      href: 'https://manual.example',
      title: '',
    }

    const html = md.render('[x][manual]\n', env)

    expect(html).toContain('href="https://manual.example"')
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

  it('clears standalone parse references before standalone parseInline', () => {
    const env: Record<string, unknown> = {}

    parse('[x][ref]\n\n[ref]: https://old.example\n', env)

    const tokens = parseInline('[x][ref]', env)

    expect(hasLinkOpen(tokens)).toBe(false)
  })

  it('clears standalone parse references before next standalone parse', () => {
    const env: Record<string, unknown> = {}

    parse('[x][ref]\n\n[ref]: https://old.example\n', env)

    const tokens = parse('[x][ref]\n', env)

    expect(hasLinkOpen(tokens)).toBe(false)
  })
})
