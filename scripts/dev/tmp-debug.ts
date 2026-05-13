import fs from 'node:fs'
import MarkdownIt from './src/index'

const md = MarkdownIt({ stream: true })
const base = '# Heading\n\nParagraph one.\n\n'
const append = 'Appended paragraph.\n'
const updated = base + append

md.stream.resetStats()
md.stream.parse(base)
const tokens = md.stream.parse(updated)

const data = {
  stats: md.stream.stats(),
  tokensLength: tokens.length,
}

fs.writeFileSync('tmp-output.json', JSON.stringify(data, null, 2))
