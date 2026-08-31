# Performance Report (latest run)

## Environment

- Generated at: 2026-08-31T03:29:04.896Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 0078d8ddfddec92752998b58d30a6dfac5a965d3

## Corpus and comparison policy

- `stock-subset`: ATX headings, plain single-line paragraphs, flat tight bullet lists, and fenced code blocks. Paragraph text and flat list source repeat intentionally; headings and fenced code vary by section.
- `feature-mixed`: A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code. Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.
- `real-world`: repository-owned MIT-licensed documents, reported per file.
- Fixed-configuration native API, tuned/best-of, and equivalent-output results are kept separate. Do not combine these sections into a general library ranking.

## Native API throughput by corpus

These rows use fixed configurations: default `MarkdownIt().parse()` / `MarkdownIt().render()`, upstream `markdown-it` defaults, and `@ox-content/napi` native parse/render APIs. The feature-mixed and real-world OX rows enable `tables` and `strikethrough` to more closely match markdown-it defaults. Implementation order rotates for every sample to avoid assigning a stable warmup, GC, or CPU-state advantage to one library.

Parse output is **not equivalent work**: markdown-it-ts returns mutable markdown-it-compatible `Token[]`, while OX returns an object containing an mdast JSON string. These rows describe native API throughput only and are not ranked into an overall winner.

### Synthetic stock subset

