import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')

const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/core.js',
  'dist/core.d.ts',
  'dist/experimental.js',
  'dist/experimental.d.ts',
  'dist/plugins/with-renderer.js',
  'dist/plugins/with-renderer.d.ts',
  'dist/render/renderer.js',
  'dist/render/renderer.d.ts',
  'dist/stream/buffer.js',
  'dist/stream/buffer.d.ts',
  'dist/stream/chunked.js',
  'dist/stream/chunked.d.ts',
  'dist/stream/debounced.js',
  'dist/stream/debounced.d.ts',
  'dist/support/chunk_recommend.js',
  'dist/support/chunk_recommend.d.ts',
  'dist/common/token.js',
  'dist/common/token.d.ts',
  'dist/common/utils.js',
  'dist/common/utils.d.ts',
  'dist/types/index.d.ts',
]

for (const file of requiredFiles) {
  const abs = join(root, file)
  if (!existsSync(abs))
    throw new Error(`Missing build output: ${file}`)
}

function walk(dir) {
  const out = []

  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    const st = statSync(abs)

    if (st.isDirectory())
      out.push(...walk(abs))
    else
      out.push(abs)
  }

  return out
}

const dtsFiles = walk(dist).filter(file => file.endsWith('.d.ts'))

for (const file of dtsFiles) {
  const text = readFileSync(file, 'utf8')
  if (text.includes('__export'))
    throw new Error(`Invalid declaration helper leaked into ${file}`)
}

const withRendererDts = readFileSync(join(root, 'dist/plugins/with-renderer.d.ts'), 'utf8')
if (!withRendererDts.includes('from \'../index') && !withRendererDts.includes('from "../index')) {
  throw new Error('dist/plugins/with-renderer.d.ts must import MarkdownIt types from ../index to preserve type identity')
}
