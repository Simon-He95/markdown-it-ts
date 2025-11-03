import type { State } from '../../parse/state'

export function replacements(state: State): void {
  const tokens = state.tokens || []
  tokens.forEach((tk) => {
    if (tk.type === 'inline' && Array.isArray(tk.children)) {
      tk.children.forEach((ch: any) => {
        if (ch.type === 'text' && typeof ch.content === 'string') {
          ch.content = ch.content
            .replace(/\.\.\./g, '…')
            .replace(/---/g, '—')
            .replace(/--/g, '–')
        }
      })
    }
  })
}

export default replacements
