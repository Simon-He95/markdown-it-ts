import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packageSpec = process.argv[2] || process.env.MDTS_PACKAGE_SPEC || `file:${root}`
const tmp = mkdtempSync(join(tmpdir(), 'markdown-it-ts-package-types-'))

writeFileSync(join(tmp, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))
execFileSync('pnpm', ['add', packageSpec, 'typescript@^5.9.3'], { cwd: tmp, stdio: 'inherit' })

writeFileSync(join(tmp, 'smoke.ts'), `
import MarkdownIt, {
  Token,
  withRenderer,
  type MarkdownIt as MarkdownItInstance,
  type MarkdownItPlugin,
  type RendererEnv,
} from 'markdown-it-ts'
import {
  ParserCore,
  Token as CoreToken,
} from 'markdown-it-ts/core'
import {
  chunkedParse,
  EditableBuffer,
  PieceTable,
  StreamBuffer,
  UnboundedBuffer,
  getParseDiagnostics,
  parseAsyncIterable,
  parseAsyncIterableToSink,
  parseIterable,
  parseIterableToSink,
  type StreamStats,
} from 'markdown-it-ts/experimental'
import Renderer, { type RendererRule } from 'markdown-it-ts/render/renderer'
import { StreamBuffer as StreamBufferSubpath } from 'markdown-it-ts/stream/buffer'
import { chunkedParse as chunkedParseSubpath } from 'markdown-it-ts/stream/chunked'
import {
  DebouncedStreamParser,
  ThrottledStreamParser,
} from 'markdown-it-ts/stream/debounced'
import {
  recommendFullChunkStrategy,
  recommendStreamChunkStrategy,
} from 'markdown-it-ts/support/chunk_recommend'
import { countLines, escapeHtml } from 'markdown-it-ts/common/utils'

interface DemoEnv extends RendererEnv {
  headings?: string[]
  touchedByCore?: boolean
}

type IsAny<T> = 0 extends (1 & T) ? true : false
type ExpectFalse<T extends false> = T

const plugin: MarkdownItPlugin = (md) => {
  md.renderer.rules.heading_open = ((tokens, idx, options, env, self) => {
    const demoEnv = env as DemoEnv
    demoEnv.headings ??= []
    demoEnv.headings.push(tokens[idx].tag)
    return self.renderToken(tokens, idx, options)
  }) satisfies RendererRule

  md.core.ruler.after('inline', 'typed_package_core_rule', (state) => {
    type CoreStateIsTyped = ExpectFalse<IsAny<typeof state>>
    const inlineMode: boolean = state.inlineMode
    const tokens: Token[] = state.tokens
    void inlineMode
    void tokens
    void (null as unknown as CoreStateIsTyped)
    ;(state.env as DemoEnv).touchedByCore = true
  })

  md.block.ruler.before('paragraph', 'typed_package_block_rule', (state, startLine, _endLine, silent) => {
    type BlockStateIsTyped = ExpectFalse<IsAny<typeof state>>
    const line: number = state.line
    const parentType: string = state.parentType
    const sourceLine: string = state.getLines(startLine, startLine + 1, 0, false)
    const push: (type: string, tag: string, nesting: number) => Token = state.push.bind(state)
    void line
    void parentType
    void sourceLine
    void push
    void (null as unknown as BlockStateIsTyped)
    if (!silent)
      state.line = startLine
    return false
  })

  md.inline.ruler.before('text', 'typed_package_inline_rule', (state, silent) => {
    type InlineStateIsTyped = ExpectFalse<IsAny<typeof state>>
    const pos: number = state.pos
    const pending: string = state.pending
    const push: (type: string, tag: string, nesting: number) => Token = state.push.bind(state)
    void pos
    void pending
    void push
    void (null as unknown as InlineStateIsTyped)
    if (!silent)
      state.pending += ''
    return false
  })
}

const env: DemoEnv = {}
const md = MarkdownIt().use(plugin)
const namespacedOptionsMd = MarkdownIt({
  experimental: {
    fullChunkedFallback: true,
  },
})
const typedMd: MarkdownItInstance = md
const patched: MarkdownItInstance = withRenderer(typedMd)
const html: string = patched.render('# typed', env)
const tokens: Token[] = patched.parse('# typed', env)
const renderer = new Renderer()
const token = new Token('text', '', 0)
function readDefaultMeta(defaultToken: Token) {
  if (defaultToken.meta?.source) {
    const source: string = defaultToken.meta.source
    void source
  }
}
const typedMetaToken = new Token<{ source: string }>('text', '', 0)
typedMetaToken.meta = { source: 'package-type-smoke' }
const core = new ParserCore()
const coreToken = new CoreToken('text', '', 0)
const streamBuffer = new StreamBuffer(typedMd)
const streamStats: StreamStats = typedMd.stream.stats()
const chunkedTokens: Token[] = chunkedParse(typedMd, '# Title\\n\\nBody', env)
const diagnostics = getParseDiagnostics(env)
const iterableTokens: Token[] = parseIterable(typedMd, ['# A\\n', '\\nB'], env)
const asyncTokens: Promise<Token[]> = parseAsyncIterable(typedMd, (async function* chunks() {
  yield '# A\\n'
  yield '\\nB'
})(), env)
const sinkStats = parseIterableToSink(typedMd, ['# A\\n'], () => {}, env)
const asyncSinkStats = parseAsyncIterableToSink(typedMd, (async function* chunks() {
  yield '# A\\n'
})(), () => {}, env)

void html
void tokens
void renderer
void token
void readDefaultMeta
void typedMetaToken
void core
void coreToken
void streamBuffer
void streamStats
void chunkedTokens
void diagnostics
void namespacedOptionsMd
void iterableTokens
void asyncTokens
void sinkStats
void asyncSinkStats
void EditableBuffer
void PieceTable
void UnboundedBuffer
void StreamBufferSubpath
void chunkedParseSubpath
void DebouncedStreamParser
void ThrottledStreamParser
void recommendFullChunkStrategy
void recommendStreamChunkStrategy
void countLines
void escapeHtml
`)

