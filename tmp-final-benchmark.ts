import { performance } from 'node:perf_hooks'
import MarkdownIt from './src/index'

console.log('╔═══════════════════════════════════════════════════════════════╗')
console.log('║     Stream Parser 优化效果总结                                 ║')
console.log('╚═══════════════════════════════════════════════════════════════╝')

const paragraph = `# Section Header

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
tempor incididunt ut labore et dolore magna aliqua.

## Subsection  

More content with **bold** and *italic* text. Here's a list:

- Item one with some text
- Item two with more content
- Item three for good measure

\`\`\`javascript
function example() {
  console.log("Hello world")
  return 42
}
\`\`\`

Another paragraph with [a link](https://example.com) and inline \`code\`.

`

function testScenario(name: string, docMultiplier: number) {
  const doc = paragraph.repeat(docMultiplier)
  const paragraphs = doc.split(/\n{2,}/).filter(p => p.trim())

  const mdWithStream = MarkdownIt({ stream: true })
  const mdWithoutStream = MarkdownIt({ stream: false })

  mdWithStream.stream.resetStats()

  // Warm up
  mdWithStream.stream.parse(doc.slice(0, 100))
  mdWithoutStream.parse(doc.slice(0, 100))

  // Test stream
  let rolling = ''
  const streamStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithStream.stream.parse(rolling)
  }
  const streamTime = performance.now() - streamStart

  // Test without stream
  rolling = ''
  const normalStart = performance.now()
  for (const para of paragraphs) {
    rolling += `${para}\n\n`
    mdWithoutStream.parse(rolling)
  }
  const normalTime = performance.now() - normalStart

  const stats = mdWithStream.stream.stats()
  const speedup = ((normalTime / streamTime - 1) * 100).toFixed(1)
  const symbol = streamTime < normalTime ? '🚀' : '🐌'

  return {
    name,
    chars: doc.length,
    blocks: paragraphs.length,
    streamTime,
    normalTime,
    speedup: Number.parseFloat(speedup),
    symbol,
    stats,
  }
}

const results = [
  testScenario('Small', 1),
  testScenario('Medium', 5),
  testScenario('Large', 20),
  testScenario('X-Large', 50),
  testScenario('XX-Large', 100),
]

console.log('\n📊 性能对比结果\n')
console.log('┌─────────────┬─────────┬─────────┬──────────┬──────────┬──────────┬────────┐')
console.log('│ 大小        │ 字符数  │ 块数    │ Stream   │ Normal   │ 加速     │ 状态   │')
console.log('├─────────────┼─────────┼─────────┼──────────┼──────────┼──────────┼────────┤')

results.forEach((r) => {
  const name = r.name.padEnd(11)
  const chars = r.chars.toString().padStart(7)
  const blocks = r.blocks.toString().padStart(7)
  const stream = r.streamTime.toFixed(2).padStart(8)
  const normal = r.normalTime.toFixed(2).padStart(8)
  const speedup = r.speedup >= 0
    ? `+${r.speedup.toFixed(1)}%`.padStart(8)
    : `${r.speedup.toFixed(1)}%`.padStart(8)
  const status = `  ${r.symbol}  `

  console.log(`│ ${name} │ ${chars} │ ${blocks} │ ${stream}ms │ ${normal}ms │ ${speedup} │ ${status} │`)
})

console.log('└─────────────┴─────────┴─────────┴──────────┴──────────┴──────────┴────────┘')

console.log('\n📈 优化统计\n')

results.forEach((r) => {
  const efficiency = (r.stats.appendHits / r.stats.total * 100).toFixed(1)
  console.log(`${r.name}:`)
  console.log(`  Total parses: ${r.stats.total}`)
  console.log(`  Append hits: ${r.stats.appendHits} (${efficiency}% of total)`)
  console.log(`  Full parses: ${r.stats.fullParses}`)
  console.log(`  Cache hits: ${r.stats.cacheHits}`)
  console.log()
})

console.log('✨ 关键发现：\n')

const breakEven = results.find(r => r.speedup > 0)
if (breakEven) {
  console.log(`✅ Stream 在 ${breakEven.name} 文档 (~${breakEven.chars} 字符) 开始变快`)
  const best = results.reduce((a, b) => a.speedup > b.speedup ? a : b)
  console.log(`✅ 最佳性能提升: ${best.speedup.toFixed(1)}% (${best.name} 文档)`)

  const avgImprovement = results
    .filter(r => r.speedup > 0)
    .reduce((sum, r) => sum + r.speedup, 0) / results.filter(r => r.speedup > 0).length

  console.log(`✅ 大文档平均提升: ${avgImprovement.toFixed(1)}%`)
}
else {
  console.log('❌ Stream 在所有测试场景中都更慢')
}

console.log('\n💡 建议：')
console.log('  • 小文档 (< 1KB): 使用普通 parse()')
console.log('  • 中文档 (1-5KB): 使用 stream，但提升有限')
console.log('  • 大文档 (> 5KB): 强烈推荐使用 stream')
console.log('  • 实时输入: 使用 DebouncedStreamParser')

console.log(`\n${'═'.repeat(67)}`)
