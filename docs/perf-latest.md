# Performance Report (latest run)

## Environment

- Generated at: 2026-11-14T06:51:45.367Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 3dab383e9c8919a8f95e5af062567d79d8b303ad

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
| 5,011 | 0.0487ms | 0.1846ms | 0.0391ms | stock-fast | 0.0219ms | 0.2291ms | 0.0340ms | stock-fast | no |
| 20,085 | 0.1211ms | 0.7299ms | 0.1478ms | stock-fast | 0.0739ms | 0.9050ms | 0.1325ms | stock-fast | no |
| 50,084 | 0.3011ms | 1.8240ms | 0.3912ms | stock-fast | 0.1807ms | 2.2727ms | 0.3308ms | stock-fast | no |
| 100,126 | 0.7108ms | 3.7636ms | 0.7653ms | stock-fast | 0.3598ms | 4.7888ms | 0.6785ms | stock-fast | no |
| 200,073 | 1.6192ms | 8.1583ms | 1.5159ms | stock-fast | 0.7211ms | 10.15ms | 1.3264ms | stock-fast | no |
| 500,121 | 3.5129ms | 21.73ms | 3.7732ms | stock-fast | 2.4192ms | 30.14ms | 3.3566ms | stock-fast | no |
| 1,000,068 | 13.33ms | 45.77ms | 7.7734ms | stock-fast | 4.9263ms | 64.98ms | 6.6524ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2089ms | 0.2607ms | 0.0538ms | general | 0.2206ms | 0.3280ms | 0.0485ms | token-renderer | no |
| 20,125 | 0.6714ms | 0.9715ms | 0.2034ms | general | 0.8188ms | 1.2362ms | 0.1829ms | token-renderer | no |
| 50,025 | 1.6684ms | 2.4199ms | 0.5369ms | general | 2.0332ms | 3.1412ms | 0.4529ms | token-renderer | no |
| 100,450 | 3.5445ms | 5.1036ms | 1.0430ms | general | 4.3056ms | 6.5880ms | 0.9233ms | token-renderer | no |
| 200,109 | 8.8459ms | 10.41ms | 2.0394ms | full-chunk | 10.27ms | 14.01ms | 1.7878ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0734ms | 0.1241ms | 0.0281ms | general | 0.0890ms | 0.1436ms | 0.0203ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0763ms | 0.1404ms | 0.0273ms | general | 0.0930ms | 0.1586ms | 0.0219ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0230ms | 0.0359ms | 0.0080ms | general | 0.0280ms | 0.0419ms | 0.0071ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2095ms | 0.1580ms | 0.1976ms | 0.1926ms | 0.0402ms | 0.1832ms | 0.2546ms | **0.0381ms** | 0.1766ms | 2.9920ms | 0.6190ms | 0.3122ms | 0.2965ms | 0.5734ms | 0.1108ms | 0.6013ms | 0.8142ms | **0.0584ms** | 0.1966ms | 9.6401ms | 1.7216ms | 0.4172ms | 0.3637ms | 1.6221ms | 0.5752ms | 1.7423ms | 2.3873ms | **0.0898ms** | 0.2497ms | 27.84ms | 0.2105ms | 0.1827ms | 0.2018ms | 0.2067ms | 0.1741ms | 0.2013ms | 0.2670ms | **0.0380ms** | 0.1750ms | 2.9737ms |
| 20000 | 0.7505ms | 0.5989ms | 0.7482ms | 0.7449ms | **0.1225ms** | 0.7322ms | 0.9970ms | 0.1459ms | 0.6949ms | 15.99ms | 2.5774ms | 1.0262ms | 1.0409ms | 2.5908ms | 0.4420ms | 2.5207ms | 3.4120ms | **0.1828ms** | 0.7263ms | 48.51ms | 7.1611ms | 1.1132ms | 0.9569ms | 7.0490ms | 2.2682ms | 6.9309ms | 9.4195ms | **0.2195ms** | 0.7860ms | 132.97ms | 0.7381ms | 0.5918ms | 0.7764ms | 0.7464ms | 0.6810ms | 0.7300ms | 1.0039ms | **0.1435ms** | 0.6924ms | 14.38ms |
| 50000 | 1.9182ms | 1.5207ms | 1.8805ms | 1.8886ms | **0.3047ms** | 1.8198ms | 2.4928ms | 0.3884ms | 1.7444ms | 47.27ms | 6.6298ms | 2.9943ms | 2.1823ms | 6.6795ms | 1.1830ms | 6.3553ms | 8.5831ms | **0.4306ms** | 1.7720ms | 141.15ms | 17.76ms | 2.7174ms | 2.4136ms | 17.83ms | 3.2168ms | 17.15ms | 23.34ms | **0.4914ms** | 1.8509ms | 377.42ms | 1.9564ms | 1.5476ms | 1.9325ms | 1.8596ms | 1.6780ms | 1.8057ms | 2.4870ms | **0.3859ms** | 1.7318ms | 42.46ms |
| 100000 | 3.9488ms | 3.1089ms | 3.9596ms | 3.9148ms | **0.7231ms** | 4.2392ms | 5.2061ms | 0.7647ms | 3.4692ms | 89.41ms | 13.37ms | 5.3127ms | 4.4787ms | 13.31ms | 2.5788ms | 13.86ms | 17.43ms | **0.8216ms** | 3.5360ms | 305.64ms | 35.98ms | 4.8547ms | 4.8140ms | 36.00ms | 6.9491ms | 36.22ms | 47.18ms | **0.8848ms** | 3.6019ms | 831.59ms | 3.9015ms | 3.0480ms | 3.9131ms | 3.7594ms | 3.4263ms | 4.1067ms | 5.1601ms | **0.7729ms** | 3.4622ms | 86.46ms |
| 200000 | 8.3176ms | 7.2611ms | 8.3341ms | 8.2658ms | 1.7765ms | 9.3418ms | 11.21ms | **1.4873ms** | 6.8683ms | 182.54ms | 27.42ms | 10.96ms | 10.32ms | 27.22ms | 5.1231ms | 27.99ms | 35.97ms | **1.7514ms** | 7.1032ms | 613.97ms | 73.54ms | 10.43ms | 10.36ms | 73.02ms | 13.09ms | 72.24ms | 96.34ms | **1.7122ms** | 7.0606ms | 1735.45ms | 8.1074ms | 6.5282ms | 8.2582ms | 8.8606ms | 9.0739ms | 7.9300ms | 10.96ms | **1.4981ms** | 6.8175ms | 181.58ms |
| 500000 | 22.51ms | 21.35ms | 23.43ms | 22.68ms | 5.8533ms | 24.21ms | 31.44ms | **3.7370ms** | 17.04ms | - | 67.42ms | 34.36ms | 28.98ms | 67.76ms | 14.08ms | 77.49ms | 100.10ms | **4.2453ms** | 17.83ms | - | 192.32ms | 27.83ms | 26.92ms | 190.16ms | 59.07ms | 208.73ms | 269.46ms | **4.5572ms** | 18.01ms | - | 24.33ms | 20.58ms | 21.85ms | 23.34ms | 23.75ms | 23.73ms | 30.87ms | **3.7914ms** | 17.09ms | - |
| 1000000 | 51.75ms | 49.28ms | 48.69ms | 51.06ms | 13.49ms | 61.69ms | 64.48ms | **7.4530ms** | 33.98ms | - | 151.74ms | 74.80ms | 64.37ms | 160.37ms | 36.93ms | 156.56ms | 201.29ms | **8.7545ms** | 37.95ms | - | 412.61ms | 60.84ms | 62.05ms | 419.08ms | 94.07ms | 439.09ms | 551.71ms | **9.0307ms** | 37.32ms | - | 47.48ms | 46.93ms | 52.55ms | 48.52ms | 69.16ms | 47.62ms | 62.29ms | **7.4392ms** | 36.12ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0402ms (stream OFF, chunk OFF)
- 20000: S5 0.1225ms (stream OFF, chunk OFF)
- 50000: S5 0.3047ms (stream OFF, chunk OFF)
- 100000: S5 0.7231ms (stream OFF, chunk OFF)
- 200000: S5 1.7765ms (stream OFF, chunk OFF)
- 500000: S5 5.8533ms (stream OFF, chunk OFF)
- 1000000: S5 13.49ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1108ms (stream OFF, chunk OFF)
- 20000: S5 0.4420ms (stream OFF, chunk OFF)
- 50000: S5 1.1830ms (stream OFF, chunk OFF)
- 100000: S5 2.5788ms (stream OFF, chunk OFF)
- 200000: S5 5.1231ms (stream OFF, chunk OFF)
- 500000: S5 14.08ms (stream OFF, chunk OFF)
- 1000000: S5 36.93ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3637ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9569ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.4136ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.8140ms (stream ON, cache ON, chunk ON)
- 200000: S3 10.36ms (stream ON, cache ON, chunk ON)
- 500000: S3 26.92ms (stream ON, cache ON, chunk ON)
- 1000000: S2 60.84ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1741ms (stream OFF, chunk OFF)
- 20000: S2 0.5918ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.5476ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0480ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.5282ms (stream ON, cache ON, chunk OFF)
- 500000: S2 20.58ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 46.93ms (stream ON, cache ON, chunk OFF)

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
| 5000 | 0.0229ms | 0.0197ms | 0.2295ms | 0.0338ms | 3.8765ms | 4.7684ms | 0.2990ms |
| 20000 | 0.0746ms | 0.0736ms | 0.9073ms | 0.1340ms | 17.89ms | 22.14ms | 1.1946ms |
| 50000 | 0.1806ms | 0.1805ms | 2.2760ms | 0.3255ms | 51.45ms | 68.88ms | 2.9750ms |
| 100000 | 0.3617ms | 0.3606ms | 4.7736ms | 0.6759ms | 105.91ms | 160.15ms | 6.0081ms |
| 200000 | 0.7134ms | 0.7112ms | 10.38ms | 1.3206ms | 219.50ms | 391.70ms | 13.14ms |
| 500000 | 2.5697ms | 2.5084ms | 31.25ms | 3.2855ms | - | - | 38.51ms |
| 1000000 | 5.1736ms | 5.0648ms | 65.64ms | 6.6102ms | - | - | 77.11ms |

