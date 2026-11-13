# Performance Report (latest run)

## Environment

- Generated at: 2026-11-13T11:44:09.552Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: ce875f6fc64e90008421d51d8621212609f2e6a6

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
| 5,011 | 0.0548ms | 0.1811ms | 0.0379ms | stock-fast | 0.0208ms | 0.2280ms | 0.0341ms | stock-fast | no |
| 20,085 | 0.1184ms | 0.7327ms | 0.1460ms | stock-fast | 0.0729ms | 0.9038ms | 0.1330ms | stock-fast | no |
| 50,084 | 0.2930ms | 1.8421ms | 0.3856ms | stock-fast | 0.1763ms | 2.3630ms | 0.3261ms | stock-fast | no |
| 100,126 | 0.6178ms | 3.8626ms | 0.7667ms | stock-fast | 0.3571ms | 4.9559ms | 0.6715ms | stock-fast | no |
| 200,073 | 1.0614ms | 7.8890ms | 1.5116ms | stock-fast | 0.6990ms | 10.61ms | 1.3235ms | stock-fast | no |
| 500,121 | 3.8966ms | 21.72ms | 3.7738ms | stock-fast | 2.3281ms | 29.86ms | 3.3117ms | stock-fast | no |
| 1,000,068 | 12.58ms | 45.67ms | 7.4339ms | stock-fast | 4.8207ms | 65.77ms | 6.6768ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2041ms | 0.2694ms | 0.0541ms | general | 0.2203ms | 0.3306ms | 0.0485ms | token-renderer | no |
| 20,125 | 0.6748ms | 0.9746ms | 0.1995ms | general | 0.8138ms | 1.2351ms | 0.1852ms | token-renderer | no |
| 50,025 | 1.6598ms | 2.4243ms | 0.5235ms | general | 1.9778ms | 3.1468ms | 0.4461ms | token-renderer | no |
| 100,450 | 3.5141ms | 5.0275ms | 1.0052ms | general | 4.2387ms | 6.5247ms | 0.9065ms | token-renderer | no |
| 200,109 | 8.6863ms | 10.43ms | 2.0110ms | full-chunk | 10.20ms | 13.94ms | 1.7920ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0735ms | 0.1232ms | 0.0272ms | general | 0.0911ms | 0.1483ms | 0.0201ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0758ms | 0.1338ms | 0.0261ms | general | 0.0902ms | 0.1556ms | 0.0220ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0231ms | 0.0344ms | 0.0078ms | general | 0.0277ms | 0.0409ms | 0.0070ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2042ms | 0.1576ms | 0.1998ms | 0.1931ms | **0.0391ms** | 0.1877ms | 0.2522ms | 0.0393ms | 0.1794ms | 2.9826ms | 0.6288ms | 0.3012ms | 0.2892ms | 0.5581ms | 0.1077ms | 0.5812ms | 0.8165ms | **0.0640ms** | 0.1978ms | 9.5762ms | 1.7206ms | 0.4044ms | 0.3587ms | 1.6194ms | 0.5827ms | 1.7424ms | 2.3923ms | **0.0945ms** | 0.2358ms | 27.64ms | 0.2051ms | 0.1968ms | 0.2005ms | 0.1941ms | 0.1743ms | 0.2042ms | 0.2715ms | **0.0406ms** | 0.1761ms | 3.0176ms |
| 20000 | 0.7443ms | 0.5956ms | 0.7382ms | 0.7450ms | **0.1206ms** | 0.7297ms | 0.9920ms | 0.1469ms | 0.6908ms | 15.95ms | 2.5130ms | 1.0102ms | 1.0182ms | 2.6388ms | 0.4200ms | 2.4916ms | 3.4196ms | **0.1961ms** | 0.7340ms | 46.99ms | 7.0682ms | 1.0883ms | 0.9540ms | 7.0741ms | 2.1779ms | 6.8410ms | 9.3167ms | **0.2310ms** | 0.7807ms | 128.40ms | 0.8169ms | 0.5931ms | 0.7733ms | 0.7448ms | 0.6718ms | 0.7105ms | 0.9741ms | **0.1509ms** | 0.6917ms | 14.55ms |
| 50000 | 1.9184ms | 1.5184ms | 1.8730ms | 1.8718ms | **0.2972ms** | 1.8274ms | 2.4687ms | 0.3915ms | 1.7577ms | 44.23ms | 6.6402ms | 2.5041ms | 2.1732ms | 6.4059ms | 1.0929ms | 6.2805ms | 8.5280ms | **0.4308ms** | 1.7790ms | 142.59ms | 17.72ms | 2.5786ms | 2.4489ms | 17.47ms | 2.9661ms | 17.02ms | 23.09ms | **0.4693ms** | 1.8459ms | 376.57ms | 1.9787ms | 1.4666ms | 1.8132ms | 1.8542ms | 1.6988ms | 1.9592ms | 2.6343ms | **0.4072ms** | 1.7506ms | 44.32ms |
| 100000 | 3.9424ms | 3.1465ms | 3.8940ms | 3.8986ms | **0.7291ms** | 3.7909ms | 5.1672ms | 0.7622ms | 3.4924ms | 89.86ms | 13.16ms | 4.9742ms | 4.5132ms | 13.24ms | 2.0564ms | 12.86ms | 17.03ms | **0.8470ms** | 3.5309ms | 302.51ms | 36.03ms | 4.9979ms | 4.6398ms | 35.98ms | 6.1973ms | 34.56ms | 46.96ms | **0.8822ms** | 3.5814ms | 832.47ms | 3.8544ms | 2.9028ms | 3.7982ms | 3.8148ms | 5.6178ms | 3.8857ms | 5.0998ms | **0.7653ms** | 3.4503ms | 88.27ms |
| 200000 | 8.4148ms | 6.9422ms | 8.2337ms | 8.3116ms | **1.3866ms** | 8.8468ms | 11.22ms | 1.4948ms | 6.8340ms | 177.82ms | 27.10ms | 10.95ms | 10.08ms | 27.06ms | 4.6897ms | 27.66ms | 36.21ms | **1.7697ms** | 7.0816ms | 619.28ms | 72.17ms | 10.15ms | 10.33ms | 72.55ms | 12.54ms | 71.47ms | 95.86ms | **1.6890ms** | 7.0769ms | 1685.40ms | 7.9381ms | 6.9899ms | 7.9846ms | 7.2965ms | 9.0071ms | 7.8150ms | 10.57ms | **1.4750ms** | 6.7965ms | 182.85ms |
| 500000 | 22.49ms | 20.76ms | 22.97ms | 23.00ms | 5.7512ms | 25.02ms | 30.76ms | **3.7640ms** | 17.04ms | - | 66.20ms | 31.93ms | 25.72ms | 68.72ms | 13.77ms | 72.43ms | 98.15ms | **4.2248ms** | 17.55ms | - | 185.66ms | 26.64ms | 26.65ms | 189.04ms | 57.50ms | 204.21ms | 255.68ms | **4.4994ms** | 17.85ms | - | 20.98ms | 20.49ms | 21.94ms | 22.45ms | 23.55ms | 27.10ms | 33.29ms | **3.8757ms** | 16.95ms | - |
| 1000000 | 50.31ms | 51.68ms | 47.52ms | 49.78ms | 14.23ms | 47.52ms | 69.01ms | **7.5385ms** | 34.00ms | - | 152.77ms | 54.67ms | 62.59ms | 151.22ms | 36.54ms | 172.89ms | 199.09ms | **8.6778ms** | 37.60ms | - | 417.05ms | 61.70ms | 55.24ms | 409.22ms | 98.18ms | 463.49ms | 558.12ms | **8.9427ms** | 37.38ms | - | 43.17ms | 47.43ms | 47.96ms | 51.16ms | 64.34ms | 45.92ms | 63.96ms | **7.5019ms** | 35.69ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0391ms (stream OFF, chunk OFF)
- 20000: S5 0.1206ms (stream OFF, chunk OFF)
- 50000: S5 0.2972ms (stream OFF, chunk OFF)
- 100000: S5 0.7291ms (stream OFF, chunk OFF)
- 200000: S5 1.3866ms (stream OFF, chunk OFF)
- 500000: S5 5.7512ms (stream OFF, chunk OFF)
- 1000000: S5 14.23ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1077ms (stream OFF, chunk OFF)
- 20000: S5 0.4200ms (stream OFF, chunk OFF)
- 50000: S5 1.0929ms (stream OFF, chunk OFF)
- 100000: S5 2.0564ms (stream OFF, chunk OFF)
- 200000: S5 4.6897ms (stream OFF, chunk OFF)
- 500000: S5 13.77ms (stream OFF, chunk OFF)
- 1000000: S5 36.54ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3587ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9540ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.4489ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.6398ms (stream ON, cache ON, chunk ON)
- 200000: S2 10.15ms (stream ON, cache ON, chunk OFF)
- 500000: S2 26.64ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 55.24ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1743ms (stream OFF, chunk OFF)
- 20000: S2 0.5931ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4666ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9028ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.9899ms (stream ON, cache ON, chunk OFF)
- 500000: S2 20.49ms (stream ON, cache ON, chunk OFF)
- 1000000: S1 43.17ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0213ms | 0.0184ms | 0.2355ms | 0.0340ms | 3.8427ms | 4.6568ms | 0.2973ms |
| 20000 | 0.0716ms | 0.0709ms | 0.9074ms | 0.1330ms | 17.56ms | 21.90ms | 1.1802ms |
| 50000 | 0.1735ms | 0.1743ms | 2.2767ms | 0.3274ms | 51.30ms | 68.27ms | 2.9492ms |
| 100000 | 0.3464ms | 0.3466ms | 4.8582ms | 0.6805ms | 105.67ms | 158.83ms | 6.0470ms |
| 200000 | 0.6950ms | 0.6913ms | 10.34ms | 1.3405ms | 216.45ms | 394.71ms | 12.98ms |
| 500000 | 2.4835ms | 2.3426ms | 31.72ms | 3.3300ms | - | - | 39.02ms |
| 1000000 | 4.7499ms | 4.7459ms | 68.16ms | 6.7488ms | - | - | 86.81ms |

