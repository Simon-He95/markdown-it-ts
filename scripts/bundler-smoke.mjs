import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'markdown-it-ts-bundler-'))
const packageSpec = process.env.MDTS_PACKAGE_SPEC || `file:${root}`

writeFileSync(join(tmp, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))
execFileSync('pnpm', ['add', packageSpec], { cwd: tmp, stdio: 'inherit' })

const entry = join(tmp, 'entry.js')
const output = join(tmp, 'bundle.mjs')

writeFileSync(entry, `
import MarkdownIt from 'markdown-it-ts'
import { Token } from 'markdown-it-ts/common/token'
import { escapeHtml } from 'markdown-it-ts/common/utils'
import { withRenderer } from 'markdown-it-ts/plugins/with-renderer'
import { Renderer } from 'markdown-it-ts/render/renderer'
import { StreamBuffer } from 'markdown-it-ts/stream/buffer'
import { chunkedParse } from 'markdown-it-ts/stream/chunked'
import { CachedStreamParser } from 'markdown-it-ts/stream/cached'
import { ChunkTable } from 'markdown-it-ts/stream/chunk-table'
import { chunkedParse as experimentalChunkedParse, UnboundedBuffer } from 'markdown-it-ts/experimental'

const md = withRenderer(MarkdownIt({ stream: true }))
const html = md.render('# bundled')
const renderer = new Renderer()
const token = new Token('text', '', 0)
const stream = new StreamBuffer(md)
stream.feed('# bundled\\n\\n')
const cached = new CachedStreamParser(md.core)
const table = new ChunkTable()
const chunked = chunkedParse(md, '# bundled\\n\\nbody')
const experimental = experimentalChunkedParse(md, '# bundled\\n\\nbody')
const buffer = new UnboundedBuffer(md)
buffer.feed('# bundled\\n\\n')

if (html !== '<h1>bundled</h1>\\n')
  throw new Error('unexpected bundled render output')

if (escapeHtml('<>&"') !== '&lt;&gt;&amp;&quot;')
  throw new Error('unexpected escapeHtml output')

if (typeof renderer.render !== 'function' || token.type !== 'text' || typeof cached.parse !== 'function' || table.size !== 0 || chunked.length === 0 || experimental.length === 0)
  throw new Error('bundled exports are not usable')
`)

const bundle = await rollup({
  input: entry,
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
  ],
  treeshake: true,
})

await bundle.write({
  file: output,
  format: 'esm',
})
await bundle.close()

execFileSync(process.execPath, [output], { cwd: tmp, stdio: 'inherit' })

const bundled = readFileSync(output, 'utf8')
if (!bundled.includes('bundled'))
  throw new Error('bundle smoke output did not include entry code')

console.log(`Bundler smoke passed in ${tmp}`)