Render vs markdown-it:
- 5,000 chars: 0.0229ms vs 0.2295ms → 10.03× faster
- 20,000 chars: 0.0746ms vs 0.9073ms → 12.16× faster
- 50,000 chars: 0.1806ms vs 2.2760ms → 12.60× faster
- 100,000 chars: 0.3617ms vs 4.7736ms → 13.20× faster
- 200,000 chars: 0.7134ms vs 10.38ms → 14.56× faster
- 500,000 chars: 2.5697ms vs 31.25ms → 12.16× faster
- 1,000,000 chars: 5.1736ms vs 65.64ms → 12.69× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0229ms vs 0.0338ms → 1.48× faster, 32.3% less time
- 20,000 chars: 0.0746ms vs 0.1340ms → 1.8× faster, 44.3% less time
- 50,000 chars: 0.1806ms vs 0.3255ms → 1.8× faster, 44.5% less time
- 100,000 chars: 0.3617ms vs 0.6759ms → 1.87× faster, 46.5% less time
- 200,000 chars: 0.7134ms vs 1.3206ms → 1.85× faster, 46% less time
- 500,000 chars: 2.5697ms vs 3.2855ms → 1.28× faster, 21.8% less time
- 1,000,000 chars: 5.1736ms vs 6.6102ms → 1.28× faster, 21.7% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0197ms vs 0.0338ms → 1.71× faster, 41.5% less time
- 20,000 chars: 0.0736ms vs 0.1340ms → 1.82× faster, 45.1% less time
- 50,000 chars: 0.1805ms vs 0.3255ms → 1.8× faster, 44.5% less time
- 100,000 chars: 0.3606ms vs 0.6759ms → 1.87× faster, 46.7% less time
- 200,000 chars: 0.7112ms vs 1.3206ms → 1.86× faster, 46.1% less time
- 500,000 chars: 2.5084ms vs 3.2855ms → 1.31× faster, 23.7% less time
- 1,000,000 chars: 5.0648ms vs 6.6102ms → 1.31× faster, 23.4% less time

