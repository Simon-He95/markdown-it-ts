/**
 * Block-level rule management with Ruler pattern
 */

export class BlockRuler {
  private _rules: Array<{
    name: string
    enabled: boolean
    fn: (state: any, startLine: number, endLine: number, silent: boolean) => boolean
    alt: string[]
  }> = []
  private cache: Map<string, Array<(state: any, startLine: number, endLine: number, silent: boolean) => boolean>> | null = null

  private invalidateCache(): void {
    this.cache = null
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

  getRules(chainName: string): Array<(state: any, startLine: number, endLine: number, silent: boolean) => boolean> {
    const chain = chainName || ''
    if (!this.cache)
      this.compileCache()
    return this.cache!.get(chain) ?? []
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

    const cache = new Map<string, Array<(state: any, startLine: number, endLine: number, silent: boolean) => boolean>>()
    for (const chain of chains) {
      const bucket: Array<(state: any, startLine: number, endLine: number, silent: boolean) => boolean> = []
      for (const rule of this._rules) {
        if (!rule.enabled)
          continue
        if (chain !== '' && !rule.alt.includes(chain))
          continue
        bucket.push(rule.fn)
      }
      cache.set(chain, bucket)
    }
    this.cache = cache
  }
}

export default BlockRuler
