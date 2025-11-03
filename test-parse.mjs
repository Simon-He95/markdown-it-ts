import { parse } from './src/parse/index.ts'
import { render } from './src/render/index.ts'

// 测试 1: 基本的 emphasis 解析
console.log('=== 测试 1: Emphasis ===')
const src1 = 'Hello *world* from markdown-it-ts'
const tokens1 = parse(src1)
console.log('Tokens:', JSON.stringify(tokens1, null, 2))
const html1 = render(tokens1, {})
console.log('HTML:', html1)
console.log('Expected:', '<p>Hello <em>world</em> from markdown-it-ts</p>')
console.log('Match:', html1 === '<p>Hello <em>world</em> from markdown-it-ts</p>')

// 测试 2: Linkify
console.log('\n=== 测试 2: Linkify ===')
const src2 = 'Visit http://example.com now'
const tokens2 = parse(src2)
console.log('Tokens:', JSON.stringify(tokens2, null, 2))
const html2 = render(tokens2, {})
console.log('HTML:', html2)

// 检查 inline token
const inlineToken = tokens2.find(t => t.type === 'inline')
console.log('Inline token:', inlineToken)
if (inlineToken && inlineToken.children) {
  console.log('Children types:', inlineToken.children.map(c => c.type))
}
