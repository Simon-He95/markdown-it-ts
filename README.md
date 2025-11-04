# markdown-it-ts

A TypeScript migration of [markdown-it](https://github.com/markdown-it/markdown-it) with modular architecture for tree-shaking and separate parse/render imports.

## 🚀 Migration Status: 100% Complete

This is an **active migration** of markdown-it to TypeScript with the following goals:
- ✅ Full TypeScript type safety
- ✅ Modular architecture (separate parse/render imports)
- ✅ Tree-shaking support
- ✅ Ruler-based rule system
- ✅ API compatibility with original markdown-it

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

#### ✅ Inline System (100%)
- **All 12 inline rules** (text, escape, linkify, strikethrough, etc.) with full post-processing coverage
- StateInline with 18 properties, 3 methods
- InlineRuler implementation mirroring markdown-it behavior

#### ✅ Renderer & Infrastructure (100%)
- Renderer ported from markdown-it with attribute handling & highlight support
- Type definitions with Token interface and renderer options
- Helper functions (parseLinkLabel, parseLinkDestination, parseLinkTitle)
- Common utilities (html_blocks, html_re, utils)
- `markdownit()` instances expose `render`, `renderInline`, and `renderer` for plugin compatibility

## Installation

```bash
npm install markdown-it-ts
```

## Usage

### Basic Parsing (Current State)

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const tokens = md.parse('# Hello World')
console.log(tokens)
```

### Rendering Markdown

Use the built-in renderer for full markdown-it compatibility:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const html = md.render('# Hello World')
console.log(html)
```

If you only need the renderer without the full instance (for tree-shaken builds), you can still import it directly:

```typescript
import { render } from 'markdown-it-ts/render'

const html = render('# Hello World')
console.log(html)
```

### Customization

You can customize the parser and renderer by enabling or disabling specific rules:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
  .enable(['linkify', 'typographer'])
  .disable('html')

const result = md.render('Some markdown content')
console.log(result)
```

### Plugin Authoring (Type-Safe)

Plugins are regular functions that receive the `markdown-it-ts` instance. For full type-safety use the exported `MarkdownItPlugin` type:

```typescript
import markdownIt, { MarkdownItPlugin } from 'markdown-it-ts'

const plugin: MarkdownItPlugin = (md) => {
  md.core.ruler.after('block', 'my_rule', (state) => {
    // custom transform logic
  })
}

const md = markdownIt().use(plugin)
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