Render vs micromark:
- 5,000 chars: 0.0229ms vs 3.8765ms → 169.43× faster
- 20,000 chars: 0.0746ms vs 17.89ms → 239.68× faster
- 50,000 chars: 0.1806ms vs 51.45ms → 284.87× faster
- 100,000 chars: 0.3617ms vs 105.91ms → 292.83× faster
- 200,000 chars: 0.7134ms vs 219.50ms → 307.70× faster

Render vs remark+rehype:
- 5,000 chars: 0.0229ms vs 4.7684ms → 208.41× faster
- 20,000 chars: 0.0746ms vs 22.14ms → 296.64× faster
- 50,000 chars: 0.1806ms vs 68.88ms → 381.36× faster
- 100,000 chars: 0.3617ms vs 160.15ms → 442.81× faster
- 200,000 chars: 0.7134ms vs 391.70ms → 549.09× faster

Render vs markdown-exit:
- 5,000 chars: 0.0229ms vs 0.2990ms → 13.07× faster
- 20,000 chars: 0.0746ms vs 1.1946ms → 16.01× faster
- 50,000 chars: 0.1806ms vs 2.9750ms → 16.47× faster
- 100,000 chars: 0.3617ms vs 6.0081ms → 16.61× faster
- 200,000 chars: 0.7134ms vs 13.14ms → 18.42× faster
- 500,000 chars: 2.5697ms vs 38.51ms → 14.98× faster
- 1,000,000 chars: 5.1736ms vs 77.11ms → 14.91× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0402ms | 0.1832ms | 4.56× faster, 78.1% less time | 0.1108ms | 0.6013ms | 5.43× faster, 81.6% less time | S5/S5 |
| 20000 | 0.1225ms | 0.7322ms | 5.98× faster, 83.3% less time | 0.4420ms | 2.5207ms | 5.7× faster, 82.5% less time | S5/S5 |
| 50000 | 0.3047ms | 1.8198ms | 5.97× faster, 83.3% less time | 1.1830ms | 6.3553ms | 5.37× faster, 81.4% less time | S5/S5 |
| 100000 | 0.7231ms | 4.2392ms | 5.86× faster, 82.9% less time | 2.5788ms | 13.86ms | 5.37× faster, 81.4% less time | S5/S5 |
| 200000 | 1.7765ms | 9.3418ms | 5.26× faster, 81% less time | 5.1231ms | 27.99ms | 5.46× faster, 81.7% less time | S5/S5 |
| 500000 | 5.8533ms | 24.21ms | 4.14× faster, 75.8% less time | 14.08ms | 77.49ms | 5.5× faster, 81.8% less time | S5/S5 |
| 1000000 | 13.49ms | 61.69ms | 4.57× faster, 78.1% less time | 36.93ms | 156.56ms | 4.24× faster, 76.4% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0402ms | 0.0381ms | 1.05× slower, 5.3% more time | 0.1108ms | 0.0584ms | 1.9× slower, 89.9% more time | S5/S5 |
| 20000 | 0.1225ms | 0.1459ms | 1.19× faster, 16.1% less time | 0.4420ms | 0.1828ms | 2.42× slower, 141.9% more time | S5/S5 |
| 50000 | 0.3047ms | 0.3884ms | 1.27× faster, 21.6% less time | 1.1830ms | 0.4306ms | 2.75× slower, 174.7% more time | S5/S5 |
| 100000 | 0.7231ms | 0.7647ms | 1.06× faster, 5.4% less time | 2.5788ms | 0.8216ms | 3.14× slower, 213.9% more time | S5/S5 |
| 200000 | 1.7765ms | 1.4873ms | 1.19× slower, 19.4% more time | 5.1231ms | 1.7514ms | 2.93× slower, 192.5% more time | S5/S5 |
| 500000 | 5.8533ms | 3.7370ms | 1.57× slower, 56.6% more time | 14.08ms | 4.2453ms | 3.32× slower, 231.7% more time | S5/S5 |
| 1000000 | 13.49ms | 7.4530ms | 1.81× slower, 81% more time | 36.93ms | 8.7545ms | 4.22× slower, 321.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0402ms | 0.1766ms | 4.4× faster, 77.3% less time |
| 20000 | 0.1225ms | 0.6949ms | 5.67× faster, 82.4% less time |
| 50000 | 0.3047ms | 1.7444ms | 5.72× faster, 82.5% less time |
| 100000 | 0.7231ms | 3.4692ms | 4.8× faster, 79.2% less time |
| 200000 | 1.7765ms | 6.8683ms | 3.87× faster, 74.1% less time |
| 500000 | 5.8533ms | 17.04ms | 2.91× faster, 65.6% less time |
| 1000000 | 13.49ms | 33.98ms | 2.52× faster, 60.3% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0265ms | 0.0396ms | 1.49× faster, 33% less time | 0.1771ms |
| 20000 | 0.0937ms | 0.1448ms | 1.55× faster, 35.3% less time | 0.7040ms |
| 50000 | 0.2249ms | 0.3981ms | 1.77× faster, 43.5% less time | 1.8043ms |
| 100000 | 0.4469ms | 0.7611ms | 1.7× faster, 41.3% less time | 3.5082ms |
| 200000 | 0.8821ms | 1.4974ms | 1.7× faster, 41.1% less time | 7.0129ms |
| 500000 | 2.1990ms | 4.0209ms | 1.83× faster, 45.3% less time | 17.33ms |
| 1000000 | 4.8758ms | 7.4608ms | 1.53× faster, 34.6% less time | 34.51ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1763ms | 0.1756ms |
| @ox-content/napi (parse only) | 0.0426ms | 0.0377ms |
| markdown-exit | 0.2701ms | 0.2445ms |
| markdown-it (baseline) | 0.1925ms | 0.1790ms |
| markdown-it-ts (stream+chunk) | 0.2285ms | 0.2061ms |
| micromark (parse only) | 4.3943ms | 3.7017ms |
| remark (parse only) | 3.7881ms | 4.1304ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6914ms | 0.6963ms |
| @ox-content/napi (parse only) | 0.1476ms | 0.1497ms |
| markdown-exit | 1.0061ms | 0.9760ms |
| markdown-it (baseline) | 0.7545ms | 0.8366ms |
| markdown-it-ts (stream+chunk) | 0.7798ms | 0.7542ms |
| micromark (parse only) | 15.67ms | 16.32ms |
| remark (parse only) | 19.48ms | 19.68ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7515ms | 1.7898ms |
| @ox-content/napi (parse only) | 0.3806ms | 0.3829ms |
| markdown-exit | 2.4597ms | 2.4224ms |
| markdown-it (baseline) | 1.7687ms | 1.9014ms |
| markdown-it-ts (stream+chunk) | 1.8795ms | 2.0230ms |
| micromark (parse only) | 45.70ms | 45.14ms |
| remark (parse only) | 62.71ms | 62.02ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5167ms | 3.4731ms |
| @ox-content/napi (parse only) | 0.7608ms | 0.7674ms |
| markdown-exit | 4.8765ms | 5.2345ms |
| markdown-it (baseline) | 3.5909ms | 3.9113ms |
| markdown-it-ts (stream+chunk) | 3.6957ms | 3.9505ms |
| micromark (parse only) | 86.05ms | 89.24ms |
| remark (parse only) | 140.56ms | 145.77ms |
