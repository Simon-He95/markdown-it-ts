// Local wrapper for 'marked' benchmark implementation. If the external `marked` package is
// present in benchmark/extra, original harness would import it. For local tests we fall back
// to using the local markdown-it-ts implementation so tests remain self-contained.

import { parse } from '../../../src/parse'
import { render } from '../../../src/render'

export function run(data: string) {
  const tokens = parse(data)
  return render(tokens)
}
