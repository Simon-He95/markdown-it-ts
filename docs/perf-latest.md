# Performance Report (latest run)

## Environment

- Generated at: 2026-08-22T22:03:42.293Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: INTEL(R) XEON(R) PLATINUM 8573C
- CPU count: 4
- Commit: fac94fb7ed63f5644d4057d1560d741f52bcbf13

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
| 5,011 | 0.0576ms | 0.2322ms | 0.0415ms | stock-fast | 0.0225ms | 0.2834ms | 0.0406ms | stock-fast | no |
| 20,085 | 0.2297ms | 0.9191ms | 0.1569ms | stock-fast | 0.0772ms | 1.1510ms | 0.1526ms | stock-fast | no |
| 50,084 | 0.5878ms | 2.5560ms | 0.4922ms | stock-fast | 0.1911ms | 2.7775ms | 0.3782ms | stock-fast | no |
| 100,126 | 1.6765ms | 5.8392ms | 0.9950ms | stock-fast | 0.3816ms | 8.5383ms | 0.8434ms | stock-fast | no |
| 200,073 | 2.5935ms | 10.63ms | 1.9859ms | stock-fast | 1.1089ms | 17.89ms | 1.7922ms | stock-fast | no |
| 500,121 | 24.20ms | 44.13ms | 4.9249ms | stock-fast | 3.0672ms | 53.63ms | 4.6127ms | stock-fast | no |
| 1,000,068 | 45.11ms | 108.29ms | 14.70ms | stock-fast | 8.0949ms | 130.08ms | 9.2071ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3111ms | 0.3311ms | 0.0686ms | general | 0.3649ms | 0.4118ms | 0.0582ms | token-renderer | no |
| 20,125 | 1.0536ms | 1.2868ms | 0.2166ms | general | 1.2597ms | 1.5730ms | 0.2085ms | token-renderer | no |
| 50,025 | 2.7764ms | 3.2381ms | 0.6857ms | general | 3.3707ms | 4.2071ms | 0.5124ms | token-renderer | no |
| 100,450 | 8.3921ms | 9.5397ms | 1.3675ms | general | 10.37ms | 10.32ms | 1.1643ms | token-renderer | no |
| 200,109 | 16.54ms | 19.13ms | 2.7806ms | full-chunk | 23.63ms | 23.61ms | 2.4479ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1258ms | 0.1762ms | 0.0246ms | general | 0.1260ms | 0.1906ms | 0.0225ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1189ms | 0.1654ms | 0.0257ms | general | 0.1367ms | 0.1942ms | 0.0248ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0328ms | 0.0441ms | 0.0089ms | general | 0.0395ms | 0.0525ms | 0.0091ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2542ms | 0.2158ms | 0.2366ms | 0.2241ms | 0.0715ms | 0.2423ms | 0.3664ms | **0.0419ms** | 0.2142ms | 7.2915ms | 0.7763ms | 0.4252ms | 0.3107ms | 0.6785ms | 0.2018ms | 0.8049ms | 1.2200ms | **0.0881ms** | 0.2426ms | 25.05ms | 2.4464ms | 0.8707ms | 0.5687ms | 2.1433ms | 0.9925ms | 2.4619ms | 3.3881ms | **0.1265ms** | 0.3104ms | 70.83ms | 0.3781ms | 0.3372ms | 0.4142ms | 0.3805ms | 0.3135ms | 0.5990ms | 0.7791ms | **0.0440ms** | 0.2183ms | 6.7642ms |
| 20000 | 0.9157ms | 0.7600ms | 0.9565ms | 0.9342ms | 0.2856ms | 0.9960ms | 1.4368ms | **0.1640ms** | 0.8173ms | 33.55ms | 3.0580ms | 1.0765ms | 1.0876ms | 3.0149ms | 0.9333ms | 3.3762ms | 4.7089ms | **0.2087ms** | 0.8618ms | 98.36ms | 8.2501ms | 1.5985ms | 2.2706ms | 8.4341ms | 3.7804ms | 9.1488ms | 13.10ms | **0.2771ms** | 0.9533ms | 299.47ms | 0.8948ms | 0.7697ms | 0.9334ms | 0.9516ms | 1.0268ms | 1.0418ms | 1.3799ms | **0.1580ms** | 0.8119ms | 40.38ms |
| 50000 | 2.1417ms | 1.8804ms | 2.2307ms | 2.1466ms | 0.6262ms | 2.4261ms | 3.4820ms | **0.5091ms** | 2.1755ms | 89.91ms | 7.5539ms | 2.9401ms | 3.3364ms | 7.6616ms | 2.0113ms | 7.5485ms | 12.02ms | **0.4708ms** | 2.0647ms | 296.00ms | 20.42ms | 5.3153ms | 5.3564ms | 20.38ms | 5.6814ms | 21.44ms | 32.65ms | **0.5447ms** | 2.1659ms | 771.40ms | 2.1051ms | 1.9163ms | 2.0944ms | 2.1140ms | 2.4994ms | 2.3713ms | 3.6568ms | **0.5517ms** | 2.1358ms | 90.11ms |
| 100000 | 4.6582ms | 6.4763ms | 4.6128ms | 4.6047ms | **1.4155ms** | 5.5873ms | 8.1144ms | 1.5506ms | 4.8778ms | 169.11ms | 16.58ms | 6.6907ms | 6.8152ms | 16.55ms | 3.7946ms | 16.07ms | 24.68ms | **0.9086ms** | 4.1040ms | 575.29ms | 43.12ms | 12.02ms | 12.06ms | 42.68ms | 11.13ms | 47.93ms | 67.28ms | **0.9760ms** | 4.1620ms | 1593.55ms | 4.5259ms | 5.7475ms | 4.3689ms | 4.4774ms | 7.6522ms | 5.7154ms | 7.9755ms | **1.5625ms** | 4.7842ms | 181.57ms |
| 200000 | 10.65ms | 15.80ms | 10.46ms | 10.75ms | 5.9900ms | 10.53ms | 16.99ms | **3.2685ms** | 9.9966ms | 335.27ms | 36.75ms | 21.11ms | 15.28ms | 38.71ms | 9.3101ms | 53.31ms | 60.20ms | **2.2171ms** | 8.6894ms | 1244.36ms | 108.20ms | 27.83ms | 22.91ms | 107.60ms | 30.67ms | 108.59ms | 145.43ms | **1.9689ms** | 8.2139ms | 3166.89ms | 13.96ms | 13.51ms | 9.4993ms | 9.5703ms | 19.73ms | 10.26ms | 17.50ms | **3.2188ms** | 9.8848ms | 338.97ms |
| 500000 | 43.11ms | 45.48ms | 42.37ms | 42.55ms | 24.23ms | 53.32ms | 64.32ms | **7.6040ms** | 25.31ms | - | 126.45ms | 56.75ms | 54.17ms | 127.10ms | 58.76ms | 188.61ms | 190.17ms | **5.4189ms** | 22.35ms | - | 374.46ms | 87.87ms | 72.42ms | 366.00ms | 238.35ms | 448.11ms | 554.47ms | **5.7915ms** | 22.02ms | - | 40.43ms | 39.99ms | 41.42ms | 43.32ms | 70.94ms | 57.29ms | 58.05ms | **7.2857ms** | 23.69ms | - |
| 1000000 | 87.10ms | 78.05ms | 81.28ms | 83.32ms | 54.04ms | 100.79ms | 127.48ms | **14.72ms** | 50.41ms | - | 325.88ms | 103.30ms | 107.14ms | 306.78ms | 184.22ms | 372.29ms | 476.79ms | **11.41ms** | 43.91ms | - | 858.76ms | 139.43ms | 147.10ms | 831.74ms | 472.09ms | 1011.41ms | 1200.44ms | **12.63ms** | 44.32ms | - | 82.83ms | 86.94ms | 79.01ms | 105.09ms | 127.60ms | 135.33ms | 124.56ms | **13.84ms** | 49.88ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0715ms (stream OFF, chunk OFF)
- 20000: S5 0.2856ms (stream OFF, chunk OFF)
- 50000: S5 0.6262ms (stream OFF, chunk OFF)
- 100000: S5 1.4155ms (stream OFF, chunk OFF)
- 200000: S5 5.9900ms (stream OFF, chunk OFF)
- 500000: S5 24.23ms (stream OFF, chunk OFF)
- 1000000: S5 54.04ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.2018ms (stream OFF, chunk OFF)
- 20000: S5 0.9333ms (stream OFF, chunk OFF)
- 50000: S5 2.0113ms (stream OFF, chunk OFF)
- 100000: S5 3.7946ms (stream OFF, chunk OFF)
- 200000: S5 9.3101ms (stream OFF, chunk OFF)
- 500000: S3 54.17ms (stream ON, cache ON, chunk ON)
- 1000000: S2 103.30ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.5687ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.5985ms (stream ON, cache ON, chunk OFF)
- 50000: S2 5.3153ms (stream ON, cache ON, chunk OFF)
- 100000: S5 11.13ms (stream OFF, chunk OFF)
- 200000: S3 22.91ms (stream ON, cache ON, chunk ON)
- 500000: S3 72.42ms (stream ON, cache ON, chunk ON)
- 1000000: S2 139.43ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.3135ms (stream OFF, chunk OFF)
- 20000: S2 0.7697ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.9163ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.3689ms (stream ON, cache ON, chunk ON)
- 200000: S3 9.4993ms (stream ON, cache ON, chunk ON)
- 500000: S2 39.99ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 79.01ms (stream ON, cache ON, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(5), S3(1), S2(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0245ms | 0.0211ms | 0.2894ms | 0.0403ms | 8.6954ms | 10.31ms | 0.4051ms |
| 20000 | 0.0780ms | 0.0780ms | 1.2084ms | 0.1522ms | 41.30ms | 41.47ms | 1.6526ms |
| 50000 | 0.1913ms | 0.1899ms | 3.1148ms | 0.3693ms | 102.36ms | 129.48ms | 4.3408ms |
| 100000 | 0.3905ms | 0.4303ms | 8.8950ms | 0.8253ms | 213.84ms | 267.69ms | 11.69ms |
| 200000 | 0.8627ms | 0.8851ms | 17.56ms | 1.7537ms | 411.78ms | 663.94ms | 25.87ms |
| 500000 | 3.4997ms | 2.9928ms | 58.38ms | 4.4213ms | - | - | 70.90ms |
| 1000000 | 7.6083ms | 7.0791ms | 135.35ms | 9.6527ms | - | - | 139.22ms |

Render vs markdown-it:
- 5,000 chars: 0.0245ms vs 0.2894ms → 11.80× faster
- 20,000 chars: 0.0780ms vs 1.2084ms → 15.49× faster
- 50,000 chars: 0.1913ms vs 3.1148ms → 16.28× faster
- 100,000 chars: 0.3905ms vs 8.8950ms → 22.78× faster
- 200,000 chars: 0.8627ms vs 17.56ms → 20.36× faster
- 500,000 chars: 3.4997ms vs 58.38ms → 16.68× faster
- 1,000,000 chars: 7.6083ms vs 135.35ms → 17.79× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0245ms vs 0.0403ms → 1.64× faster, 39.2% less time
- 20,000 chars: 0.0780ms vs 0.1522ms → 1.95× faster, 48.7% less time
- 50,000 chars: 0.1913ms vs 0.3693ms → 1.93× faster, 48.2% less time
- 100,000 chars: 0.3905ms vs 0.8253ms → 2.11× faster, 52.7% less time
- 200,000 chars: 0.8627ms vs 1.7537ms → 2.03× faster, 50.8% less time
- 500,000 chars: 3.4997ms vs 4.4213ms → 1.26× faster, 20.8% less time
- 1,000,000 chars: 7.6083ms vs 9.6527ms → 1.27× faster, 21.2% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0211ms vs 0.0403ms → 1.91× faster, 47.7% less time
- 20,000 chars: 0.0780ms vs 0.1522ms → 1.95× faster, 48.8% less time
- 50,000 chars: 0.1899ms vs 0.3693ms → 1.94× faster, 48.6% less time
- 100,000 chars: 0.4303ms vs 0.8253ms → 1.92× faster, 47.9% less time
- 200,000 chars: 0.8851ms vs 1.7537ms → 1.98× faster, 49.5% less time
- 500,000 chars: 2.9928ms vs 4.4213ms → 1.48× faster, 32.3% less time
- 1,000,000 chars: 7.0791ms vs 9.6527ms → 1.36× faster, 26.7% less time

Render vs micromark:
- 5,000 chars: 0.0245ms vs 8.6954ms → 354.66× faster
- 20,000 chars: 0.0780ms vs 41.30ms → 529.28× faster
- 50,000 chars: 0.1913ms vs 102.36ms → 535.07× faster
- 100,000 chars: 0.3905ms vs 213.84ms → 547.60× faster
- 200,000 chars: 0.8627ms vs 411.78ms → 477.31× faster

Render vs remark+rehype:
- 5,000 chars: 0.0245ms vs 10.31ms → 420.69× faster
- 20,000 chars: 0.0780ms vs 41.47ms → 531.45× faster
- 50,000 chars: 0.1913ms vs 129.48ms → 676.81× faster
- 100,000 chars: 0.3905ms vs 267.69ms → 685.50× faster
- 200,000 chars: 0.8627ms vs 663.94ms → 769.61× faster

Render vs markdown-exit:
- 5,000 chars: 0.0245ms vs 0.4051ms → 16.52× faster
- 20,000 chars: 0.0780ms vs 1.6526ms → 21.18× faster
- 50,000 chars: 0.1913ms vs 4.3408ms → 22.69× faster
- 100,000 chars: 0.3905ms vs 11.69ms → 29.94× faster
- 200,000 chars: 0.8627ms vs 25.87ms → 29.99× faster
- 500,000 chars: 3.4997ms vs 70.90ms → 20.26× faster
- 1,000,000 chars: 7.6083ms vs 139.22ms → 18.30× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0715ms | 0.2423ms | 3.39× faster, 70.5% less time | 0.2018ms | 0.8049ms | 3.99× faster, 74.9% less time | S5/S5 |
| 20000 | 0.2856ms | 0.9960ms | 3.49× faster, 71.3% less time | 0.9333ms | 3.3762ms | 3.62× faster, 72.4% less time | S5/S5 |
| 50000 | 0.6262ms | 2.4261ms | 3.87× faster, 74.2% less time | 2.0113ms | 7.5485ms | 3.75× faster, 73.4% less time | S5/S5 |
| 100000 | 1.4155ms | 5.5873ms | 3.95× faster, 74.7% less time | 3.7946ms | 16.07ms | 4.23× faster, 76.4% less time | S5/S5 |
| 200000 | 5.9900ms | 10.53ms | 1.76× faster, 43.1% less time | 9.3101ms | 53.31ms | 5.73× faster, 82.5% less time | S5/S5 |
| 500000 | 24.23ms | 53.32ms | 2.2× faster, 54.6% less time | 54.17ms | 188.61ms | 3.48× faster, 71.3% less time | S5/S3 |
| 1000000 | 54.04ms | 100.79ms | 1.86× faster, 46.4% less time | 103.30ms | 372.29ms | 3.6× faster, 72.3% less time | S5/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0715ms | 0.0419ms | 1.7× slower, 70.4% more time | 0.2018ms | 0.0881ms | 2.29× slower, 129.1% more time | S5/S5 |
| 20000 | 0.2856ms | 0.1640ms | 1.74× slower, 74.2% more time | 0.9333ms | 0.2087ms | 4.47× slower, 347.2% more time | S5/S5 |
| 50000 | 0.6262ms | 0.5091ms | 1.23× slower, 23% more time | 2.0113ms | 0.4708ms | 4.27× slower, 327.2% more time | S5/S5 |
| 100000 | 1.4155ms | 1.5506ms | 1.1× faster, 8.7% less time | 3.7946ms | 0.9086ms | 4.18× slower, 317.6% more time | S5/S5 |
| 200000 | 5.9900ms | 3.2685ms | 1.83× slower, 83.3% more time | 9.3101ms | 2.2171ms | 4.2× slower, 319.9% more time | S5/S5 |
| 500000 | 24.23ms | 7.6040ms | 3.19× slower, 218.6% more time | 54.17ms | 5.4189ms | 10× slower, 899.7% more time | S5/S3 |
| 1000000 | 54.04ms | 14.72ms | 3.67× slower, 267.1% more time | 103.30ms | 11.41ms | 9.06× slower, 805.7% more time | S5/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0715ms | 0.2142ms | 3× faster, 66.6% less time |
| 20000 | 0.2856ms | 0.8173ms | 2.86× faster, 65.1% less time |
| 50000 | 0.6262ms | 2.1755ms | 3.47× faster, 71.2% less time |
| 100000 | 1.4155ms | 4.8778ms | 3.45× faster, 71% less time |
| 200000 | 5.9900ms | 9.9966ms | 1.67× faster, 40.1% less time |
| 500000 | 24.23ms | 25.31ms | 1.04× faster, 4.3% less time |
| 1000000 | 54.04ms | 50.41ms | 1.07× slower, 7.2% more time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0314ms | 0.0412ms | 1.31× faster, 23.8% less time | 0.2096ms |
| 20000 | 0.1101ms | 0.1576ms | 1.43× faster, 30.2% less time | 0.8098ms |
| 50000 | 0.2387ms | 0.4933ms | 2.07× faster, 51.6% less time | 2.1666ms |
| 100000 | 0.5411ms | 0.9846ms | 1.82× faster, 45% less time | 4.2864ms |
| 200000 | 1.0811ms | 2.1047ms | 1.95× faster, 48.6% less time | 8.6400ms |
| 500000 | 3.0160ms | 5.3626ms | 1.78× faster, 43.8% less time | 22.84ms |
| 1000000 | 7.2475ms | 13.74ms | 1.9× faster, 47.3% less time | 49.95ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2049ms | 0.2045ms |
| @ox-content/napi (parse only) | 0.0412ms | 0.0406ms |
| markdown-exit | 0.6701ms | 0.7338ms |
| markdown-it (baseline) | 0.2558ms | 0.2170ms |
| markdown-it-ts (stream+chunk) | 0.2436ms | 0.4170ms |
| micromark (parse only) | 8.4662ms | 8.4645ms |
| remark (parse only) | 8.6140ms | 9.0889ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.8221ms | 0.8013ms |
| @ox-content/napi (parse only) | 0.1809ms | 0.1600ms |
| markdown-exit | 1.3765ms | 1.4149ms |
| markdown-it (baseline) | 0.9390ms | 0.9856ms |
| markdown-it-ts (stream+chunk) | 0.9356ms | 0.9722ms |
| micromark (parse only) | 29.37ms | 28.79ms |
| remark (parse only) | 38.46ms | 40.72ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.1198ms | 2.1412ms |
| @ox-content/napi (parse only) | 0.4966ms | 0.4943ms |
| markdown-exit | 3.3057ms | 3.9086ms |
| markdown-it (baseline) | 3.0794ms | 2.7366ms |
| markdown-it-ts (stream+chunk) | 2.2224ms | 2.5434ms |
| micromark (parse only) | 76.03ms | 84.85ms |
| remark (parse only) | 112.11ms | 115.28ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 4.1971ms | 4.1985ms |
| @ox-content/napi (parse only) | 0.9722ms | 1.0236ms |
| markdown-exit | 10.12ms | 11.12ms |
| markdown-it (baseline) | 7.1311ms | 8.4571ms |
| markdown-it-ts (stream+chunk) | 4.8467ms | 6.5681ms |
| micromark (parse only) | 166.66ms | 174.98ms |
| remark (parse only) | 228.84ms | 248.15ms |
