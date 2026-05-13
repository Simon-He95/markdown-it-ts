import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
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
]

for (const file of requiredFiles) {
  const abs = join(root, file)
  if (!existsSync(abs))
    throw new Error(`Missing build output: ${file}`)
}

const indexSize = statSync(join(root, 'dist/index.js')).size

// This catches accidental root bundle code splitting; perf workflow remains the real gate.
if (indexSize < 220_000)
  throw new Error(`dist/index.js looks unexpectedly small (${indexSize} bytes); root parser bundle may have been code-split`)
