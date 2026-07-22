# Performance Report (latest run)

## Environment

- Generated at: 2026-07-22T16:41:22.490Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 57543035910811a8badbc1d0aeac8ca1eb814d0e

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
| 5,011 | 0.0513ms | 0.1463ms | 0.0300ms | stock-fast | 0.0140ms | 0.1799ms | 0.0286ms | stock-fast | no |
| 20,085 | 0.0964ms | 0.5728ms | 0.1280ms | stock-fast | 0.0555ms | 0.7151ms | 0.1507ms | stock-fast | no |
| 50,084 | 0.2735ms | 1.4684ms | 0.3792ms | stock-fast | 0.1369ms | 1.8132ms | 0.3341ms | stock-fast | no |
| 100,126 | 0.5848ms | 3.1410ms | 0.7848ms | stock-fast | 0.2728ms | 3.9033ms | 0.7344ms | stock-fast | no |
| 200,073 | 0.9615ms | 6.5747ms | 1.6432ms | stock-fast | 0.5303ms | 9.1008ms | 1.5616ms | stock-fast | no |
| 500,121 | 2.3467ms | 17.26ms | 4.2304ms | stock-fast | 2.0637ms | 28.03ms | 3.6202ms | stock-fast | no |
| 1,000,068 | 12.76ms | 47.53ms | 7.1854ms | stock-fast | 3.9795ms | 62.12ms | 7.1576ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2233ms | 0.2160ms | 0.0394ms | general | 0.2207ms | 0.2630ms | 0.0386ms | token-renderer | no |
| 20,125 | 0.6795ms | 0.7720ms | 0.1827ms | general | 0.8036ms | 0.9871ms | 0.1571ms | token-renderer | no |
| 50,025 | 1.7545ms | 1.9928ms | 0.5209ms | general | 2.0537ms | 2.4848ms | 0.4181ms | token-renderer | no |
| 100,450 | 3.7729ms | 4.1953ms | 0.9029ms | general | 4.5379ms | 5.3659ms | 0.8322ms | token-renderer | no |
| 200,109 | 8.8808ms | 9.0714ms | 1.8685ms | full-chunk | 10.01ms | 11.32ms | 1.6536ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0943ms | 0.0986ms | 0.0212ms | general | 0.1020ms | 0.1117ms | 0.0152ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1012ms | 0.1125ms | 0.0209ms | general | 0.1151ms | 0.1250ms | 0.0174ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0270ms | 0.0276ms | 0.0064ms | general | 0.0299ms | 0.0318ms | 0.0058ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1742ms | 0.1308ms | 0.1649ms | 0.1606ms | **0.0287ms** | 0.1457ms | 0.2008ms | 0.0305ms | 0.1414ms | 3.2612ms | 0.5270ms | 0.2274ms | 0.2149ms | 0.4590ms | 0.0889ms | 0.4663ms | 0.6301ms | **0.0456ms** | 0.1546ms | 10.10ms | 1.4539ms | 0.3602ms | 0.3047ms | 1.3941ms | 0.5438ms | 1.3569ms | 1.8718ms | **0.0720ms** | 0.1861ms | 30.08ms | 0.1664ms | 0.1454ms | 0.1799ms | 0.1682ms | 0.1509ms | 0.1558ms | 0.2118ms | **0.0304ms** | 0.1370ms | 3.3184ms |
| 20000 | 0.7343ms | 0.6844ms | 0.7357ms | 0.6175ms | **0.1011ms** | 0.8296ms | 0.8356ms | 0.1221ms | 0.5610ms | 14.11ms | 2.4592ms | 1.3410ms | 0.9364ms | 2.1920ms | 0.3305ms | 2.0976ms | 2.7645ms | **0.1535ms** | 0.6586ms | 45.94ms | 8.2665ms | 1.9087ms | 1.0438ms | 6.3456ms | 1.8377ms | 5.7929ms | 8.3267ms | **0.1754ms** | 0.6890ms | 121.94ms | 1.2414ms | 0.6806ms | 0.7613ms | 0.6548ms | 0.6166ms | 3.9429ms | 0.9536ms | **0.1133ms** | 0.5688ms | 12.56ms |
| 50000 | 1.6964ms | 1.2463ms | 1.8306ms | 1.6323ms | **0.2474ms** | 1.5549ms | 2.0827ms | 0.3475ms | 1.6468ms | 42.31ms | 5.7487ms | 1.8002ms | 1.9924ms | 6.1300ms | 0.9311ms | 5.1977ms | 6.9761ms | **0.4114ms** | 1.4918ms | 124.79ms | 15.77ms | 2.1532ms | 2.6468ms | 17.51ms | 2.9251ms | 13.62ms | 19.41ms | **0.3827ms** | 1.5624ms | 337.34ms | 1.6868ms | 1.1772ms | 1.6292ms | 1.5913ms | 2.1285ms | 1.5229ms | 1.9976ms | **0.4046ms** | 1.4476ms | 35.13ms |
| 100000 | 3.3622ms | 2.6329ms | 3.3201ms | 3.5191ms | **0.5720ms** | 3.0225ms | 4.3115ms | 0.7109ms | 2.8824ms | 81.69ms | 11.55ms | 3.3607ms | 3.3783ms | 11.31ms | 2.0591ms | 10.23ms | 14.00ms | **0.7243ms** | 2.9973ms | 279.23ms | 31.72ms | 4.1693ms | 4.4869ms | 35.97ms | 5.3201ms | 27.97ms | 37.89ms | **0.6919ms** | 3.0475ms | 710.54ms | 3.3231ms | 2.4358ms | 3.2735ms | 3.6783ms | 2.9941ms | 3.1722ms | 4.1135ms | **0.7793ms** | 2.8498ms | 72.18ms |
| 200000 | 7.7997ms | 6.1645ms | 7.3232ms | 7.2493ms | 1.5858ms | 7.1695ms | 9.3080ms | **1.5814ms** | 5.8706ms | 163.57ms | 23.54ms | 8.6863ms | 8.5666ms | 23.27ms | 4.1910ms | 22.76ms | 29.40ms | **1.7709ms** | 5.9659ms | 552.00ms | 63.42ms | 14.10ms | 14.07ms | 61.70ms | 11.61ms | 60.06ms | 84.08ms | **1.5933ms** | 5.8374ms | 1538.97ms | 7.0627ms | 6.3554ms | 6.2425ms | 6.3912ms | 8.6555ms | 6.3967ms | 8.9144ms | **1.6488ms** | 5.8229ms | 162.16ms |
| 500000 | 18.75ms | 18.22ms | 19.20ms | 20.10ms | 4.8561ms | 20.93ms | 26.05ms | **4.1396ms** | 14.60ms | - | 57.16ms | 24.15ms | 20.90ms | 56.97ms | 12.81ms | 64.37ms | 83.20ms | **4.2739ms** | 14.88ms | - | 160.83ms | 27.28ms | 21.69ms | 161.33ms | 51.81ms | 173.76ms | 222.02ms | **4.4064ms** | 17.47ms | - | 19.49ms | 22.75ms | 16.59ms | 17.76ms | 20.65ms | 19.34ms | 23.99ms | **4.6437ms** | 14.56ms | - |
| 1000000 | 41.25ms | 44.01ms | 42.33ms | 52.79ms | 15.07ms | 55.94ms | 62.25ms | **8.2151ms** | 28.83ms | - | 129.95ms | 43.01ms | 48.20ms | 130.32ms | 32.84ms | 139.58ms | 181.40ms | **9.1418ms** | 33.97ms | - | 367.77ms | 57.41ms | 57.49ms | 366.09ms | 89.96ms | 368.38ms | 471.72ms | **10.73ms** | 33.51ms | - | 43.34ms | 45.38ms | 48.66ms | 41.72ms | 51.87ms | 38.45ms | 61.63ms | **7.5668ms** | 30.51ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0287ms (stream OFF, chunk OFF)
- 20000: S5 0.1011ms (stream OFF, chunk OFF)
- 50000: S5 0.2474ms (stream OFF, chunk OFF)
- 100000: S5 0.5720ms (stream OFF, chunk OFF)
- 200000: S5 1.5858ms (stream OFF, chunk OFF)
- 500000: S5 4.8561ms (stream OFF, chunk OFF)
- 1000000: S5 15.07ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0889ms (stream OFF, chunk OFF)
- 20000: S5 0.3305ms (stream OFF, chunk OFF)
- 50000: S5 0.9311ms (stream OFF, chunk OFF)
- 100000: S5 2.0591ms (stream OFF, chunk OFF)
- 200000: S5 4.1910ms (stream OFF, chunk OFF)
- 500000: S5 12.81ms (stream OFF, chunk OFF)
- 1000000: S5 32.84ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3047ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0438ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.1532ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.1693ms (stream ON, cache ON, chunk OFF)
- 200000: S5 11.61ms (stream OFF, chunk OFF)
- 500000: S3 21.69ms (stream ON, cache ON, chunk ON)
- 1000000: S2 57.41ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1454ms (stream ON, cache ON, chunk OFF)
- 20000: S5 0.6166ms (stream OFF, chunk OFF)
- 50000: S2 1.1772ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.4358ms (stream ON, cache ON, chunk OFF)
- 200000: S3 6.2425ms (stream ON, cache ON, chunk ON)
- 500000: S3 16.59ms (stream ON, cache ON, chunk ON)
- 1000000: S4 41.72ms (stream OFF, chunk ON)

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
| 5000 | 0.0163ms | 0.0145ms | 0.1835ms | 0.0284ms | 3.1072ms | 3.7103ms | 0.2322ms |
| 20000 | 0.0562ms | 0.0571ms | 0.7292ms | 0.1266ms | 14.82ms | 18.95ms | 0.9268ms |
| 50000 | 0.1374ms | 0.1372ms | 1.8114ms | 0.3415ms | 45.60ms | 59.50ms | 2.3800ms |
| 100000 | 0.2689ms | 0.2704ms | 3.9406ms | 0.6686ms | 94.83ms | 140.09ms | 4.9653ms |
| 200000 | 0.5401ms | 0.5374ms | 8.7434ms | 1.4512ms | 187.02ms | 332.08ms | 11.10ms |
| 500000 | 2.0176ms | 1.9591ms | 29.99ms | 3.8353ms | - | - | 35.41ms |
| 1000000 | 4.1138ms | 4.0261ms | 54.41ms | 6.8230ms | - | - | 73.16ms |