writeFileSync(join(tmp, 'negative-smoke.ts'), `
// @ts-expect-error chunkedParse must not be a root named export.
import { chunkedParse } from 'markdown-it-ts'

// @ts-expect-error getParseDiagnostics must not be a root named export.
import { getParseDiagnostics } from 'markdown-it-ts'

// @ts-expect-error StreamBuffer must not be a root named export.
import { StreamBuffer } from 'markdown-it-ts'

// @ts-expect-error UnboundedBuffer must not be a root named export.
import { UnboundedBuffer } from 'markdown-it-ts'

// @ts-expect-error EditableBuffer must not be a root named export.
import { EditableBuffer } from 'markdown-it-ts'

// @ts-expect-error PieceTable must not be a root named export.
import { PieceTable } from 'markdown-it-ts'

// @ts-expect-error parseIterable must not be a root named export.
import { parseIterable } from 'markdown-it-ts'

// @ts-expect-error parseAsyncIterable must not be a root named export.
import { parseAsyncIterable } from 'markdown-it-ts'

// @ts-expect-error parseIterableToSink must not be a root named export.
import { parseIterableToSink } from 'markdown-it-ts'

// @ts-expect-error parseAsyncIterableToSink must not be a root named export.
import { parseAsyncIterableToSink } from 'markdown-it-ts'

// @ts-expect-error recommendFullChunkStrategy must not be a root named export.
import { recommendFullChunkStrategy } from 'markdown-it-ts'

// @ts-expect-error recommendStreamChunkStrategy must not be a root named export.
import { recommendStreamChunkStrategy } from 'markdown-it-ts'

// @ts-expect-error DebouncedStreamParser must not be a root named export.
import { DebouncedStreamParser } from 'markdown-it-ts'

// @ts-expect-error ThrottledStreamParser must not be a root named export.
import { ThrottledStreamParser } from 'markdown-it-ts'

// @ts-expect-error ChunkedOptions must not be a root named export.
import type { ChunkedOptions } from 'markdown-it-ts'

// @ts-expect-error StreamStats must not be a root named export.
import type { StreamStats } from 'markdown-it-ts'

// @ts-expect-error EditableBufferStats must not be a root named export.
import type { EditableBufferStats } from 'markdown-it-ts'

// @ts-expect-error PieceTableStats must not be a root named export.
import type { PieceTableStats } from 'markdown-it-ts'

// @ts-expect-error UnboundedBufferOptions must not be a root named export.
import type { UnboundedBufferOptions } from 'markdown-it-ts'
`)

const tscArgs = [
  '--module',
  'NodeNext',
  '--moduleResolution',
  'NodeNext',
  '--target',
  'ES2022',
  '--strict',
  '--noEmit',
]

execFileSync('pnpm', ['exec', 'tsc', 'smoke.ts', ...tscArgs], { cwd: tmp, stdio: 'inherit' })
execFileSync('pnpm', ['exec', 'tsc', 'negative-smoke.ts', ...tscArgs], { cwd: tmp, stdio: 'inherit' })

console.log(`Package type smoke passed in ${tmp}`)
