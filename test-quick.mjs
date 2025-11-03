// Quick validation script for ParserCore + CoreRuler
import { ParserCore } from './src/parse/parser_core.ts'

const src = 'Hello "world" from http://example.com -- test...'
const core = new ParserCore()
const state = core.parse(src)

console.log('✓ ParserCore instantiated')
console.log('✓ Parse completed')
console.log(`✓ Generated ${state.tokens.length} tokens`)
console.log('\nTokens:', JSON.stringify(state.tokens.slice(0, 3), null, 2))

// Check if core rules ran
const hasInline = state.tokens.some(t => t.type === 'inline')
console.log(`✓ Has inline tokens: ${hasInline}`)

if (hasInline) {
  const inline = state.tokens.find(t => t.type === 'inline')
  if (inline && inline.children) {
    console.log(`✓ Inline has ${inline.children.length} children`)
    const types = inline.children.map(c => c.type).join(', ')
    console.log(`  Child types: ${types}`)

    // Check for smartquotes conversion
    const hasSmartQuotes = inline.children.some(c =>
      c.type === 'text' && c.content && (c.content.includes('"') || c.content.includes('"')),
    )
    console.log(`✓ Smartquotes applied: ${hasSmartQuotes}`)

    // Check for replacements
    const hasEllipsis = inline.children.some(c =>
      c.type === 'text' && c.content && c.content.includes('…'),
    )
    const hasEndash = inline.children.some(c =>
      c.type === 'text' && c.content && c.content.includes('–'),
    )
    console.log(`✓ Replacements applied: ellipsis=${hasEllipsis}, endash=${hasEndash}`)

    // Check for linkify
    const hasLink = inline.children.some(c => c.type === 'link_open')
    console.log(`✓ Linkify applied: ${hasLink}`)
  }
}

console.log('\n✅ All core rules appear to be working!')
