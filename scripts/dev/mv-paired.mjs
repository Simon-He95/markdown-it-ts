#!/usr/bin/env node

// Paired same-process A/B in the real markstream-vue parser package:
// /tmp/mdtsA (old markdown-it-ts) vs /tmp/mdtsB (new). Alternates per sample
// to cancel machine-load drift, reports median of per-sample deltas.
//
// Prerequisites:
//   mkdir -p /tmp/mdtsA/node_modules /tmp/mdtsB/node_modules
//   cp -r <markstream-vue>/packages/markdown-parser/dist /tmp/mdtsA/dist
//   cp -r <markstream-vue>/packages/markdown-parser/dist /tmp/mdtsB/dist
//   cp -r <old markdown-it-ts dist> /tmp/mdtsA/node_modules/markdown-it-ts
//   cp -r <new markdown-it-ts dist> /tmp/mdtsB/node_modules/markdown-it-ts
// Run with NODE_PATH=<markstream-vue>/packages/markdown-parser/node_modules
//   node --expose-gc scripts/dev/mv-paired.mjs [parse|stream]
import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const reqA = createRequire('/tmp/mdtsA/dist/index.cjs')
const reqB = createRequire('/tmp/mdtsB/dist/index.cjs')
const { getMarkdown: getMarkdownA } = reqA('./index.cjs')
const { getMarkdown: getMarkdownB } = reqB('./index.cjs')

const streams = process.argv[2] === 'stream'

function make(getMarkdown) {
  const md = getMarkdown('paired', { markdownItOptions: { experimental: { stream: streams } } })
  return md
}

const mdA = make(getMarkdownA)
const mdB = make(getMarkdownB)

const files = ['README.md', 'docs/architecture.md', 'docs/development.md', 'docs/PERFORMANCE_OPTIMIZATION_SUMMARY.md', 'README.zh-CN.md']
let src = files.map(f => readFileSync(f, 'utf8')).join('\n\n')
let chat = ''
for (let i = 0; i < 300; i++)
  chat += `用户 ${i}: 看看 https://example.com/issue/${i} 还有 "quote" 100% (c)\n\n`
src += chat

const segments = []
for (let i = 0; i < 60; i++)
  segments.push(`用户 ${i}: 看看 https://example.com/issue/${i} 还有 "quote" 100%\n\n`)

function bench(md) {
  if (streams) {
    md.stream.reset()
    md.stream.parse(src, {})
    const t0 = performance.now()
    for (let i = 0; i < segments.length; i++)
      md.stream.append(segments[i], {})
    return (performance.now() - t0) / segments.length
  }
  const t0 = performance.now()
  for (let i = 0; i < 8; i++)
    md.parse(src, { __markstreamFinal: true })
  return (performance.now() - t0) / 8
}

// warmup both
for (let i = 0; i < 5; i++) {
  bench(mdA)
  bench(mdB)
}

const aVals = []
const bVals = []
const SAMPLES = 9
for (let s = 0; s < SAMPLES; s++) {
  if (globalThis.gc)
    globalThis.gc()
  if (s % 2 === 0) {
    aVals.push(bench(mdA))
    bVals.push(bench(mdB))
  }
  else {
    bVals.push(bench(mdB))
    aVals.push(bench(mdA))
  }
}

function median(arr) {
  const sorted = [...arr].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const aM = median(aVals)
const bM = median(bVals)
const deltas = aVals.map((a, i) => (bVals[i] - a) / a)
console.log(JSON.stringify({
  mode: streams ? 'stream-append' : 'full-parse',
  oldMs: aM,
  newMs: bM,
  deltaPct: 100 * (bM - aM) / aM,
  medianPairDeltaPct: 100 * median(deltas),
  samples: SAMPLES,
  chars: src.length,
}))