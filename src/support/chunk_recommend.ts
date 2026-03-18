import type { MarkdownItOptions } from '../index'

export interface ChunkRecommendation {
  strategy: 'plain' | 'discrete' | 'adaptive'
  maxChunkChars?: number
  maxChunkLines?: number
  fenceAware: boolean
  maxChunks?: number
  notes?: string
}

const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)

interface DiscreteRecommendation {
  max: number
  strategy: ChunkRecommendation['strategy']
  maxChunkChars?: number
  maxChunkLines?: number
  maxChunks?: number
  notes: string
}

const FULL_DISCRETE_RECOMMENDATIONS: ReadonlyArray<DiscreteRecommendation> = [
  { max: 5_000, strategy: 'discrete', maxChunkChars: 32_000, maxChunkLines: 150, maxChunks: 8, notes: '<=5k' },
  { max: 20_000, strategy: 'discrete', maxChunkChars: 24_000, maxChunkLines: 200, maxChunks: 12, notes: '<=20k' },
  { max: 100_000, strategy: 'plain', notes: '<=100k plain' },
  { max: 200_000, strategy: 'discrete', maxChunkChars: 20_000, maxChunkLines: 150, maxChunks: 12, notes: '<=200k' },
  { max: 500_000, strategy: 'discrete', maxChunkChars: 32_000, maxChunkLines: 350, maxChunks: 16, notes: '<=500k' },
  { max: 5_000_000, strategy: 'discrete', maxChunkChars: 64_000, maxChunkLines: 700, maxChunks: 16, notes: '<=5M' },
]

const STREAM_DISCRETE_RECOMMENDATIONS: ReadonlyArray<DiscreteRecommendation> = [
  { max: 5_000, strategy: 'discrete', maxChunkChars: 16_000, maxChunkLines: 250, maxChunks: 8, notes: '<=5k' },
  { max: 20_000, strategy: 'discrete', maxChunkChars: 16_000, maxChunkLines: 200, maxChunks: 12, notes: '<=20k' },
  { max: 50_000, strategy: 'discrete', maxChunkChars: 16_000, maxChunkLines: 250, maxChunks: 12, notes: '<=50k' },
  { max: 500_000, strategy: 'discrete', maxChunkChars: 32_000, maxChunkLines: 350, maxChunks: 16, notes: '<=500k' },
]

function toRecommendation(fenceAware: boolean, discrete: DiscreteRecommendation): ChunkRecommendation {
  return {
    strategy: discrete.strategy,
    maxChunkChars: discrete.maxChunkChars,
    maxChunkLines: discrete.maxChunkLines,
    maxChunks: discrete.maxChunks,
    fenceAware,
    notes: discrete.notes,
  }
}

export function recommendFullChunkStrategy(sizeChars: number, sizeLines = Math.max(0, (sizeChars / 40) | 0), opts: Partial<MarkdownItOptions> = {}): ChunkRecommendation {
  const fenceAware = opts.fullChunkFenceAware ?? true
  const target = opts.fullChunkTargetChunks ?? 8
  const adaptive = opts.fullChunkAdaptive !== false
  for (let i = 0; i < FULL_DISCRETE_RECOMMENDATIONS.length; i++) {
    const rec = FULL_DISCRETE_RECOMMENDATIONS[i]
    if (sizeChars <= rec.max) {
      if (rec.strategy !== 'adaptive')
        return toRecommendation(fenceAware, rec)
      break
    }
  }
  if (sizeChars > 5_000_000) {
    return { strategy: 'plain', fenceAware, notes: '>5M plain' }
  }
  if (adaptive) {
    const maxChunkChars = clamp(Math.ceil(sizeChars / target), 8000, 64_000)
    const maxChunkLines = clamp(Math.ceil(sizeLines / target), 150, 700)
    const maxChunks = clamp(Math.ceil(sizeChars / 64_000), target, 16)
    return { strategy: 'adaptive', maxChunkChars, maxChunkLines, maxChunks, fenceAware, notes: 'adaptive fallback' }
  }
  return { strategy: 'discrete', maxChunkChars: opts.fullChunkSizeChars ?? 10000, maxChunkLines: opts.fullChunkSizeLines ?? 200, fenceAware, maxChunks: opts.fullChunkMaxChunks }
}

export function recommendStreamChunkStrategy(sizeChars: number, sizeLines = Math.max(0, (sizeChars / 40) | 0), opts: Partial<MarkdownItOptions> = {}): ChunkRecommendation {
  const fenceAware = opts.streamChunkFenceAware ?? true
  const target = opts.streamChunkTargetChunks ?? 8
  const adaptive = opts.streamChunkAdaptive !== false
  for (let i = 0; i < STREAM_DISCRETE_RECOMMENDATIONS.length; i++) {
    const rec = STREAM_DISCRETE_RECOMMENDATIONS[i]
    if (sizeChars <= rec.max) {
      if (rec.strategy !== 'adaptive')
        return toRecommendation(fenceAware, rec)
      break
    }
  }
  if (sizeChars > 500_000)
    return { strategy: 'plain', fenceAware, notes: '>500k plain' }
  if (adaptive) {
    const maxChunkChars = clamp(Math.ceil(sizeChars / target), 8000, 64_000)
    const maxChunkLines = clamp(Math.ceil(sizeLines / target), 150, 700)
    const maxChunks = clamp(Math.ceil(sizeChars / 64_000), target, 32)
    return { strategy: 'adaptive', maxChunkChars, maxChunkLines, maxChunks, fenceAware, notes: 'adaptive fallback' }
  }
  return {
    strategy: 'discrete',
    maxChunkChars: opts.streamChunkSizeChars ?? 10000,
    maxChunkLines: opts.streamChunkSizeLines ?? 200,
    maxChunks: (opts as any).streamChunkMaxChunks,
    fenceAware,
  }
}
