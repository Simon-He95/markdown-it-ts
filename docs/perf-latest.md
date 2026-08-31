# Performance Report (latest run)

## Environment

- Generated at: 2026-08-31T02:54:36.189Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: e5f22f34b58009de1ac7136595bf883a4fda400e

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
| 5,011 | 0.0559ms | 0.1911ms | 0.0429ms | stock-fast | 0.0217ms | 0.2679ms | 0.0386ms | stock-fast | no |
| 20,085 | 0.1296ms | 0.8262ms | 0.1724ms | stock-fast | 0.0714ms | 0.9288ms | 0.1507ms | stock-fast | no |
| 50,084 | 0.2969ms | 1.8628ms | 0.4290ms | stock-fast | 0.1757ms | 2.3116ms | 0.3661ms | stock-fast | no |
| 100,126 | 0.6366ms | 3.8311ms | 0.8393ms | stock-fast | 0.3525ms | 4.7740ms | 0.7492ms | stock-fast | no |
| 200,073 | 1.2560ms | 8.6922ms | 1.9375ms | stock-fast | 0.7728ms | 11.62ms | 1.5365ms | stock-fast | no |
| 500,121 | 4.1930ms | 22.23ms | 4.3793ms | stock-fast | 2.8916ms | 40.23ms | 4.0724ms | stock-fast | no |
| 1,000,068 | 13.65ms | 55.57ms | 11.31ms | stock-fast | 5.3953ms | 80.20ms | 9.0796ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3191ms | 0.3195ms | 0.0723ms | general | 0.2702ms | 0.3348ms | 0.0568ms | token-renderer | no |
| 20,125 | 0.7887ms | 0.9832ms | 0.2142ms | general | 0.9720ms | 1.3512ms | 0.2323ms | token-renderer | no |
| 50,025 | 1.9335ms | 2.4412ms | 0.5793ms | general | 2.2832ms | 3.2291ms | 0.4936ms | token-renderer | no |
| 100,450 | 4.2638ms | 5.5198ms | 1.1269ms | general | 5.7439ms | 8.0734ms | 1.0683ms | token-renderer | no |
| 200,109 | 11.82ms | 12.66ms | 3.2310ms | full-chunk | 11.48ms | 13.85ms | 1.9803ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0888ms | 0.1202ms | 0.0314ms | general | 0.1027ms | 0.1376ms | 0.0250ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0984ms | 0.1334ms | 0.0294ms | general | 0.1149ms | 0.1511ms | 0.0256ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0272ms | 0.0345ms | 0.0089ms | general | 0.0331ms | 0.0415ms | 0.0082ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2048ms | 0.1577ms | 0.1954ms | 0.1882ms | **0.0400ms** | 0.1860ms | 0.2583ms | 0.0431ms | 0.1840ms | 3.0594ms | 0.5853ms | 0.2966ms | 0.2834ms | 0.5599ms | 0.1069ms | 0.5966ms | 0.8373ms | **0.0627ms** | 0.2104ms | 10.40ms | 1.8058ms | 0.4470ms | 0.4103ms | 1.6799ms | 0.5682ms | 1.6903ms | 2.4508ms | **0.0957ms** | 0.2594ms | 28.68ms | 0.2090ms | 0.1954ms | 0.1925ms | 0.1973ms | 0.1790ms | 0.2052ms | 0.2770ms | **0.0424ms** | 0.1798ms | 3.1067ms |
| 20000 | 0.7568ms | 0.5964ms | 0.7399ms | 0.7455ms | **0.1175ms** | 0.7358ms | 1.0007ms | 0.1626ms | 0.7184ms | 16.35ms | 2.5627ms | 0.9935ms | 1.0720ms | 2.5784ms | 0.3998ms | 2.5045ms | 3.3782ms | **0.2001ms** | 0.7491ms | 48.35ms | 7.0800ms | 1.3998ms | 1.3368ms | 7.0234ms | 2.1798ms | 6.8894ms | 9.4330ms | **0.2369ms** | 0.8104ms | 135.47ms | 0.7758ms | 0.6010ms | 0.7843ms | 0.7373ms | 0.6697ms | 0.7286ms | 0.9801ms | **0.1613ms** | 0.7227ms | 15.27ms |
| 50000 | 1.9146ms | 1.5186ms | 1.8845ms | 1.8916ms | **0.2929ms** | 1.8372ms | 2.5201ms | 0.4321ms | 1.8178ms | 45.04ms | 6.6400ms | 2.2008ms | 2.2692ms | 6.5418ms | 1.1042ms | 6.3744ms | 8.7324ms | **0.4724ms** | 1.8827ms | 143.77ms | 17.96ms | 2.9166ms | 2.9381ms | 17.77ms | 2.9544ms | 17.12ms | 23.81ms | **0.5097ms** | 1.9035ms | 388.34ms | 1.9114ms | 1.4883ms | 1.9059ms | 1.9017ms | 1.7265ms | 1.8136ms | 2.5069ms | **0.4510ms** | 1.7909ms | 41.99ms |
| 100000 | 3.9666ms | 3.1569ms | 3.9611ms | 3.9514ms | **0.6514ms** | 3.7884ms | 5.3355ms | 0.8422ms | 3.5881ms | 91.53ms | 13.44ms | 4.4736ms | 5.1237ms | 13.34ms | 2.3352ms | 12.87ms | 17.73ms | **0.9144ms** | 3.6894ms | 310.25ms | 36.00ms | 5.8885ms | 9.0061ms | 35.78ms | 5.8744ms | 34.91ms | 47.35ms | **0.9975ms** | 3.7192ms | 837.41ms | 3.7957ms | 3.0723ms | 3.8331ms | 3.8184ms | 3.5449ms | 3.8440ms | 5.0441ms | **0.8368ms** | 3.6279ms | 89.48ms |
| 200000 | 8.6090ms | 7.6951ms | 8.2229ms | 8.2510ms | 1.7521ms | 8.7912ms | 11.82ms | **1.6949ms** | 7.2227ms | 207.88ms | 27.36ms | 12.50ms | 11.02ms | 27.08ms | 4.9616ms | 27.74ms | 36.96ms | **1.9689ms** | 7.4781ms | 671.48ms | 77.52ms | 17.76ms | 13.16ms | 72.96ms | 12.86ms | 71.95ms | 99.20ms | **1.8784ms** | 7.3659ms | 1908.12ms | 8.3505ms | 7.3617ms | 8.0441ms | 8.0162ms | 9.1663ms | 7.5430ms | 10.82ms | **1.6916ms** | 7.1056ms | 194.60ms |
| 500000 | 22.06ms | 21.22ms | 22.76ms | 24.47ms | 6.8542ms | 27.50ms | 32.74ms | **4.1827ms** | 17.80ms | - | 69.16ms | 40.91ms | 31.50ms | 68.47ms | 14.69ms | 81.05ms | 106.43ms | **4.7344ms** | 18.36ms | - | 191.30ms | 42.92ms | 38.68ms | 194.68ms | 59.92ms | 220.98ms | 293.21ms | **4.9728ms** | 21.17ms | - | 20.95ms | 22.61ms | 19.74ms | 21.30ms | 24.18ms | 23.40ms | 31.03ms | **5.2492ms** | 17.83ms | - |
| 1000000 | 50.32ms | 50.92ms | 56.26ms | 50.78ms | 14.33ms | 121.67ms | 65.37ms | **10.73ms** | 37.66ms | - | 154.98ms | 66.86ms | 77.55ms | 161.49ms | 37.66ms | 186.69ms | 225.48ms | **9.6672ms** | 38.72ms | - | 422.63ms | 103.04ms | 95.52ms | 406.73ms | 96.46ms | 496.82ms | 745.69ms | **9.7096ms** | 38.65ms | - | 43.00ms | 54.95ms | 49.54ms | 49.66ms | 78.26ms | 53.44ms | 66.68ms | **10.48ms** | 39.77ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0400ms (stream OFF, chunk OFF)
- 20000: S5 0.1175ms (stream OFF, chunk OFF)
- 50000: S5 0.2929ms (stream OFF, chunk OFF)
- 100000: S5 0.6514ms (stream OFF, chunk OFF)
- 200000: S5 1.7521ms (stream OFF, chunk OFF)
- 500000: S5 6.8542ms (stream OFF, chunk OFF)
- 1000000: S5 14.33ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1069ms (stream OFF, chunk OFF)
- 20000: S5 0.3998ms (stream OFF, chunk OFF)
- 50000: S5 1.1042ms (stream OFF, chunk OFF)
- 100000: S5 2.3352ms (stream OFF, chunk OFF)
- 200000: S5 4.9616ms (stream OFF, chunk OFF)
- 500000: S5 14.69ms (stream OFF, chunk OFF)
- 1000000: S5 37.66ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.4103ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.3368ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.9166ms (stream ON, cache ON, chunk OFF)
- 100000: S5 5.8744ms (stream OFF, chunk OFF)
- 200000: S5 12.86ms (stream OFF, chunk OFF)
- 500000: S3 38.68ms (stream ON, cache ON, chunk ON)
- 1000000: S3 95.52ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1790ms (stream OFF, chunk OFF)
- 20000: S2 0.6010ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4883ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0723ms (stream ON, cache ON, chunk OFF)
- 200000: S2 7.3617ms (stream ON, cache ON, chunk OFF)
- 500000: S3 19.74ms (stream ON, cache ON, chunk ON)
- 1000000: S1 43.00ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0215ms | 0.0190ms | 0.2331ms | 0.0389ms | 3.8381ms | 4.6822ms | 0.3147ms |
| 20000 | 0.0727ms | 0.0720ms | 0.9347ms | 0.1525ms | 19.12ms | 23.15ms | 1.2865ms |
| 50000 | 0.1750ms | 0.1768ms | 2.3149ms | 0.3735ms | 55.53ms | 72.20ms | 2.9785ms |
| 100000 | 0.3541ms | 0.3520ms | 4.8068ms | 0.7653ms | 114.41ms | 164.29ms | 6.1652ms |
| 200000 | 0.7094ms | 0.7459ms | 11.39ms | 1.5276ms | 219.05ms | 413.92ms | 13.26ms |
| 500000 | 2.7205ms | 2.5338ms | 34.48ms | 3.8443ms | - | - | 42.49ms |
| 1000000 | 5.3894ms | 5.2625ms | 97.52ms | 8.1222ms | - | - | 101.65ms |

