# Performance Report (latest run)

## Environment

- Generated at: 2026-11-13T11:52:28.069Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 5c59276dc5dafc69c33b0cce58c7ee29e2a5169f

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
| 5,011 | 0.0588ms | 0.2030ms | 0.0389ms | stock-fast | 0.0198ms | 0.2279ms | 0.0341ms | stock-fast | no |
| 20,085 | 0.1289ms | 0.7370ms | 0.1523ms | stock-fast | 0.0755ms | 0.9215ms | 0.1333ms | stock-fast | no |
| 50,084 | 0.2961ms | 1.8554ms | 0.4099ms | stock-fast | 0.1786ms | 2.3302ms | 0.3317ms | stock-fast | no |
| 100,126 | 0.6262ms | 3.9334ms | 0.8001ms | stock-fast | 0.3553ms | 4.8125ms | 0.6842ms | stock-fast | no |
| 200,073 | 1.2168ms | 8.1070ms | 1.5679ms | stock-fast | 0.6939ms | 10.29ms | 1.3635ms | stock-fast | no |
| 500,121 | 4.7421ms | 23.05ms | 3.9526ms | stock-fast | 2.4422ms | 32.24ms | 3.3837ms | stock-fast | no |
| 1,000,068 | 20.96ms | 51.71ms | 7.4436ms | stock-fast | 4.8740ms | 77.40ms | 6.7175ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2084ms | 0.2719ms | 0.0537ms | general | 0.2255ms | 0.3366ms | 0.0503ms | token-renderer | no |
| 20,125 | 0.6789ms | 0.9984ms | 0.2023ms | general | 0.8478ms | 1.2877ms | 0.1878ms | token-renderer | no |
| 50,025 | 1.6792ms | 2.4776ms | 0.5203ms | general | 2.0298ms | 3.1877ms | 0.4539ms | token-renderer | no |
| 100,450 | 3.5513ms | 5.2608ms | 1.0437ms | general | 4.4071ms | 6.9179ms | 0.9153ms | token-renderer | no |
| 200,109 | 8.9979ms | 10.81ms | 2.0302ms | full-chunk | 10.55ms | 14.58ms | 1.8047ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0732ms | 0.1217ms | 0.0263ms | general | 0.0894ms | 0.1393ms | 0.0197ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0760ms | 0.1331ms | 0.0262ms | general | 0.0919ms | 0.1532ms | 0.0216ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0231ms | 0.0346ms | 0.0080ms | general | 0.0277ms | 0.0404ms | 0.0071ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2033ms | 0.1593ms | 0.1976ms | 0.1881ms | **0.0362ms** | 0.1854ms | 0.2525ms | 0.0381ms | 0.1767ms | 3.7741ms | 0.6192ms | 0.3071ms | 0.3088ms | 0.5638ms | 0.1064ms | 0.5845ms | 0.8113ms | **0.0573ms** | 0.1973ms | 12.67ms | 1.7820ms | 0.4074ms | 0.3696ms | 1.6795ms | 0.6398ms | 1.7100ms | 2.3784ms | **0.0888ms** | 0.2416ms | 34.89ms | 0.2274ms | 0.1790ms | 0.2045ms | 0.1991ms | 0.1720ms | 0.1935ms | 0.2659ms | **0.0376ms** | 0.1754ms | 3.7172ms |
| 20000 | 0.7533ms | 0.5995ms | 0.7464ms | 0.7362ms | **0.1213ms** | 0.7294ms | 0.9928ms | 0.1450ms | 0.6907ms | 15.80ms | 2.5672ms | 0.8733ms | 1.0311ms | 2.5420ms | 0.4065ms | 2.4964ms | 3.3729ms | **0.1844ms** | 0.7351ms | 46.73ms | 7.0155ms | 1.0784ms | 0.9578ms | 7.0716ms | 2.1172ms | 6.8902ms | 9.3590ms | **0.2201ms** | 0.7909ms | 129.50ms | 0.7744ms | 0.5976ms | 0.7386ms | 0.7780ms | 0.7278ms | 0.7479ms | 1.0873ms | **0.1512ms** | 0.6886ms | 14.66ms |
| 50000 | 1.9048ms | 1.5190ms | 1.8862ms | 1.8855ms | **0.3034ms** | 1.8290ms | 2.4680ms | 0.3877ms | 1.7655ms | 44.17ms | 6.6326ms | 2.1084ms | 2.1866ms | 6.4458ms | 1.0685ms | 6.2870ms | 8.5224ms | **0.4247ms** | 1.7923ms | 139.53ms | 17.86ms | 2.3618ms | 2.4813ms | 17.59ms | 2.9256ms | 17.03ms | 23.18ms | **0.4693ms** | 1.8783ms | 380.57ms | 1.8980ms | 1.4582ms | 1.8549ms | 1.8805ms | 1.6876ms | 1.7955ms | 2.5056ms | **0.3876ms** | 1.7586ms | 42.58ms |
| 100000 | 3.9600ms | 3.1405ms | 3.9031ms | 3.9417ms | **0.6703ms** | 3.8293ms | 5.1425ms | 0.7557ms | 3.4752ms | 89.90ms | 13.30ms | 4.4559ms | 4.5248ms | 13.37ms | 2.3840ms | 12.99ms | 17.07ms | **0.8359ms** | 3.5208ms | 302.59ms | 36.22ms | 4.7242ms | 4.4520ms | 35.68ms | 6.3730ms | 35.22ms | 46.98ms | **0.8999ms** | 3.6162ms | 824.10ms | 3.8067ms | 3.0805ms | 3.9290ms | 3.8132ms | 3.4108ms | 3.7790ms | 4.9428ms | **0.7527ms** | 3.4650ms | 88.33ms |
| 200000 | 8.3993ms | 6.7802ms | 8.2422ms | 8.3768ms | 1.6980ms | 8.6680ms | 11.55ms | **1.5157ms** | 6.9013ms | 177.51ms | 27.25ms | 9.5744ms | 9.3383ms | 26.95ms | 4.7094ms | 27.71ms | 35.80ms | **1.7985ms** | 7.1655ms | 633.96ms | 73.03ms | 9.5410ms | 10.71ms | 72.94ms | 12.42ms | 71.19ms | 96.86ms | **1.7092ms** | 7.1092ms | 1693.41ms | 7.9913ms | 8.6033ms | 8.3899ms | 7.9238ms | 11.63ms | 7.9167ms | 19.72ms | **1.5158ms** | 6.8358ms | 180.22ms |
| 500000 | 24.05ms | 21.01ms | 23.81ms | 22.84ms | 6.0846ms | 25.23ms | 32.21ms | **3.8580ms** | 17.17ms | - | 66.55ms | 35.28ms | 31.39ms | 67.13ms | 13.51ms | 78.74ms | 102.95ms | **4.3422ms** | 17.77ms | - | 196.87ms | 34.89ms | 24.68ms | 191.56ms | 66.26ms | 225.07ms | 274.11ms | **4.5575ms** | 18.10ms | - | 20.74ms | 23.29ms | 19.70ms | 21.41ms | 24.05ms | 22.75ms | 36.15ms | **3.8021ms** | 17.19ms | - |
| 1000000 | 55.90ms | 50.26ms | 50.72ms | 49.68ms | 12.88ms | 63.29ms | 66.04ms | **7.5174ms** | 34.70ms | - | 151.43ms | 62.82ms | 64.67ms | 153.40ms | 36.41ms | 158.33ms | 204.75ms | **8.6516ms** | 38.21ms | - | 421.26ms | 63.46ms | 65.58ms | 420.84ms | 89.70ms | 434.85ms | 576.25ms | **8.7901ms** | 38.07ms | - | 43.73ms | 44.94ms | 49.87ms | 47.31ms | 56.06ms | 53.68ms | 70.71ms | **7.5121ms** | 35.91ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0362ms (stream OFF, chunk OFF)
- 20000: S5 0.1213ms (stream OFF, chunk OFF)
- 50000: S5 0.3034ms (stream OFF, chunk OFF)
- 100000: S5 0.6703ms (stream OFF, chunk OFF)
- 200000: S5 1.6980ms (stream OFF, chunk OFF)
- 500000: S5 6.0846ms (stream OFF, chunk OFF)
- 1000000: S5 12.88ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1064ms (stream OFF, chunk OFF)
- 20000: S5 0.4065ms (stream OFF, chunk OFF)
- 50000: S5 1.0685ms (stream OFF, chunk OFF)
- 100000: S5 2.3840ms (stream OFF, chunk OFF)
- 200000: S5 4.7094ms (stream OFF, chunk OFF)
- 500000: S5 13.51ms (stream OFF, chunk OFF)
- 1000000: S5 36.41ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3696ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9578ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.3618ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.4520ms (stream ON, cache ON, chunk ON)
- 200000: S2 9.5410ms (stream ON, cache ON, chunk OFF)
- 500000: S3 24.68ms (stream ON, cache ON, chunk ON)
- 1000000: S2 63.46ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1720ms (stream OFF, chunk OFF)
- 20000: S2 0.5976ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4582ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0805ms (stream ON, cache ON, chunk OFF)
- 200000: S4 7.9238ms (stream OFF, chunk ON)
- 500000: S3 19.70ms (stream ON, cache ON, chunk ON)
- 1000000: S1 43.73ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0216ms | 0.0182ms | 0.2312ms | 0.0344ms | 3.9019ms | 4.8658ms | 0.3015ms |
| 20000 | 0.0706ms | 0.0717ms | 0.9141ms | 0.1345ms | 18.23ms | 22.62ms | 1.1778ms |
| 50000 | 0.1764ms | 0.1758ms | 2.2895ms | 0.3286ms | 52.34ms | 70.36ms | 2.9879ms |
| 100000 | 0.3489ms | 0.3453ms | 4.8926ms | 0.6887ms | 109.76ms | 165.78ms | 6.1184ms |
| 200000 | 0.6981ms | 0.6909ms | 10.91ms | 1.3738ms | 213.92ms | 410.09ms | 13.53ms |
| 500000 | 2.4394ms | 2.4614ms | 32.94ms | 3.3716ms | - | - | 40.74ms |
| 1000000 | 4.8743ms | 5.6034ms | 66.72ms | 6.6449ms | - | - | 78.66ms |

