import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import MarkdownIt, { EditableBuffer } from '../dist/index.js'

const SIZES = [100_000, 500_000, 1_000_000, 5_000_000]

function para(n) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function makeParasByChars(targetChars) {
  const paras = []
  let doc = ''
  let i = 0
  while (doc.length < targetChars) {
    const p = para(i++)
    paras.push(p)
    doc += p
  }
  return { paras, doc }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function pickBench(size) {
  if (size <= 100_000)
    return { samples: 4, repeats: 8 }
  if (size <= 500_000)
    return { samples: 3, repeats: 4 }
  if (size <= 1_000_000)
    return { samples: 3, repeats: 2 }
  return { samples: 2, repeats: 1 }
}

function fmt(ms) {
  return ms < 10 ? `${ms.toFixed(4)}ms` : `${ms.toFixed(2)}ms`
}

function measureEditable(doc, marker, replacement, samples, repeats) {
  const md = MarkdownIt()
  const values = []
  let lastStats = null
  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0
    for (let i = 0; i < repeats; i++) {
      const buffer = new EditableBuffer(md, doc)
      buffer.parse({})
      const start = buffer.toString().indexOf(marker)
      const t0 = performance.now()
      buffer.replace(start, start + marker.length, replacement, {})
      elapsed += performance.now() - t0
      lastStats = buffer.stats()
    }
    values.push(elapsed / repeats)
  }
  return { ms: median(values), stats: lastStats }
}

function measureFull(doc, marker, replacement, samples, repeats) {
  const md = MarkdownIt({ stream: false })
  const values = []
  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0
    for (let i = 0; i < repeats; i++) {
      const updated = doc.replace(marker, replacement)
      const t0 = performance.now()
      md.parse(updated, {})
      elapsed += performance.now() - t0
    }
    values.push(elapsed / repeats)
  }
  return median(values)
}

function measureStream(doc, marker, replacement, samples, repeats) {
  const md = MarkdownIt({ stream: true, streamChunkedFallback: true })
  const values = []
  for (let sample = 0; sample < samples; sample++) {
    let elapsed = 0
    for (let i = 0; i < repeats; i++) {
      md.stream.reset()
      md.stream.parse(doc, {})
      const updated = doc.replace(marker, replacement)
      const t0 = performance.now()
      md.stream.parse(updated, {})
      elapsed += performance.now() - t0
    }
    values.push(elapsed / repeats)
  }
  return median(values)
}

function chooseMarkers(doc) {
  const matches = [...doc.matchAll(/console\.log\((\d+)\)/g)]
  const middle = matches[Math.floor(matches.length * 0.5)]?.[0] ?? 'console.log(0)'
  const late = matches[Math.floor(matches.length * 0.85)]?.[0] ?? matches[matches.length - 1]?.[0] ?? 'console.log(0)'
  return { middle, late }
}

const summary = []

for (const size of SIZES) {
  const { doc } = makeParasByChars(size)
  const { middle, late } = chooseMarkers(doc)
  const { samples, repeats } = pickBench(size)

  const middleEditable = measureEditable(doc, middle, 'console.log("middle-edit")', samples, repeats)
  const lateEditable = measureEditable(doc, late, 'console.log("late-edit")', samples, repeats)
  const middleFull = measureFull(doc, middle, 'console.log("middle-edit")', samples, repeats)
  const lateFull = measureFull(doc, late, 'console.log("late-edit")', samples, repeats)
  const middleStream = measureStream(doc, middle, 'console.log("middle-edit")', samples, repeats)
  const lateStream = measureStream(doc, late, 'console.log("late-edit")', samples, repeats)

  summary.push({
    size,
    middle: {
      editableMs: middleEditable.ms,
      fullMs: middleFull,
      streamMs: middleStream,
      lastReparsedChars: middleEditable.stats?.lastReparsedChars ?? null,
      pieceCount: middleEditable.stats?.pieceCount ?? null,
    },
    late: {
      editableMs: lateEditable.ms,
      fullMs: lateFull,
      streamMs: lateStream,
      lastReparsedChars: lateEditable.stats?.lastReparsedChars ?? null,
      pieceCount: lateEditable.stats?.pieceCount ?? null,
    },
  })
}

const lines = []
lines.push('# Editable Buffer Tuning')
lines.push('')
lines.push('Replace workloads for arbitrary in-place edits. Lower is better.')
lines.push('')

for (const row of summary) {
  lines.push(`## ${row.size.toLocaleString()} chars`)
  lines.push('')
  lines.push(`- Middle replace: editable ${fmt(row.middle.editableMs)}, full ${fmt(row.middle.fullMs)}, stream ${fmt(row.middle.streamMs)}`)
  lines.push(`- Late replace: editable ${fmt(row.late.editableMs)}, full ${fmt(row.late.fullMs)}, stream ${fmt(row.late.streamMs)}`)
  lines.push(`- Last reparsed chars: middle ${row.middle.lastReparsedChars?.toLocaleString() ?? 'n/a'}, late ${row.late.lastReparsedChars?.toLocaleString() ?? 'n/a'}`)
  lines.push('')
  lines.push('| Workload | EditableBuffer | Plain full parse | stream.parse | Notes |')
  lines.push('|:--|---:|---:|---:|:--|')
  lines.push(`| middle replace | ${fmt(row.middle.editableMs)} | ${fmt(row.middle.fullMs)} | ${fmt(row.middle.streamMs)} | reparsed=${row.middle.lastReparsedChars?.toLocaleString() ?? 'n/a'} chars |`)
  lines.push(`| late replace | ${fmt(row.late.editableMs)} | ${fmt(row.late.fullMs)} | ${fmt(row.late.streamMs)} | reparsed=${row.late.lastReparsedChars?.toLocaleString() ?? 'n/a'} chars |`)
  lines.push('')
}

writeFileSync(new URL('../docs/perf-editable-buffer.json', import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sizes: SIZES,
  summary,
}, null, 2))
writeFileSync(new URL('../docs/perf-editable-buffer.md', import.meta.url), lines.join('\n'))

console.log('Wrote docs/perf-editable-buffer.md and docs/perf-editable-buffer.json')
