export type CoreRule = (state: any) => void

export class CoreRuler {
  private rules: Array<{ name: string, fn: CoreRule }> = []

  push(name: string, fn: CoreRule) {
    this.rules.push({ name, fn })
  }

  getRules(_chainName = ''): CoreRule[] {
    return this.rules.map(r => r.fn)
  }
}

export default CoreRuler