Render vs markdown-it:
- 5,000 chars: 0.0216ms vs 0.2312ms → 10.69× faster
- 20,000 chars: 0.0706ms vs 0.9141ms → 12.95× faster
- 50,000 chars: 0.1764ms vs 2.2895ms → 12.98× faster
- 100,000 chars: 0.3489ms vs 4.8926ms → 14.02× faster
- 200,000 chars: 0.6981ms vs 10.91ms → 15.63× faster
- 500,000 chars: 2.4394ms vs 32.94ms → 13.50× faster
- 1,000,000 chars: 4.8743ms vs 66.72ms → 13.69× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0216ms vs 0.0344ms → 1.59× faster, 37.2% less time
- 20,000 chars: 0.0706ms vs 0.1345ms → 1.91× faster, 47.5% less time
- 50,000 chars: 0.1764ms vs 0.3286ms → 1.86× faster, 46.3% less time
- 100,000 chars: 0.3489ms vs 0.6887ms → 1.97× faster, 49.3% less time
- 200,000 chars: 0.6981ms vs 1.3738ms → 1.97× faster, 49.2% less time
- 500,000 chars: 2.4394ms vs 3.3716ms → 1.38× faster, 27.6% less time
- 1,000,000 chars: 4.8743ms vs 6.6449ms → 1.36× faster, 26.6% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0182ms vs 0.0344ms → 1.89× faster, 47.1% less time
- 20,000 chars: 0.0717ms vs 0.1345ms → 1.88× faster, 46.7% less time
- 50,000 chars: 0.1758ms vs 0.3286ms → 1.87× faster, 46.5% less time
- 100,000 chars: 0.3453ms vs 0.6887ms → 1.99× faster, 49.9% less time
- 200,000 chars: 0.6909ms vs 1.3738ms → 1.99× faster, 49.7% less time
- 500,000 chars: 2.4614ms vs 3.3716ms → 1.37× faster, 27% less time
- 1,000,000 chars: 5.6034ms vs 6.6449ms → 1.19× faster, 15.7% less time

