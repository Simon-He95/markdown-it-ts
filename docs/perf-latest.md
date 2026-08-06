# Performance Report (latest run)

## Environment

- Generated at: 2026-08-06T00:10:37.921Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: INTEL(R) XEON(R) PLATINUM 8573C
- CPU count: 4
- Commit: c927d84e6a5afc49ea625f79cc57b26e7a14215b

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
| 5,011 | 0.0362ms | 0.1822ms | 0.0357ms | stock-fast | 0.0174ms | 0.2135ms | 0.0302ms | stock-fast | no |
| 20,085 | 0.1415ms | 0.7121ms | 0.1203ms | stock-fast | 0.0627ms | 0.8437ms | 0.1161ms | stock-fast | no |
| 50,084 | 0.3968ms | 1.8886ms | 0.3946ms | stock-fast | 0.1691ms | 2.2500ms | 0.3131ms | stock-fast | no |
| 100,126 | 1.1409ms | 4.2852ms | 0.7852ms | stock-fast | 0.3133ms | 6.8781ms | 0.6692ms | stock-fast | no |
| 200,073 | 1.6688ms | 7.9582ms | 1.6040ms | stock-fast | 0.7122ms | 14.95ms | 1.5201ms | stock-fast | no |
| 500,121 | 17.66ms | 38.33ms | 3.9528ms | stock-fast | 2.7060ms | 44.87ms | 4.0051ms | stock-fast | no |
| 1,000,068 | 41.00ms | 85.24ms | 10.46ms | stock-fast | 5.4807ms | 90.48ms | 7.2671ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2213ms | 0.2610ms | 0.0418ms | general | 0.2684ms | 0.3276ms | 0.0404ms | token-renderer | no |
| 20,125 | 0.8073ms | 1.0041ms | 0.1600ms | general | 0.9738ms | 1.2684ms | 0.1410ms | token-renderer | no |
| 50,025 | 2.1287ms | 2.5748ms | 0.4854ms | general | 2.5898ms | 3.4421ms | 0.3427ms | token-renderer | no |
| 100,450 | 7.3600ms | 7.6123ms | 1.0057ms | general | 7.6755ms | 8.7146ms | 0.8164ms | token-renderer | no |
| 200,109 | 12.26ms | 16.56ms | 2.1585ms | full-chunk | 17.35ms | 19.76ms | 1.7632ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1159ms | 0.1835ms | 0.0166ms | general | 0.1173ms | 0.1802ms | 0.0141ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0986ms | 0.1374ms | 0.0177ms | general | 0.1164ms | 0.1573ms | 0.0169ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0250ms | 0.0352ms | 0.0066ms | general | 0.0314ms | 0.0429ms | 0.0064ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2076ms | 0.1525ms | 0.1690ms | 0.1667ms | 0.0392ms | 0.1777ms | 0.3306ms | **0.0358ms** | 0.1766ms | 6.0455ms | 0.5878ms | 0.2771ms | 0.2320ms | 0.4834ms | 0.1180ms | 0.6470ms | 0.9067ms | **0.0604ms** | 0.1992ms | 19.17ms | 1.8135ms | 0.4023ms | 0.6512ms | 1.4413ms | 0.6530ms | 1.7582ms | 3.0761ms | **0.1015ms** | 0.2537ms | 52.27ms | 0.2740ms | 0.1347ms | 0.3162ms | 0.1626ms | 0.1815ms | 0.4792ms | 0.7343ms | **0.0304ms** | 0.1717ms | 5.9593ms |
| 20000 | 0.6860ms | 0.5818ms | 0.7118ms | 0.6946ms | 0.1620ms | 0.7419ms | 1.1128ms | **0.1251ms** | 0.7221ms | 24.75ms | 2.2891ms | 0.8539ms | 0.8839ms | 2.3175ms | 0.5333ms | 2.4606ms | 3.6439ms | **0.1864ms** | 0.7028ms | 78.28ms | 6.3341ms | 1.1513ms | 1.7973ms | 6.2369ms | 2.3159ms | 6.6543ms | 10.86ms | **0.2280ms** | 0.7997ms | 228.55ms | 0.7304ms | 0.5593ms | 0.6632ms | 0.6666ms | 0.7119ms | 0.7261ms | 1.1594ms | **0.1215ms** | 0.6585ms | 34.63ms |
| 50000 | 1.6543ms | 1.4671ms | 1.6938ms | 1.6764ms | **0.4329ms** | 1.9492ms | 2.9374ms | 0.4571ms | 1.8226ms | 64.69ms | 5.7520ms | 2.1789ms | 2.2202ms | 5.8932ms | 1.3420ms | 6.1111ms | 9.3817ms | **0.3590ms** | 2.0205ms | 206.82ms | 18.71ms | 4.1451ms | 4.1272ms | 16.11ms | 3.8731ms | 17.36ms | 26.53ms | **0.4292ms** | 2.0718ms | 575.30ms | 1.9192ms | 1.6690ms | 1.6656ms | 1.7395ms | 1.9232ms | 1.8394ms | 3.1792ms | **0.4500ms** | 1.8330ms | 60.74ms |
| 100000 | 3.9792ms | 5.9517ms | 3.4885ms | 3.5435ms | **1.2118ms** | 4.5899ms | 6.8241ms | 1.2829ms | 3.9932ms | 130.51ms | 12.95ms | 5.3889ms | 5.2702ms | 13.38ms | 2.9887ms | 13.30ms | 20.35ms | **0.6990ms** | 3.3425ms | 466.40ms | 32.90ms | 9.0242ms | 8.5742ms | 33.32ms | 7.4496ms | 36.71ms | 60.97ms | **0.7825ms** | 3.4357ms | 1222.54ms | 3.5750ms | 6.1466ms | 3.4925ms | 3.4951ms | 6.2137ms | 4.9278ms | 6.6158ms | **1.2387ms** | 3.9272ms | 139.98ms |
| 200000 | 8.4624ms | 14.03ms | 8.4340ms | 8.3995ms | 4.7805ms | 8.7339ms | 14.27ms | **2.8994ms** | 8.0552ms | 256.09ms | 27.83ms | 15.54ms | 10.66ms | 28.58ms | 7.6223ms | 28.04ms | 57.47ms | **1.8448ms** | 7.3252ms | 894.30ms | 85.15ms | 25.72ms | 17.64ms | 82.22ms | 30.81ms | 82.24ms | 117.93ms | **1.5978ms** | 6.7754ms | 2530.54ms | 8.3520ms | 13.74ms | 7.2510ms | 7.3215ms | 12.62ms | 7.8107ms | 18.15ms | **2.5862ms** | 8.4730ms | 289.83ms |
| 500000 | 30.34ms | 37.81ms | 31.26ms | 33.60ms | 20.64ms | 42.43ms | 55.54ms | **5.5860ms** | 20.05ms | - | 102.65ms | 56.73ms | 38.99ms | 99.10ms | 43.61ms | 144.52ms | 159.91ms | **4.7523ms** | 19.86ms | - | 292.15ms | 51.44ms | 67.78ms | 301.03ms | 168.34ms | 380.49ms | 453.63ms | **5.5173ms** | 18.66ms | - | 37.38ms | 33.18ms | 29.74ms | 39.05ms | 59.41ms | 37.03ms | 54.46ms | **5.4806ms** | 19.08ms | - |
| 1000000 | 61.46ms | 62.28ms | 58.98ms | 63.45ms | 38.65ms | 76.56ms | 98.60ms | **10.71ms** | 41.68ms | - | 219.62ms | 104.81ms | 75.41ms | 243.48ms | 138.92ms | 326.41ms | 368.04ms | **9.4110ms** | 36.57ms | - | 640.32ms | 97.97ms | 105.13ms | 631.37ms | 351.80ms | 772.97ms | 984.38ms | **10.96ms** | 36.73ms | - | 66.18ms | 65.41ms | 61.80ms | 85.22ms | 118.88ms | 105.57ms | 94.38ms | **9.6761ms** | 39.02ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0392ms (stream OFF, chunk OFF)
- 20000: S5 0.1620ms (stream OFF, chunk OFF)
- 50000: S5 0.4329ms (stream OFF, chunk OFF)
- 100000: S5 1.2118ms (stream OFF, chunk OFF)
- 200000: S5 4.7805ms (stream OFF, chunk OFF)
- 500000: S5 20.64ms (stream OFF, chunk OFF)
- 1000000: S5 38.65ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1180ms (stream OFF, chunk OFF)
- 20000: S5 0.5333ms (stream OFF, chunk OFF)
- 50000: S5 1.3420ms (stream OFF, chunk OFF)
- 100000: S5 2.9887ms (stream OFF, chunk OFF)
- 200000: S5 7.6223ms (stream OFF, chunk OFF)
- 500000: S3 38.99ms (stream ON, cache ON, chunk ON)
- 1000000: S3 75.41ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.4023ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.1513ms (stream ON, cache ON, chunk OFF)
- 50000: S5 3.8731ms (stream OFF, chunk OFF)
- 100000: S5 7.4496ms (stream OFF, chunk OFF)
- 200000: S3 17.64ms (stream ON, cache ON, chunk ON)
- 500000: S2 51.44ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 97.97ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1347ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5593ms (stream ON, cache ON, chunk OFF)
- 50000: S3 1.6656ms (stream ON, cache ON, chunk ON)
- 100000: S3 3.4925ms (stream ON, cache ON, chunk ON)
- 200000: S3 7.2510ms (stream ON, cache ON, chunk ON)
- 500000: S3 29.74ms (stream ON, cache ON, chunk ON)
- 1000000: S3 61.80ms (stream ON, cache ON, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(5), S3(2)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0418ms | 0.0173ms | 0.2061ms | 0.0300ms | 4.4265ms | 5.1667ms | 0.3070ms |
| 20000 | 0.0651ms | 0.0642ms | 0.8497ms | 0.1283ms | 32.89ms | 34.03ms | 1.2717ms |
| 50000 | 0.1575ms | 0.1579ms | 2.3249ms | 0.2786ms | 77.28ms | 100.29ms | 3.4463ms |
| 100000 | 0.3302ms | 0.3496ms | 6.6680ms | 0.6605ms | 161.46ms | 200.55ms | 9.1451ms |
| 200000 | 0.7128ms | 0.7070ms | 13.98ms | 1.4778ms | 311.97ms | 552.81ms | 20.25ms |
| 500000 | 2.8241ms | 2.8681ms | 45.44ms | 3.9308ms | - | - | 57.60ms |
| 1000000 | 5.7233ms | 5.5025ms | 101.93ms | 7.1388ms | - | - | 110.95ms |

Render vs markdown-it:
- 5,000 chars: 0.0418ms vs 0.2061ms → 4.93× faster
- 20,000 chars: 0.0651ms vs 0.8497ms → 13.05× faster
- 50,000 chars: 0.1575ms vs 2.3249ms → 14.76× faster
- 100,000 chars: 0.3302ms vs 6.6680ms → 20.19× faster
- 200,000 chars: 0.7128ms vs 13.98ms → 19.62× faster
- 500,000 chars: 2.8241ms vs 45.44ms → 16.09× faster
- 1,000,000 chars: 5.7233ms vs 101.93ms → 17.81× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0418ms vs 0.0300ms → 1.39× slower, 39.4% more time
- 20,000 chars: 0.0651ms vs 0.1283ms → 1.97× faster, 49.3% less time
- 50,000 chars: 0.1575ms vs 0.2786ms → 1.77× faster, 43.5% less time
- 100,000 chars: 0.3302ms vs 0.6605ms → 2× faster, 50% less time
- 200,000 chars: 0.7128ms vs 1.4778ms → 2.07× faster, 51.8% less time
- 500,000 chars: 2.8241ms vs 3.9308ms → 1.39× faster, 28.2% less time
- 1,000,000 chars: 5.7233ms vs 7.1388ms → 1.25× faster, 19.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0173ms vs 0.0300ms → 1.74× faster, 42.5% less time
- 20,000 chars: 0.0642ms vs 0.1283ms → 2× faster, 50% less time
- 50,000 chars: 0.1579ms vs 0.2786ms → 1.76× faster, 43.3% less time
- 100,000 chars: 0.3496ms vs 0.6605ms → 1.89× faster, 47.1% less time
- 200,000 chars: 0.7070ms vs 1.4778ms → 2.09× faster, 52.2% less time
- 500,000 chars: 2.8681ms vs 3.9308ms → 1.37× faster, 27% less time
- 1,000,000 chars: 5.5025ms vs 7.1388ms → 1.3× faster, 22.9% less time

Render vs micromark:
- 5,000 chars: 0.0418ms vs 4.4265ms → 105.87× faster
- 20,000 chars: 0.0651ms vs 32.89ms → 505.15× faster
- 50,000 chars: 0.1575ms vs 77.28ms → 490.75× faster
- 100,000 chars: 0.3302ms vs 161.46ms → 488.95× faster
- 200,000 chars: 0.7128ms vs 311.97ms → 437.67× faster

Render vs remark+rehype:
- 5,000 chars: 0.0418ms vs 5.1667ms → 123.58× faster
- 20,000 chars: 0.0651ms vs 34.03ms → 522.59× faster
- 50,000 chars: 0.1575ms vs 100.29ms → 636.82× faster
- 100,000 chars: 0.3302ms vs 200.55ms → 607.33× faster
- 200,000 chars: 0.7128ms vs 552.81ms → 775.57× faster

Render vs markdown-exit:
- 5,000 chars: 0.0418ms vs 0.3070ms → 7.34× faster
- 20,000 chars: 0.0651ms vs 1.2717ms → 19.53× faster
- 50,000 chars: 0.1575ms vs 3.4463ms → 21.88× faster
- 100,000 chars: 0.3302ms vs 9.1451ms → 27.69× faster
- 200,000 chars: 0.7128ms vs 20.25ms → 28.40× faster
- 500,000 chars: 2.8241ms vs 57.60ms → 20.40× faster
- 1,000,000 chars: 5.7233ms vs 110.95ms → 19.38× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0392ms | 0.1777ms | 4.53× faster, 77.9% less time | 0.1180ms | 0.6470ms | 5.48× faster, 81.8% less time | S5/S5 |
| 20000 | 0.1620ms | 0.7419ms | 4.58× faster, 78.2% less time | 0.5333ms | 2.4606ms | 4.61× faster, 78.3% less time | S5/S5 |
| 50000 | 0.4329ms | 1.9492ms | 4.5× faster, 77.8% less time | 1.3420ms | 6.1111ms | 4.55× faster, 78% less time | S5/S5 |
| 100000 | 1.2118ms | 4.5899ms | 3.79× faster, 73.6% less time | 2.9887ms | 13.30ms | 4.45× faster, 77.5% less time | S5/S5 |
| 200000 | 4.7805ms | 8.7339ms | 1.83× faster, 45.3% less time | 7.6223ms | 28.04ms | 3.68× faster, 72.8% less time | S5/S5 |
| 500000 | 20.64ms | 42.43ms | 2.06× faster, 51.4% less time | 38.99ms | 144.52ms | 3.71× faster, 73% less time | S5/S3 |
| 1000000 | 38.65ms | 76.56ms | 1.98× faster, 49.5% less time | 75.41ms | 326.41ms | 4.33× faster, 76.9% less time | S5/S3 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0392ms | 0.0358ms | 1.09× slower, 9.5% more time | 0.1180ms | 0.0604ms | 1.95× slower, 95.4% more time | S5/S5 |
| 20000 | 0.1620ms | 0.1251ms | 1.3× slower, 29.5% more time | 0.5333ms | 0.1864ms | 2.86× slower, 186.1% more time | S5/S5 |
| 50000 | 0.4329ms | 0.4571ms | 1.06× faster, 5.3% less time | 1.3420ms | 0.3590ms | 3.74× slower, 273.8% more time | S5/S5 |
| 100000 | 1.2118ms | 1.2829ms | 1.06× faster, 5.5% less time | 2.9887ms | 0.6990ms | 4.28× slower, 327.6% more time | S5/S5 |
| 200000 | 4.7805ms | 2.8994ms | 1.65× slower, 64.9% more time | 7.6223ms | 1.8448ms | 4.13× slower, 313.2% more time | S5/S5 |
| 500000 | 20.64ms | 5.5860ms | 3.69× slower, 269.4% more time | 38.99ms | 4.7523ms | 8.21× slower, 720.5% more time | S5/S3 |
| 1000000 | 38.65ms | 10.71ms | 3.61× slower, 261% more time | 75.41ms | 9.4110ms | 8.01× slower, 701.3% more time | S5/S3 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0392ms | 0.1766ms | 4.51× faster, 77.8% less time |
| 20000 | 0.1620ms | 0.7221ms | 4.46× faster, 77.6% less time |
| 50000 | 0.4329ms | 1.8226ms | 4.21× faster, 76.2% less time |
| 100000 | 1.2118ms | 3.9932ms | 3.3× faster, 69.7% less time |
| 200000 | 4.7805ms | 8.0552ms | 1.69× faster, 40.7% less time |
| 500000 | 20.64ms | 20.05ms | 1.03× slower, 2.9% more time |
| 1000000 | 38.65ms | 41.68ms | 1.08× faster, 7.3% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0243ms | 0.0301ms | 1.24× faster, 19.2% less time | 0.1668ms |
| 20000 | 0.0834ms | 0.1194ms | 1.43× faster, 30.1% less time | 0.6706ms |
| 50000 | 0.2664ms | 0.5278ms | 1.98× faster, 49.5% less time | 1.7877ms |
| 100000 | 0.4535ms | 0.8119ms | 1.79× faster, 44.1% less time | 3.5388ms |
| 200000 | 0.9248ms | 1.6607ms | 1.8× faster, 44.3% less time | 7.2042ms |
| 500000 | 2.6703ms | 4.1716ms | 1.56× faster, 36% less time | 18.13ms |
| 1000000 | 5.7339ms | 9.5953ms | 1.67× faster, 40.2% less time | 39.64ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1695ms | 0.1664ms |
| @ox-content/napi (parse only) | 0.0308ms | 0.0302ms |
| markdown-exit | 0.5046ms | 0.2747ms |
| markdown-it (baseline) | 0.2152ms | 0.1821ms |
| markdown-it-ts (stream+chunk) | 0.1946ms | 0.1660ms |
| micromark (parse only) | 7.3113ms | 4.5535ms |
| remark (parse only) | 4.7709ms | 4.5130ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6448ms | 0.6469ms |
| @ox-content/napi (parse only) | 0.1225ms | 0.1162ms |
| markdown-exit | 1.0945ms | 1.1308ms |
| markdown-it (baseline) | 0.7123ms | 0.7162ms |
| markdown-it-ts (stream+chunk) | 0.7012ms | 0.7216ms |
| micromark (parse only) | 20.54ms | 23.88ms |
| remark (parse only) | 44.38ms | 35.99ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7461ms | 1.7373ms |
| @ox-content/napi (parse only) | 0.4133ms | 0.3958ms |
| markdown-exit | 2.6185ms | 2.9619ms |
| markdown-it (baseline) | 2.3702ms | 2.0144ms |
| markdown-it-ts (stream+chunk) | 1.5968ms | 1.8790ms |
| micromark (parse only) | 61.54ms | 60.07ms |
| remark (parse only) | 84.81ms | 80.07ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.4543ms | 3.4159ms |
| @ox-content/napi (parse only) | 0.8009ms | 0.7830ms |
| markdown-exit | 6.8550ms | 8.3020ms |
| markdown-it (baseline) | 5.9089ms | 5.4817ms |
| markdown-it-ts (stream+chunk) | 4.7233ms | 5.2773ms |
| micromark (parse only) | 153.63ms | 122.32ms |
| remark (parse only) | 169.18ms | 193.47ms |
