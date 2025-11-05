import MarkdownIt from './dist/index.js'

const md = MarkdownIt({ stream: true })

const base = '# Title\n\nParagraph\n'
const append = '-\n'
const updated = base + append

md.stream.resetStats()
md.stream.parse(base)
const tokens = md.stream.parse(updated)

console.log('stats', md.stream.stats())
console.log('parse calls expected 2? tokens len', tokens.length)
