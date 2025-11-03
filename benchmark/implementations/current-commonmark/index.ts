// Local 'current-commonmark' benchmark implementation wrapper: use commonmark preset if available

import { parse } from '../../../src/parse'
import { render } from '../../../src/render'

export function run(data: string) {
  // For now, our parse/render wrapper doesn't accept presets; fallback to default render
  const tokens = parse(data)
  return render(tokens)
}
