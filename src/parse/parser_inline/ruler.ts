/**
 * InlineRuler - manages inline parsing rules
 * Similar to original markdown-it/lib/ruler.mjs but for inline rules
 */

export interface InlineRule {
  name: string
  fn: (state: any, silent?: boolean) => boolean | void
  alt?: string[]
}

export class InlineRuler {
  private rules: InlineRule[] = []

  /**
   * Push new rule to the end of chain
   */
  public push(name: string, fn: (state: any, silent?: boolean) => boolean | void, options?: { alt?: string[] }) {
    this.rules.push({
      name,
      fn,
      alt: options?.alt || [],
    })
  }

  /**
   * Get rules for specified chain name (or empty string for default)
   * Note: chainName is ignored for inline rules, always returns all rules
   */
  public getRules(_chainName: string): Array<(state: any, silent?: boolean) => boolean | void> {
    return this.rules.map(rule => rule.fn)
  }

  /**
   * Get rule by name
   */
  public at(name: string): InlineRule | undefined {
    return this.rules.find(rule => rule.name === name)
  }
}

export default InlineRuler
