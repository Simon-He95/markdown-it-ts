import { parse } from './src/parse/index.ts'
import { render } from './src/render/index.ts'

const testCases = [
  'Hello *world* from markdown-it-ts',
  'This is **strong text**',
  'Mix *emphasis* and **strong**',
]

console.log('=== Testing Inline Rules ===\n')

for (const test of testCases) {
  console.log(`Input: "${test}"`)
  const tokens = parse(test)
  console.log('Tokens:', JSON.stringify(tokens, null, 2))
  console.log('HTML:', render(tokens as any))
  console.log('---\n')
}
