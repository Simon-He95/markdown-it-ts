# Performance Report (latest run)

## Environment

- Generated at: 2026-08-22T17:28:43.682Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: AMD EPYC 7763 64-Core Processor
- CPU count: 4
- Commit: d2f169ef15bc5c92c60d9ab923da8457a959b155

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
| 5,011 | 0.0387ms | 0.2338ms | 0.0457ms | stock-fast | 0.0234ms | 0.2850ms | 0.0435ms | stock-fast | no |
| 20,085 | 0.1668ms | 0.9463ms | 0.1771ms | stock-fast | 0.0883ms | 1.1526ms | 0.1702ms | stock-fast | no |
| 50,084 | 0.4505ms | 2.5595ms | 0.5686ms | stock-fast | 0.2181ms | 2.7854ms | 0.4423ms | stock-fast | no |
| 100,126 | 1.4971ms | 5.7158ms | 1.1004ms | stock-fast | 0.4383ms | 8.3614ms | 0.9665ms | stock-fast | no |
| 200,073 | 2.0421ms | 10.51ms | 2.0995ms | stock-fast | 0.8741ms | 16.83ms | 1.9184ms | stock-fast | no |
| 500,121 | 21.77ms | 42.49ms | 4.7363ms | stock-fast | 3.4402ms | 57.62ms | 4.6101ms | stock-fast | no |
| 1,000,068 | 50.41ms | 102.66ms | 13.76ms | stock-fast | 8.8341ms | 125.74ms | 9.2571ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3662ms | 0.3994ms | 0.0649ms | general | 0.4012ms | 0.4692ms | 0.0625ms | token-renderer | no |
| 20,125 | 1.1635ms | 1.4051ms | 0.2457ms | general | 1.3735ms | 1.7328ms | 0.2318ms | token-renderer | no |
| 50,025 | 2.9695ms | 3.4492ms | 0.7495ms | general | 3.6045ms | 4.5006ms | 0.5900ms | token-renderer | no |
| 100,450 | 9.0336ms | 10.51ms | 1.4088ms | general | 10.91ms | 10.88ms | 1.2746ms | token-renderer | no |
| 200,109 | 19.30ms | 20.26ms | 2.7133ms | full-chunk | 20.99ms | 24.65ms | 2.4579ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1575ms | 0.1968ms | 0.0282ms | general | 0.1593ms | 0.2151ms | 0.0238ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1430ms | 0.1865ms | 0.0274ms | general | 0.1729ms | 0.2196ms | 0.0266ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0370ms | 0.0516ms | 0.0099ms | general | 0.0459ms | 0.0581ms | 0.0097ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.4504ms | 0.2454ms | 0.2337ms | 0.2374ms | 0.0590ms | 0.2543ms | 0.4107ms | **0.0491ms** | 0.2539ms | 8.3646ms | 0.7249ms | 0.3713ms | 0.3345ms | 0.6921ms | 0.1639ms | 0.7986ms | 1.2965ms | **0.0797ms** | 0.2901ms | 25.44ms | 2.2888ms | 0.9423ms | 0.5559ms | 2.0216ms | 0.8658ms | 2.2907ms | 3.7882ms | **0.1374ms** | 0.3648ms | 77.72ms | 0.3523ms | 0.2597ms | 0.3010ms | 0.2336ms | 0.3163ms | 0.7369ms | 0.9938ms | **0.0455ms** | 0.2531ms | 9.1489ms |
| 20000 | 0.9361ms | 0.7982ms | 0.9637ms | 0.9461ms | 0.2178ms | 1.0111ms | 1.5852ms | **0.1799ms** | 0.9942ms | 36.00ms | 3.1549ms | 1.1279ms | 1.0555ms | 3.0822ms | 0.7139ms | 3.4620ms | 5.3301ms | **0.2255ms** | 1.0496ms | 109.46ms | 8.6103ms | 1.3760ms | 1.8600ms | 8.6699ms | 3.2371ms | 9.2006ms | 15.93ms | **0.2909ms** | 1.1347ms | 327.91ms | 0.9226ms | 0.8387ms | 0.9408ms | 0.9715ms | 0.9936ms | 1.0142ms | 1.6550ms | **0.1798ms** | 0.9902ms | 37.70ms |
| 50000 | 2.4056ms | 2.0653ms | 2.2572ms | 2.3244ms | **0.5455ms** | 2.6397ms | 3.9948ms | 0.5615ms | 2.6181ms | 96.57ms | 8.3205ms | 2.8434ms | 2.8406ms | 7.9937ms | 1.7682ms | 8.2440ms | 13.47ms | **0.5101ms** | 2.5738ms | 308.57ms | 22.56ms | 4.5775ms | 4.5639ms | 21.63ms | 4.9587ms | 23.04ms | 37.61ms | **0.5816ms** | 2.6752ms | 887.49ms | 2.3988ms | 2.2575ms | 2.3312ms | 2.3524ms | 2.6122ms | 2.5370ms | 4.1311ms | **0.6447ms** | 2.6112ms | 98.70ms |
| 100000 | 5.0710ms | 6.9391ms | 4.9230ms | 4.9011ms | **1.3019ms** | 5.7656ms | 8.8441ms | 1.9017ms | 6.0108ms | 188.94ms | 18.12ms | 6.5629ms | 6.6921ms | 18.11ms | 3.4095ms | 18.37ms | 28.36ms | **1.0128ms** | 5.0426ms | 657.62ms | 45.77ms | 10.40ms | 10.82ms | 46.84ms | 9.2123ms | 48.48ms | 77.93ms | **1.1003ms** | 5.1178ms | 1814.85ms | 4.8276ms | 6.0589ms | 4.9497ms | 4.8785ms | 8.0994ms | 6.1821ms | 9.0783ms | **1.9136ms** | 5.9549ms | 183.63ms |
| 200000 | 11.41ms | 17.40ms | 11.22ms | 10.90ms | 6.9256ms | 11.68ms | 19.02ms | **3.8937ms** | 12.16ms | 397.84ms | 38.15ms | 16.18ms | 13.86ms | 38.57ms | 8.3296ms | 38.45ms | 70.09ms | **2.4910ms** | 10.44ms | 1362.15ms | 114.11ms | 22.91ms | 20.18ms | 105.78ms | 37.19ms | 112.25ms | 180.73ms | **2.1647ms** | 10.09ms | 3678.77ms | 9.8059ms | 18.45ms | 9.8192ms | 9.9233ms | 16.63ms | 10.61ms | 19.03ms | **3.8447ms** | 11.97ms | 387.68ms |
| 500000 | 45.92ms | 40.63ms | 47.11ms | 44.42ms | 23.06ms | 53.94ms | 68.21ms | **7.8968ms** | 29.32ms | - | 162.02ms | 65.35ms | 47.56ms | 157.72ms | 75.24ms | 145.26ms | 240.85ms | **6.0635ms** | 27.07ms | - | 422.60ms | 66.27ms | 66.94ms | 383.87ms | 191.81ms | 443.31ms | 586.09ms | **8.4092ms** | 26.74ms | - | 40.36ms | 55.43ms | 39.30ms | 43.98ms | 69.27ms | 46.96ms | 74.82ms | **7.4635ms** | 27.40ms | - |
| 1000000 | 80.99ms | 89.16ms | 75.06ms | 100.73ms | 44.41ms | 96.07ms | 126.36ms | **13.94ms** | 56.37ms | - | 307.26ms | 145.57ms | 143.77ms | 347.59ms | 178.58ms | 358.55ms | 495.00ms | **11.90ms** | 51.95ms | - | 840.90ms | 125.48ms | 155.06ms | 846.88ms | 467.78ms | 989.00ms | 1271.46ms | **13.51ms** | 51.72ms | - | 81.29ms | 88.78ms | 120.56ms | 82.26ms | 123.32ms | 145.95ms | 126.06ms | **13.21ms** | 56.24ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0590ms (stream OFF, chunk OFF)
- 20000: S5 0.2178ms (stream OFF, chunk OFF)
- 50000: S5 0.5455ms (stream OFF, chunk OFF)
- 100000: S5 1.3019ms (stream OFF, chunk OFF)
- 200000: S5 6.9256ms (stream OFF, chunk OFF)
- 500000: S5 23.06ms (stream OFF, chunk OFF)
- 1000000: S5 44.41ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1639ms (stream OFF, chunk OFF)
- 20000: S5 0.7139ms (stream OFF, chunk OFF)
- 50000: S5 1.7682ms (stream OFF, chunk OFF)
- 100000: S5 3.4095ms (stream OFF, chunk OFF)
- 200000: S5 8.3296ms (stream OFF, chunk OFF)
- 500000: S3 47.56ms (stream ON, cache ON, chunk ON)
- 1000000: S3 143.77ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.5559ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.3760ms (stream ON, cache ON, chunk OFF)
- 50000: S3 4.5639ms (stream ON, cache ON, chunk ON)
- 100000: S5 9.2123ms (stream OFF, chunk OFF)
- 200000: S3 20.18ms (stream ON, cache ON, chunk ON)
- 500000: S2 66.27ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 125.48ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S4 0.2336ms (stream OFF, chunk ON)
- 20000: S2 0.8387ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.2575ms (stream ON, cache ON, chunk OFF)
- 100000: S1 4.8276ms (stream ON, cache OFF, chunk ON)
- 200000: S1 9.8059ms (stream ON, cache OFF, chunk ON)
- 500000: S3 39.30ms (stream ON, cache ON, chunk ON)
- 1000000: S1 81.29ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0249ms | 0.0245ms | 0.2824ms | 0.0435ms | 6.4070ms | 7.4248ms | 0.4392ms |
| 20000 | 0.0946ms | 0.0939ms | 1.1643ms | 0.1714ms | 44.15ms | 46.81ms | 1.8124ms |
| 50000 | 0.2325ms | 0.2389ms | 3.0529ms | 0.4326ms | 107.85ms | 137.20ms | 4.6599ms |
| 100000 | 0.4631ms | 0.4999ms | 8.0470ms | 0.9761ms | 216.97ms | 266.95ms | 11.80ms |
| 200000 | 0.9239ms | 0.9118ms | 17.41ms | 1.8838ms | 421.10ms | 608.76ms | 25.68ms |
| 500000 | 3.9123ms | 3.5106ms | 56.67ms | 4.6484ms | - | - | 66.47ms |
| 1000000 | 8.5103ms | 8.5146ms | 115.47ms | 9.4473ms | - | - | 153.68ms |

