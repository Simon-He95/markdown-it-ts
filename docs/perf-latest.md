# Performance Report (latest run)

## Environment

- Generated at: 2026-11-20T08:28:08.247Z
- Node.js: v26.10.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 8fd30f6d5fd37ff639d180e5498e7536aa9ec566

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
| 5,011 | 0.0657ms | 0.2756ms | 0.0493ms | stock-fast | 0.0227ms | 0.2422ms | 0.0338ms | stock-fast | no |
| 20,085 | 0.1535ms | 0.8695ms | 0.1430ms | stock-fast | 0.0720ms | 1.1431ms | 0.1424ms | stock-fast | no |
| 50,084 | 0.4400ms | 2.3606ms | 0.4151ms | stock-fast | 0.1971ms | 2.5204ms | 0.3467ms | stock-fast | no |
| 100,126 | 1.0708ms | 5.2026ms | 0.8093ms | stock-fast | 0.3462ms | 5.9262ms | 0.7961ms | stock-fast | no |
| 200,073 | 1.9779ms | 14.06ms | 1.5654ms | stock-fast | 0.7585ms | 15.82ms | 1.4561ms | stock-fast | no |
| 500,121 | 14.54ms | 53.08ms | 4.3325ms | stock-fast | 4.8770ms | 63.43ms | 3.9924ms | stock-fast | no |
| 1,000,068 | 16.86ms | 99.53ms | 9.6890ms | stock-fast | 6.4597ms | 71.54ms | 6.6082ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2956ms | 0.2978ms | 0.0558ms | general | 0.2750ms | 0.3879ms | 0.0509ms | token-renderer | no |
| 20,125 | 0.6983ms | 1.0002ms | 0.1984ms | general | 0.9057ms | 1.3727ms | 0.1825ms | token-renderer | no |
| 50,025 | 1.7825ms | 2.5654ms | 0.4913ms | general | 2.3390ms | 3.4842ms | 0.4387ms | token-renderer | no |
| 100,450 | 4.8223ms | 5.7567ms | 1.0232ms | general | 4.8344ms | 7.5621ms | 1.0036ms | token-renderer | no |
| 200,109 | 10.54ms | 12.32ms | 2.0488ms | full-chunk | 13.46ms | 17.45ms | 1.9575ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0755ms | 0.1547ms | 0.0258ms | general | 0.0879ms | 0.1541ms | 0.0191ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0823ms | 0.1607ms | 0.0277ms | general | 0.0983ms | 0.1713ms | 0.0218ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0248ms | 0.0359ms | 0.0075ms | general | 0.0309ms | 0.0456ms | 0.0069ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2229ms | 0.1620ms | 0.2406ms | 0.1925ms | 0.0420ms | 0.1929ms | 0.2768ms | **0.0384ms** | 0.1715ms | 4.5080ms | 0.6546ms | 0.3245ms | 0.3451ms | 0.5606ms | 0.1126ms | 0.6095ms | 0.8790ms | **0.0581ms** | 0.1904ms | 14.61ms | 1.7338ms | 0.4116ms | 0.3887ms | 1.5993ms | 0.5811ms | 2.1243ms | 2.4871ms | **0.0919ms** | 0.2314ms | 44.11ms | 0.2097ms | 0.1782ms | 0.2281ms | 0.1945ms | 0.1828ms | 0.2129ms | 0.2899ms | **0.0384ms** | 0.1696ms | 4.7786ms |
| 20000 | 0.7742ms | 0.6221ms | 0.8940ms | 0.8229ms | **0.1373ms** | 0.7652ms | 1.2544ms | 0.1448ms | 0.6830ms | 21.02ms | 2.6214ms | 1.0898ms | 1.1160ms | 2.7672ms | 0.4487ms | 2.6361ms | 3.6708ms | **0.1802ms** | 0.7142ms | 64.77ms | 7.2113ms | 1.0746ms | 1.2518ms | 7.3466ms | 2.2946ms | 7.7622ms | 11.33ms | **0.2219ms** | 0.7689ms | 192.04ms | 0.7716ms | 0.6474ms | 0.8470ms | 0.7394ms | 0.7208ms | 0.8260ms | 1.1065ms | **0.1432ms** | 0.7893ms | 24.31ms |
| 50000 | 2.5540ms | 1.6673ms | 1.9346ms | 1.9524ms | **0.3306ms** | 2.0274ms | 2.6818ms | 0.3889ms | 1.6713ms | 48.25ms | 7.2060ms | 2.3314ms | 2.2320ms | 6.7654ms | 1.2361ms | 6.6511ms | 8.9237ms | **0.4147ms** | 1.7300ms | 166.07ms | 19.55ms | 2.5145ms | 2.3734ms | 18.61ms | 3.2581ms | 20.43ms | 23.86ms | **0.4738ms** | 1.7834ms | 451.46ms | 2.2268ms | 1.6192ms | 1.9197ms | 1.9527ms | 1.7109ms | 1.9329ms | 2.7101ms | **0.3632ms** | 1.7769ms | 48.46ms |
| 100000 | 4.3289ms | 3.6488ms | 4.2933ms | 4.2130ms | 0.9160ms | 4.3062ms | 5.7330ms | **0.7608ms** | 3.3350ms | 100.20ms | 13.58ms | 5.8344ms | 5.3224ms | 15.20ms | 2.4710ms | 13.11ms | 17.35ms | **0.8281ms** | 3.4384ms | 368.20ms | 36.35ms | 5.7345ms | 5.2637ms | 39.19ms | 6.3491ms | 36.69ms | 48.25ms | **0.8786ms** | 3.4664ms | 942.20ms | 4.1431ms | 3.0905ms | 3.9647ms | 4.0516ms | 4.0231ms | 4.1640ms | 5.4182ms | **0.6851ms** | 3.2815ms | 101.54ms |
| 200000 | 10.05ms | 7.3377ms | 9.3363ms | 9.8018ms | 2.4131ms | 11.19ms | 13.24ms | **1.4980ms** | 6.7640ms | 191.13ms | 28.56ms | 10.95ms | 9.5300ms | 29.19ms | 5.3603ms | 30.20ms | 37.06ms | **1.7139ms** | 6.7646ms | 664.46ms | 76.37ms | 10.05ms | 11.91ms | 82.57ms | 13.95ms | 85.00ms | 101.82ms | **1.7023ms** | 7.1282ms | 2463.78ms | 9.5152ms | 6.9495ms | 7.7163ms | 7.6082ms | 9.4533ms | 7.7267ms | 10.79ms | **1.4839ms** | 7.4405ms | 182.79ms |
| 500000 | 26.91ms | 20.48ms | 23.94ms | 25.72ms | 10.19ms | 28.24ms | 34.01ms | **3.9096ms** | 16.86ms | - | 76.45ms | 35.77ms | 36.45ms | 76.09ms | 17.78ms | 76.73ms | 102.00ms | **4.7446ms** | 18.46ms | - | 234.41ms | 29.59ms | 29.19ms | 212.51ms | 76.95ms | 226.77ms | 286.64ms | **4.5984ms** | 18.21ms | - | 23.74ms | 22.45ms | 27.82ms | 29.31ms | 26.23ms | 27.70ms | 36.07ms | **3.7374ms** | 16.61ms | - |
| 1000000 | 52.72ms | 66.79ms | 58.89ms | 65.78ms | 21.68ms | 66.50ms | 72.80ms | **7.3870ms** | 33.97ms | - | 178.48ms | 86.81ms | 79.60ms | 184.31ms | 57.64ms | 297.40ms | 221.62ms | **8.4920ms** | 35.27ms | - | 497.37ms | 67.13ms | 74.16ms | 487.11ms | 104.99ms | 546.34ms | 639.13ms | **8.8207ms** | 34.07ms | - | 52.56ms | 50.90ms | 57.04ms | 52.37ms | 85.09ms | 79.85ms | 68.50ms | **7.3733ms** | 35.70ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0420ms (stream OFF, chunk OFF)
- 20000: S5 0.1373ms (stream OFF, chunk OFF)
- 50000: S5 0.3306ms (stream OFF, chunk OFF)
- 100000: S5 0.9160ms (stream OFF, chunk OFF)
- 200000: S5 2.4131ms (stream OFF, chunk OFF)
- 500000: S5 10.19ms (stream OFF, chunk OFF)
- 1000000: S5 21.68ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1126ms (stream OFF, chunk OFF)
- 20000: S5 0.4487ms (stream OFF, chunk OFF)
- 50000: S5 1.2361ms (stream OFF, chunk OFF)
- 100000: S5 2.4710ms (stream OFF, chunk OFF)
- 200000: S5 5.3603ms (stream OFF, chunk OFF)
- 500000: S5 17.78ms (stream OFF, chunk OFF)
- 1000000: S5 57.64ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3887ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.0746ms (stream ON, cache ON, chunk OFF)
- 50000: S3 2.3734ms (stream ON, cache ON, chunk ON)
- 100000: S3 5.2637ms (stream ON, cache ON, chunk ON)
- 200000: S2 10.05ms (stream ON, cache ON, chunk OFF)
- 500000: S3 29.19ms (stream ON, cache ON, chunk ON)
- 1000000: S2 67.13ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1782ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.6474ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.6192ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0905ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.9495ms (stream ON, cache ON, chunk OFF)
- 500000: S2 22.45ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 50.90ms (stream ON, cache ON, chunk OFF)

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
| 5000 | 0.0228ms | 0.0187ms | 0.2444ms | 0.0367ms | 4.5397ms | 5.5614ms | 0.3147ms |
| 20000 | 0.0700ms | 0.0699ms | 1.0444ms | 0.1393ms | 21.84ms | 27.93ms | 1.2578ms |
| 50000 | 0.1714ms | 0.1793ms | 2.5245ms | 0.3238ms | 57.92ms | 112.99ms | 4.9437ms |
| 100000 | 0.3501ms | 0.3861ms | 5.3229ms | 0.7178ms | 142.23ms | 171.88ms | 6.2423ms |
| 200000 | 0.7582ms | 0.6843ms | 13.28ms | 1.4935ms | 224.32ms | 470.60ms | 16.78ms |
| 500000 | 2.3783ms | 2.2868ms | 38.97ms | 3.4163ms | - | - | 46.58ms |
| 1000000 | 5.0054ms | 5.4347ms | 73.92ms | 7.8569ms | - | - | 114.29ms |

