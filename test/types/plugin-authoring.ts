import MarkdownIt, {
  Token,
  type MarkdownIt as MarkdownItInstance,
  type MarkdownItPlugin,
  type RendererEnv,
  type RendererOptions,
} from 'markdown-it-ts'
import { ParserCore } from 'markdown-it-ts/core'
import { chunkedParse, StreamBuffer } from 'markdown-it-ts/experimental'
import type { RendererRule } from 'markdown-it-ts/render/renderer'

// @ts-expect-error Experimental helpers must stay out of the stable root entry.
import { chunkedParse as rootChunkedParse } from 'markdown-it-ts'

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

  md.core.ruler.after('inline', 'typed_core_rule', (state) => {
    ;(state.env as DemoEnv).touchedByCore = true
  })

  md.block.ruler.before('paragraph', 'typed_block_rule', (state, startLine, _endLine, silent) => {
    if (!silent)
      state.line = startLine
    return false
  })

  md.inline.ruler.before('text', 'typed_inline_rule', (state, silent) => {
    if (!silent)
      state.pending += ''
    return false
  })

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
const coreTokens: Token[] = new ParserCore().parse('# Core').tokens

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
void coreTokens