Render vs markdown-it:
- 5,000 chars: 0.0249ms vs 0.2824ms → 11.33× faster
- 20,000 chars: 0.0946ms vs 1.1643ms → 12.31× faster
- 50,000 chars: 0.2325ms vs 3.0529ms → 13.13× faster
- 100,000 chars: 0.4631ms vs 8.0470ms → 17.38× faster
- 200,000 chars: 0.9239ms vs 17.41ms → 18.85× faster
- 500,000 chars: 3.9123ms vs 56.67ms → 14.48× faster
- 1,000,000 chars: 8.5103ms vs 115.47ms → 13.57× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0249ms vs 0.0435ms → 1.74× faster, 42.7% less time
- 20,000 chars: 0.0946ms vs 0.1714ms → 1.81× faster, 44.8% less time
- 50,000 chars: 0.2325ms vs 0.4326ms → 1.86× faster, 46.3% less time
- 100,000 chars: 0.4631ms vs 0.9761ms → 2.11× faster, 52.6% less time
- 200,000 chars: 0.9239ms vs 1.8838ms → 2.04× faster, 51% less time
- 500,000 chars: 3.9123ms vs 4.6484ms → 1.19× faster, 15.8% less time
- 1,000,000 chars: 8.5103ms vs 9.4473ms → 1.11× faster, 9.9% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0245ms vs 0.0435ms → 1.78× faster, 43.8% less time
- 20,000 chars: 0.0939ms vs 0.1714ms → 1.83× faster, 45.2% less time
- 50,000 chars: 0.2389ms vs 0.4326ms → 1.81× faster, 44.8% less time
- 100,000 chars: 0.4999ms vs 0.9761ms → 1.95× faster, 48.8% less time
- 200,000 chars: 0.9118ms vs 1.8838ms → 2.07× faster, 51.6% less time
- 500,000 chars: 3.5106ms vs 4.6484ms → 1.32× faster, 24.5% less time
- 1,000,000 chars: 8.5146ms vs 9.4473ms → 1.11× faster, 9.9% less time

