export type CoreRule = (state: any) => void

interface CoreRuleRec {
  name: string
  fn: CoreRule
  enabled: boolean
}

export class CoreRuler {
  private rules: CoreRuleRec[] = []
  private cache: CoreRule[] | null = null

  private invalidateCache(): void {
    this.cache = null
  }

  push(name: string, fn: CoreRule) {
    // remove existing with same name to keep unique
    const idx = this.rules.findIndex(r => r.name === name)
    if (idx >= 0)
      this.rules.splice(idx, 1)
    this.rules.push({ name, fn, enabled: true })
    this.invalidateCache()
  }

  at(name: string, fn: CoreRule) {
    const idx = this.rules.findIndex(r => r.name === name)
    if (idx < 0)
      throw new Error(`Parser rule not found: ${name}`)
    this.rules[idx].fn = fn
    this.invalidateCache()
  }

  before(beforeName: string, name: string, fn: CoreRule) {
    const i = this.rules.findIndex(r => r.name === beforeName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${beforeName}`)
    // remove if already exists
    const exists = this.rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this.rules.splice(exists, 1)
    this.rules.splice(i, 0, { name, fn, enabled: true })
    this.invalidateCache()
  }

  after(afterName: string, name: string, fn: CoreRule) {
    const i = this.rules.findIndex(r => r.name === afterName)
    if (i < 0)
      throw new Error(`Parser rule not found: ${afterName}`)
    const exists = this.rules.findIndex(r => r.name === name)
    if (exists >= 0)
      this.rules.splice(exists, 1)
    this.rules.splice(i + 1, 0, { name, fn, enabled: true })
    this.invalidateCache()
  }

  enable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const list = Array.isArray(names) ? names : [names]
    const changed: string[] = []
    for (const n of list) {
      const idx = this.rules.findIndex(r => r.name === n)
      if (idx < 0) {
        if (!ignoreInvalid)
          throw new Error(`Rules manager: invalid rule name ${n}`)
        continue
      }
      if (!this.rules[idx].enabled) {
        this.rules[idx].enabled = true
        changed.push(n)
      }
    }
    if (changed.length)
      this.invalidateCache()
    return changed
  }

  disable(names: string | string[], ignoreInvalid?: boolean): string[] {
    const list = Array.isArray(names) ? names : [names]
    const changed: string[] = []
    for (const n of list) {
      const idx = this.rules.findIndex(r => r.name === n)
      if (idx < 0) {
        if (!ignoreInvalid)
          throw new Error(`Rules manager: invalid rule name ${n}`)
        continue
      }
      if (this.rules[idx].enabled) {
        this.rules[idx].enabled = false
        changed.push(n)
      }
    }
    if (changed.length)
      this.invalidateCache()
    return changed
  }

  enableOnly(names: string[]) {
    const set = new Set(names)
    let changed = false
    for (const r of this.rules) {
      const next = set.has(r.name)
      if (r.enabled !== next) {
        r.enabled = next
        changed = true
      }
    }
    if (changed)
      this.invalidateCache()
  }

  private compileCache(): void {
    this.cache = this.rules.filter(r => r.enabled).map(r => r.fn)
  }

  getRules(_chainName = ''): CoreRule[] {
    if (!this.cache)
      this.compileCache()
    return this.cache!
  }
}

export default CoreRuler
