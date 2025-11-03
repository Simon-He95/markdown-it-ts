/**
 * Quick test to verify block parsing works
 */

import { ParserBlock } from './src/parse/parser_block'

const md = {
  options: {
    maxNesting: 100,
    html: true,
  },
  helpers: {
    parseLinkLabel: () => ({ ok: false, pos: 0 }),
    parseLinkDestination: () => ({ ok: false, str: '', pos: 0 }),
    parseLinkTitle: () => ({ ok: false, str: '', pos: 0, can_continue: false }),
  },
  normalizeLink: (url: string) => url,
  validateLink: (_url: string) => true,
  inline: {
    parse: () => {},
  },
  block: null as any,
}

const parser = new ParserBlock()
md.block = parser

const testCases = [
  {
    name: 'Simple paragraph',
    input: 'Hello world',
    expected: ['paragraph_open', 'inline', 'paragraph_close'],
  },
  {
    name: 'ATX heading',
    input: '# Hello',
    expected: ['heading_open', 'inline', 'heading_close'],
  },
  {
    name: 'Code block',
    input: '    code',
    expected: ['code_block'],
  },
  {
    name: 'Fenced code',
    input: '```\ncode\n```',
    expected: ['fence'],
  },
  {
    name: 'Horizontal rule',
    input: '---',
    expected: ['hr'],
  },
  {
    name: 'Blockquote',
    input: '> quote',
    expected: ['blockquote_open', 'paragraph_open', 'inline', 'paragraph_close', 'blockquote_close'],
  },
  {
    name: 'Bullet list',
    input: '- item',
    expected: ['bullet_list_open', 'list_item_open', 'paragraph_open', 'inline', 'paragraph_close', 'list_item_close', 'bullet_list_close'],
  },
]

console.log('🧪 Testing Block Parser\n')

for (const test of testCases) {
  const tokens: any[] = []
  try {
    parser.parse(test.input, md, {}, tokens)
    const types = tokens.map(t => t.type)

    const match = test.expected.every(exp => types.includes(exp))

    if (match) {
      console.log(`✅ ${test.name}`)
      console.log(`   Tokens: ${types.join(', ')}`)
    }
    else {
      console.log(`❌ ${test.name}`)
      console.log(`   Expected: ${test.expected.join(', ')}`)
      console.log(`   Got: ${types.join(', ')}`)
    }
  }
  catch (error) {
    console.log(`❌ ${test.name} - Error: ${error}`)
  }
  console.log()
}

console.log('Done!')