Render vs markdown-it:
- 5,000 chars: 0.0228ms vs 0.2444ms → 10.70× faster
- 20,000 chars: 0.0700ms vs 1.0444ms → 14.92× faster
- 50,000 chars: 0.1714ms vs 2.5245ms → 14.73× faster
- 100,000 chars: 0.3501ms vs 5.3229ms → 15.20× faster
- 200,000 chars: 0.7582ms vs 13.28ms → 17.52× faster
- 500,000 chars: 2.3783ms vs 38.97ms → 16.39× faster
- 1,000,000 chars: 5.0054ms vs 73.92ms → 14.77× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0228ms vs 0.0367ms → 1.61× faster, 37.7% less time
- 20,000 chars: 0.0700ms vs 0.1393ms → 1.99× faster, 49.8% less time
- 50,000 chars: 0.1714ms vs 0.3238ms → 1.89× faster, 47.1% less time
- 100,000 chars: 0.3501ms vs 0.7178ms → 2.05× faster, 51.2% less time
- 200,000 chars: 0.7582ms vs 1.4935ms → 1.97× faster, 49.2% less time
- 500,000 chars: 2.3783ms vs 3.4163ms → 1.44× faster, 30.4% less time
- 1,000,000 chars: 5.0054ms vs 7.8569ms → 1.57× faster, 36.3% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0187ms vs 0.0367ms → 1.96× faster, 48.9% less time
- 20,000 chars: 0.0699ms vs 0.1393ms → 1.99× faster, 49.8% less time
- 50,000 chars: 0.1793ms vs 0.3238ms → 1.81× faster, 44.6% less time
- 100,000 chars: 0.3861ms vs 0.7178ms → 1.86× faster, 46.2% less time
- 200,000 chars: 0.6843ms vs 1.4935ms → 2.18× faster, 54.2% less time
- 500,000 chars: 2.2868ms vs 3.4163ms → 1.49× faster, 33.1% less time
- 1,000,000 chars: 5.4347ms vs 7.8569ms → 1.45× faster, 30.8% less time