Render vs micromark:
- 5,000 chars: 0.0249ms vs 6.4070ms → 257.10× faster
- 20,000 chars: 0.0946ms vs 44.15ms → 466.80× faster
- 50,000 chars: 0.2325ms vs 107.85ms → 463.89× faster
- 100,000 chars: 0.4631ms vs 216.97ms → 468.50× faster
- 200,000 chars: 0.9239ms vs 421.10ms → 455.81× faster

Render vs remark+rehype:
- 5,000 chars: 0.0249ms vs 7.4248ms → 297.94× faster
- 20,000 chars: 0.0946ms vs 46.81ms → 494.92× faster
- 50,000 chars: 0.2325ms vs 137.20ms → 590.16× faster
- 100,000 chars: 0.4631ms vs 266.95ms → 576.43× faster
- 200,000 chars: 0.9239ms vs 608.76ms → 658.93× faster

Render vs markdown-exit:
- 5,000 chars: 0.0249ms vs 0.4392ms → 17.63× faster
- 20,000 chars: 0.0946ms vs 1.8124ms → 19.16× faster
- 50,000 chars: 0.2325ms vs 4.6599ms → 20.04× faster
- 100,000 chars: 0.4631ms vs 11.80ms → 25.48× faster
- 200,000 chars: 0.9239ms vs 25.68ms → 27.80× faster
- 500,000 chars: 3.9123ms vs 66.47ms → 16.99× faster
- 1,000,000 chars: 8.5103ms vs 153.68ms → 18.06× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0590ms | 0.2543ms | 4.31× faster, 76.8% less time | 0.1639ms | 0.7986ms | 4.87× faster, 79.5% less time | S5/S5 |
| 20000 | 0.2178ms | 1.0111ms | 4.64× faster, 78.5% less time | 0.7139ms | 3.4620ms | 4.85× faster, 79.4% less time | S5/S5 |
| 50000 | 0.5455ms | 2.6397ms | 4.84× faster, 79.3% less time | 1.7682ms | 8.2440ms | 4.66× faster, 78.6% less time | S5/S5 |
| 100000 | 1.3019ms | 5.7656ms | 4.43× faster, 77.4% less time | 3.4095ms | 18.37ms | 5.39× faster, 81.4% less time | S5/S5 |
| 200000 | 6.9256ms | 11.68ms | 1.69× faster, 40.7% less time | 8.3296ms | 38.45ms | 4.62× faster, 78.3% less time | S5/S5 |
| 500000 | 23.06ms | 53.94ms | 2.34× faster, 57.2% less time | 47.56ms | 145.26ms | 3.05× faster, 67.3% less time | S5/S3 |
| 1000000 | 44.41ms | 96.07ms | 2.16× faster, 53.8% less time | 143.77ms | 358.55ms | 2.49× faster, 59.9% less time | S5/S3 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0590ms | 0.0491ms | 1.2× slower, 20.3% more time | 0.1639ms | 0.0797ms | 2.06× slower, 105.7% more time | S5/S5 |
| 20000 | 0.2178ms | 0.1799ms | 1.21× slower, 21% more time | 0.7139ms | 0.2255ms | 3.17× slower, 216.6% more time | S5/S5 |
| 50000 | 0.5455ms | 0.5615ms | 1.03× faster, 2.8% less time | 1.7682ms | 0.5101ms | 3.47× slower, 246.6% more time | S5/S5 |
| 100000 | 1.3019ms | 1.9017ms | 1.46× faster, 31.5% less time | 3.4095ms | 1.0128ms | 3.37× slower, 236.6% more time | S5/S5 |
| 200000 | 6.9256ms | 3.8937ms | 1.78× slower, 77.9% more time | 8.3296ms | 2.4910ms | 3.34× slower, 234.4% more time | S5/S5 |
| 500000 | 23.06ms | 7.8968ms | 2.92× slower, 192% more time | 47.56ms | 6.0635ms | 7.84× slower, 684.4% more time | S5/S3 |
| 1000000 | 44.41ms | 13.94ms | 3.18× slower, 218.5% more time | 143.77ms | 11.90ms | 12.08× slower, 1108.1% more time | S5/S3 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0590ms | 0.2539ms | 4.3× faster, 76.8% less time |
| 20000 | 0.2178ms | 0.9942ms | 4.57× faster, 78.1% less time |
| 50000 | 0.5455ms | 2.6181ms | 4.8× faster, 79.2% less time |
| 100000 | 1.3019ms | 6.0108ms | 4.62× faster, 78.3% less time |
| 200000 | 6.9256ms | 12.16ms | 1.76× faster, 43% less time |
| 500000 | 23.06ms | 29.32ms | 1.27× faster, 21.4% less time |
| 1000000 | 44.41ms | 56.37ms | 1.27× faster, 21.2% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0357ms | 0.0451ms | 1.26× faster, 20.9% less time | 0.2534ms |
| 20000 | 0.1216ms | 0.1813ms | 1.49× faster, 33% less time | 1.0037ms |
| 50000 | 0.2929ms | 0.5524ms | 1.89× faster, 47% less time | 2.6278ms |
| 100000 | 0.6589ms | 1.0756ms | 1.63× faster, 38.7% less time | 5.2044ms |
| 200000 | 1.3260ms | 2.2266ms | 1.68× faster, 40.4% less time | 10.33ms |
| 500000 | 3.5551ms | 5.8644ms | 1.65× faster, 39.4% less time | 26.18ms |
| 1000000 | 8.5389ms | 13.72ms | 1.61× faster, 37.8% less time | 56.66ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2483ms | 0.2493ms |
| @ox-content/napi (parse only) | 0.0456ms | 0.0458ms |
| markdown-exit | 0.4805ms | 0.4008ms |
| markdown-it (baseline) | 0.2762ms | 0.2311ms |
| markdown-it-ts (stream+chunk) | 0.2539ms | 0.2215ms |
| micromark (parse only) | 7.4075ms | 7.0680ms |
| remark (parse only) | 7.1483ms | 7.2071ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.9848ms | 0.9851ms |
| @ox-content/napi (parse only) | 0.1774ms | 0.1766ms |
| markdown-exit | 1.5209ms | 1.5742ms |
| markdown-it (baseline) | 1.0196ms | 1.0134ms |
| markdown-it-ts (stream+chunk) | 0.9443ms | 1.0018ms |
| micromark (parse only) | 29.81ms | 30.28ms |
| remark (parse only) | 42.73ms | 41.13ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.6325ms | 2.5737ms |
| @ox-content/napi (parse only) | 0.5633ms | 0.5632ms |
| markdown-exit | 3.7517ms | 4.2603ms |
| markdown-it (baseline) | 2.2796ms | 2.6825ms |
| markdown-it-ts (stream+chunk) | 2.6098ms | 2.5443ms |
| micromark (parse only) | 84.98ms | 94.04ms |
| remark (parse only) | 101.05ms | 123.97ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 5.2335ms | 5.1991ms |
| @ox-content/napi (parse only) | 1.0777ms | 1.1079ms |
| markdown-exit | 10.30ms | 11.51ms |
| markdown-it (baseline) | 7.1084ms | 8.4498ms |
| markdown-it-ts (stream+chunk) | 5.9352ms | 6.4549ms |
| micromark (parse only) | 164.54ms | 171.37ms |
| remark (parse only) | 261.26ms | 287.18ms |
