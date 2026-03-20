export type RuleProfileChain = 'core' | 'block' | 'inline' | 'inline2'

export interface RuleProfileRecord {
  chain: RuleProfileChain
  name: string
  calls: number
  hits: number
  inclusiveMs: number
  medianMs: number
  maxMs: number
  normalCalls: number
  normalHits: number
  silentCalls: number
  silentHits: number
  samples: number[]
}

export interface RuleProfileSession {
  enabled: boolean
  fixture?: string
  mode?: string
  startedAt: number
  completedAt?: number
  records: Record<string, RuleProfileRecord>
}

type ProfileCarrier = {
  __mdtsProfileRules?: boolean | Partial<Pick<RuleProfileSession, 'fixture' | 'mode'>>
  __mdtsRuleProfile?: RuleProfileSession
}

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function')
    return performance.now()
  return Date.now()
}

function median(values: number[]): number {
  if (values.length === 0)
    return 0

  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function createRecord(chain: RuleProfileChain, name: string): RuleProfileRecord {
  return {
    chain,
    name,
    calls: 0,
    hits: 0,
    inclusiveMs: 0,
    medianMs: 0,
    maxMs: 0,
    normalCalls: 0,
    normalHits: 0,
    silentCalls: 0,
    silentHits: 0,
    samples: [],
  }
}

export function getRuleProfile(env: Record<string, unknown> | undefined | null): RuleProfileSession | null {
  const carrier = env as ProfileCarrier | undefined | null
  if (!carrier)
    return null

  if (carrier.__mdtsRuleProfile)
    return carrier.__mdtsRuleProfile

  if (!carrier.__mdtsProfileRules)
    return null

  const meta = carrier.__mdtsProfileRules === true
    ? {}
    : carrier.__mdtsProfileRules

  const session: RuleProfileSession = {
    enabled: true,
    fixture: meta.fixture,
    mode: meta.mode,
    startedAt: now(),
    records: Object.create(null) as RuleProfileSession['records'],
  }

  carrier.__mdtsRuleProfile = session
  return session
}

export function recordRuleInvocation(
  env: Record<string, unknown> | undefined | null,
  chain: RuleProfileChain,
  name: string,
  durationMs: number,
  hit: boolean,
  silent: boolean,
): void {
  const session = getRuleProfile(env)
  if (!session)
    return

  const key = `${chain}:${name}`
  const record = session.records[key] ?? (session.records[key] = createRecord(chain, name))

  record.calls++
  record.inclusiveMs += durationMs
  if (durationMs > record.maxMs)
    record.maxMs = durationMs
  record.samples.push(durationMs)

  if (silent) {
    record.silentCalls++
    if (hit)
      record.silentHits++
  }
  else {
    record.normalCalls++
    if (hit)
      record.normalHits++
  }

  if (hit)
    record.hits++

  session.completedAt = now()
}

export function finalizeRuleProfile(env: Record<string, unknown> | undefined | null): RuleProfileSession | null {
  const session = getRuleProfile(env)
  if (!session)
    return null

  const records = Object.keys(session.records)
  for (let i = 0; i < records.length; i++) {
    const record = session.records[records[i]]
    record.medianMs = median(record.samples)
  }
  session.completedAt = now()
  return session
}
