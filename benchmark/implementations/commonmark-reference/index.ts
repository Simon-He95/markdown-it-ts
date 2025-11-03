// Local wrapper for 'commonmark-reference' benchmark implementation. If the external
// commonmark package is available under benchmark/extra, it would be used in original
// repo. Here we fallback to using the local markdown-it-ts implementation for consistency.

import { parse } from '../../../src/parse'
import { render } from '../../../src/render'

export function run(data: string) {
  const tokens = parse(data)
  return render(tokens)
}
