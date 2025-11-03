import type { State } from '../../parse/state'
import LinkifyIt from 'linkify-it'

const linkifyIt = LinkifyIt()

function makeLinkOpen(href: string, level = 0) {
  return { type: 'link_open', tag: 'a', attrs: [['href', href]], level } as any
}

function makeLinkClose(level = 0) {
  return { type: 'link_close', tag: 'a', level } as any
}

export function linkify(state: State): void {
  const tokens = state.tokens || []

  tokens.forEach((tk) => {
    if (tk.type === 'inline' && Array.isArray(tk.children)) {
      const newChildren: any[] = []
      tk.children.forEach((child: any) => {
        if (child.type === 'text' && typeof child.content === 'string') {
          const text = child.content
          const matches = linkifyIt.match(text)
          if (!matches) {
            newChildren.push(child)
            return
          }

          let lastIndex = 0
          matches.forEach((m: any) => {
            const idx = m.index
            if (idx > lastIndex) {
              newChildren.push({ type: 'text', content: text.slice(lastIndex, idx), level: child.level })
            }
            const url = m.url
            newChildren.push(makeLinkOpen(url, child.level))
            newChildren.push({ type: 'text', content: text.slice(m.index, m.lastIndex), level: child.level + 1 })
            newChildren.push(makeLinkClose(child.level))
            lastIndex = m.lastIndex
          })
          if (lastIndex < text.length) {
            newChildren.push({ type: 'text', content: text.slice(lastIndex), level: child.level })
          }
        }
        else {
          newChildren.push(child)
        }
      })
      tk.children = newChildren
    }
  })
}

export default linkify