Render vs markdown-it:
- 5,000 chars: 0.0215ms vs 0.2331ms → 10.83× faster
- 20,000 chars: 0.0727ms vs 0.9347ms → 12.86× faster
- 50,000 chars: 0.1750ms vs 2.3149ms → 13.23× faster
- 100,000 chars: 0.3541ms vs 4.8068ms → 13.58× faster
- 200,000 chars: 0.7094ms vs 11.39ms → 16.06× faster
- 500,000 chars: 2.7205ms vs 34.48ms → 12.67× faster
- 1,000,000 chars: 5.3894ms vs 97.52ms → 18.10× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0215ms vs 0.0389ms → 1.81× faster, 44.6% less time
- 20,000 chars: 0.0727ms vs 0.1525ms → 2.1× faster, 52.4% less time
- 50,000 chars: 0.1750ms vs 0.3735ms → 2.13× faster, 53.2% less time
- 100,000 chars: 0.3541ms vs 0.7653ms → 2.16× faster, 53.7% less time
- 200,000 chars: 0.7094ms vs 1.5276ms → 2.15× faster, 53.6% less time
- 500,000 chars: 2.7205ms vs 3.8443ms → 1.41× faster, 29.2% less time
- 1,000,000 chars: 5.3894ms vs 8.1222ms → 1.51× faster, 33.6% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0190ms vs 0.0389ms → 2.05× faster, 51.2% less time
- 20,000 chars: 0.0720ms vs 0.1525ms → 2.12× faster, 52.8% less time
- 50,000 chars: 0.1768ms vs 0.3735ms → 2.11× faster, 52.7% less time
- 100,000 chars: 0.3520ms vs 0.7653ms → 2.17× faster, 54% less time
- 200,000 chars: 0.7459ms vs 1.5276ms → 2.05× faster, 51.2% less time
- 500,000 chars: 2.5338ms vs 3.8443ms → 1.52× faster, 34.1% less time
- 1,000,000 chars: 5.2625ms vs 8.1222ms → 1.54× faster, 35.2% less time

