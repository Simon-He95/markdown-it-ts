import process from 'node:process'
import { defineConfig } from 'vitest/config'

const runOriginal = process.env.RUN_ORIGINAL === '1'

export default defineConfig({
  test: {
    // Include tests from this project and the original markdown-it project
    include: [
      'test/**/*.{ts,js,mts,mjs}',
    ],
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    globals: true,
    reporters: ['default'],
    exclude: [
      // keep Vitest from treating helper/worker files as tests
      '**/node_modules/**',
      '**/.git/**',
      'test/original/pathological_worker.js',
      'test/original/pathological_worker_thread.mjs',
      'test/original/pathological.json',
      'test/original/cjs.js',
      'test/types/**',
      // Skip original markdown-it suite unless explicitly enabled
      ...(runOriginal ? [] : ['test/original/**']),
    ],
  },
})