Render vs micromark:
- 5,000 chars: 0.0228ms vs 4.5397ms → 198.81× faster
- 20,000 chars: 0.0700ms vs 21.84ms → 312.04× faster
- 50,000 chars: 0.1714ms vs 57.92ms → 337.85× faster
- 100,000 chars: 0.3501ms vs 142.23ms → 406.21× faster
- 200,000 chars: 0.7582ms vs 224.32ms → 295.85× faster

Render vs remark+rehype:
- 5,000 chars: 0.0228ms vs 5.5614ms → 243.55× faster
- 20,000 chars: 0.0700ms vs 27.93ms → 399.11× faster
- 50,000 chars: 0.1714ms vs 112.99ms → 659.08× faster
- 100,000 chars: 0.3501ms vs 171.88ms → 490.87× faster
- 200,000 chars: 0.7582ms vs 470.60ms → 620.67× faster

Render vs markdown-exit:
- 5,000 chars: 0.0228ms vs 0.3147ms → 13.78× faster
- 20,000 chars: 0.0700ms vs 1.2578ms → 17.98× faster
- 50,000 chars: 0.1714ms vs 4.9437ms → 28.84× faster
- 100,000 chars: 0.3501ms vs 6.2423ms → 17.83× faster
- 200,000 chars: 0.7582ms vs 16.78ms → 22.13× faster
- 500,000 chars: 2.3783ms vs 46.58ms → 19.59× faster
- 1,000,000 chars: 5.0054ms vs 114.29ms → 22.83× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0420ms | 0.1929ms | 4.59× faster, 78.2% less time | 0.1126ms | 0.6095ms | 5.41× faster, 81.5% less time | S5/S5 |
| 20000 | 0.1373ms | 0.7652ms | 5.57× faster, 82.1% less time | 0.4487ms | 2.6361ms | 5.88× faster, 83% less time | S5/S5 |
| 50000 | 0.3306ms | 2.0274ms | 6.13× faster, 83.7% less time | 1.2361ms | 6.6511ms | 5.38× faster, 81.4% less time | S5/S5 |
| 100000 | 0.9160ms | 4.3062ms | 4.7× faster, 78.7% less time | 2.4710ms | 13.11ms | 5.3× faster, 81.1% less time | S5/S5 |
| 200000 | 2.4131ms | 11.19ms | 4.64× faster, 78.4% less time | 5.3603ms | 30.20ms | 5.63× faster, 82.2% less time | S5/S5 |
| 500000 | 10.19ms | 28.24ms | 2.77× faster, 63.9% less time | 17.78ms | 76.73ms | 4.31× faster, 76.8% less time | S5/S5 |
| 1000000 | 21.68ms | 66.50ms | 3.07× faster, 67.4% less time | 57.64ms | 297.40ms | 5.16× faster, 80.6% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0420ms | 0.0384ms | 1.1× slower, 9.6% more time | 0.1126ms | 0.0581ms | 1.94× slower, 93.8% more time | S5/S5 |
| 20000 | 0.1373ms | 0.1448ms | 1.05× faster, 5.1% less time | 0.4487ms | 0.1802ms | 2.49× slower, 149% more time | S5/S5 |
| 50000 | 0.3306ms | 0.3889ms | 1.18× faster, 15% less time | 1.2361ms | 0.4147ms | 2.98× slower, 198.1% more time | S5/S5 |
| 100000 | 0.9160ms | 0.7608ms | 1.2× slower, 20.4% more time | 2.4710ms | 0.8281ms | 2.98× slower, 198.4% more time | S5/S5 |
| 200000 | 2.4131ms | 1.4980ms | 1.61× slower, 61.1% more time | 5.3603ms | 1.7139ms | 3.13× slower, 212.7% more time | S5/S5 |
| 500000 | 10.19ms | 3.9096ms | 2.61× slower, 160.6% more time | 17.78ms | 4.7446ms | 3.75× slower, 274.8% more time | S5/S5 |
| 1000000 | 21.68ms | 7.3870ms | 2.94× slower, 193.5% more time | 57.64ms | 8.4920ms | 6.79× slower, 578.8% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0420ms | 0.1715ms | 4.08× faster, 75.5% less time |
| 20000 | 0.1373ms | 0.6830ms | 4.97× faster, 79.9% less time |
| 50000 | 0.3306ms | 1.6713ms | 5.06× faster, 80.2% less time |
| 100000 | 0.9160ms | 3.3350ms | 3.64× faster, 72.5% less time |
| 200000 | 2.4131ms | 6.7640ms | 2.8× faster, 64.3% less time |
| 500000 | 10.19ms | 16.86ms | 1.65× faster, 39.6% less time |
| 1000000 | 21.68ms | 33.97ms | 1.57× faster, 36.2% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0331ms | 0.0428ms | 1.29× faster, 22.5% less time | 0.1762ms |
| 20000 | 0.0985ms | 0.1466ms | 1.49× faster, 32.8% less time | 0.6904ms |
| 50000 | 0.2404ms | 0.4451ms | 1.85× faster, 46% less time | 1.9215ms |
| 100000 | 0.6205ms | 0.8475ms | 1.37× faster, 26.8% less time | 3.4679ms |
| 200000 | 1.1635ms | 1.5600ms | 1.34× faster, 25.4% less time | 7.3540ms |
| 500000 | 2.3923ms | 4.3276ms | 1.81× faster, 44.7% less time | 19.12ms |
| 1000000 | 8.7291ms | 7.9661ms | 1.1× slower, 9.6% more time | 55.97ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1975ms | 0.1679ms |
| @ox-content/napi (parse only) | 0.0409ms | 0.0370ms |
| markdown-exit | 0.7719ms | 0.7435ms |
| markdown-it (baseline) | 0.2317ms | 0.2075ms |
| markdown-it-ts (stream+chunk) | 0.2985ms | 0.1872ms |
| micromark (parse only) | 4.4778ms | 4.3070ms |
| remark (parse only) | 4.5897ms | 4.6539ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6830ms | 0.6598ms |
| @ox-content/napi (parse only) | 0.1418ms | 0.1420ms |
| markdown-exit | 1.8945ms | 1.3872ms |
| markdown-it (baseline) | 0.8566ms | 0.8741ms |
| markdown-it-ts (stream+chunk) | 0.8076ms | 0.7676ms |
| micromark (parse only) | 16.39ms | 18.35ms |
| remark (parse only) | 23.73ms | 23.32ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.6948ms | 1.6401ms |
| @ox-content/napi (parse only) | 0.3768ms | 0.3864ms |
| markdown-exit | 3.4235ms | 2.8741ms |
| markdown-it (baseline) | 2.0181ms | 2.0316ms |
| markdown-it-ts (stream+chunk) | 1.8795ms | 2.1634ms |
| micromark (parse only) | 61.30ms | 49.31ms |
| remark (parse only) | 63.92ms | 68.86ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.2653ms | 3.4952ms |
| @ox-content/napi (parse only) | 0.7884ms | 0.8113ms |
| markdown-exit | 5.5922ms | 6.1902ms |
| markdown-it (baseline) | 4.5445ms | 4.9003ms |
| markdown-it-ts (stream+chunk) | 3.8121ms | 4.6849ms |
| micromark (parse only) | 100.46ms | 101.52ms |
| remark (parse only) | 175.72ms | 190.33ms |
