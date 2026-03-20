export interface StrategyDiagnostics {
  area: 'parse' | 'stream'
  path: string
  reason?: string
  chunked?: boolean
  unbounded?: boolean
}

export function setStrategyDiagnostics(
  env: Record<string, unknown> | undefined,
  info: StrategyDiagnostics,
): void {
  if (!env)
    return

  try {
    ;(env as Record<string, unknown>).__mdtsStrategyInfo = info
  }
  catch {}
}

