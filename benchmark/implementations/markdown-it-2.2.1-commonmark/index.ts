// Legacy markdown-it 2.2.1 commonmark wrapper — in benchmark repo it required an external
// package. For local testing we use the local implementation as a fallback.

import { parse } from '../../../src/parse'
import { render } from '../../../src/render'

export function run(data: string) {
  const tokens = parse(data)
  return render(tokens)
}