Render vs micromark:
- 5,000 chars: 0.0216ms vs 3.9019ms → 180.50× faster
- 20,000 chars: 0.0706ms vs 18.23ms → 258.29× faster
- 50,000 chars: 0.1764ms vs 52.34ms → 296.80× faster
- 100,000 chars: 0.3489ms vs 109.76ms → 314.59× faster
- 200,000 chars: 0.6981ms vs 213.92ms → 306.42× faster

Render vs remark+rehype:
- 5,000 chars: 0.0216ms vs 4.8658ms → 225.09× faster
- 20,000 chars: 0.0706ms vs 22.62ms → 320.37× faster
- 50,000 chars: 0.1764ms vs 70.36ms → 398.93× faster
- 100,000 chars: 0.3489ms vs 165.78ms → 475.12× faster
- 200,000 chars: 0.6981ms vs 410.09ms → 587.44× faster

Render vs markdown-exit:
- 5,000 chars: 0.0216ms vs 0.3015ms → 13.95× faster
- 20,000 chars: 0.0706ms vs 1.1778ms → 16.68× faster
- 50,000 chars: 0.1764ms vs 2.9879ms → 16.94× faster
- 100,000 chars: 0.3489ms vs 6.1184ms → 17.54× faster
- 200,000 chars: 0.6981ms vs 13.53ms → 19.38× faster
- 500,000 chars: 2.4394ms vs 40.74ms → 16.70× faster
- 1,000,000 chars: 4.8743ms vs 78.66ms → 16.14× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0362ms | 0.1854ms | 5.11× faster, 80.4% less time | 0.1064ms | 0.5845ms | 5.49× faster, 81.8% less time | S5/S5 |
| 20000 | 0.1213ms | 0.7294ms | 6.01× faster, 83.4% less time | 0.4065ms | 2.4964ms | 6.14× faster, 83.7% less time | S5/S5 |
| 50000 | 0.3034ms | 1.8290ms | 6.03× faster, 83.4% less time | 1.0685ms | 6.2870ms | 5.88× faster, 83% less time | S5/S5 |
| 100000 | 0.6703ms | 3.8293ms | 5.71× faster, 82.5% less time | 2.3840ms | 12.99ms | 5.45× faster, 81.6% less time | S5/S5 |
| 200000 | 1.6980ms | 8.6680ms | 5.1× faster, 80.4% less time | 4.7094ms | 27.71ms | 5.88× faster, 83% less time | S5/S5 |
| 500000 | 6.0846ms | 25.23ms | 4.15× faster, 75.9% less time | 13.51ms | 78.74ms | 5.83× faster, 82.8% less time | S5/S5 |
| 1000000 | 12.88ms | 63.29ms | 4.91× faster, 79.7% less time | 36.41ms | 158.33ms | 4.35× faster, 77% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0362ms | 0.0381ms | 1.05× faster, 4.8% less time | 0.1064ms | 0.0573ms | 1.86× slower, 85.7% more time | S5/S5 |
| 20000 | 0.1213ms | 0.1450ms | 1.2× faster, 16.3% less time | 0.4065ms | 0.1844ms | 2.2× slower, 120.5% more time | S5/S5 |
| 50000 | 0.3034ms | 0.3877ms | 1.28× faster, 21.7% less time | 1.0685ms | 0.4247ms | 2.52× slower, 151.6% more time | S5/S5 |
| 100000 | 0.6703ms | 0.7557ms | 1.13× faster, 11.3% less time | 2.3840ms | 0.8359ms | 2.85× slower, 185.2% more time | S5/S5 |
| 200000 | 1.6980ms | 1.5157ms | 1.12× slower, 12% more time | 4.7094ms | 1.7985ms | 2.62× slower, 161.8% more time | S5/S5 |
| 500000 | 6.0846ms | 3.8580ms | 1.58× slower, 57.7% more time | 13.51ms | 4.3422ms | 3.11× slower, 211.2% more time | S5/S5 |
| 1000000 | 12.88ms | 7.5174ms | 1.71× slower, 71.3% more time | 36.41ms | 8.6516ms | 4.21× slower, 320.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0362ms | 0.1767ms | 4.88× faster, 79.5% less time |
| 20000 | 0.1213ms | 0.6907ms | 5.7× faster, 82.4% less time |
| 50000 | 0.3034ms | 1.7655ms | 5.82× faster, 82.8% less time |
| 100000 | 0.6703ms | 3.4752ms | 5.18× faster, 80.7% less time |
| 200000 | 1.6980ms | 6.9013ms | 4.06× faster, 75.4% less time |
| 500000 | 6.0846ms | 17.17ms | 2.82× faster, 64.6% less time |
| 1000000 | 12.88ms | 34.70ms | 2.69× faster, 62.9% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0253ms | 0.0378ms | 1.49× faster, 33% less time | 0.1804ms |
| 20000 | 0.0881ms | 0.1488ms | 1.69× faster, 40.8% less time | 0.7293ms |
| 50000 | 0.2177ms | 0.4211ms | 1.93× faster, 48.3% less time | 1.7955ms |
| 100000 | 0.4261ms | 0.7660ms | 1.8× faster, 44.4% less time | 3.5676ms |
| 200000 | 0.8450ms | 1.5224ms | 1.8× faster, 44.5% less time | 7.1040ms |
| 500000 | 2.1023ms | 3.8894ms | 1.85× faster, 45.9% less time | 18.42ms |
| 1000000 | 4.7554ms | 7.3779ms | 1.55× faster, 35.5% less time | 34.86ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1755ms | 0.1757ms |
| @ox-content/napi (parse only) | 0.0394ms | 0.0375ms |
| markdown-exit | 0.6050ms | 0.5628ms |
| markdown-it (baseline) | 0.1992ms | 0.1788ms |
| markdown-it-ts (stream+chunk) | 0.8151ms | 1.0157ms |
| micromark (parse only) | 6.5957ms | 3.6909ms |
| remark (parse only) | 4.0944ms | 4.2164ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7211ms | 0.6951ms |
| @ox-content/napi (parse only) | 0.1454ms | 0.1447ms |
| markdown-exit | 1.2153ms | 1.1658ms |
| markdown-it (baseline) | 0.7674ms | 0.7183ms |
| markdown-it-ts (stream+chunk) | 0.9428ms | 0.8396ms |
| micromark (parse only) | 16.71ms | 16.69ms |
| remark (parse only) | 19.71ms | 20.04ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7814ms | 1.7716ms |
| @ox-content/napi (parse only) | 0.3845ms | 0.3817ms |
| markdown-exit | 2.4186ms | 2.5386ms |
| markdown-it (baseline) | 1.7760ms | 1.8626ms |
| markdown-it-ts (stream+chunk) | 1.9921ms | 2.0179ms |
| micromark (parse only) | 40.32ms | 45.59ms |
| remark (parse only) | 58.96ms | 62.37ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5014ms | 3.5053ms |
| @ox-content/napi (parse only) | 0.9050ms | 0.7607ms |
| markdown-exit | 4.9078ms | 5.1186ms |
| markdown-it (baseline) | 3.5405ms | 3.7046ms |
| markdown-it-ts (stream+chunk) | 3.8696ms | 4.0202ms |
| micromark (parse only) | 85.22ms | 90.29ms |
| remark (parse only) | 142.03ms | 142.47ms |
