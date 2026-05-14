export interface StrategyDiagnostics {
  area: 'parse' | 'stream'
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

export interface ParseDiagnostics {
  strategy?: StrategyDiagnostics
  chunk?: ChunkDiagnostics
  unbounded?: UnboundedDiagnostics
  editable?: EditableDiagnostics
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
    Object.defineProperty(env, MDTS_DIAGNOSTICS, {
      value: diagnostics,
      enumerable: false,
      configurable: true,
      writable: true,
    })
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
    delete (env as any)[MDTS_DIAGNOSTICS]
  }
  catch {}
}

export function beginParseDiagnostics(env: Record<string, unknown> | undefined): void {
  clearParseDiagnostics(env)
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
