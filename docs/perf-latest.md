# Performance Report (latest run)

## Environment

- Generated at: 2026-08-22T17:57:47.609Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: AMD EPYC 7763 64-Core Processor
- CPU count: 4
- Commit: 47e3b5e51107e98ba3dc39cb87c223661ded77b2

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
| 5,011 | 0.0391ms | 0.2476ms | 0.0450ms | stock-fast | 0.0225ms | 0.2983ms | 0.0440ms | stock-fast | no |
| 20,085 | 0.1705ms | 1.0034ms | 0.1765ms | stock-fast | 0.0875ms | 1.2006ms | 0.1721ms | stock-fast | no |
| 50,084 | 0.4397ms | 2.6523ms | 0.5443ms | stock-fast | 0.2145ms | 2.9033ms | 0.4391ms | stock-fast | no |
| 100,126 | 1.3706ms | 5.9701ms | 1.0682ms | stock-fast | 0.4309ms | 8.1659ms | 0.9633ms | stock-fast | no |
| 200,073 | 2.0562ms | 11.09ms | 2.0570ms | stock-fast | 1.1452ms | 17.38ms | 1.8712ms | stock-fast | no |
| 500,121 | 21.12ms | 47.39ms | 5.0902ms | stock-fast | 3.3478ms | 49.90ms | 4.5967ms | stock-fast | no |
| 1,000,068 | 46.87ms | 97.33ms | 11.55ms | stock-fast | 7.7036ms | 125.04ms | 9.0636ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3515ms | 0.3815ms | 0.0638ms | general | 0.3888ms | 0.4838ms | 0.0621ms | token-renderer | no |
| 20,125 | 1.1369ms | 1.4161ms | 0.2403ms | general | 1.3783ms | 1.7521ms | 0.2305ms | token-renderer | no |
| 50,025 | 2.9326ms | 3.4329ms | 0.7394ms | general | 3.5087ms | 4.3981ms | 0.5831ms | token-renderer | no |
| 100,450 | 8.3507ms | 9.6000ms | 1.3939ms | general | 9.4007ms | 10.46ms | 1.2636ms | token-renderer | no |
| 200,109 | 17.10ms | 22.87ms | 2.7177ms | full-chunk | 21.33ms | 22.87ms | 2.4383ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1487ms | 0.1871ms | 0.0279ms | general | 0.1527ms | 0.2188ms | 0.0237ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1378ms | 0.1838ms | 0.0272ms | general | 0.1645ms | 0.2184ms | 0.0264ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0363ms | 0.0509ms | 0.0097ms | general | 0.0444ms | 0.0585ms | 0.0097ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2606ms | 0.2097ms | 0.2376ms | 0.2368ms | 0.0495ms | 0.2551ms | 0.4907ms | **0.0455ms** | 0.2579ms | 7.0364ms | 0.7658ms | 0.3966ms | 0.2921ms | 0.7104ms | 0.1505ms | 0.8893ms | 1.3588ms | **0.0815ms** | 0.2982ms | 24.35ms | 2.3627ms | 0.4498ms | 0.8486ms | 2.0598ms | 0.8690ms | 2.6158ms | 3.6599ms | **0.1455ms** | 0.3683ms | 70.72ms | 0.3713ms | 0.2101ms | 0.2490ms | 0.2398ms | 0.2364ms | 0.5408ms | 0.8169ms | **0.0453ms** | 0.2578ms | 8.2489ms |
| 20000 | 0.9618ms | 0.7862ms | 0.9612ms | 0.9530ms | 0.2009ms | 1.0575ms | 1.5644ms | **0.1751ms** | 1.0186ms | 32.40ms | 3.2501ms | 1.1544ms | 1.1974ms | 3.2650ms | 0.6665ms | 3.5013ms | 5.1956ms | **0.2213ms** | 1.0770ms | 100.49ms | 8.8485ms | 1.3487ms | 2.0190ms | 8.8896ms | 3.0777ms | 9.6631ms | 14.63ms | **0.2891ms** | 1.1620ms | 272.56ms | 0.9430ms | 0.9050ms | 1.1327ms | 0.9543ms | 0.9857ms | 1.0526ms | 1.5618ms | **0.1752ms** | 1.0200ms | 40.37ms |
| 50000 | 2.3829ms | 2.0797ms | 2.3562ms | 2.3561ms | **0.5134ms** | 2.6979ms | 3.8585ms | 0.5624ms | 2.6492ms | 90.69ms | 8.2854ms | 2.8236ms | 2.8852ms | 8.2721ms | 1.6570ms | 8.5671ms | 13.28ms | **0.5103ms** | 2.6144ms | 306.72ms | 22.53ms | 4.6702ms | 4.6301ms | 22.22ms | 4.8251ms | 23.86ms | 37.41ms | **0.5807ms** | 2.7161ms | 812.44ms | 2.3935ms | 2.0577ms | 2.3421ms | 2.3551ms | 2.7915ms | 2.5897ms | 4.0641ms | **0.6258ms** | 2.6494ms | 87.22ms |
| 100000 | 5.1410ms | 7.2540ms | 5.0245ms | 5.0290ms | **1.4635ms** | 5.9634ms | 9.0698ms | 1.9052ms | 6.0793ms | 186.16ms | 17.82ms | 7.3739ms | 6.5144ms | 17.82ms | 3.5296ms | 17.61ms | 27.25ms | **1.0048ms** | 5.1565ms | 615.71ms | 45.78ms | 11.21ms | 10.46ms | 47.06ms | 9.2484ms | 50.84ms | 78.96ms | **1.0793ms** | 5.3251ms | 1698.04ms | 4.9267ms | 6.0119ms | 4.8424ms | 4.8292ms | 11.41ms | 6.8612ms | 8.3990ms | **1.9057ms** | 6.0285ms | 180.47ms |
| 200000 | 10.50ms | 16.80ms | 10.43ms | 10.92ms | 7.2789ms | 11.67ms | 18.07ms | **3.4383ms** | 12.05ms | 354.91ms | 38.18ms | 17.54ms | 13.95ms | 38.00ms | 8.9750ms | 50.09ms | 65.00ms | **2.5405ms** | 10.75ms | 1300.25ms | 112.70ms | 22.82ms | 27.90ms | 110.98ms | 37.00ms | 118.04ms | 160.06ms | **2.1597ms** | 10.61ms | 3468.98ms | 14.19ms | 12.96ms | 10.06ms | 10.09ms | 17.14ms | 10.84ms | 18.77ms | **3.5074ms** | 11.89ms | 377.18ms |
| 500000 | 39.60ms | 39.87ms | 45.38ms | 44.81ms | 22.46ms | 47.64ms | 65.10ms | **7.2539ms** | 28.83ms | - | 131.15ms | 52.44ms | 51.37ms | 130.07ms | 70.29ms | 154.53ms | 202.14ms | **5.8940ms** | 27.45ms | - | 380.07ms | 61.64ms | 65.11ms | 374.03ms | 207.67ms | 450.52ms | 586.96ms | **7.7467ms** | 27.05ms | - | 40.01ms | 51.97ms | 49.15ms | 37.57ms | 58.71ms | 58.30ms | 61.38ms | **7.3072ms** | 27.18ms | - |
| 1000000 | 81.67ms | 107.68ms | 110.85ms | 82.49ms | 48.34ms | 96.08ms | 124.36ms | **12.13ms** | 56.21ms | - | 289.57ms | 141.87ms | 148.50ms | 295.27ms | 163.42ms | 409.40ms | 459.56ms | **11.74ms** | 54.56ms | - | 813.16ms | 129.73ms | 163.18ms | 835.60ms | 393.41ms | 976.68ms | 1197.37ms | **13.17ms** | 52.88ms | - | 79.67ms | 83.38ms | 79.18ms | 80.19ms | 122.36ms | 101.34ms | 151.80ms | **12.04ms** | 55.52ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0495ms (stream OFF, chunk OFF)
- 20000: S5 0.2009ms (stream OFF, chunk OFF)
- 50000: S5 0.5134ms (stream OFF, chunk OFF)
- 100000: S5 1.4635ms (stream OFF, chunk OFF)
- 200000: S5 7.2789ms (stream OFF, chunk OFF)
- 500000: S5 22.46ms (stream OFF, chunk OFF)
- 1000000: S5 48.34ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1505ms (stream OFF, chunk OFF)
- 20000: S5 0.6665ms (stream OFF, chunk OFF)
- 50000: S5 1.6570ms (stream OFF, chunk OFF)
- 100000: S5 3.5296ms (stream OFF, chunk OFF)
- 200000: S5 8.9750ms (stream OFF, chunk OFF)
- 500000: S3 51.37ms (stream ON, cache ON, chunk ON)
- 1000000: S2 141.87ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.4498ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.3487ms (stream ON, cache ON, chunk OFF)
- 50000: S3 4.6301ms (stream ON, cache ON, chunk ON)
- 100000: S5 9.2484ms (stream OFF, chunk OFF)
- 200000: S2 22.82ms (stream ON, cache ON, chunk OFF)
- 500000: S2 61.64ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 129.73ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.2101ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.9050ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.0577ms (stream ON, cache ON, chunk OFF)
- 100000: S4 4.8292ms (stream OFF, chunk ON)
- 200000: S3 10.06ms (stream ON, cache ON, chunk ON)
- 500000: S4 37.57ms (stream OFF, chunk ON)
- 1000000: S3 79.18ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0308ms | 0.0246ms | 0.2977ms | 0.0436ms | 9.1266ms | 10.64ms | 0.4325ms |
| 20000 | 0.0928ms | 0.0929ms | 1.2166ms | 0.1701ms | 40.12ms | 44.75ms | 1.7639ms |
| 50000 | 0.2448ms | 0.2309ms | 3.1504ms | 0.4322ms | 105.89ms | 133.63ms | 4.5975ms |
| 100000 | 0.4563ms | 0.4959ms | 8.3102ms | 0.9483ms | 219.38ms | 265.88ms | 11.63ms |
| 200000 | 0.9063ms | 1.0287ms | 17.50ms | 1.8804ms | 428.49ms | 649.97ms | 25.25ms |
| 500000 | 3.6094ms | 3.6019ms | 55.35ms | 4.5931ms | - | - | 67.13ms |
| 1000000 | 7.5409ms | 7.8338ms | 123.83ms | 9.1121ms | - | - | 157.51ms |

