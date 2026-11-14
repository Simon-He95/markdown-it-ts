# Performance Report (latest run)

## Environment

- Generated at: 2026-11-14T06:06:38.556Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 949d2b93c782607b6acf69e9b7f80627523c3eb6

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
| 5,011 | 0.0479ms | 0.1818ms | 0.0375ms | stock-fast | 0.0214ms | 0.2276ms | 0.0340ms | stock-fast | no |
| 20,085 | 0.1171ms | 0.7230ms | 0.1444ms | stock-fast | 0.0742ms | 0.8960ms | 0.1318ms | stock-fast | no |
| 50,084 | 0.3294ms | 1.8075ms | 0.3847ms | stock-fast | 0.1813ms | 2.2627ms | 0.3246ms | stock-fast | no |
| 100,126 | 0.7055ms | 3.6958ms | 0.7555ms | stock-fast | 0.3610ms | 4.8163ms | 0.6715ms | stock-fast | no |
| 200,073 | 1.5940ms | 7.9412ms | 1.4869ms | stock-fast | 0.7182ms | 9.9279ms | 1.3201ms | stock-fast | no |
| 500,121 | 5.1840ms | 21.95ms | 3.7610ms | stock-fast | 2.3896ms | 30.32ms | 3.2849ms | stock-fast | no |
| 1,000,068 | 13.31ms | 54.47ms | 7.4505ms | stock-fast | 4.8746ms | 67.53ms | 6.6024ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2032ms | 0.2596ms | 0.0526ms | general | 0.2224ms | 0.3305ms | 0.0504ms | token-renderer | no |
| 20,125 | 0.6631ms | 0.9573ms | 0.1976ms | general | 0.8055ms | 1.2220ms | 0.1820ms | token-renderer | no |
| 50,025 | 1.6603ms | 2.4353ms | 0.5110ms | general | 2.0282ms | 3.1064ms | 0.4408ms | token-renderer | no |
| 100,450 | 3.5215ms | 5.0944ms | 1.0108ms | general | 4.1442ms | 6.4274ms | 0.9221ms | token-renderer | no |
| 200,109 | 8.4659ms | 10.86ms | 1.9884ms | full-chunk | 10.18ms | 13.88ms | 1.7559ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0733ms | 0.1302ms | 0.0273ms | general | 0.0896ms | 0.1425ms | 0.0195ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0762ms | 0.1310ms | 0.0265ms | general | 0.0916ms | 0.1510ms | 0.0216ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0227ms | 0.0337ms | 0.0078ms | general | 0.0270ms | 0.0395ms | 0.0070ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2114ms | 0.1590ms | 0.2006ms | 0.1912ms | 0.0413ms | 0.1875ms | 0.2574ms | **0.0395ms** | 0.1771ms | 3.0620ms | 0.6233ms | 0.3387ms | 0.2933ms | 0.5910ms | 0.1142ms | 0.5935ms | 0.8504ms | **0.0590ms** | 0.1982ms | 9.7138ms | 1.8461ms | 0.3781ms | 0.3600ms | 1.7423ms | 0.6705ms | 1.7823ms | 2.3907ms | **0.0901ms** | 0.2357ms | 27.78ms | 0.2330ms | 0.1882ms | 0.1898ms | 0.1936ms | 0.1814ms | 0.1987ms | 0.2723ms | **0.0382ms** | 0.1766ms | 3.0740ms |
| 20000 | 0.7577ms | 0.6104ms | 0.7559ms | 0.7570ms | **0.1270ms** | 0.7397ms | 0.9989ms | 0.1453ms | 0.7040ms | 16.36ms | 2.6112ms | 1.0000ms | 1.0520ms | 2.6395ms | 0.4302ms | 2.5304ms | 3.4960ms | **0.1836ms** | 0.7396ms | 48.24ms | 7.1309ms | 1.1047ms | 0.9604ms | 7.1474ms | 2.2759ms | 7.0141ms | 9.5282ms | **0.2206ms** | 0.7871ms | 132.04ms | 0.7571ms | 0.5986ms | 0.8081ms | 0.7523ms | 0.6833ms | 0.7300ms | 0.9965ms | **0.1430ms** | 0.6883ms | 15.19ms |
| 50000 | 1.9000ms | 1.5154ms | 1.8886ms | 1.9099ms | **0.3045ms** | 1.8460ms | 2.5164ms | 0.3900ms | 1.7603ms | 46.10ms | 6.6466ms | 2.1747ms | 2.1755ms | 6.6787ms | 1.1594ms | 6.3980ms | 8.7211ms | **0.4259ms** | 1.8150ms | 145.38ms | 17.73ms | 2.4243ms | 2.4475ms | 18.03ms | 3.1593ms | 17.08ms | 23.44ms | **0.4729ms** | 1.8806ms | 384.85ms | 1.8894ms | 1.4744ms | 1.9438ms | 1.8788ms | 1.6658ms | 1.8792ms | 2.4674ms | **0.4040ms** | 1.7733ms | 42.78ms |
| 100000 | 4.0210ms | 3.1930ms | 3.8970ms | 3.8926ms | **0.6725ms** | 3.7986ms | 5.2526ms | 0.7495ms | 3.4564ms | 90.97ms | 13.50ms | 5.0572ms | 4.5635ms | 13.27ms | 2.6063ms | 12.80ms | 17.24ms | **0.8217ms** | 3.5380ms | 303.44ms | 36.86ms | 4.9811ms | 4.4833ms | 36.14ms | 6.6902ms | 35.36ms | 47.10ms | **0.8971ms** | 3.6029ms | 840.87ms | 3.9520ms | 2.9168ms | 3.9647ms | 3.7669ms | 3.4730ms | 3.7065ms | 4.8699ms | **0.7675ms** | 3.4255ms | 89.11ms |
| 200000 | 8.2018ms | 6.8596ms | 8.0799ms | 8.2762ms | 1.7715ms | 8.5964ms | 11.30ms | **1.4964ms** | 6.9917ms | 184.67ms | 26.88ms | 10.28ms | 10.59ms | 26.59ms | 5.0362ms | 27.07ms | 35.96ms | **1.7637ms** | 7.0754ms | 644.32ms | 73.87ms | 10.96ms | 10.29ms | 73.84ms | 14.10ms | 71.89ms | 95.71ms | **1.7713ms** | 7.1161ms | 1718.95ms | 9.4068ms | 6.0245ms | 8.2296ms | 7.8714ms | 9.0636ms | 7.9076ms | 10.78ms | **1.5016ms** | 6.7877ms | 177.33ms |
| 500000 | 21.86ms | 20.66ms | 22.48ms | 23.08ms | 5.8392ms | 23.42ms | 32.92ms | **3.8258ms** | 17.02ms | - | 67.79ms | 34.50ms | 31.09ms | 68.38ms | 14.52ms | 76.93ms | 100.14ms | **4.2234ms** | 17.93ms | - | 191.24ms | 32.88ms | 26.08ms | 188.38ms | 60.39ms | 202.98ms | 269.52ms | **4.4238ms** | 18.10ms | - | 21.05ms | 21.99ms | 21.67ms | 22.84ms | 27.65ms | 21.21ms | 30.81ms | **3.6934ms** | 17.18ms | - |
| 1000000 | 53.54ms | 48.14ms | 50.96ms | 50.77ms | 13.29ms | 58.52ms | 65.78ms | **7.4772ms** | 33.75ms | - | 158.70ms | 64.96ms | 60.56ms | 150.36ms | 37.02ms | 154.87ms | 211.11ms | **8.4712ms** | 37.59ms | - | 404.27ms | 56.31ms | 58.48ms | 422.55ms | 100.46ms | 455.63ms | 567.73ms | **8.7466ms** | 36.68ms | - | 57.65ms | 44.49ms | 47.64ms | 43.16ms | 56.28ms | 53.70ms | 65.44ms | **7.3215ms** | 35.98ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0413ms (stream OFF, chunk OFF)
- 20000: S5 0.1270ms (stream OFF, chunk OFF)
- 50000: S5 0.3045ms (stream OFF, chunk OFF)
- 100000: S5 0.6725ms (stream OFF, chunk OFF)
- 200000: S5 1.7715ms (stream OFF, chunk OFF)
- 500000: S5 5.8392ms (stream OFF, chunk OFF)
- 1000000: S5 13.29ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1142ms (stream OFF, chunk OFF)
- 20000: S5 0.4302ms (stream OFF, chunk OFF)
- 50000: S5 1.1594ms (stream OFF, chunk OFF)
- 100000: S5 2.6063ms (stream OFF, chunk OFF)
- 200000: S5 5.0362ms (stream OFF, chunk OFF)
- 500000: S5 14.52ms (stream OFF, chunk OFF)
- 1000000: S5 37.02ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3600ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9604ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.4243ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.4833ms (stream ON, cache ON, chunk ON)
- 200000: S3 10.29ms (stream ON, cache ON, chunk ON)
- 500000: S3 26.08ms (stream ON, cache ON, chunk ON)
- 1000000: S2 56.31ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1814ms (stream OFF, chunk OFF)
- 20000: S2 0.5986ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4744ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9168ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.0245ms (stream ON, cache ON, chunk OFF)
- 500000: S1 21.05ms (stream ON, cache OFF, chunk ON)
- 1000000: S4 43.16ms (stream OFF, chunk ON)

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
| 5000 | 0.0222ms | 0.0191ms | 0.2321ms | 0.0337ms | 3.8373ms | 4.6171ms | 0.2977ms |
| 20000 | 0.0727ms | 0.0746ms | 0.9120ms | 0.1342ms | 17.70ms | 21.81ms | 1.2139ms |
| 50000 | 0.1811ms | 0.1810ms | 2.2798ms | 0.3283ms | 51.53ms | 69.58ms | 3.0123ms |
| 100000 | 0.3614ms | 0.3572ms | 4.8284ms | 0.6687ms | 107.86ms | 157.80ms | 6.1667ms |
| 200000 | 0.7166ms | 0.7160ms | 10.43ms | 1.3404ms | 213.07ms | 390.74ms | 13.08ms |
| 500000 | 2.6466ms | 2.4150ms | 30.98ms | 3.2649ms | - | - | 39.29ms |
| 1000000 | 4.9789ms | 5.0776ms | 70.92ms | 6.6270ms | - | - | 84.84ms |

