// Local 'current' implementation wrapper for benchmark tests — uses markdown-it-ts implementation
// Export a run(data:string) function as the benchmark harness expects.

import { parse } from '../../../src/parse'
import { render } from '../../../src/render'

export function run(data: string) {
  const tokens = parse(data)
  return render(tokens)
}