Render vs markdown-it:
- 5,000 chars: 0.0308ms vs 0.2977ms → 9.66× faster
- 20,000 chars: 0.0928ms vs 1.2166ms → 13.12× faster
- 50,000 chars: 0.2448ms vs 3.1504ms → 12.87× faster
- 100,000 chars: 0.4563ms vs 8.3102ms → 18.21× faster
- 200,000 chars: 0.9063ms vs 17.50ms → 19.31× faster
- 500,000 chars: 3.6094ms vs 55.35ms → 15.33× faster
- 1,000,000 chars: 7.5409ms vs 123.83ms → 16.42× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0308ms vs 0.0436ms → 1.41× faster, 29.2% less time
- 20,000 chars: 0.0928ms vs 0.1701ms → 1.83× faster, 45.5% less time
- 50,000 chars: 0.2448ms vs 0.4322ms → 1.77× faster, 43.4% less time
- 100,000 chars: 0.4563ms vs 0.9483ms → 2.08× faster, 51.9% less time
- 200,000 chars: 0.9063ms vs 1.8804ms → 2.07× faster, 51.8% less time
- 500,000 chars: 3.6094ms vs 4.5931ms → 1.27× faster, 21.4% less time
- 1,000,000 chars: 7.5409ms vs 9.1121ms → 1.21× faster, 17.2% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0246ms vs 0.0436ms → 1.77× faster, 43.4% less time
- 20,000 chars: 0.0929ms vs 0.1701ms → 1.83× faster, 45.4% less time
- 50,000 chars: 0.2309ms vs 0.4322ms → 1.87× faster, 46.6% less time
- 100,000 chars: 0.4959ms vs 0.9483ms → 1.91× faster, 47.7% less time
- 200,000 chars: 1.0287ms vs 1.8804ms → 1.83× faster, 45.3% less time
- 500,000 chars: 3.6019ms vs 4.5931ms → 1.28× faster, 21.6% less time
- 1,000,000 chars: 7.8338ms vs 9.1121ms → 1.16× faster, 14% less time

