// Simple compilation test
import { ParserBlock } from './src/parse/parser_block'
import { ParserCore } from './src/parse/parser_core'
import { ParserInline } from './src/parse/parser_inline'

console.log('✅ Imports successful')

// Create instances
const block = new ParserBlock()
const inline = new ParserInline()
const core = new ParserCore()

console.log('✅ Instances created')
console.log('✅ Block rules:', block.ruler.getRules('').length)
console.log('✅ Inline rules:', inline.ruler.getRules('').length)
console.log('✅ Core rules:', core.ruler.getRules('').length)

console.log('\n🎉 All basic checks passed!')
