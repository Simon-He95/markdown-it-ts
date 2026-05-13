import MarkdownIt from './src/index.ts'

try {
  const md = MarkdownIt({ stream: true })

  const base = '# Title\n\nParagraph\n'
  const append = '-\n'
  const updated = base + append

  md.stream.resetStats()
  md.stream.parse(base)
  const tokens = md.stream.parse(updated)

  console.log('stats', md.stream.stats())
  console.log('tokens length', tokens.length)
}
catch (error) {
  console.error('error', error)
  console.error('stack', error?.stack)
}
