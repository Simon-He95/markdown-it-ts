/**
 * Block-level rule management with Ruler pattern
 */

import { recordRuleInvocation } from '../rule_profile'

export type BlockRuleFn = (state: any, startLine: number, endLine: number, silent: boolean) => boolean

export interface BlockNamedRule {
  name: string
  fn: BlockRuleFn
}

export class BlockRuler {
  private _rules: Array<{
    name: string
    enabled: boolean
    fn: BlockRuleFn
    alt: string[]
  }> = []

  private cache: Record<string, BlockRuleFn[]> | null = null
  private namedCache: Record<string, BlockNamedRule[]> | null = null
  public version = 0

  private invalidateCache(): void {
    this.cache = null
    this.namedCache = null
    this.version++
  }

  push(name: string, fn: any, options?: { alt?: string[] }): void {
    this._rules.push({
      name,
      enabled: true,
      fn,
      alt: options?.alt || [],
    })
    this.invalidateCache()
  }

  before(beforeName: string, name: string, fn: any, options?: { alt?: string[] }): void {
    const i = this._rules.findIndex(r => r.name === beforeName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${beforeName}`)
    const exists = this._rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this._rules.splice(exists, 1)
    this._rules.splice(i, 0, { name, enabled: true, fn, alt: options?.alt || [] })
    this.invalidateCache()
  }

  after(afterName: string, name: string, fn: any, options?: { alt?: string[] }): void {
    const i = this._rules.findIndex(r => r.name === afterName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${afterName}`)
    const exists = this._rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this._rules.splice(exists, 1)
    this._rules.splice(i + 1, 0, { name, enabled: true, fn, alt: options?.alt || [] })
    this.invalidateCache()
  }

  getRules(chainName: string): BlockRuleFn[] {
    const chain = chainName || ''
    if (!this.cache)
      this.compileCache()
    return this.cache![chain] ?? []
  }

  getNamedRules(chainName: string): BlockNamedRule[] {
    const chain = chainName || ''
    if (!this.namedCache)
      this.compileCache()
    return this.namedCache![chain] ?? []
  }

  getRulesForState(state: any, chainName: string): BlockRuleFn[] {
    const env = state?.env
    const shouldProfile = !!env && (Object.prototype.hasOwnProperty.call(env, '__mdtsRuleProfile') || Object.prototype.hasOwnProperty.call(env, '__mdtsProfileRules'))
    if (!shouldProfile)
      return this.getRules(chainName)

    const namedRules = this.getNamedRules(chainName)
    return namedRules.map(({ name, fn }) => {
      return (currentState: any, startLine: number, endLine: number, silent: boolean) => {
        const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now()
        const ok = fn(currentState, startLine, endLine, silent)
        const endedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now()
        recordRuleInvocation(currentState?.env, 'block', name, endedAt - startedAt, ok, !!silent)
        return ok
      }
    })
  }

  at(name: string, fn: any, options?: { alt?: string[] }): void {
    const index = this._rules.findIndex(r => r.name === name)
    if (index === -1) {
      throw new Error(`Parser rule not found: ${name}`)
    }

    this._rules[index].fn = fn
    if (options?.alt) {
      this._rules[index].alt = options.alt
    }
    this.invalidateCache()
  }

  enable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const nameList = Array.isArray(names) ? names : [names]
    const result: string[] = []

    nameList.forEach((name) => {
      const idx = this._rules.findIndex(r => r.name === name)
      if (idx === -1) {
        if (ignoreInvalid)
          return
        throw new Error(`Rules manager: invalid rule name ${name}`)
      }
      if (!this._rules[idx].enabled) {
        this._rules[idx].enabled = true
        result.push(name)
      }
    })

    if (result.length)
      this.invalidateCache()
    return result
  }

  disable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const nameList = Array.isArray(names) ? names : [names]
    const result: string[] = []

    nameList.forEach((name) => {
      const idx = this._rules.findIndex(r => r.name === name)
      if (idx === -1) {
        if (ignoreInvalid)
          return
        throw new Error(`Rules manager: invalid rule name ${name}`)
      }
      if (this._rules[idx].enabled) {
        this._rules[idx].enabled = false
        result.push(name)
      }
    })

    if (result.length)
      this.invalidateCache()
    return result
  }

  enableOnly(names: string[]): void {
    const allow = new Set(names)
    let changed = false
    for (const r of this._rules) {
      const next = allow.has(r.name)
      if (r.enabled !== next) {
        r.enabled = next
        changed = true
      }
    }
    if (changed)
      this.invalidateCache()
  }

  private compileCache(): void {
    const chains = new Set<string>([''])
    for (const rule of this._rules) {
      if (!rule.enabled)
        continue
      for (const alt of rule.alt)
        chains.add(alt)
    }

    const cache: Record<string, BlockRuleFn[]> = Object.create(null)
    const namedCache: Record<string, BlockNamedRule[]> = Object.create(null)
    for (const chain of chains) {
      const bucket: BlockRuleFn[] = []
      const namedBucket: BlockNamedRule[] = []
      for (const rule of this._rules) {
        if (!rule.enabled)
          continue
        if (chain !== '' && !rule.alt.includes(chain))
          continue
        bucket.push(rule.fn)
        namedBucket.push({ name: rule.name, fn: rule.fn })
      }
      cache[chain] = bucket
      namedCache[chain] = namedBucket
    }
    this.cache = cache
    this.namedCache = namedCache
  }
}

export default BlockRuler