Render vs markdown-it:
- 5,000 chars: 0.0222ms vs 0.2321ms → 10.44× faster
- 20,000 chars: 0.0727ms vs 0.9120ms → 12.55× faster
- 50,000 chars: 0.1811ms vs 2.2798ms → 12.59× faster
- 100,000 chars: 0.3614ms vs 4.8284ms → 13.36× faster
- 200,000 chars: 0.7166ms vs 10.43ms → 14.56× faster
- 500,000 chars: 2.6466ms vs 30.98ms → 11.70× faster
- 1,000,000 chars: 4.9789ms vs 70.92ms → 14.24× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0222ms vs 0.0337ms → 1.51× faster, 34% less time
- 20,000 chars: 0.0727ms vs 0.1342ms → 1.85× faster, 45.8% less time
- 50,000 chars: 0.1811ms vs 0.3283ms → 1.81× faster, 44.8% less time
- 100,000 chars: 0.3614ms vs 0.6687ms → 1.85× faster, 46% less time
- 200,000 chars: 0.7166ms vs 1.3404ms → 1.87× faster, 46.5% less time
- 500,000 chars: 2.6466ms vs 3.2649ms → 1.23× faster, 18.9% less time
- 1,000,000 chars: 4.9789ms vs 6.6270ms → 1.33× faster, 24.9% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0191ms vs 0.0337ms → 1.76× faster, 43.3% less time
- 20,000 chars: 0.0746ms vs 0.1342ms → 1.8× faster, 44.4% less time
- 50,000 chars: 0.1810ms vs 0.3283ms → 1.81× faster, 44.9% less time
- 100,000 chars: 0.3572ms vs 0.6687ms → 1.87× faster, 46.6% less time
- 200,000 chars: 0.7160ms vs 1.3404ms → 1.87× faster, 46.6% less time
- 500,000 chars: 2.4150ms vs 3.2649ms → 1.35× faster, 26% less time
- 1,000,000 chars: 5.0776ms vs 6.6270ms → 1.31× faster, 23.4% less time

