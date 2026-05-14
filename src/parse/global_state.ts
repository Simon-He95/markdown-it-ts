export type GlobalMarkdownStateReason = 'reference-definition' | 'footnote-definition' | 'abbreviation-definition'

const FOOTNOTE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[\^[^\]\n]+\]:/m
const ABBR_DEF_RE = /(?:^|\n)[ \t]{0,3}\*\[[^\]\n]+\]:/m
const REFERENCE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[(?!\^)(?:\\[\s\S]|[^\]\\[])+\][ \t]*:/m
const GLOBAL_STATE_CHUNK_SCAN_WINDOW = 4096
const GLOBAL_STATE_ENV_KEYS = [
  'references',
  'footnotes',
  'abbreviations',
  'abbr',
  'abbrs',
] as const
const GLOBAL_STATE_ENV_MARKER = Symbol.for('markdown-it-ts.global-state')
const hasOwn = Object.prototype.hasOwnProperty

type GlobalStateEnvKey = typeof GLOBAL_STATE_ENV_KEYS[number]

interface EnvValueSnapshot {
  existed: boolean
  value?: unknown
  ownedKeys?: string[]
}

interface GlobalStateMarker {
  reason: GlobalMarkdownStateReason
  snapshot: Partial<Record<GlobalStateEnvKey, EnvValueSnapshot>>
}

function isGlobalMarkdownStateReason(value: unknown): value is GlobalMarkdownStateReason {
  return value === 'reference-definition'
    || value === 'footnote-definition'
    || value === 'abbreviation-definition'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object')
    return false

  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function cloneSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(item => cloneSnapshotValue(item))

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value))
      out[key] = cloneSnapshotValue(value[key])
    return out
  }

  return value
}

function ownKeys(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map((_, index) => String(index))

  if (isPlainObject(value))
    return Object.keys(value)

  return []
}

function snapshotValueEquals(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right))
      return false
    if (left.length !== right.length)
      return false
    for (let i = 0; i < left.length; i++) {
      if (!snapshotValueEquals(left[i], right[i]))
        return false
    }
    return true
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right))
      return false
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length)
      return false
    for (const key of leftKeys) {
      if (!hasOwn.call(right, key) || !snapshotValueEquals(left[key], right[key]))
        return false
    }
    return true
  }

  return Object.is(left, right)
}

function getSnapshotKeyValue(value: unknown, key: string): unknown {
  if (Array.isArray(value))
    return value[Number(key)]

  if (isPlainObject(value))
    return value[key]

  return undefined
}

function restoreSnapshotValue(target: unknown, snapshot: unknown): unknown {
  if (Array.isArray(target) && Array.isArray(snapshot)) {
    target.length = snapshot.length
    for (let i = 0; i < snapshot.length; i++)
      target[i] = cloneSnapshotValue(snapshot[i])
    return target
  }

  if (isPlainObject(target) && isPlainObject(snapshot)) {
    for (const key of Object.keys(target)) {
      if (!hasOwn.call(snapshot, key))
        delete target[key]
    }

    for (const key of Object.keys(snapshot))
      target[key] = cloneSnapshotValue(snapshot[key])

    return target
  }

  return cloneSnapshotValue(snapshot)
}

function resetOwnedSnapshotValue(
  env: Record<string, unknown>,
  key: GlobalStateEnvKey,
  entry: EnvValueSnapshot,
): void {
  const ownedKeys = entry.ownedKeys ?? []
  const target = (env as any)[key]

  if (isPlainObject(target) || Array.isArray(target)) {
    const snapshotKeys = new Set(ownKeys(entry.value))
    for (const ownedKey of ownedKeys) {
      if (entry.existed && snapshotKeys.has(ownedKey)) {
        ;(target as any)[ownedKey] = cloneSnapshotValue(getSnapshotKeyValue(entry.value, ownedKey))
      }
      else {
        delete (target as any)[ownedKey]
      }
    }

    if (!entry.existed && ownKeys(target).length === 0)
      delete (env as any)[key]

    return
  }

  if (entry.existed) {
    ;(env as any)[key] = cloneSnapshotValue(entry.value)
  }
  else {
    delete (env as any)[key]
  }
}

function getMarker(env: Record<string, unknown>): GlobalStateMarker | null {
  const value = (env as any)[GLOBAL_STATE_ENV_MARKER]

  if (isGlobalMarkdownStateReason(value)) {
    return {
      reason: value,
      snapshot: {},
    }
  }

  if (
    value
    && typeof value === 'object'
    && isGlobalMarkdownStateReason((value as any).reason)
    && (value as any).snapshot
    && typeof (value as any).snapshot === 'object'
  ) {
    return value as GlobalStateMarker
  }

  return null
}

