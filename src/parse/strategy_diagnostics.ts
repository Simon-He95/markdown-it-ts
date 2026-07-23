export interface StrategyDiagnostics {
  area: 'parse' | 'render' | 'stream'
  path: string
  reason?: string
  chunked?: boolean
  unbounded?: boolean
}

export interface ChunkDiagnostics {
  count: number
  fallback?: boolean
  fallbackReason?: string
  globalStateDetected?: string
  globalStateFallbackDisabled?: boolean
  maxChunkChars: number
  maxChunkLines: number
}

export interface UnboundedDiagnostics {
  mode?: 'full' | 'stream'
  fallback?: boolean
  fallbackReason?: string
  globalStateDetected?: string
  globalStateFallbackDisabled?: boolean
  maxChunkChars?: number
  maxChunkLines?: number
  committedChars: number
  committedLines: number
  pendingChars: number
  pendingLines: number
  fedChunks: number
  parsedChunks: number
}

export interface EditableDiagnostics {
  fallback?: boolean
  fallbackReason?: string
}

export interface StockFastDiagnostics {
  area: 'parse' | 'render'
  attempted: boolean
  matched: boolean
  attemptMs: number
  fallbackReason?: string
  blocks: number
  headings: number
  paragraphs: number
  lists: number
  fences: number
  paragraphCacheHits: number
  paragraphCacheMisses: number
  paragraphCacheBypasses: number
  listCacheHits: number
  listCacheMisses: number
  fenceCacheHits: number
  fenceCacheMisses: number
}

export interface ParseDiagnostics {
  strategy?: StrategyDiagnostics
  chunk?: ChunkDiagnostics
  unbounded?: UnboundedDiagnostics
  editable?: EditableDiagnostics
  stockFast?: StockFastDiagnostics
}

export function createStockFastDiagnostics(area: StockFastDiagnostics['area']): StockFastDiagnostics {
  return {
    area,
    attempted: true,
    matched: false,
    attemptMs: 0,
    blocks: 0,
    headings: 0,
    paragraphs: 0,
    lists: 0,
    fences: 0,
    paragraphCacheHits: 0,
    paragraphCacheMisses: 0,
    paragraphCacheBypasses: 0,
    listCacheHits: 0,
    listCacheMisses: 0,
    fenceCacheHits: 0,
    fenceCacheMisses: 0,
  }
}

export const MDTS_DIAGNOSTICS = Symbol.for('markdown-it-ts.diagnostics')

function getDiagnosticsStore(
  env: Record<string, unknown> | undefined,
  create: boolean,
): ParseDiagnostics | undefined {
  if (!env)
    return undefined

  try {
    const existing = (env as any)[MDTS_DIAGNOSTICS]
    if (existing && typeof existing === 'object')
      return existing as ParseDiagnostics

    if (!create)
      return undefined

    const diagnostics: ParseDiagnostics = {}
    ;(env as any)[MDTS_DIAGNOSTICS] = diagnostics
    return diagnostics
  }
  catch {
    return undefined
  }
}

export function getParseDiagnostics(env: Record<string, unknown> | undefined): ParseDiagnostics | undefined {
  return getDiagnosticsStore(env, false)
}

export function clearParseDiagnostics(env: Record<string, unknown> | undefined): void {
  if (!env)
    return

  try {
    const diagnostics = (env as any)[MDTS_DIAGNOSTICS]
    if (diagnostics && typeof diagnostics === 'object') {
      delete diagnostics.strategy
      delete diagnostics.chunk
      delete diagnostics.unbounded
      delete diagnostics.editable
      delete diagnostics.stockFast
    }
  }
  catch {}
}

export function beginParseDiagnostics(env: Record<string, unknown> | undefined): void {
  clearParseDiagnostics(env)
}

export function setStockFastDiagnostics(
  env: Record<string, unknown> | undefined,
  info: StockFastDiagnostics,
): void {
  const diagnostics = getDiagnosticsStore(env, true)
  if (!diagnostics)
    return

  diagnostics.stockFast = info
}

export function setStrategyDiagnostics(
  env: Record<string, unknown> | undefined,
  info: StrategyDiagnostics,
): void {
  const diagnostics = getDiagnosticsStore(env, true)
  if (!diagnostics)
    return

  diagnostics.strategy = info
}

export function setChunkDiagnostics(
  env: Record<string, unknown> | undefined,
  info: ChunkDiagnostics,
): void {
  const diagnostics = getDiagnosticsStore(env, true)
  if (!diagnostics)
    return

  diagnostics.chunk = info
}

export function setUnboundedDiagnostics(
  env: Record<string, unknown> | undefined,
  info: UnboundedDiagnostics,
): void {
  const diagnostics = getDiagnosticsStore(env, true)
  if (!diagnostics)
    return

  diagnostics.unbounded = info
}

export function setEditableDiagnostics(
  env: Record<string, unknown> | undefined,
  info: EditableDiagnostics,
): void {
  const diagnostics = getDiagnosticsStore(env, true)
  if (!diagnostics)
    return

  diagnostics.editable = info
}
