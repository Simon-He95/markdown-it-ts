import { MarkdownIt } from './dist/index.mjs'

const md = new MarkdownIt()

// Test basic emphasis
const testCases = [
  { input: 'Hello *world* from markdown-it-ts', desc: 'basic emphasis' },
  { input: 'Hello **world** from markdown-it-ts', desc: 'basic strong' },
  { input: '*italic* and **bold**', desc: 'mixed emphasis' },
  { input: '_italic_ and __bold__', desc: 'underscore emphasis' },
]

console.log('Testing emphasis parsing...\n')

for (const { input, desc } of testCases) {
  console.log(`Test: ${desc}`)
  console.log(`Input: "${input}"`)

  const result = md.render(input)
  console.log(`Output: ${result.trim()}`)
  console.log()
}