function setMarker(env: Record<string, unknown>, marker: GlobalStateMarker): void {
  Object.defineProperty(env, GLOBAL_STATE_ENV_MARKER, {
    value: marker,
    enumerable: false,
    configurable: true,
    writable: true,
  })
}

export function detectGlobalMarkdownState(src: string): GlobalMarkdownStateReason | null {
  if (!src)
    return null

  if (FOOTNOTE_DEF_RE.test(src))
    return 'footnote-definition'

  if (ABBR_DEF_RE.test(src))
    return 'abbreviation-definition'

  if (REFERENCE_DEF_RE.test(src))
    return 'reference-definition'

  return null
}

export function detectGlobalMarkdownStateFromChunks(
  chunks: Iterable<string>,
): GlobalMarkdownStateReason | null {
  let carry = ''

  for (const chunk of chunks) {
    if (!chunk)
      continue

    const text = carry + chunk
    const reason = detectGlobalMarkdownState(text)
    if (reason)
      return reason

    carry = text.length > GLOBAL_STATE_CHUNK_SCAN_WINDOW
      ? text.slice(text.length - GLOBAL_STATE_CHUNK_SCAN_WINDOW)
      : text
  }

  return detectGlobalMarkdownState(carry)
}

export function hasGlobalMarkdownState(src: string): boolean {
  return detectGlobalMarkdownState(src) !== null
}

export function getKnownGlobalMarkdownState(env: Record<string, unknown>): GlobalMarkdownStateReason | null {
  return getMarker(env)?.reason ?? null
}

export function runWithKnownGlobalMarkdownState<T>(
  env: Record<string, unknown>,
  reason: GlobalMarkdownStateReason | null,
  run: () => T,
): T {
  if (getKnownGlobalMarkdownState(env))
    resetKnownGlobalMarkdownState(env)

  if (!reason)
    return run()

  markKnownGlobalMarkdownState(env, reason)

  try {
    const result = run()
    finalizeKnownGlobalMarkdownState(env)
    return result
  }
  catch (error) {
    resetKnownGlobalMarkdownState(env)
    throw error
  }
}

export function markKnownGlobalMarkdownState(
  env: Record<string, unknown>,
  reason: GlobalMarkdownStateReason,
): void {
  try {
    resetKnownGlobalMarkdownState(env)

    const snapshot: GlobalStateMarker['snapshot'] = {}

    for (const key of GLOBAL_STATE_ENV_KEYS) {
      snapshot[key] = hasOwn.call(env, key)
        ? {
            existed: true,
            value: cloneSnapshotValue((env as any)[key]),
          }
        : {
            existed: false,
          }
    }

    setMarker(env, {
      reason,
      snapshot,
    })
  }
  catch {}
}

export function finalizeKnownGlobalMarkdownState(env: Record<string, unknown>): void {
  const marker = getMarker(env)
  if (!marker)
    return

  for (const key of GLOBAL_STATE_ENV_KEYS) {
    const entry = marker.snapshot[key]
    if (!entry)
      continue

    entry.ownedKeys = []

    const after = (env as any)[key]
    if (!isPlainObject(after) && !Array.isArray(after))
      continue

    const beforeKeys = new Set(ownKeys(entry.existed ? entry.value : undefined))
    const afterKeys = ownKeys(after)

    entry.ownedKeys = afterKeys.filter((name) => {
      if (!beforeKeys.has(name))
        return true

      return !snapshotValueEquals((after as any)[name], getSnapshotKeyValue(entry.value, name))
    })
  }
}

export function resetKnownGlobalMarkdownState(env: Record<string, unknown>): void {
  const marker = getMarker(env)
  if (!marker)
    return

  for (const key of GLOBAL_STATE_ENV_KEYS) {
    const entry = marker.snapshot[key]

    if (!entry) {
      delete (env as any)[key]
      continue
    }

    if (entry.ownedKeys) {
      resetOwnedSnapshotValue(env, key, entry)
      continue
    }

    if (entry.existed) {
      ;(env as any)[key] = restoreSnapshotValue((env as any)[key], entry.value)
    }
    else {
      delete (env as any)[key]
    }
  }

  delete (env as any)[GLOBAL_STATE_ENV_MARKER]
}
