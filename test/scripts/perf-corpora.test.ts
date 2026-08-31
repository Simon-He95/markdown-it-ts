import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics } from '../../src/experimental'
import {
  FEATURE_MIXED_CORPUS,
  REAL_WORLD_CORPUS_FILES,
  STOCK_SUBSET_CORPUS,
  firstDifference,
  makeFeatureMixedDocument,
  makeStockSubsetParts,
} from '../../scripts/perf-corpora.mjs'
import { FEATURE_STRESS_CORPORA, STOCK_BOUNDARY_CORPORA } from '../../scripts/perf-feature-corpora.mjs'

describe('performance corpora', () => {
  it('keeps the specialized stock corpus on stock-fast', () => {
    const source = makeStockSubsetParts(20_000).join('')
    const parseEnv: Record<string, unknown> = {}
    const renderEnv: Record<string, unknown> = {}
    const md = MarkdownIt()

    md.parse(source, parseEnv)
    md.render(source, renderEnv)

    expect(STOCK_SUBSET_CORPUS.expectedParsePath).toBe('stock-fast')
    expect(getParseDiagnostics(parseEnv)?.strategy?.path).toBe('stock-fast')
    expect(getParseDiagnostics(renderEnv)?.strategy).toMatchObject({ area: 'render', path: 'stock-fast' })
  })

  it('forces feature-mixed Markdown through the general token renderer', () => {
    const source = makeFeatureMixedDocument(20_000)
    const parseEnv: Record<string, unknown> = {}
    const renderEnv: Record<string, unknown> = {}
    const md = MarkdownIt()

    md.parse(source, parseEnv)
    md.render(source, renderEnv)

    expect(source).toContain('**strong text**')
    expect(source).toContain('| Feature | Value |')
    expect(source).toContain('~~Removed')
    expect(FEATURE_MIXED_CORPUS.expectedParsePath).toBe('plain')
    expect(getParseDiagnostics(parseEnv)?.strategy?.path).toBe('plain')
    expect(getParseDiagnostics(renderEnv)?.strategy).toMatchObject({ area: 'parse', path: 'plain' })
  })

  it('keeps every feature-stress corpus on the general parser and token renderer', () => {
    expect(FEATURE_STRESS_CORPORA.map(corpus => corpus.id)).toEqual([
      'plain-text',
      'inline-formatting',
      'links-media-autolinks',
      'nested-blocks',
      'tables-strikethrough',
      'fenced-code',
      'feature-mixed',
    ])

    for (const corpus of FEATURE_STRESS_CORPORA) {
      const source = corpus.makeDocument(5_000)
      const parseEnv: Record<string, unknown> = {}
      const renderEnv: Record<string, unknown> = {}
      const md = MarkdownIt()

      md.parse(source, parseEnv)
      md.render(source, renderEnv)

      expect(getParseDiagnostics(parseEnv)?.strategy?.path, corpus.id).toBe(corpus.expectedParsePath)
      expect(getParseDiagnostics(renderEnv)?.strategy?.path, corpus.id).toBe('plain')
      expect(corpus.expectedRenderPath, corpus.id).toBe('token-renderer')
    }
  })

  it('keeps stock repetition and late fallback boundary cases explicit', () => {
    expect(STOCK_BOUNDARY_CORPORA.map(corpus => corpus.id)).toEqual([
      'stock-repeated',
      'stock-unique',
      'stock-near-miss',
    ])

    for (const corpus of STOCK_BOUNDARY_CORPORA) {
      const source = corpus.makeDocument(20_000)
      const parseEnv: Record<string, unknown> = {}
      const renderEnv: Record<string, unknown> = {}
      const md = MarkdownIt()

      md.parse(source, parseEnv)
      md.render(source, renderEnv)

      expect(getParseDiagnostics(parseEnv)?.strategy?.path, corpus.id).toBe(corpus.expectedParsePath)
      const renderStrategy = getParseDiagnostics(renderEnv)?.strategy
      const renderPath = renderStrategy?.area === 'render' ? renderStrategy.path : 'token-renderer'
      expect(renderPath, corpus.id).toBe(corpus.expectedRenderPath)
    }
  })

  it('keeps repository-owned real-world files explicit and independent', () => {
    expect(REAL_WORLD_CORPUS_FILES.map(corpus => corpus.path)).toEqual([
      'docs/architecture.md',
      'docs/development.md',
      'docs/security.md',
    ])
    expect(new Set(REAL_WORLD_CORPUS_FILES.map(corpus => corpus.id)).size).toBe(REAL_WORLD_CORPUS_FILES.length)
    expect(REAL_WORLD_CORPUS_FILES.every(corpus => corpus.provenance.includes('MIT'))).toBe(true)
  })

  it('reports exact equality or the first output difference', () => {
    expect(firstDifference('same', 'same')).toMatchObject({
      equal: true,
      firstDifferenceIndex: null,
    })
    expect(firstDifference('<h1>A</h1>', '<h1 id="a">A</h1>')).toMatchObject({
      equal: false,
      firstDifferenceIndex: 3,
      leftLength: 10,
      rightLength: 17,
    })
  })
})