Render vs markdown-it:
- 5,000 chars: 0.0163ms vs 0.1835ms → 11.27× faster
- 20,000 chars: 0.0562ms vs 0.7292ms → 12.98× faster
- 50,000 chars: 0.1374ms vs 1.8114ms → 13.18× faster
- 100,000 chars: 0.2689ms vs 3.9406ms → 14.65× faster
- 200,000 chars: 0.5401ms vs 8.7434ms → 16.19× faster
- 500,000 chars: 2.0176ms vs 29.99ms → 14.86× faster
- 1,000,000 chars: 4.1138ms vs 54.41ms → 13.23× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0163ms vs 0.0284ms → 1.74× faster, 42.6% less time
- 20,000 chars: 0.0562ms vs 0.1266ms → 2.25× faster, 55.6% less time
- 50,000 chars: 0.1374ms vs 0.3415ms → 2.48× faster, 59.8% less time
- 100,000 chars: 0.2689ms vs 0.6686ms → 2.49× faster, 59.8% less time
- 200,000 chars: 0.5401ms vs 1.4512ms → 2.69× faster, 62.8% less time
- 500,000 chars: 2.0176ms vs 3.8353ms → 1.9× faster, 47.4% less time
- 1,000,000 chars: 4.1138ms vs 6.8230ms → 1.66× faster, 39.7% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0145ms vs 0.0284ms → 1.96× faster, 49% less time
- 20,000 chars: 0.0571ms vs 0.1266ms → 2.22× faster, 54.9% less time
- 50,000 chars: 0.1372ms vs 0.3415ms → 2.49× faster, 59.8% less time
- 100,000 chars: 0.2704ms vs 0.6686ms → 2.47× faster, 59.6% less time
- 200,000 chars: 0.5374ms vs 1.4512ms → 2.7× faster, 63% less time
- 500,000 chars: 1.9591ms vs 3.8353ms → 1.96× faster, 48.9% less time
- 1,000,000 chars: 4.0261ms vs 6.8230ms → 1.69× faster, 41% less time

