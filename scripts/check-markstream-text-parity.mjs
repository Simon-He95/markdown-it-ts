import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
assert(option('baseline') && option('candidate'), 'Pass --baseline=<parser.mjs> and --candidate=<parser.mjs>')
const baseline = await import(pathToFileURL(resolve(option('baseline'))).href)
const candidate = await import(pathToFileURL(resolve(option('candidate'))).href)
let checks = 0
for (const final of [false, true]) {
  for (const raw of [undefined, 'raw undefined', 'raw\\*escaped*']) {
    const contents = ['undefined', 'a undefined', '中文文字', '<', '']
    for (let code = 0; code < 128; code++) {
      const char = String.fromCharCode(code)
      contents.push(char, `hello${char}world`, `hello${char}`)
    }
    for (const content of new Set(contents)) {
      const token = { type: 'text', content, markup: '', loading: false }
      assert.deepEqual(
        candidate.parseInlineTokens([{ ...token }], raw, undefined, { final }),
        baseline.parseInlineTokens([{ ...token }], raw, undefined, { final }),
        JSON.stringify({ content, raw, final }),
      )
      checks++
    }
  }
}
console.log(`Strict text parity passed: ${checks} distinct content/raw/final cases.`)
