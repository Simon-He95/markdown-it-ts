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