Render vs micromark:
- 5,000 chars: 0.0308ms vs 9.1266ms → 296.00× faster
- 20,000 chars: 0.0928ms vs 40.12ms → 432.53× faster
- 50,000 chars: 0.2448ms vs 105.89ms → 432.61× faster
- 100,000 chars: 0.4563ms vs 219.38ms → 480.78× faster
- 200,000 chars: 0.9063ms vs 428.49ms → 472.79× faster

Render vs remark+rehype:
- 5,000 chars: 0.0308ms vs 10.64ms → 345.14× faster
- 20,000 chars: 0.0928ms vs 44.75ms → 482.45× faster
- 50,000 chars: 0.2448ms vs 133.63ms → 545.97× faster
- 100,000 chars: 0.4563ms vs 265.88ms → 582.67× faster
- 200,000 chars: 0.9063ms vs 649.97ms → 717.17× faster

Render vs markdown-exit:
- 5,000 chars: 0.0308ms vs 0.4325ms → 14.03× faster
- 20,000 chars: 0.0928ms vs 1.7639ms → 19.02× faster
- 50,000 chars: 0.2448ms vs 4.5975ms → 18.78× faster
- 100,000 chars: 0.4563ms vs 11.63ms → 25.50× faster
- 200,000 chars: 0.9063ms vs 25.25ms → 27.87× faster
- 500,000 chars: 3.6094ms vs 67.13ms → 18.60× faster
- 1,000,000 chars: 7.5409ms vs 157.51ms → 20.89× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0495ms | 0.2551ms | 5.15× faster, 80.6% less time | 0.1505ms | 0.8893ms | 5.91× faster, 83.1% less time | S5/S5 |
| 20000 | 0.2009ms | 1.0575ms | 5.26× faster, 81% less time | 0.6665ms | 3.5013ms | 5.25× faster, 81% less time | S5/S5 |
| 50000 | 0.5134ms | 2.6979ms | 5.26× faster, 81% less time | 1.6570ms | 8.5671ms | 5.17× faster, 80.7% less time | S5/S5 |
| 100000 | 1.4635ms | 5.9634ms | 4.07× faster, 75.5% less time | 3.5296ms | 17.61ms | 4.99× faster, 80% less time | S5/S5 |
| 200000 | 7.2789ms | 11.67ms | 1.6× faster, 37.6% less time | 8.9750ms | 50.09ms | 5.58× faster, 82.1% less time | S5/S5 |
| 500000 | 22.46ms | 47.64ms | 2.12× faster, 52.9% less time | 51.37ms | 154.53ms | 3.01× faster, 66.8% less time | S5/S3 |
| 1000000 | 48.34ms | 96.08ms | 1.99× faster, 49.7% less time | 141.87ms | 409.40ms | 2.89× faster, 65.3% less time | S5/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0495ms | 0.0455ms | 1.09× slower, 8.9% more time | 0.1505ms | 0.0815ms | 1.85× slower, 84.6% more time | S5/S5 |
| 20000 | 0.2009ms | 0.1751ms | 1.15× slower, 14.8% more time | 0.6665ms | 0.2213ms | 3.01× slower, 201.2% more time | S5/S5 |
| 50000 | 0.5134ms | 0.5624ms | 1.1× faster, 8.7% less time | 1.6570ms | 0.5103ms | 3.25× slower, 224.7% more time | S5/S5 |
| 100000 | 1.4635ms | 1.9052ms | 1.3× faster, 23.2% less time | 3.5296ms | 1.0048ms | 3.51× slower, 251.3% more time | S5/S5 |
| 200000 | 7.2789ms | 3.4383ms | 2.12× slower, 111.7% more time | 8.9750ms | 2.5405ms | 3.53× slower, 253.3% more time | S5/S5 |
| 500000 | 22.46ms | 7.2539ms | 3.1× slower, 209.7% more time | 51.37ms | 5.8940ms | 8.72× slower, 771.6% more time | S5/S3 |
| 1000000 | 48.34ms | 12.13ms | 3.98× slower, 298.4% more time | 141.87ms | 11.74ms | 12.08× slower, 1108% more time | S5/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0495ms | 0.2579ms | 5.21× faster, 80.8% less time |
| 20000 | 0.2009ms | 1.0186ms | 5.07× faster, 80.3% less time |
| 50000 | 0.5134ms | 2.6492ms | 5.16× faster, 80.6% less time |
| 100000 | 1.4635ms | 6.0793ms | 4.15× faster, 75.9% less time |
| 200000 | 7.2789ms | 12.05ms | 1.66× faster, 39.6% less time |
| 500000 | 22.46ms | 28.83ms | 1.28× faster, 22.1% less time |
| 1000000 | 48.34ms | 56.21ms | 1.16× faster, 14% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0572ms | 0.0452ms | 1.27× slower, 26.7% more time | 0.2558ms |
| 20000 | 0.1150ms | 0.1773ms | 1.54× faster, 35.1% less time | 1.0149ms |
| 50000 | 0.2802ms | 0.5448ms | 1.94× faster, 48.6% less time | 2.6399ms |
| 100000 | 0.5999ms | 1.0611ms | 1.77× faster, 43.5% less time | 5.2706ms |
| 200000 | 1.2291ms | 2.0750ms | 1.69× faster, 40.8% less time | 10.47ms |
| 500000 | 3.1824ms | 5.0622ms | 1.59× faster, 37.1% less time | 26.69ms |
| 1000000 | 8.5194ms | 11.77ms | 1.38× faster, 27.6% less time | 55.42ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2556ms | 0.2360ms |
| @ox-content/napi (parse only) | 0.0453ms | 0.0448ms |
| markdown-exit | 0.6888ms | 0.3913ms |
| markdown-it (baseline) | 0.3061ms | 0.3994ms |
| markdown-it-ts (stream+chunk) | 0.2521ms | 0.2309ms |
| micromark (parse only) | 9.8320ms | 12.56ms |
| remark (parse only) | 9.4598ms | 8.3347ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.0198ms | 1.0123ms |
| @ox-content/napi (parse only) | 0.1899ms | 0.1743ms |
| markdown-exit | 1.4811ms | 1.5873ms |
| markdown-it (baseline) | 1.0130ms | 1.0156ms |
| markdown-it-ts (stream+chunk) | 1.8841ms | 0.9942ms |
| micromark (parse only) | 29.53ms | 29.55ms |
| remark (parse only) | 41.29ms | 40.55ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.6192ms | 2.6244ms |
| @ox-content/napi (parse only) | 0.5497ms | 0.5429ms |
| markdown-exit | 3.6106ms | 4.0090ms |
| markdown-it (baseline) | 2.3873ms | 2.7483ms |
| markdown-it-ts (stream+chunk) | 2.7772ms | 2.5829ms |
| micromark (parse only) | 101.89ms | 83.84ms |
| remark (parse only) | 105.25ms | 117.99ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 5.1892ms | 5.2110ms |
| @ox-content/napi (parse only) | 1.0702ms | 1.0701ms |
| markdown-exit | 9.9823ms | 11.02ms |
| markdown-it (baseline) | 7.5463ms | 7.5408ms |
| markdown-it-ts (stream+chunk) | 7.6194ms | 6.4195ms |
| micromark (parse only) | 181.74ms | 172.28ms |
| remark (parse only) | 258.68ms | 247.95ms |