Render vs micromark:
- 5,000 chars: 0.0222ms vs 3.8373ms → 172.61× faster
- 20,000 chars: 0.0727ms vs 17.70ms → 243.54× faster
- 50,000 chars: 0.1811ms vs 51.53ms → 284.48× faster
- 100,000 chars: 0.3614ms vs 107.86ms → 298.46× faster
- 200,000 chars: 0.7166ms vs 213.07ms → 297.36× faster

Render vs remark+rehype:
- 5,000 chars: 0.0222ms vs 4.6171ms → 207.69× faster
- 20,000 chars: 0.0727ms vs 21.81ms → 300.03× faster
- 50,000 chars: 0.1811ms vs 69.58ms → 384.15× faster
- 100,000 chars: 0.3614ms vs 157.80ms → 436.65× faster
- 200,000 chars: 0.7166ms vs 390.74ms → 545.30× faster

Render vs markdown-exit:
- 5,000 chars: 0.0222ms vs 0.2977ms → 13.39× faster
- 20,000 chars: 0.0727ms vs 1.2139ms → 16.70× faster
- 50,000 chars: 0.1811ms vs 3.0123ms → 16.63× faster
- 100,000 chars: 0.3614ms vs 6.1667ms → 17.06× faster
- 200,000 chars: 0.7166ms vs 13.08ms → 18.25× faster
- 500,000 chars: 2.6466ms vs 39.29ms → 14.85× faster
- 1,000,000 chars: 4.9789ms vs 84.84ms → 17.04× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0413ms | 0.1875ms | 4.54× faster, 78% less time | 0.1142ms | 0.5935ms | 5.2× faster, 80.8% less time | S5/S5 |
| 20000 | 0.1270ms | 0.7397ms | 5.83× faster, 82.8% less time | 0.4302ms | 2.5304ms | 5.88× faster, 83% less time | S5/S5 |
| 50000 | 0.3045ms | 1.8460ms | 6.06× faster, 83.5% less time | 1.1594ms | 6.3980ms | 5.52× faster, 81.9% less time | S5/S5 |
| 100000 | 0.6725ms | 3.7986ms | 5.65× faster, 82.3% less time | 2.6063ms | 12.80ms | 4.91× faster, 79.6% less time | S5/S5 |
| 200000 | 1.7715ms | 8.5964ms | 4.85× faster, 79.4% less time | 5.0362ms | 27.07ms | 5.37× faster, 81.4% less time | S5/S5 |
| 500000 | 5.8392ms | 23.42ms | 4.01× faster, 75.1% less time | 14.52ms | 76.93ms | 5.3× faster, 81.1% less time | S5/S5 |
| 1000000 | 13.29ms | 58.52ms | 4.4× faster, 77.3% less time | 37.02ms | 154.87ms | 4.18× faster, 76.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0413ms | 0.0395ms | 1.05× slower, 4.5% more time | 0.1142ms | 0.0590ms | 1.94× slower, 93.6% more time | S5/S5 |
| 20000 | 0.1270ms | 0.1453ms | 1.14× faster, 12.6% less time | 0.4302ms | 0.1836ms | 2.34× slower, 134.2% more time | S5/S5 |
| 50000 | 0.3045ms | 0.3900ms | 1.28× faster, 21.9% less time | 1.1594ms | 0.4259ms | 2.72× slower, 172.2% more time | S5/S5 |
| 100000 | 0.6725ms | 0.7495ms | 1.11× faster, 10.3% less time | 2.6063ms | 0.8217ms | 3.17× slower, 217.2% more time | S5/S5 |
| 200000 | 1.7715ms | 1.4964ms | 1.18× slower, 18.4% more time | 5.0362ms | 1.7637ms | 2.86× slower, 185.6% more time | S5/S5 |
| 500000 | 5.8392ms | 3.8258ms | 1.53× slower, 52.6% more time | 14.52ms | 4.2234ms | 3.44× slower, 243.8% more time | S5/S5 |
| 1000000 | 13.29ms | 7.4772ms | 1.78× slower, 77.8% more time | 37.02ms | 8.4712ms | 4.37× slower, 337.1% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0413ms | 0.1771ms | 4.29× faster, 76.7% less time |
| 20000 | 0.1270ms | 0.7040ms | 5.54× faster, 82% less time |
| 50000 | 0.3045ms | 1.7603ms | 5.78× faster, 82.7% less time |
| 100000 | 0.6725ms | 3.4564ms | 5.14× faster, 80.5% less time |
| 200000 | 1.7715ms | 6.9917ms | 3.95× faster, 74.7% less time |
| 500000 | 5.8392ms | 17.02ms | 2.91× faster, 65.7% less time |
| 1000000 | 13.29ms | 33.75ms | 2.54× faster, 60.6% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0265ms | 0.0376ms | 1.42× faster, 29.5% less time | 0.1787ms |
| 20000 | 0.0938ms | 0.1448ms | 1.54× faster, 35.2% less time | 0.7011ms |
| 50000 | 0.2278ms | 0.3888ms | 1.71× faster, 41.4% less time | 1.7715ms |
| 100000 | 0.4518ms | 0.7442ms | 1.65× faster, 39.3% less time | 3.4923ms |
| 200000 | 0.8929ms | 1.4728ms | 1.65× faster, 39.4% less time | 7.0760ms |
| 500000 | 2.7798ms | 3.7346ms | 1.34× faster, 25.6% less time | 17.79ms |
| 1000000 | 4.8469ms | 7.4506ms | 1.54× faster, 34.9% less time | 34.77ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1757ms | 0.1749ms |
| @ox-content/napi (parse only) | 0.0488ms | 0.0408ms |
| markdown-exit | 0.5276ms | 0.5147ms |
| markdown-it (baseline) | 0.2156ms | 0.1812ms |
| markdown-it-ts (stream+chunk) | 0.8540ms | 0.6775ms |
| micromark (parse only) | 4.5176ms | 3.4612ms |
| remark (parse only) | 3.8137ms | 4.0246ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6903ms | 0.6921ms |
| @ox-content/napi (parse only) | 0.1444ms | 0.1458ms |
| markdown-exit | 1.0390ms | 1.0912ms |
| markdown-it (baseline) | 0.7578ms | 0.8037ms |
| markdown-it-ts (stream+chunk) | 0.9256ms | 0.8501ms |
| micromark (parse only) | 16.11ms | 15.75ms |
| remark (parse only) | 19.62ms | 19.02ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7305ms | 1.7242ms |
| @ox-content/napi (parse only) | 0.3982ms | 0.3835ms |
| markdown-exit | 2.4151ms | 2.3781ms |
| markdown-it (baseline) | 1.7687ms | 1.8497ms |
| markdown-it-ts (stream+chunk) | 1.9646ms | 2.0239ms |
| micromark (parse only) | 40.74ms | 43.86ms |
| remark (parse only) | 63.35ms | 61.43ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5641ms | 3.4889ms |
| @ox-content/napi (parse only) | 0.7620ms | 0.7617ms |
| markdown-exit | 4.7762ms | 5.0204ms |
| markdown-it (baseline) | 3.6160ms | 3.7489ms |
| markdown-it-ts (stream+chunk) | 3.7213ms | 3.9175ms |
| micromark (parse only) | 87.79ms | 90.82ms |
| remark (parse only) | 139.53ms | 163.76ms |
