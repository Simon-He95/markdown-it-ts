import MarkdownIt, {
  Token,
  type MarkdownIt as MarkdownItInstance,
  type MarkdownItPlugin,
  type RendererEnv,
  type RendererOptions,
} from '../../src'
import { chunkedParse, StreamBuffer } from '../../src/experimental'
import type { BlockRuleFn } from '../../src/parse/parser_block/ruler'
import type { InlineRuleFn } from '../../src/parse/parser_inline/ruler'
import type { RendererRule } from '../../src/render/renderer'
import type { CoreRule } from '../../src/rules/core/ruler'

// @ts-expect-error Experimental helpers must stay out of the stable root entry.
import { chunkedParse as rootChunkedParse } from '../../src'

interface DemoEnv extends RendererEnv {
  headings?: string[]
  touchedByCore?: boolean
}

const plugin: MarkdownItPlugin = (md, classNameParam) => {
  const className = typeof classNameParam === 'string' ? classNameParam : 'typed'
  md.renderer.rules.heading_open = ((tokens, idx, options, env, self) => {
    tokens[idx].attrJoin('class', className)
    const demoEnv = env as DemoEnv
    demoEnv.headings ??= []
    demoEnv.headings.push(tokens[idx].tag)
    return self.renderToken(tokens, idx, options)
  }) satisfies RendererRule

  const coreRule: CoreRule = (state) => {
    ;(state.env as DemoEnv).touchedByCore = true
  }
  md.core.ruler.after('inline', 'typed_core_rule', coreRule)

  const blockRule: BlockRuleFn = (state, startLine, _endLine, silent) => {
    if (!silent)
      state.line = startLine
    return false
  }
  md.block.ruler.before('paragraph', 'typed_block_rule', blockRule)

  const inlineRule: InlineRuleFn = (state, silent) => {
    if (!silent)
      state.pending += ''
    return false
  }
  md.inline.ruler.before('text', 'typed_inline_rule', inlineRule)

  return md
}

const rendererOptions: RendererOptions = {
  langPrefix: 'language-',
  highlight: async code => code,
}

const env: DemoEnv = {}
const md = MarkdownIt({ html: false }).use(plugin, 'demo')
const typedMd: MarkdownItInstance = md
const tokens: Token[] = typedMd.parse('# Title', env)
const inlineTokens: Token[] = typedMd.parseInline('**strong**', env)
const html: string = typedMd.render('# Title', env)
const inlineHtml: string = typedMd.renderInline('**strong**', env)
const asyncHtml: Promise<string> = typedMd.renderAsync('```ts\nconst x = 1\n```', env)
const iterableHtml: string = typedMd.renderIterable(['# A\n', '\nB'], env)
const asyncIterableHtml: Promise<string> = typedMd.renderAsyncIterable((async function* chunks() {
  yield '# A\n'
  yield '\nB'
})(), env)

const token = new Token('text', '', 0)
token.attrSet('data-kind', 'demo')
token.attrJoin('class', 'one')
token.meta = { source: 'type-smoke' }
token.children = inlineTokens

const streamBuffer = new StreamBuffer(typedMd)
streamBuffer.feed('# Title\n\n')

const chunkedTokens: Token[] = chunkedParse(typedMd, '# Title\n\nBody', env)

void rootChunkedParse
void rendererOptions
void tokens
void html
void inlineHtml
void asyncHtml
void iterableHtml
void asyncIterableHtml
void token
void streamBuffer
void chunkedTokens
