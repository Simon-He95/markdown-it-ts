#!/usr/bin/env node

// Aggregate a V8 .cpuprofile: self time + total time by function.
// Usage: node scripts/dev/prof-agg.mjs /path/to/profile.cpuprofile [--self]
import { readFileSync } from 'node:fs'

const [profilePath] = process.argv.slice(2)
const profile = JSON.parse(readFileSync(profilePath, 'utf8'))

const byId = new Map(profile.nodes.map(n => [n.id, n]))
const selfMs = new Map()
const totalMs = new Map()
const hitCount = new Map()
const callCount = new Map()

for (const node of profile.nodes) {
  selfMs.set(node.id, 0)
  totalMs.set(node.id, 0)
  hitCount.set(node.id, 0)
}

for (const sample of profile.samples) {
  const id = sample
  selfMs.set(id, (selfMs.get(id) || 0) + profile.timeDeltas?.[0] ?? 1)
}

// proper: use timeDeltas aligned with samples
let idx = 0
const deltas = profile.timeDeltas || []
for (let i = 0; i < profile.samples.length; i++) {
  const delta = deltas[i] ?? 100
  const id = profile.samples[i]
  selfMs.set(id, (selfMs.get(id) || 0) + delta)
}

for (const node of profile.nodes) {
  const total = selfMs.get(node.id) || 0
  totalMs.set(node.id, total)
  const children = node.children || []
  for (const c of children)
    totalMs.set(node.id, (totalMs.get(node.id) || 0) + (totalMs.get(c) || 0))
}

// sum by function name (dedupe by url+name)
const byName = new Map()
for (const node of profile.nodes) {
  const key = `${node.callFrame.functionName || '(anon)'} @ ${node.callFrame.url.split('/').slice(-2).join('/')}:${node.callFrame.lineNumber + 1}`
  const rec = byName.get(key) || { self: 0, total: 0, samples: 0, count: 0 }
  rec.self += selfMs.get(node.id) || 0
  rec.total += totalMs.get(node.id) || 0
  rec.samples += hitCount.get(node.id) || 0
  rec.count++
  byName.set(key, rec)
}

const sorted = [...byName.entries()].sort((a, b) => b[1].total - a[1].total)
for (const [name, rec] of sorted.slice(0, 60)) {
  console.log(
    `${Math.round(rec.total).toString().padStart(8)}ms total | ${Math.round(rec.self).toString().padStart(8)}ms self | ${name}`,
  )
}
console.log(`\ntotal samples: ${profile.samples.length}`)