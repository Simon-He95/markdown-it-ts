# markdown-it-ts

A TypeScript migration of [markdown-it](https://github.com/markdown-it/markdown-it) with modular architecture for tree-shaking and separate parse/render imports.

## 🚀 Migration Status: ~85% Complete

This is an **active migration** of markdown-it to TypeScript with the following goals:
- ✅ Full TypeScript type safety
- ✅ Modular architecture (separate parse/render imports)
- ✅ Tree-shaking support
- ✅ Ruler-based rule system
- ⚠️ API compatibility with original markdown-it

### What's Implemented

#### ✅ Core System (100%)
- All 7 core rules (normalize, block, inline, linkify, replacements, smartquotes, text_join)
- CoreRuler with enable/disable/getRules support
- Full parsing pipeline

#### ✅ Block System (100%)
- **All 11 block rules**:
  - table (GFM tables)
  - code (indented code blocks)
  - fence (fenced code blocks)
  - blockquote (block quotes)
  - hr (horizontal rules)
  - list (bullet and ordered lists with nesting)
  - reference (link reference definitions)
  - html_block (raw HTML blocks)
  - heading (ATX headings `#`)
  - lheading (Setext headings `===`)
  - paragraph (paragraphs)
- StateBlock with full line tracking (200+ lines)
- BlockRuler implementation (80 lines)
- ParserBlock refactored with Ruler pattern

#### ✅ Inline System (83%)
- **10/12 inline rules**:
  - text, newline, escape, backticks
  - emphasis (with tokenize & postProcess)
  - link, image, autolink
  - html_inline, entity
  - ⚠️ Missing: linkify (needs linkify-it), strikethrough (GFM)
- StateInline with 18 properties, 3 methods
- InlineRuler implementation
- 3/4 post-process rules (balance_pairs, emphasis.postProcess, fragments_join)

#### ✅ Infrastructure (100%)
- Type definitions with Token interface
- Helper functions (parseLinkLabel, parseLinkDestination, parseLinkTitle)
- Common utilities (html_blocks, html_re, utils)

### What's Missing
- ⚠️ 2 optional inline rules (linkify, strikethrough)
- ⚠️ Complete test suite validation
- ⚠️ Renderer implementation
- ⚠️ Plugin system integration

## Installation

```bash
npm install markdown-it-ts
```

## Usage

### Basic Parsing (Current State)

```typescript
import { ParserBlock } from 'markdown-it-ts/parse'

const tokens = parse('# Hello World')
console.log(tokens)
```

### Rendering Markdown

To render Markdown to HTML, you can import the rendering functionalities:

```typescript
import { render } from 'markdown-it-ts/render'

const html = render('# Hello World')
console.log(html)
```

### Customization

You can customize the parser and renderer by enabling or disabling specific rules:

```typescript
import MarkdownIt from 'markdown-it-ts'

const md = new MarkdownIt()
  .enable(['linkify', 'typographer'])
  .disable('html')

const result = md.render('Some markdown content')
console.log(result)
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