Render vs markdown-it:
- 5,000 chars: 0.0213ms vs 0.2355ms → 11.04× faster
- 20,000 chars: 0.0716ms vs 0.9074ms → 12.67× faster
- 50,000 chars: 0.1735ms vs 2.2767ms → 13.13× faster
- 100,000 chars: 0.3464ms vs 4.8582ms → 14.03× faster
- 200,000 chars: 0.6950ms vs 10.34ms → 14.87× faster
- 500,000 chars: 2.4835ms vs 31.72ms → 12.77× faster
- 1,000,000 chars: 4.7499ms vs 68.16ms → 14.35× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0213ms vs 0.0340ms → 1.59× faster, 37.2% less time
- 20,000 chars: 0.0716ms vs 0.1330ms → 1.86× faster, 46.2% less time
- 50,000 chars: 0.1735ms vs 0.3274ms → 1.89× faster, 47% less time
- 100,000 chars: 0.3464ms vs 0.6805ms → 1.96× faster, 49.1% less time
- 200,000 chars: 0.6950ms vs 1.3405ms → 1.93× faster, 48.1% less time
- 500,000 chars: 2.4835ms vs 3.3300ms → 1.34× faster, 25.4% less time
- 1,000,000 chars: 4.7499ms vs 6.7488ms → 1.42× faster, 29.6% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0184ms vs 0.0340ms → 1.85× faster, 45.8% less time
- 20,000 chars: 0.0709ms vs 0.1330ms → 1.88× faster, 46.7% less time
- 50,000 chars: 0.1743ms vs 0.3274ms → 1.88× faster, 46.8% less time
- 100,000 chars: 0.3466ms vs 0.6805ms → 1.96× faster, 49.1% less time
- 200,000 chars: 0.6913ms vs 1.3405ms → 1.94× faster, 48.4% less time
- 500,000 chars: 2.3426ms vs 3.3300ms → 1.42× faster, 29.7% less time
- 1,000,000 chars: 4.7459ms vs 6.7488ms → 1.42× faster, 29.7% less time

