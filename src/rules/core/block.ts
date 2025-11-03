/**
 * Core rule: block
 * Runs block-level parser on the input.
 */
export function block(state: any): void {
  if (state.inlineMode) {
    // In inline mode, create a single inline token instead of parsing blocks
    const token = {
      type: 'inline',
      tag: '',
      content: state.src,
      map: [0, 1],
      children: [],
      level: 0,
    }
    state.tokens.push(token)
  }
  else {
    // Normal mode: run block parser with correct signature
    if (state.md && state.md.block) {
      state.md.block.parse(state.src, state.md, state.env, state.tokens)
    }
  }
}

export default block
