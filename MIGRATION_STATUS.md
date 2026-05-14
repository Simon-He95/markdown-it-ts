# Markdown-it TypeScript Migration Status

## Core Port Complete; 1.0 Stable Surface Defined

The TypeScript rewrite covers the original markdown-it core parser, renderer, and public plugin hooks. As of `1.0.0`, the root entry targets the stable markdown-it public API compatibility surface. Streaming, chunked, unbounded, and editable-buffer APIs remain available through `markdown-it-ts/experimental` or explicit subpaths and should be treated as advanced/experimental.

### ✅ Core & Parsing Pipeline
- ParserCore orchestrates the canonical 7-rule core pipeline.
- BlockRuler/InlineRuler/CoreRuler are fully ported with enable/disable/enableOnly utilities.
- StateCore, StateBlock, and StateInline are fully implemented with exhaustive TypeScript coverage.

### ✅ Inline System
- All 12 inline rules (text, escape, linkify, strikethrough, etc.) plus their post-processing counterparts are implemented.
- Inline linkify support leverages `linkify-it`, matching upstream behavior.
- Plugins can inject additional inline/token rules with full typing support.

### ✅ Block System
- All 11 block rules (tables, lists, fences, references, headings, etc.) are complete.
- Tight/loose list handling, nesting guards, and termination checks behave identically to markdown-it.

### ✅ Renderer & Ecosystem Compatibility
- Renderer has been ported with the full default rule set and attribute handling semantics.
- `markdownit()` instances expose `render`, `renderInline`, and `renderer` by default for plugins that use the markdown-it public API.
- `withRenderer` remains available for tree-shaken core-only builds and is idempotent when applied to full instances.

### ✅ Tooling & Types
- Public type definitions cover `MarkdownIt`, tokens, parser states, and renderer options.
- The test suite includes upstream markdown-it fixtures and local plugin/stream coverage to guard behavioral parity for supported public API paths.

## Current Focus

- 📚 Refresh documentation to describe the renderer integration, TypeScript plugin ergonomics, and migration guidance.
- 🧪 Continue adding regression tests for edge cases surfaced by consumers.
- ⚙️ Explore performance benchmarks and potential micro-optimizations once documentation lands.