Render vs micromark:
- 5,000 chars: 0.0163ms vs 3.1072ms → 190.80× faster
- 20,000 chars: 0.0562ms vs 14.82ms → 263.76× faster
- 50,000 chars: 0.1374ms vs 45.60ms → 331.78× faster
- 100,000 chars: 0.2689ms vs 94.83ms → 352.60× faster
- 200,000 chars: 0.5401ms vs 187.02ms → 346.29× faster

Render vs remark+rehype:
- 5,000 chars: 0.0163ms vs 3.7103ms → 227.83× faster
- 20,000 chars: 0.0562ms vs 18.95ms → 337.27× faster
- 50,000 chars: 0.1374ms vs 59.50ms → 432.90× faster
- 100,000 chars: 0.2689ms vs 140.09ms → 520.89× faster
- 200,000 chars: 0.5401ms vs 332.08ms → 614.90× faster

Render vs markdown-exit:
- 5,000 chars: 0.0163ms vs 0.2322ms → 14.26× faster
- 20,000 chars: 0.0562ms vs 0.9268ms → 16.49× faster
- 50,000 chars: 0.1374ms vs 2.3800ms → 17.32× faster
- 100,000 chars: 0.2689ms vs 4.9653ms → 18.46× faster
- 200,000 chars: 0.5401ms vs 11.10ms → 20.55× faster
- 500,000 chars: 2.0176ms vs 35.41ms → 17.55× faster
- 1,000,000 chars: 4.1138ms vs 73.16ms → 17.78× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0287ms | 0.1457ms | 5.08× faster, 80.3% less time | 0.0889ms | 0.4663ms | 5.25× faster, 80.9% less time | S5/S5 |
| 20000 | 0.1011ms | 0.8296ms | 8.2× faster, 87.8% less time | 0.3305ms | 2.0976ms | 6.35× faster, 84.2% less time | S5/S5 |
| 50000 | 0.2474ms | 1.5549ms | 6.28× faster, 84.1% less time | 0.9311ms | 5.1977ms | 5.58× faster, 82.1% less time | S5/S5 |
| 100000 | 0.5720ms | 3.0225ms | 5.28× faster, 81.1% less time | 2.0591ms | 10.23ms | 4.97× faster, 79.9% less time | S5/S5 |
| 200000 | 1.5858ms | 7.1695ms | 4.52× faster, 77.9% less time | 4.1910ms | 22.76ms | 5.43× faster, 81.6% less time | S5/S5 |
| 500000 | 4.8561ms | 20.93ms | 4.31× faster, 76.8% less time | 12.81ms | 64.37ms | 5.02× faster, 80.1% less time | S5/S5 |
| 1000000 | 15.07ms | 55.94ms | 3.71× faster, 73.1% less time | 32.84ms | 139.58ms | 4.25× faster, 76.5% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0287ms | 0.0305ms | 1.06× faster, 5.9% less time | 0.0889ms | 0.0456ms | 1.95× slower, 94.7% more time | S5/S5 |
| 20000 | 0.1011ms | 0.1221ms | 1.21× faster, 17.2% less time | 0.3305ms | 0.1535ms | 2.15× slower, 115.3% more time | S5/S5 |
| 50000 | 0.2474ms | 0.3475ms | 1.4× faster, 28.8% less time | 0.9311ms | 0.4114ms | 2.26× slower, 126.3% more time | S5/S5 |
| 100000 | 0.5720ms | 0.7109ms | 1.24× faster, 19.5% less time | 2.0591ms | 0.7243ms | 2.84× slower, 184.3% more time | S5/S5 |
| 200000 | 1.5858ms | 1.5814ms | 1× slower, 0.3% more time | 4.1910ms | 1.7709ms | 2.37× slower, 136.7% more time | S5/S5 |
| 500000 | 4.8561ms | 4.1396ms | 1.17× slower, 17.3% more time | 12.81ms | 4.2739ms | 3× slower, 199.8% more time | S5/S5 |
| 1000000 | 15.07ms | 8.2151ms | 1.83× slower, 83.4% more time | 32.84ms | 9.1418ms | 3.59× slower, 259.3% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0287ms | 0.1414ms | 4.94× faster, 79.7% less time |
| 20000 | 0.1011ms | 0.5610ms | 5.55× faster, 82% less time |
| 50000 | 0.2474ms | 1.6468ms | 6.66× faster, 85% less time |
| 100000 | 0.5720ms | 2.8824ms | 5.04× faster, 80.2% less time |
| 200000 | 1.5858ms | 5.8706ms | 3.7× faster, 73% less time |
| 500000 | 4.8561ms | 14.60ms | 3.01× faster, 66.7% less time |
| 1000000 | 15.07ms | 28.83ms | 1.91× faster, 47.7% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0193ms | 0.0311ms | 1.61× faster, 37.9% less time | 0.1472ms |
| 20000 | 0.0685ms | 0.1303ms | 1.9× faster, 47.4% less time | 0.6021ms |
| 50000 | 0.1703ms | 0.4004ms | 2.35× faster, 57.5% less time | 1.4982ms |
| 100000 | 0.3296ms | 0.8047ms | 2.44× faster, 59% less time | 3.0535ms |
| 200000 | 0.6688ms | 1.7154ms | 2.56× faster, 61% less time | 6.3241ms |
| 500000 | 1.6264ms | 3.9847ms | 2.45× faster, 59.2% less time | 15.17ms |
| 1000000 | 3.5206ms | 7.4869ms | 2.13× faster, 53% less time | 29.30ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1344ms | 0.1347ms |
| @ox-content/napi (parse only) | 0.0348ms | 0.0306ms |
| markdown-exit | 0.4738ms | 0.4012ms |
| markdown-it (baseline) | 0.1683ms | 0.1393ms |
| markdown-it-ts (stream+chunk) | 0.1630ms | 0.1496ms |
| micromark (parse only) | 3.6319ms | 3.2738ms |
| remark (parse only) | 2.9979ms | 3.4483ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.5857ms | 0.5754ms |
| @ox-content/napi (parse only) | 0.1143ms | 0.1141ms |
| markdown-exit | 0.9405ms | 0.8782ms |
| markdown-it (baseline) | 0.6089ms | 0.6840ms |
| markdown-it-ts (stream+chunk) | 0.6330ms | 0.6079ms |
| micromark (parse only) | 12.25ms | 14.12ms |
| remark (parse only) | 16.12ms | 16.64ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.4049ms | 1.4852ms |
| @ox-content/napi (parse only) | 0.3715ms | 0.3526ms |
| markdown-exit | 1.9690ms | 2.2181ms |
| markdown-it (baseline) | 1.4090ms | 1.5170ms |
| markdown-it-ts (stream+chunk) | 1.5661ms | 1.6456ms |
| micromark (parse only) | 34.87ms | 39.01ms |
| remark (parse only) | 55.08ms | 59.75ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.0498ms | 3.3396ms |
| @ox-content/napi (parse only) | 0.6986ms | 0.8622ms |
| markdown-exit | 4.3077ms | 4.8232ms |
| markdown-it (baseline) | 3.1343ms | 3.4235ms |
| markdown-it-ts (stream+chunk) | 3.4295ms | 3.5430ms |
| micromark (parse only) | 84.89ms | 87.02ms |
| remark (parse only) | 122.88ms | 133.74ms |
