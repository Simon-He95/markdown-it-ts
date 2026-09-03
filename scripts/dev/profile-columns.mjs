#!/usr/bin/env node

// Run perf-feature-profile for a given dist (old|new) N times and extract the
// median TS parse + TS render columns per corpus.
// Usage: swap the desired dist into ./dist, then:
//   node --expose-gc scripts/dev/profile-columns.mjs <old|new> <rounds>
// Results land in /tmp/cols/<side>.json for before/after comparison.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const [side, roundsArg] = process.argv.slice(2)
const rounds = Number(roundsArg || 3)

mkdirSync('/tmp/cols', { recursive: true })

function extract(line) {
  // | name | chars | ts-parse | stockDelta | mdi-parse | ox-parse | path | attempt | tokens | ts-token-render | ts-e2e | stockRenderDelta | ox-e2e | render-path |
  const parts = line.split('|').map(s => s.trim())
  const n = (v) => Number(v.replace('ms', ''))
  return {
    name: parts[1],
    chars: parts[2],
    tsParse: n(parts[3]),
    tsTokenRender: n(parts[10]),
    tsE2e: n(parts[11]),
  }
}

const byName = new Map()
for (let round = 0; round < rounds; round++) {
  const result = spawnSync(process.execPath, ['--expose-gc', 'scripts/perf-feature-profile.mjs'], {
    cwd: '/Users/Simon/Github/markdown-it-ts',
    encoding: 'utf8',
    env: { ...process.env, MDTS_PROFILE_TARGET_CHARS: '50000', MDTS_PROFILE_SAMPLES: '5' },
    timeout: 600_000,
  })
  for (const line of result.stdout.split('\n')) {
    if (!line.trim().startsWith('|') || !line.includes('ms'))
      continue
    if (!/^\| [a-z-]+ \|/.test(line))
      continue
    const parts = line.split('|').map(s => s.trim())
    if (parts.length < 13 || !['plain-text', 'inline-formatting', 'links-media-autolinks', 'nested-blocks', 'tables-strikethrough', 'fenced-code', 'feature-mixed', 'stock-repeated', 'stock-unique', 'stock-near-miss'].includes(parts[1]))
      continue
    const rec = extract(line)
    if (!byName.has(rec.name))
      byName.set(rec.name, [])
    byName.get(rec.name).push(rec)
  }
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

const out = []
for (const [name, recs] of byName) {
  out.push({
    name,
    chars: recs[0].chars,
    tsParseMedian: median(recs.map(r => r.tsParse)),
    tsTokenRenderMedian: median(recs.map(r => r.tsTokenRender)),
    tsE2eMedian: median(recs.map(r => r.tsE2e)),
    runs: recs.length,
  })
}
out.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(`/tmp/cols/${side}.json`, JSON.stringify(out, null, 2))
console.log(`wrote /tmp/cols/${side}.json (${out.length} corpora, ${rounds} rounds)`)
for (const r of out)
  console.log(`${r.name.padEnd(24)} parse ${r.tsParseMedian.toFixed(4)}ms  tokenRender ${r.tsTokenRenderMedian.toFixed(4)}ms  e2e ${r.tsE2eMedian.toFixed(4)}ms`)