import type { State } from '../../parse/state'

// Join adjacent text nodes inside inline tokens
export function text_join(state: State): void {
  const blockTokens = state.tokens || []
  const length = blockTokens.length

  for (let j = 0; j < length; j++) {
    const blockToken = blockTokens[j]
    if (blockToken.type !== 'inline' || !Array.isArray(blockToken.children))
      continue

    const tokens = blockToken.children
    const max = tokens.length

    for (let curr = 0; curr < max; curr++) {
      if (tokens[curr].type === 'text_special')
        tokens[curr].type = 'text'
    }

    let last = 0
    let curr = 0
    for (; curr < max; curr++) {
      if (
        tokens[curr].type === 'text'
        && curr + 1 < max
        && tokens[curr + 1].type === 'text'
      ) {
        tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content
      }
      else {
        if (curr !== last)
          tokens[last] = tokens[curr]
        last++
      }
    }

    if (curr !== last) {
      tokens.length = last
    }
  }
}

export default text_join