Render vs micromark:
- 5,000 chars: 0.0213ms vs 3.8427ms → 180.12× faster
- 20,000 chars: 0.0716ms vs 17.56ms → 245.22× faster
- 50,000 chars: 0.1735ms vs 51.30ms → 295.75× faster
- 100,000 chars: 0.3464ms vs 105.67ms → 305.10× faster
- 200,000 chars: 0.6950ms vs 216.45ms → 311.43× faster

Render vs remark+rehype:
- 5,000 chars: 0.0213ms vs 4.6568ms → 218.28× faster
- 20,000 chars: 0.0716ms vs 21.90ms → 305.74× faster
- 50,000 chars: 0.1735ms vs 68.27ms → 393.59× faster
- 100,000 chars: 0.3464ms vs 158.83ms → 458.56× faster
- 200,000 chars: 0.6950ms vs 394.71ms → 567.90× faster

Render vs markdown-exit:
- 5,000 chars: 0.0213ms vs 0.2973ms → 13.94× faster
- 20,000 chars: 0.0716ms vs 1.1802ms → 16.48× faster
- 50,000 chars: 0.1735ms vs 2.9492ms → 17.00× faster
- 100,000 chars: 0.3464ms vs 6.0470ms → 17.46× faster
- 200,000 chars: 0.6950ms vs 12.98ms → 18.67× faster
- 500,000 chars: 2.4835ms vs 39.02ms → 15.71× faster
- 1,000,000 chars: 4.7499ms vs 86.81ms → 18.28× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0391ms | 0.1877ms | 4.8× faster, 79.2% less time | 0.1077ms | 0.5812ms | 5.4× faster, 81.5% less time | S5/S5 |
| 20000 | 0.1206ms | 0.7297ms | 6.05× faster, 83.5% less time | 0.4200ms | 2.4916ms | 5.93× faster, 83.1% less time | S5/S5 |
| 50000 | 0.2972ms | 1.8274ms | 6.15× faster, 83.7% less time | 1.0929ms | 6.2805ms | 5.75× faster, 82.6% less time | S5/S5 |
| 100000 | 0.7291ms | 3.7909ms | 5.2× faster, 80.8% less time | 2.0564ms | 12.86ms | 6.26× faster, 84% less time | S5/S5 |
| 200000 | 1.3866ms | 8.8468ms | 6.38× faster, 84.3% less time | 4.6897ms | 27.66ms | 5.9× faster, 83% less time | S5/S5 |
| 500000 | 5.7512ms | 25.02ms | 4.35× faster, 77% less time | 13.77ms | 72.43ms | 5.26× faster, 81% less time | S5/S5 |
| 1000000 | 14.23ms | 47.52ms | 3.34× faster, 70% less time | 36.54ms | 172.89ms | 4.73× faster, 78.9% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0391ms | 0.0393ms | 1× faster, 0.5% less time | 0.1077ms | 0.0640ms | 1.68× slower, 68.4% more time | S5/S5 |
| 20000 | 0.1206ms | 0.1469ms | 1.22× faster, 17.9% less time | 0.4200ms | 0.1961ms | 2.14× slower, 114.1% more time | S5/S5 |
| 50000 | 0.2972ms | 0.3915ms | 1.32× faster, 24.1% less time | 1.0929ms | 0.4308ms | 2.54× slower, 153.7% more time | S5/S5 |
| 100000 | 0.7291ms | 0.7622ms | 1.05× faster, 4.4% less time | 2.0564ms | 0.8470ms | 2.43× slower, 142.8% more time | S5/S5 |
| 200000 | 1.3866ms | 1.4948ms | 1.08× faster, 7.2% less time | 4.6897ms | 1.7697ms | 2.65× slower, 165% more time | S5/S5 |
| 500000 | 5.7512ms | 3.7640ms | 1.53× slower, 52.8% more time | 13.77ms | 4.2248ms | 3.26× slower, 225.9% more time | S5/S5 |
| 1000000 | 14.23ms | 7.5385ms | 1.89× slower, 88.8% more time | 36.54ms | 8.6778ms | 4.21× slower, 321% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0391ms | 0.1794ms | 4.59× faster, 78.2% less time |
| 20000 | 0.1206ms | 0.6908ms | 5.73× faster, 82.5% less time |
| 50000 | 0.2972ms | 1.7577ms | 5.91× faster, 83.1% less time |
| 100000 | 0.7291ms | 3.4924ms | 4.79× faster, 79.1% less time |
| 200000 | 1.3866ms | 6.8340ms | 4.93× faster, 79.7% less time |
| 500000 | 5.7512ms | 17.04ms | 2.96× faster, 66.3% less time |
| 1000000 | 14.23ms | 34.00ms | 2.39× faster, 58.1% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0244ms | 0.0378ms | 1.55× faster, 35.5% less time | 0.1797ms |
| 20000 | 0.0870ms | 0.1457ms | 1.67× faster, 40.3% less time | 0.7063ms |
| 50000 | 0.2123ms | 0.3893ms | 1.83× faster, 45.5% less time | 1.7839ms |
| 100000 | 0.4206ms | 0.7621ms | 1.81× faster, 44.8% less time | 3.5449ms |
| 200000 | 0.8347ms | 1.4952ms | 1.79× faster, 44.2% less time | 7.0328ms |
| 500000 | 2.0693ms | 3.7681ms | 1.82× faster, 45.1% less time | 17.73ms |
| 1000000 | 4.4094ms | 7.4007ms | 1.68× faster, 40.4% less time | 34.75ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1888ms | 0.1764ms |
| @ox-content/napi (parse only) | 0.0394ms | 0.0373ms |
| markdown-exit | 0.6145ms | 0.5344ms |
| markdown-it (baseline) | 0.1985ms | 0.1764ms |
| markdown-it-ts (stream+chunk) | 0.7974ms | 0.6813ms |
| micromark (parse only) | 3.9991ms | 3.3684ms |
| remark (parse only) | 3.9398ms | 4.0535ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6832ms | 0.7068ms |
| @ox-content/napi (parse only) | 0.1465ms | 0.1459ms |
| markdown-exit | 1.0731ms | 1.0048ms |
| markdown-it (baseline) | 0.7643ms | 0.7013ms |
| markdown-it-ts (stream+chunk) | 0.9310ms | 0.9858ms |
| micromark (parse only) | 16.31ms | 15.85ms |
| remark (parse only) | 18.00ms | 19.47ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7765ms | 1.7787ms |
| @ox-content/napi (parse only) | 0.3851ms | 0.3872ms |
| markdown-exit | 3.1142ms | 2.8802ms |
| markdown-it (baseline) | 1.7855ms | 1.8621ms |
| markdown-it-ts (stream+chunk) | 1.8987ms | 1.9999ms |
| micromark (parse only) | 44.23ms | 44.60ms |
| remark (parse only) | 62.52ms | 60.58ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5058ms | 3.4649ms |
| @ox-content/napi (parse only) | 0.7695ms | 0.7628ms |
| markdown-exit | 5.5982ms | 5.4906ms |
| markdown-it (baseline) | 3.6398ms | 3.7234ms |
| markdown-it-ts (stream+chunk) | 3.7530ms | 4.3353ms |
| micromark (parse only) | 86.02ms | 91.03ms |
| remark (parse only) | 135.87ms | 143.68ms |
