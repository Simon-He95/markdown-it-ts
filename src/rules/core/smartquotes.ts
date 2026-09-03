// Convert straight quotation marks to typographic ones

import { isPunctCode, isWhiteSpace } from '../../common/utils'

const QUOTE_TEST_RE = /['"]/
const QUOTE_RE = /['"]/g
const APOSTROPHE = '\u2019' /* ' */

function replaceAt(str: string, index: number, ch: string): string {
  return str.slice(0, index) + ch + str.slice(index + 1)
}

function process_inlines(tokens: any[], state: any): void {
  let j: number
  const stack: Array<{ token: number, pos: number, single: boolean, level: number }> = []
  const quotes = (state.md && state.md.options && state.md.options.quotes) || '\u201C\u201D\u2018\u2019'

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const thisLevel = tokens[i].level

    for (j = stack.length - 1; j >= 0; j--) {
      if (stack[j].level <= thisLevel)
        break
    }
    stack.length = j + 1

    if (token.type !== 'text')
      continue

    let text = token.content
    let pos = 0
    let max = text.length

    /* eslint-disable no-labels */
    OUTER:
    while (pos < max) {
      QUOTE_RE.lastIndex = pos
      const t = QUOTE_RE.exec(text)
      if (!t)
        break

      let canOpen = true
      let canClose = true
      pos = t.index + 1
      const isSingle = (t[0] === '\'')

      let lastChar = 0x20
      if (t.index - 1 >= 0) {
        lastChar = text.charCodeAt(t.index - 1)
      }
      else {
        for (j = i - 1; j >= 0; j--) {
          if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak')
            break
          if (!tokens[j].content)
            continue
          lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1)
          break
        }
      }

      let nextChar = 0x20
      if (pos < max) {
        nextChar = text.charCodeAt(pos)
      }
      else {
        for (j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak')
            break
          if (!tokens[j].content)
            continue
          nextChar = tokens[j].content.charCodeAt(0)
          break
        }
      }

      // isPunctCode caches non-ASCII code-point lookups and fast-paths ASCII,
      // avoiding the two giant ucmicro regexes per quote character.
      const isLastPunctChar = isPunctCode(lastChar)
      const isNextPunctChar = isPunctCode(nextChar)
      const isLastWhiteSpace = isWhiteSpace(lastChar)
      const isNextWhiteSpace = isWhiteSpace(nextChar)

      if (isNextWhiteSpace) {
        canOpen = false
      }
      else if (isNextPunctChar) {
        if (!(isLastWhiteSpace || isLastPunctChar))
          canOpen = false
      }

      if (isLastWhiteSpace) {
        canClose = false
      }
      else if (isLastPunctChar) {
        if (!(isNextWhiteSpace || isNextPunctChar))
          canClose = false
      }

      if (nextChar === 0x22 && t[0] === '"') {
        if (lastChar >= 0x30 && lastChar <= 0x39) {
          canClose = canOpen = false
        }
      }

      if (canOpen && canClose) {
        canOpen = isLastPunctChar
        canClose = isNextPunctChar
      }

      if (!canOpen && !canClose) {
        if (isSingle)
          token.content = replaceAt(token.content, t.index, APOSTROPHE)
        continue
      }

      if (canClose) {
        for (j = stack.length - 1; j >= 0; j--) {
          let item = stack[j]
          if (stack[j].level < thisLevel)
            break
          if (item.single === isSingle && stack[j].level === thisLevel) {
            item = stack[j]

            let openQuote: string
            let closeQuote: string
            if (isSingle) {
              openQuote = quotes[2] || '\u2018'
              closeQuote = quotes[3] || '\u2019'
            }
            else {
              openQuote = quotes[0] || '\u201C'
              closeQuote = quotes[1] || '\u201D'
            }

            token.content = replaceAt(token.content, t.index, closeQuote)
            tokens[item.token].content = replaceAt(tokens[item.token].content, item.pos, openQuote)

            pos += closeQuote.length - 1
            if (item.token === i)
              pos += openQuote.length - 1

            text = token.content
            max = text.length

            stack.length = j
            continue OUTER
          }
        }
      }

      if (canOpen) {
        stack.push({ token: i, pos: t.index, single: isSingle, level: thisLevel })
      }
      else if (canClose && isSingle) {
        token.content = replaceAt(token.content, t.index, APOSTROPHE)
      }
    }
    /* eslint-enable no-labels */
  }
}

export function smartquotes(state: any): void {
  if (!state.md.options.typographer)
    return

  for (let blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
    const inlineToken = state.tokens[blkIdx]
    if (inlineToken.type !== 'inline')
      continue

    const inlineContent = typeof inlineToken.content === 'string'
      ? inlineToken.content
      : (inlineToken.children || []).map((t: any) => t.content || '').join('')

    if (!QUOTE_TEST_RE.test(inlineContent) || !inlineToken.children)
      continue

    process_inlines(inlineToken.children, state)
  }
}

export default smartquotes
