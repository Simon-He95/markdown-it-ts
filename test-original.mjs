// 测试原始 markdown-it 的行为
import MarkdownIt from '../../index.mjs'

const md = new MarkdownIt()

console.log('=== 测试原始 markdown-it ===')

// 测试 1: Emphasis
console.log('\n测试 1: Emphasis')
const src1 = 'Hello *world* from markdown-it-ts'
const html1 = md.render(src1)
console.log('Input:', src1)
console.log('HTML:', html1.trim())
console.log('Expected:', '<p>Hello <em>world</em> from markdown-it-ts</p>')

// 测试 2: Linkify (需要启用)
console.log('\n测试 2: Linkify (默认)')
const src2 = 'Visit http://example.com now'
const html2 = md.render(src2)
console.log('Input:', src2)
console.log('HTML:', html2.trim())

// 测试 2b: Linkify (启用)
console.log('\n测试 2b: Linkify (启用 linkify)')
const md2 = new MarkdownIt({ linkify: true })
const html2b = md2.render(src2)
console.log('Input:', src2)
console.log('HTML:', html2b.trim())

// 查看 tokens
console.log('\n=== Token 结构 ===')
const tokens = md.parse(src1, {})
console.log('Tokens:', JSON.stringify(tokens, null, 2))
