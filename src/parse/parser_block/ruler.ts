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

  push(name: string, fn: any, options?: { alt?: string[] }): void {
    this._rules.push({
      name,
      enabled: true,
      fn,
      alt: options?.alt || [],
    })
  }

  getRules(chainName: string): Array<(state: any, startLine: number, endLine: number, silent: boolean) => boolean> {
    if (chainName === '') {
      return this._rules.filter(rule => rule.enabled).map(rule => rule.fn)
    }

    // Get rules that can be terminated by specific rule names
    const result: typeof this._rules[0]['fn'][] = []
    for (const rule of this._rules) {
      if (rule.enabled && (!chainName || rule.alt.includes(chainName))) {
        result.push(rule.fn)
      }
    }
    return result
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
      this._rules[idx].enabled = true
      result.push(name)
    })

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
      this._rules[idx].enabled = false
      result.push(name)
    })

    return result
  }
}

export default BlockRuler
