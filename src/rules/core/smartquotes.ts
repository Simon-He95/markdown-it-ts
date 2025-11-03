import type { State } from '../../parse/state'

export function smartquotes(state: State): void {
  const tokens = state.tokens || []
  tokens.forEach((tk) => {
    if (tk.type === 'inline' && Array.isArray(tk.children)) {
      let doubleOpen = true
      let singleOpen = true

      tk.children.forEach((ch: any) => {
        if (ch.type === 'text' && typeof ch.content === 'string') {
          let text = ch.content
          text = text.replace(/"/g, () => {
            const r = doubleOpen ? '“' : '”'
            doubleOpen = !doubleOpen
            return r
          })
          text = text.replace(/'/g, () => {
            const r = singleOpen ? '‘' : '’'
            singleOpen = !singleOpen
            return r
          })
          ch.content = text
        }
      })
    }
  })
}

export default smartquotes
