/**
 * InlineRuler - manages inline parsing rules
 * Similar to original markdown-it/lib/ruler.mjs but for inline rules
 */

export type InlineRuleFn = (state: any, silent?: boolean) => boolean | void

export interface InlineRule {
  name: string
  fn: InlineRuleFn
  alt?: string[]
  enabled: boolean
}

export type InlineRuleSnapshot = Readonly<{
  name: string
  fn: InlineRuleFn
  alt?: readonly string[]
  enabled: boolean
}>

export interface InlineNamedRule {
  name: string
  fn: InlineRuleFn
}

export class InlineRuler {
  private rules: InlineRule[] = []
  private cache: Map<string, InlineRuleFn[]> | null = null
  private namedCache: Map<string, InlineNamedRule[]> | null = null
  public version = 0

  private invalidateCache(): void {
    this.cache = null
    this.namedCache = null
    this.version++
  }

  /**
   * Push new rule to the end of chain
   */
  public push(name: string, fn: InlineRuleFn, options?: { alt?: string[] }) {
    // ensure uniqueness by name
    const idx = this.rules.findIndex(r => r.name === name)
    if (idx >= 0)
      this.rules.splice(idx, 1)
    this.rules.push({
      name,
      fn,
      alt: options?.alt || [],
      enabled: true,
    })
    this.invalidateCache()
  }

  public at(name: string): InlineRuleSnapshot | undefined
  public at(name: string, fn: InlineRuleFn, options?: { alt?: string[] }): void
  public at(name: string, fn?: InlineRuleFn, options?: { alt?: string[] }): InlineRuleSnapshot | undefined | void {
    const index = this.rules.findIndex(rule => rule.name === name)

    if (fn === undefined) {
      if (index < 0)
        return undefined

      const rule = this.rules[index]

      return Object.freeze({
        name: rule.name,
        fn: rule.fn,
        alt: rule.alt ? Object.freeze(rule.alt.slice()) : undefined,
        enabled: rule.enabled,
      })
    }

    if (index < 0)
      throw new Error(`Parser rule not found: ${name}`)

    this.rules[index].fn = fn
    if (options?.alt !== undefined)
      this.rules[index].alt = options.alt
    this.invalidateCache()
  }

  public before(beforeName: string, name: string, fn: InlineRuleFn, options?: { alt?: string[] }) {
    const i = this.rules.findIndex(r => r.name === beforeName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${beforeName}`)
    const exists = this.rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this.rules.splice(exists, 1)
    this.rules.splice(i, 0, { name, fn, alt: options?.alt || [], enabled: true })
    this.invalidateCache()
  }

  public after(afterName: string, name: string, fn: InlineRuleFn, options?: { alt?: string[] }) {
    const i = this.rules.findIndex(r => r.name === afterName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${afterName}`)
    const exists = this.rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this.rules.splice(exists, 1)
    this.rules.splice(i + 1, 0, { name, fn, alt: options?.alt || [], enabled: true })
    this.invalidateCache()
  }

  public enable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const list = Array.isArray(names) ? names : [names]
    const found: string[] = []
    let changed = false

    for (const n of list) {
      const idx = this.rules.findIndex(r => r.name === n)
      if (idx < 0) {
        if (!ignoreInvalid)
          throw new Error(`Rules manager: invalid rule name ${n}`)
        continue
      }

      found.push(n)

      if (!this.rules[idx].enabled) {
        this.rules[idx].enabled = true
        changed = true
      }
    }

    if (changed)
      this.invalidateCache()

    return found
  }

  public disable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const list = Array.isArray(names) ? names : [names]
    const found: string[] = []
    let changed = false

    for (const n of list) {
      const idx = this.rules.findIndex(r => r.name === n)
      if (idx < 0) {
        if (!ignoreInvalid)
          throw new Error(`Rules manager: invalid rule name ${n}`)
        continue
      }

      found.push(n)

      if (this.rules[idx].enabled) {
        this.rules[idx].enabled = false
        changed = true
      }
    }

    if (changed)
      this.invalidateCache()

    return found
  }

  public enableOnly(names: string[]): void {
    const allow = new Set(names)
    let changed = false
    for (const r of this.rules) {
      const next = allow.has(r.name)
      if (r.enabled !== next) {
        r.enabled = next
        changed = true
      }
    }
    if (changed)
      this.invalidateCache()
  }

  /**
   * Get rules for specified chain name (or empty string for default)
   */
  public getRules(chainName: string): InlineRuleFn[] {
    const chain = chainName || ''
    if (!this.cache)
      this.compileCache()
    return this.cache!.get(chain) ?? []
  }

  public getNamedRules(chainName: string): InlineNamedRule[] {
    const chain = chainName || ''
    if (!this.namedCache)
      this.compileCache()
    return this.namedCache!.get(chain) ?? []
  }

  private compileCache(): void {
    const chains = new Set<string>([''])
    for (const rule of this.rules) {
      if (!rule.enabled)
        continue
      if (rule.alt) {
        for (const alt of rule.alt)
          chains.add(alt)
      }
    }

    const cache = new Map<string, InlineRuleFn[]>()
    const namedCache = new Map<string, InlineNamedRule[]>()
    for (const chain of chains) {
      const bucket: InlineRuleFn[] = []
      const namedBucket: InlineNamedRule[] = []
      for (const rule of this.rules) {
        if (!rule.enabled)
          continue
        if (chain !== '' && !(rule.alt?.includes(chain)))
          continue
        bucket.push(rule.fn)
        namedBucket.push({ name: rule.name, fn: rule.fn })
      }
      cache.set(chain, bucket)
      namedCache.set(chain, namedBucket)
    }
    this.cache = cache
    this.namedCache = namedCache
  }
}

export default InlineRuler