Render vs micromark:
- 5,000 chars: 0.0215ms vs 3.8381ms → 178.29× faster
- 20,000 chars: 0.0727ms vs 19.12ms → 263.08× faster
- 50,000 chars: 0.1750ms vs 55.53ms → 317.38× faster
- 100,000 chars: 0.3541ms vs 114.41ms → 323.13× faster
- 200,000 chars: 0.7094ms vs 219.05ms → 308.77× faster

Render vs remark+rehype:
- 5,000 chars: 0.0215ms vs 4.6822ms → 217.50× faster
- 20,000 chars: 0.0727ms vs 23.15ms → 318.59× faster
- 50,000 chars: 0.1750ms vs 72.20ms → 412.62× faster
- 100,000 chars: 0.3541ms vs 164.29ms → 464.00× faster
- 200,000 chars: 0.7094ms vs 413.92ms → 583.46× faster

Render vs markdown-exit:
- 5,000 chars: 0.0215ms vs 0.3147ms → 14.62× faster
- 20,000 chars: 0.0727ms vs 1.2865ms → 17.70× faster
- 50,000 chars: 0.1750ms vs 2.9785ms → 17.02× faster
- 100,000 chars: 0.3541ms vs 6.1652ms → 17.41× faster
- 200,000 chars: 0.7094ms vs 13.26ms → 18.69× faster
- 500,000 chars: 2.7205ms vs 42.49ms → 15.62× faster
- 1,000,000 chars: 5.3894ms vs 101.65ms → 18.86× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0400ms | 0.1860ms | 4.65× faster, 78.5% less time | 0.1069ms | 0.5966ms | 5.58× faster, 82.1% less time | S5/S5 |
| 20000 | 0.1175ms | 0.7358ms | 6.26× faster, 84% less time | 0.3998ms | 2.5045ms | 6.26× faster, 84% less time | S5/S5 |
| 50000 | 0.2929ms | 1.8372ms | 6.27× faster, 84.1% less time | 1.1042ms | 6.3744ms | 5.77× faster, 82.7% less time | S5/S5 |
| 100000 | 0.6514ms | 3.7884ms | 5.82× faster, 82.8% less time | 2.3352ms | 12.87ms | 5.51× faster, 81.8% less time | S5/S5 |
| 200000 | 1.7521ms | 8.7912ms | 5.02× faster, 80.1% less time | 4.9616ms | 27.74ms | 5.59× faster, 82.1% less time | S5/S5 |
| 500000 | 6.8542ms | 27.50ms | 4.01× faster, 75.1% less time | 14.69ms | 81.05ms | 5.52× faster, 81.9% less time | S5/S5 |
| 1000000 | 14.33ms | 121.67ms | 8.49× faster, 88.2% less time | 37.66ms | 186.69ms | 4.96× faster, 79.8% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0400ms | 0.0431ms | 1.08× faster, 7.1% less time | 0.1069ms | 0.0627ms | 1.7× slower, 70.5% more time | S5/S5 |
| 20000 | 0.1175ms | 0.1626ms | 1.38× faster, 27.7% less time | 0.3998ms | 0.2001ms | 2× slower, 99.8% more time | S5/S5 |
| 50000 | 0.2929ms | 0.4321ms | 1.48× faster, 32.2% less time | 1.1042ms | 0.4724ms | 2.34× slower, 133.7% more time | S5/S5 |
| 100000 | 0.6514ms | 0.8422ms | 1.29× faster, 22.7% less time | 2.3352ms | 0.9144ms | 2.55× slower, 155.4% more time | S5/S5 |
| 200000 | 1.7521ms | 1.6949ms | 1.03× slower, 3.4% more time | 4.9616ms | 1.9689ms | 2.52× slower, 152% more time | S5/S5 |
| 500000 | 6.8542ms | 4.1827ms | 1.64× slower, 63.9% more time | 14.69ms | 4.7344ms | 3.1× slower, 210.3% more time | S5/S5 |
| 1000000 | 14.33ms | 10.73ms | 1.34× slower, 33.5% more time | 37.66ms | 9.6672ms | 3.9× slower, 289.5% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0400ms | 0.1840ms | 4.6× faster, 78.2% less time |
| 20000 | 0.1175ms | 0.7184ms | 6.12× faster, 83.6% less time |
| 50000 | 0.2929ms | 1.8178ms | 6.21× faster, 83.9% less time |
| 100000 | 0.6514ms | 3.5881ms | 5.51× faster, 81.8% less time |
| 200000 | 1.7521ms | 7.2227ms | 4.12× faster, 75.7% less time |
| 500000 | 6.8542ms | 17.80ms | 2.6× faster, 61.5% less time |
| 1000000 | 14.33ms | 37.66ms | 2.63× faster, 62% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0262ms | 0.0482ms | 1.84× faster, 45.7% less time | 0.2098ms |
| 20000 | 0.1007ms | 0.2012ms | 2× faster, 49.9% less time | 1.0687ms |
| 50000 | 0.2369ms | 0.4469ms | 1.89× faster, 47% less time | 1.9389ms |
| 100000 | 0.5264ms | 1.1671ms | 2.22× faster, 54.9% less time | 3.9229ms |
| 200000 | 0.8536ms | 1.8593ms | 2.18× faster, 54.1% less time | 8.0235ms |
| 500000 | 2.0614ms | 4.4605ms | 2.16× faster, 53.8% less time | 21.46ms |
| 1000000 | 4.5364ms | 10.69ms | 2.36× faster, 57.6% less time | 42.55ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1846ms | 0.1808ms |
| @ox-content/napi (parse only) | 0.0455ms | 0.0417ms |
| markdown-exit | 0.2921ms | 0.2899ms |
| markdown-it (baseline) | 0.2472ms | 0.2021ms |
| markdown-it-ts (stream+chunk) | 0.2643ms | 0.1860ms |
| micromark (parse only) | 3.5260ms | 3.5770ms |
| remark (parse only) | 4.2735ms | 4.1858ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7049ms | 0.7153ms |
| @ox-content/napi (parse only) | 0.1701ms | 0.1602ms |
| markdown-exit | 1.1142ms | 1.0805ms |
| markdown-it (baseline) | 0.7665ms | 0.7515ms |
| markdown-it-ts (stream+chunk) | 0.7648ms | 0.7403ms |
| micromark (parse only) | 15.87ms | 16.70ms |
| remark (parse only) | 26.85ms | 21.38ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8863ms | 1.8743ms |
| @ox-content/napi (parse only) | 0.4646ms | 0.4423ms |
| markdown-exit | 2.5844ms | 2.6941ms |
| markdown-it (baseline) | 1.8068ms | 1.9568ms |
| markdown-it-ts (stream+chunk) | 1.9340ms | 2.0199ms |
| micromark (parse only) | 49.36ms | 48.45ms |
| remark (parse only) | 63.42ms | 66.09ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5682ms | 3.6240ms |
| @ox-content/napi (parse only) | 0.8448ms | 0.8480ms |
| markdown-exit | 5.0867ms | 5.3341ms |
| markdown-it (baseline) | 3.6402ms | 4.0235ms |
| markdown-it-ts (stream+chunk) | 3.9231ms | 4.0021ms |
| micromark (parse only) | 98.14ms | 94.89ms |
| remark (parse only) | 147.33ms | 159.22ms |