ATX headings, plain single-line paragraphs, flat tight bullet lists, and fenced code blocks.
Paragraph text and flat list source repeat intentionally; headings and fenced code vary by section.
This is a specialized fast-path benchmark, not a proxy for general Markdown performance.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,011 | 0.0576ms | 0.1850ms | 0.0420ms | stock-fast | 0.0207ms | 0.2310ms | 0.0385ms | stock-fast | no |
| 20,085 | 0.1188ms | 0.7435ms | 0.1645ms | stock-fast | 0.0740ms | 0.9161ms | 0.1525ms | stock-fast | no |
| 50,084 | 0.2912ms | 1.8639ms | 0.4334ms | stock-fast | 0.1837ms | 2.3340ms | 0.3756ms | stock-fast | no |
| 100,126 | 0.6282ms | 3.9566ms | 0.8514ms | stock-fast | 0.3566ms | 4.9003ms | 0.7709ms | stock-fast | no |
| 200,073 | 1.0865ms | 8.0367ms | 1.6935ms | stock-fast | 0.7037ms | 10.55ms | 1.4997ms | stock-fast | no |
| 500,121 | 2.7196ms | 22.04ms | 4.2412ms | stock-fast | 2.3569ms | 31.25ms | 3.7768ms | stock-fast | no |
| 1,000,068 | 12.25ms | 53.78ms | 10.60ms | stock-fast | 4.8681ms | 69.51ms | 7.5768ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2337ms | 0.2714ms | 0.0590ms | general | 0.2576ms | 0.3316ms | 0.0544ms | token-renderer | no |
| 20,125 | 0.7734ms | 0.9855ms | 0.2200ms | general | 0.9359ms | 1.2523ms | 0.2055ms | token-renderer | no |
| 50,025 | 1.9667ms | 2.4397ms | 0.5652ms | general | 2.2933ms | 3.1540ms | 0.4972ms | token-renderer | no |
| 100,450 | 4.1006ms | 5.2896ms | 1.1168ms | general | 4.9963ms | 6.6509ms | 1.0095ms | token-renderer | no |
| 200,109 | 10.02ms | 11.09ms | 2.2213ms | full-chunk | 11.37ms | 14.19ms | 1.9787ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0869ms | 0.1251ms | 0.0325ms | general | 0.1048ms | 0.1460ms | 0.0253ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1021ms | 0.1353ms | 0.0306ms | general | 0.1198ms | 0.1552ms | 0.0270ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0285ms | 0.0348ms | 0.0093ms | general | 0.0326ms | 0.0419ms | 0.0083ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2044ms | 0.1577ms | 0.2014ms | 0.1907ms | **0.0398ms** | 0.1873ms | 0.2611ms | 0.0432ms | 0.1810ms | 3.1012ms | 0.6005ms | 0.2953ms | 0.2870ms | 0.5604ms | 0.1055ms | 0.6064ms | 0.8318ms | **0.0625ms** | 0.2049ms | 9.8171ms | 1.9214ms | 0.4498ms | 0.3968ms | 1.6911ms | 0.5722ms | 1.7297ms | 2.4352ms | **0.0947ms** | 0.2683ms | 28.21ms | 0.1963ms | 0.1708ms | 0.2012ms | 0.2034ms | 0.1809ms | 0.1999ms | 0.2754ms | **0.0420ms** | 0.1791ms | 3.0497ms |
| 20000 | 0.7552ms | 0.6009ms | 0.7523ms | 0.7390ms | **0.1188ms** | 0.7384ms | 1.0137ms | 0.1630ms | 0.7172ms | 16.59ms | 2.6590ms | 1.0219ms | 1.0514ms | 2.5380ms | 0.4210ms | 2.5115ms | 3.3917ms | **0.2017ms** | 0.7575ms | 49.33ms | 7.1489ms | 1.4369ms | 1.3258ms | 7.0802ms | 2.1927ms | 7.0463ms | 9.6665ms | **0.2398ms** | 0.8092ms | 137.81ms | 0.7320ms | 0.6007ms | 0.7689ms | 0.7399ms | 0.6761ms | 0.7411ms | 1.0255ms | **0.1628ms** | 0.7101ms | 15.54ms |
| 50000 | 1.9385ms | 1.5479ms | 1.8939ms | 1.9022ms | **0.3141ms** | 1.8502ms | 2.5374ms | 0.4342ms | 1.8010ms | 46.25ms | 7.0102ms | 2.7117ms | 2.2381ms | 6.6884ms | 1.0803ms | 6.4531ms | 8.7866ms | **0.4611ms** | 1.8494ms | 147.39ms | 18.78ms | 3.2264ms | 2.9473ms | 17.91ms | 2.9988ms | 17.27ms | 23.80ms | **0.5174ms** | 1.9181ms | 397.79ms | 2.0054ms | 1.4904ms | 1.9263ms | 1.8296ms | 1.6590ms | 1.8790ms | 2.4676ms | **0.4308ms** | 1.8291ms | 42.88ms |
| 100000 | 3.9954ms | 3.1582ms | 3.9959ms | 3.9666ms | **0.8359ms** | 4.0582ms | 5.3627ms | 0.8499ms | 3.5774ms | 91.56ms | 13.51ms | 5.4064ms | 4.5769ms | 13.47ms | 2.4024ms | 13.45ms | 17.49ms | **0.9079ms** | 3.6636ms | 308.26ms | 36.69ms | 6.4624ms | 6.1503ms | 36.09ms | 6.5811ms | 36.62ms | 48.11ms | **0.9958ms** | 3.7461ms | 843.84ms | 3.9618ms | 3.1299ms | 3.8673ms | 3.8194ms | 3.4668ms | 4.0662ms | 5.5008ms | **0.8398ms** | 3.6039ms | 88.18ms |
| 200000 | 8.5944ms | 6.8192ms | 8.4936ms | 8.7706ms | 1.7427ms | 8.6826ms | 11.48ms | **1.6565ms** | 7.0515ms | 179.51ms | 27.79ms | 11.20ms | 10.46ms | 26.74ms | 4.4323ms | 27.24ms | 36.77ms | **1.9395ms** | 7.3556ms | 633.63ms | 75.37ms | 13.60ms | 13.10ms | 72.46ms | 14.98ms | 73.16ms | 97.96ms | **1.9038ms** | 7.3055ms | 1777.94ms | 7.6502ms | 6.5721ms | 8.4568ms | 7.8431ms | 9.3389ms | 8.4384ms | 10.45ms | **1.6566ms** | 7.0735ms | 186.02ms |
| 500000 | 22.01ms | 19.84ms | 22.64ms | 26.47ms | 5.7955ms | 27.99ms | 30.65ms | **4.2150ms** | 17.53ms | - | 68.79ms | 36.70ms | 32.91ms | 72.25ms | 14.05ms | 78.17ms | 98.88ms | **4.6187ms** | 18.06ms | - | 195.72ms | 55.03ms | 48.54ms | 199.56ms | 68.24ms | 209.37ms | 260.01ms | **4.9221ms** | 20.42ms | - | 20.99ms | 27.83ms | 20.00ms | 22.53ms | 24.45ms | 28.15ms | 28.40ms | **5.0331ms** | 17.36ms | - |
| 1000000 | 53.23ms | 51.46ms | 50.92ms | 47.48ms | 14.82ms | 52.82ms | 65.39ms | **10.64ms** | 38.74ms | - | 167.14ms | 81.37ms | 81.07ms | 160.55ms | 36.73ms | 197.78ms | 318.59ms | **9.6839ms** | 36.77ms | - | 427.83ms | 100.61ms | 101.02ms | 410.20ms | 103.19ms | 482.08ms | 574.17ms | **9.9390ms** | 37.33ms | - | 48.74ms | 46.42ms | 43.23ms | 46.96ms | 74.39ms | 51.68ms | 60.89ms | **11.10ms** | 39.53ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0398ms (stream OFF, chunk OFF)
- 20000: S5 0.1188ms (stream OFF, chunk OFF)
- 50000: S5 0.3141ms (stream OFF, chunk OFF)
- 100000: S5 0.8359ms (stream OFF, chunk OFF)
- 200000: S5 1.7427ms (stream OFF, chunk OFF)
- 500000: S5 5.7955ms (stream OFF, chunk OFF)
- 1000000: S5 14.82ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1055ms (stream OFF, chunk OFF)
- 20000: S5 0.4210ms (stream OFF, chunk OFF)
- 50000: S5 1.0803ms (stream OFF, chunk OFF)
- 100000: S5 2.4024ms (stream OFF, chunk OFF)
- 200000: S5 4.4323ms (stream OFF, chunk OFF)
- 500000: S5 14.05ms (stream OFF, chunk OFF)
- 1000000: S5 36.73ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3968ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.3258ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.9473ms (stream ON, cache ON, chunk ON)
- 100000: S3 6.1503ms (stream ON, cache ON, chunk ON)
- 200000: S3 13.10ms (stream ON, cache ON, chunk ON)
- 500000: S3 48.54ms (stream ON, cache ON, chunk ON)
- 1000000: S2 100.61ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1708ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.6007ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4904ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.1299ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.5721ms (stream ON, cache ON, chunk OFF)
- 500000: S3 20.00ms (stream ON, cache ON, chunk ON)
- 1000000: S3 43.23ms (stream ON, cache ON, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(7)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0210ms | 0.0186ms | 0.2343ms | 0.0383ms | 4.1133ms | 4.9732ms | 0.3062ms |
| 20000 | 0.0721ms | 0.0719ms | 0.9280ms | 0.1516ms | 19.07ms | 22.73ms | 1.1937ms |
| 50000 | 0.1763ms | 0.1779ms | 2.3494ms | 0.3726ms | 52.78ms | 70.50ms | 2.9991ms |
| 100000 | 0.3547ms | 0.3555ms | 4.9944ms | 0.7583ms | 108.71ms | 160.46ms | 6.1385ms |
| 200000 | 0.7020ms | 0.7034ms | 10.84ms | 1.5295ms | 227.14ms | 405.74ms | 13.20ms |
| 500000 | 2.4222ms | 2.4122ms | 32.00ms | 3.7595ms | - | - | 40.69ms |
| 1000000 | 4.8734ms | 4.9357ms | 69.68ms | 7.5453ms | - | - | 90.02ms |

Render vs markdown-it:
- 5,000 chars: 0.0210ms vs 0.2343ms → 11.15× faster
- 20,000 chars: 0.0721ms vs 0.9280ms → 12.88× faster
- 50,000 chars: 0.1763ms vs 2.3494ms → 13.33× faster
- 100,000 chars: 0.3547ms vs 4.9944ms → 14.08× faster
- 200,000 chars: 0.7020ms vs 10.84ms → 15.43× faster
- 500,000 chars: 2.4222ms vs 32.00ms → 13.21× faster
- 1,000,000 chars: 4.8734ms vs 69.68ms → 14.30× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0210ms vs 0.0383ms → 1.82× faster, 45.2% less time
- 20,000 chars: 0.0721ms vs 0.1516ms → 2.1× faster, 52.5% less time
- 50,000 chars: 0.1763ms vs 0.3726ms → 2.11× faster, 52.7% less time
- 100,000 chars: 0.3547ms vs 0.7583ms → 2.14× faster, 53.2% less time
- 200,000 chars: 0.7020ms vs 1.5295ms → 2.18× faster, 54.1% less time
- 500,000 chars: 2.4222ms vs 3.7595ms → 1.55× faster, 35.6% less time
- 1,000,000 chars: 4.8734ms vs 7.5453ms → 1.55× faster, 35.4% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0186ms vs 0.0383ms → 2.06× faster, 51.4% less time
- 20,000 chars: 0.0719ms vs 0.1516ms → 2.11× faster, 52.6% less time
- 50,000 chars: 0.1779ms vs 0.3726ms → 2.09× faster, 52.3% less time
- 100,000 chars: 0.3555ms vs 0.7583ms → 2.13× faster, 53.1% less time
- 200,000 chars: 0.7034ms vs 1.5295ms → 2.17× faster, 54% less time
- 500,000 chars: 2.4122ms vs 3.7595ms → 1.56× faster, 35.8% less time
- 1,000,000 chars: 4.9357ms vs 7.5453ms → 1.53× faster, 34.6% less time

Render vs micromark:
- 5,000 chars: 0.0210ms vs 4.1133ms → 195.63× faster
- 20,000 chars: 0.0721ms vs 19.07ms → 264.62× faster
- 50,000 chars: 0.1763ms vs 52.78ms → 299.43× faster
- 100,000 chars: 0.3547ms vs 108.71ms → 306.45× faster
- 200,000 chars: 0.7020ms vs 227.14ms → 323.55× faster

Render vs remark+rehype:
- 5,000 chars: 0.0210ms vs 4.9732ms → 236.53× faster
- 20,000 chars: 0.0721ms vs 22.73ms → 315.46× faster
- 50,000 chars: 0.1763ms vs 70.50ms → 399.98× faster
- 100,000 chars: 0.3547ms vs 160.46ms → 452.35× faster
- 200,000 chars: 0.7020ms vs 405.74ms → 577.97× faster

Render vs markdown-exit:
- 5,000 chars: 0.0210ms vs 0.3062ms → 14.56× faster
- 20,000 chars: 0.0721ms vs 1.1937ms → 16.56× faster
- 50,000 chars: 0.1763ms vs 2.9991ms → 17.02× faster
- 100,000 chars: 0.3547ms vs 6.1385ms → 17.30× faster
- 200,000 chars: 0.7020ms vs 13.20ms → 18.80× faster
- 500,000 chars: 2.4222ms vs 40.69ms → 16.80× faster
- 1,000,000 chars: 4.8734ms vs 90.02ms → 18.47× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0398ms | 0.1873ms | 4.7× faster, 78.7% less time | 0.1055ms | 0.6064ms | 5.75× faster, 82.6% less time | S5/S5 |
| 20000 | 0.1188ms | 0.7384ms | 6.21× faster, 83.9% less time | 0.4210ms | 2.5115ms | 5.97× faster, 83.2% less time | S5/S5 |
| 50000 | 0.3141ms | 1.8502ms | 5.89× faster, 83% less time | 1.0803ms | 6.4531ms | 5.97× faster, 83.3% less time | S5/S5 |
| 100000 | 0.8359ms | 4.0582ms | 4.85× faster, 79.4% less time | 2.4024ms | 13.45ms | 5.6× faster, 82.1% less time | S5/S5 |
| 200000 | 1.7427ms | 8.6826ms | 4.98× faster, 79.9% less time | 4.4323ms | 27.24ms | 6.15× faster, 83.7% less time | S5/S5 |
| 500000 | 5.7955ms | 27.99ms | 4.83× faster, 79.3% less time | 14.05ms | 78.17ms | 5.57× faster, 82% less time | S5/S5 |
| 1000000 | 14.82ms | 52.82ms | 3.56× faster, 71.9% less time | 36.73ms | 197.78ms | 5.38× faster, 81.4% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0398ms | 0.0432ms | 1.08× faster, 7.8% less time | 0.1055ms | 0.0625ms | 1.69× slower, 68.9% more time | S5/S5 |
| 20000 | 0.1188ms | 0.1630ms | 1.37× faster, 27.1% less time | 0.4210ms | 0.2017ms | 2.09× slower, 108.7% more time | S5/S5 |
| 50000 | 0.3141ms | 0.4342ms | 1.38× faster, 27.7% less time | 1.0803ms | 0.4611ms | 2.34× slower, 134.3% more time | S5/S5 |
| 100000 | 0.8359ms | 0.8499ms | 1.02× faster, 1.6% less time | 2.4024ms | 0.9079ms | 2.65× slower, 164.6% more time | S5/S5 |
| 200000 | 1.7427ms | 1.6565ms | 1.05× slower, 5.2% more time | 4.4323ms | 1.9395ms | 2.29× slower, 128.5% more time | S5/S5 |
| 500000 | 5.7955ms | 4.2150ms | 1.37× slower, 37.5% more time | 14.05ms | 4.6187ms | 3.04× slower, 204.1% more time | S5/S5 |
| 1000000 | 14.82ms | 10.64ms | 1.39× slower, 39.4% more time | 36.73ms | 9.6839ms | 3.79× slower, 279.3% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0398ms | 0.1810ms | 4.54× faster, 78% less time |
| 20000 | 0.1188ms | 0.7172ms | 6.03× faster, 83.4% less time |
| 50000 | 0.3141ms | 1.8010ms | 5.73× faster, 82.6% less time |
| 100000 | 0.8359ms | 3.5774ms | 4.28× faster, 76.6% less time |
| 200000 | 1.7427ms | 7.0515ms | 4.05× faster, 75.3% less time |
| 500000 | 5.7955ms | 17.53ms | 3.02× faster, 66.9% less time |
| 1000000 | 14.82ms | 38.74ms | 2.61× faster, 61.7% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0252ms | 0.0423ms | 1.68× faster, 40.5% less time | 0.1862ms |
| 20000 | 0.0863ms | 0.1651ms | 1.91× faster, 47.7% less time | 0.7339ms |
| 50000 | 0.2175ms | 0.4392ms | 2.02× faster, 50.5% less time | 1.8686ms |
| 100000 | 0.4291ms | 0.8557ms | 1.99× faster, 49.9% less time | 3.6792ms |
| 200000 | 0.8399ms | 1.7054ms | 2.03× faster, 50.7% less time | 7.2392ms |
| 500000 | 2.0633ms | 4.2071ms | 2.04× faster, 51% less time | 17.91ms |
| 1000000 | 4.4850ms | 10.40ms | 2.32× faster, 56.9% less time | 37.83ms |


### Diagnostic: Chunk Info (if chunked)

| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 4 | 4 | 4 | 4 | 4 | 4 |
| 20000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 50000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 100000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 200000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 500000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 1000000 | 16 | 16 | 16 | 16 | 16 | 16 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs across markdown-it-ts and external baselines.

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.2228ms | 0.1818ms |
| @ox-content/napi (parse only) | 0.0463ms | 0.0417ms |
| markdown-exit | 0.7361ms | 0.7049ms |
| markdown-it (baseline) | 0.2100ms | 0.1812ms |
| markdown-it-ts (stream+chunk) | 0.2175ms | 0.1930ms |
| micromark (parse only) | 4.8067ms | 3.9341ms |
| remark (parse only) | 4.5238ms | 4.5772ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7352ms | 0.7185ms |
| @ox-content/napi (parse only) | 0.1830ms | 0.1756ms |
| markdown-exit | 1.5689ms | 1.2792ms |
| markdown-it (baseline) | 0.7892ms | 0.7409ms |
| markdown-it-ts (stream+chunk) | 1.2162ms | 0.8044ms |
| micromark (parse only) | 17.02ms | 18.57ms |
| remark (parse only) | 22.96ms | 22.35ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 10.57ms | 3.7832ms |
| @ox-content/napi (parse only) | 0.4497ms | 0.5801ms |
| markdown-exit | 2.5265ms | 2.6169ms |
| markdown-it (baseline) | 2.7174ms | 2.6516ms |
| markdown-it-ts (stream+chunk) | 2.0386ms | 2.2254ms |
| micromark (parse only) | 50.77ms | 48.56ms |
| remark (parse only) | 70.41ms | 65.58ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5587ms | 3.5716ms |
| @ox-content/napi (parse only) | 0.8336ms | 0.8595ms |
| markdown-exit | 4.8951ms | 5.1918ms |
| markdown-it (baseline) | 4.7085ms | 3.8363ms |
| markdown-it-ts (stream+chunk) | 3.9207ms | 4.4216ms |
| micromark (parse only) | 108.49ms | 98.31ms |
| remark (parse only) | 146.93ms | 151.31ms |
