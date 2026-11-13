# Performance Report (latest run)

## Environment

- Generated at: 2026-11-13T10:05:05.628Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 180be1efdb90aa61e2c5d783bc8de3274622861f

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
| 5,011 | 0.0539ms | 0.1816ms | 0.0375ms | stock-fast | 0.0204ms | 0.2309ms | 0.0339ms | stock-fast | no |
| 20,085 | 0.1217ms | 0.7359ms | 0.1462ms | stock-fast | 0.0717ms | 0.9076ms | 0.1352ms | stock-fast | no |
| 50,084 | 0.2990ms | 1.8572ms | 0.3885ms | stock-fast | 0.1792ms | 2.3009ms | 0.3233ms | stock-fast | no |
| 100,126 | 0.6352ms | 3.9285ms | 0.7699ms | stock-fast | 0.3578ms | 4.8801ms | 0.6773ms | stock-fast | no |
| 200,073 | 1.1025ms | 8.1023ms | 1.5424ms | stock-fast | 0.7087ms | 10.57ms | 1.3580ms | stock-fast | no |
| 500,121 | 3.7859ms | 22.18ms | 3.7246ms | stock-fast | 2.3427ms | 30.35ms | 3.2840ms | stock-fast | no |
| 1,000,068 | 14.15ms | 54.57ms | 7.3547ms | stock-fast | 4.8020ms | 72.21ms | 6.6393ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2089ms | 0.2709ms | 0.0530ms | general | 0.2247ms | 0.3364ms | 0.0487ms | token-renderer | no |
| 20,125 | 0.6765ms | 0.9780ms | 0.1984ms | general | 0.8137ms | 1.2495ms | 0.1832ms | token-renderer | no |
| 50,025 | 1.6654ms | 2.4577ms | 0.5229ms | general | 2.0258ms | 3.1241ms | 0.4483ms | token-renderer | no |
| 100,450 | 3.4490ms | 5.2477ms | 1.0090ms | general | 4.2079ms | 6.4686ms | 0.9075ms | token-renderer | no |
| 200,109 | 9.1356ms | 11.31ms | 2.0214ms | full-chunk | 10.41ms | 14.00ms | 1.8261ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0760ms | 0.1235ms | 0.0266ms | general | 0.0906ms | 0.1412ms | 0.0202ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0766ms | 0.1375ms | 0.0269ms | general | 0.0963ms | 0.1522ms | 0.0220ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0229ms | 0.0344ms | 0.0078ms | general | 0.0290ms | 0.0408ms | 0.0069ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1994ms | 0.1577ms | 0.1996ms | 0.1906ms | 0.0387ms | 0.1839ms | 0.2526ms | **0.0380ms** | 0.1752ms | 2.9889ms | 0.6156ms | 0.3158ms | 0.2937ms | 0.5541ms | 0.1046ms | 0.6125ms | 0.8179ms | **0.0576ms** | 0.1993ms | 9.7731ms | 1.7881ms | 0.4225ms | 0.3890ms | 1.6440ms | 0.5621ms | 1.7305ms | 2.3444ms | **0.0884ms** | 0.2459ms | 28.02ms | 0.2445ms | 0.1640ms | 0.1952ms | 0.1956ms | 0.1724ms | 0.1933ms | 0.2598ms | **0.0376ms** | 0.1774ms | 2.9509ms |
| 20000 | 0.7463ms | 0.5938ms | 0.7312ms | 0.7350ms | **0.1213ms** | 0.7367ms | 0.9945ms | 0.1456ms | 0.6886ms | 16.35ms | 2.5886ms | 0.9315ms | 0.9306ms | 2.5584ms | 0.4160ms | 2.5768ms | 3.4387ms | **0.1825ms** | 0.7533ms | 47.27ms | 7.0526ms | 1.1362ms | 1.0717ms | 6.9575ms | 2.2051ms | 7.0157ms | 9.3039ms | **0.2212ms** | 0.8001ms | 131.96ms | 0.7283ms | 0.5831ms | 0.7705ms | 0.7375ms | 0.6825ms | 0.7194ms | 0.9689ms | **0.1452ms** | 0.6910ms | 14.68ms |
| 50000 | 1.9070ms | 1.5364ms | 1.8823ms | 1.8892ms | **0.2947ms** | 1.8419ms | 2.5105ms | 0.3914ms | 1.8410ms | 50.53ms | 6.5270ms | 2.3270ms | 2.2633ms | 6.6318ms | 1.0930ms | 6.3856ms | 8.6462ms | **0.4245ms** | 1.7975ms | 167.07ms | 17.78ms | 2.5914ms | 2.6907ms | 17.67ms | 2.9620ms | 17.22ms | 23.97ms | **0.4741ms** | 1.8346ms | 429.93ms | 1.9417ms | 1.5527ms | 1.8966ms | 1.8453ms | 1.6403ms | 1.9393ms | 2.5020ms | **0.3982ms** | 1.7701ms | 48.74ms |
| 100000 | 3.8592ms | 3.1591ms | 3.8906ms | 3.9679ms | **0.6650ms** | 3.8768ms | 5.2389ms | 0.7751ms | 3.5072ms | 92.28ms | 13.22ms | 5.2324ms | 4.6343ms | 13.37ms | 2.0304ms | 12.90ms | 17.24ms | **0.8327ms** | 3.6057ms | 313.05ms | 36.08ms | 5.6471ms | 5.1515ms | 35.85ms | 6.0184ms | 34.75ms | 47.01ms | **0.8850ms** | 3.6311ms | 843.06ms | 3.8692ms | 2.9313ms | 3.6839ms | 3.8118ms | 3.7767ms | 3.9199ms | 5.3088ms | **0.7483ms** | 3.4929ms | 90.63ms |
| 200000 | 8.2431ms | 7.6655ms | 8.9334ms | 8.1732ms | 1.7942ms | 8.8319ms | 11.21ms | **1.5366ms** | 6.9682ms | 185.30ms | 27.03ms | 11.63ms | 10.47ms | 27.04ms | 4.8453ms | 26.63ms | 36.17ms | **1.8984ms** | 7.1989ms | 643.42ms | 72.34ms | 11.65ms | 12.11ms | 73.34ms | 12.76ms | 71.97ms | 95.96ms | **1.7079ms** | 7.2098ms | 1728.76ms | 8.0085ms | 7.7681ms | 8.1170ms | 7.7493ms | 8.9851ms | 7.7649ms | 10.47ms | **1.4669ms** | 6.9383ms | 182.63ms |
| 500000 | 22.45ms | 19.55ms | 22.82ms | 22.05ms | 5.1679ms | 26.34ms | 30.80ms | **3.7403ms** | 17.03ms | - | 66.39ms | 35.41ms | 32.49ms | 71.22ms | 15.90ms | 78.54ms | 97.52ms | **4.2300ms** | 17.51ms | - | 188.54ms | 31.26ms | 30.84ms | 190.47ms | 57.84ms | 224.87ms | 260.08ms | **4.5057ms** | 17.76ms | - | 21.29ms | 22.22ms | 20.38ms | 21.64ms | 26.54ms | 25.08ms | 36.37ms | **3.7489ms** | 16.99ms | - |
| 1000000 | 49.78ms | 48.81ms | 60.39ms | 50.00ms | 13.27ms | 51.42ms | 62.99ms | **7.4694ms** | 34.29ms | - | 153.63ms | 67.06ms | 67.51ms | 167.73ms | 37.17ms | 172.90ms | 206.10ms | **12.39ms** | 37.74ms | - | 409.54ms | 61.58ms | 97.37ms | 401.78ms | 79.80ms | 474.16ms | 557.54ms | **9.2018ms** | 37.33ms | - | 50.65ms | 53.86ms | 49.61ms | 59.48ms | 63.63ms | 67.33ms | 65.39ms | **7.5466ms** | 35.65ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0387ms (stream OFF, chunk OFF)
- 20000: S5 0.1213ms (stream OFF, chunk OFF)
- 50000: S5 0.2947ms (stream OFF, chunk OFF)
- 100000: S5 0.6650ms (stream OFF, chunk OFF)
- 200000: S5 1.7942ms (stream OFF, chunk OFF)
- 500000: S5 5.1679ms (stream OFF, chunk OFF)
- 1000000: S5 13.27ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1046ms (stream OFF, chunk OFF)
- 20000: S5 0.4160ms (stream OFF, chunk OFF)
- 50000: S5 1.0930ms (stream OFF, chunk OFF)
- 100000: S5 2.0304ms (stream OFF, chunk OFF)
- 200000: S5 4.8453ms (stream OFF, chunk OFF)
- 500000: S5 15.90ms (stream OFF, chunk OFF)
- 1000000: S5 37.17ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3890ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0717ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.5914ms (stream ON, cache ON, chunk OFF)
- 100000: S3 5.1515ms (stream ON, cache ON, chunk ON)
- 200000: S2 11.65ms (stream ON, cache ON, chunk OFF)
- 500000: S3 30.84ms (stream ON, cache ON, chunk ON)
- 1000000: S2 61.58ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1640ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5831ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.5527ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9313ms (stream ON, cache ON, chunk OFF)
- 200000: S4 7.7493ms (stream OFF, chunk ON)
- 500000: S3 20.38ms (stream ON, cache ON, chunk ON)
- 1000000: S3 49.61ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0222ms | 0.0187ms | 0.2305ms | 0.0340ms | 3.7068ms | 4.5648ms | 0.2988ms |
| 20000 | 0.0713ms | 0.0721ms | 0.9099ms | 0.1338ms | 17.65ms | 22.79ms | 1.1846ms |
| 50000 | 0.1792ms | 0.1768ms | 2.2930ms | 0.3301ms | 53.68ms | 71.58ms | 2.9768ms |
| 100000 | 0.3469ms | 0.3479ms | 4.9167ms | 0.6867ms | 108.46ms | 161.72ms | 6.0200ms |
| 200000 | 0.6867ms | 0.6862ms | 10.55ms | 1.3616ms | 218.74ms | 414.72ms | 13.24ms |
| 500000 | 2.4163ms | 2.3529ms | 32.40ms | 3.3013ms | - | - | 41.00ms |
| 1000000 | 4.8267ms | 4.8481ms | 68.60ms | 6.8719ms | - | - | 90.85ms |

Render vs markdown-it:
- 5,000 chars: 0.0222ms vs 0.2305ms → 10.37× faster
- 20,000 chars: 0.0713ms vs 0.9099ms → 12.77× faster
- 50,000 chars: 0.1792ms vs 2.2930ms → 12.79× faster
- 100,000 chars: 0.3469ms vs 4.9167ms → 14.17× faster
- 200,000 chars: 0.6867ms vs 10.55ms → 15.36× faster
- 500,000 chars: 2.4163ms vs 32.40ms → 13.41× faster
- 1,000,000 chars: 4.8267ms vs 68.60ms → 14.21× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0222ms vs 0.0340ms → 1.53× faster, 34.7% less time
- 20,000 chars: 0.0713ms vs 0.1338ms → 1.88× faster, 46.7% less time
- 50,000 chars: 0.1792ms vs 0.3301ms → 1.84× faster, 45.7% less time
- 100,000 chars: 0.3469ms vs 0.6867ms → 1.98× faster, 49.5% less time
- 200,000 chars: 0.6867ms vs 1.3616ms → 1.98× faster, 49.6% less time
- 500,000 chars: 2.4163ms vs 3.3013ms → 1.37× faster, 26.8% less time
- 1,000,000 chars: 4.8267ms vs 6.8719ms → 1.42× faster, 29.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0187ms vs 0.0340ms → 1.82× faster, 45% less time
- 20,000 chars: 0.0721ms vs 0.1338ms → 1.86× faster, 46.1% less time
- 50,000 chars: 0.1768ms vs 0.3301ms → 1.87× faster, 46.5% less time
- 100,000 chars: 0.3479ms vs 0.6867ms → 1.97× faster, 49.3% less time
- 200,000 chars: 0.6862ms vs 1.3616ms → 1.98× faster, 49.6% less time
- 500,000 chars: 2.3529ms vs 3.3013ms → 1.4× faster, 28.7% less time
- 1,000,000 chars: 4.8481ms vs 6.8719ms → 1.42× faster, 29.4% less time

Render vs micromark:
- 5,000 chars: 0.0222ms vs 3.7068ms → 166.72× faster
- 20,000 chars: 0.0713ms vs 17.65ms → 247.63× faster
- 50,000 chars: 0.1792ms vs 53.68ms → 299.50× faster
- 100,000 chars: 0.3469ms vs 108.46ms → 312.65× faster
- 200,000 chars: 0.6867ms vs 218.74ms → 318.52× faster

Render vs remark+rehype:
- 5,000 chars: 0.0222ms vs 4.5648ms → 205.31× faster
- 20,000 chars: 0.0713ms vs 22.79ms → 319.81× faster
- 50,000 chars: 0.1792ms vs 71.58ms → 399.38× faster
- 100,000 chars: 0.3469ms vs 161.72ms → 466.16× faster
- 200,000 chars: 0.6867ms vs 414.72ms → 603.90× faster

Render vs markdown-exit:
- 5,000 chars: 0.0222ms vs 0.2988ms → 13.44× faster
- 20,000 chars: 0.0713ms vs 1.1846ms → 16.62× faster
- 50,000 chars: 0.1792ms vs 2.9768ms → 16.61× faster
- 100,000 chars: 0.3469ms vs 6.0200ms → 17.35× faster
- 200,000 chars: 0.6867ms vs 13.24ms → 19.28× faster
- 500,000 chars: 2.4163ms vs 41.00ms → 16.97× faster
- 1,000,000 chars: 4.8267ms vs 90.85ms → 18.82× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0387ms | 0.1839ms | 4.75× faster, 78.9% less time | 0.1046ms | 0.6125ms | 5.86× faster, 82.9% less time | S5/S5 |
| 20000 | 0.1213ms | 0.7367ms | 6.07× faster, 83.5% less time | 0.4160ms | 2.5768ms | 6.19× faster, 83.9% less time | S5/S5 |
| 50000 | 0.2947ms | 1.8419ms | 6.25× faster, 84% less time | 1.0930ms | 6.3856ms | 5.84× faster, 82.9% less time | S5/S5 |
| 100000 | 0.6650ms | 3.8768ms | 5.83× faster, 82.8% less time | 2.0304ms | 12.90ms | 6.36× faster, 84.3% less time | S5/S5 |
| 200000 | 1.7942ms | 8.8319ms | 4.92× faster, 79.7% less time | 4.8453ms | 26.63ms | 5.5× faster, 81.8% less time | S5/S5 |
| 500000 | 5.1679ms | 26.34ms | 5.1× faster, 80.4% less time | 15.90ms | 78.54ms | 4.94× faster, 79.8% less time | S5/S5 |
| 1000000 | 13.27ms | 51.42ms | 3.88× faster, 74.2% less time | 37.17ms | 172.90ms | 4.65× faster, 78.5% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0387ms | 0.0380ms | 1.02× slower, 1.8% more time | 0.1046ms | 0.0576ms | 1.81× slower, 81.5% more time | S5/S5 |
| 20000 | 0.1213ms | 0.1456ms | 1.2× faster, 16.7% less time | 0.4160ms | 0.1825ms | 2.28× slower, 128% more time | S5/S5 |
| 50000 | 0.2947ms | 0.3914ms | 1.33× faster, 24.7% less time | 1.0930ms | 0.4245ms | 2.57× slower, 157.5% more time | S5/S5 |
| 100000 | 0.6650ms | 0.7751ms | 1.17× faster, 14.2% less time | 2.0304ms | 0.8327ms | 2.44× slower, 143.8% more time | S5/S5 |
| 200000 | 1.7942ms | 1.5366ms | 1.17× slower, 16.8% more time | 4.8453ms | 1.8984ms | 2.55× slower, 155.2% more time | S5/S5 |
| 500000 | 5.1679ms | 3.7403ms | 1.38× slower, 38.2% more time | 15.90ms | 4.2300ms | 3.76× slower, 275.9% more time | S5/S5 |
| 1000000 | 13.27ms | 7.4694ms | 1.78× slower, 77.6% more time | 37.17ms | 12.39ms | 3× slower, 199.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0387ms | 0.1752ms | 4.52× faster, 77.9% less time |
| 20000 | 0.1213ms | 0.6886ms | 5.68× faster, 82.4% less time |
| 50000 | 0.2947ms | 1.8410ms | 6.25× faster, 84% less time |
| 100000 | 0.6650ms | 3.5072ms | 5.27× faster, 81% less time |
| 200000 | 1.7942ms | 6.9682ms | 3.88× faster, 74.3% less time |
| 500000 | 5.1679ms | 17.03ms | 3.29× faster, 69.6% less time |
| 1000000 | 13.27ms | 34.29ms | 2.58× faster, 61.3% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0249ms | 0.0383ms | 1.54× faster, 35% less time | 0.1815ms |
| 20000 | 0.0895ms | 0.1460ms | 1.63× faster, 38.7% less time | 0.7171ms |
| 50000 | 0.2196ms | 0.3864ms | 1.76× faster, 43.2% less time | 1.7836ms |
| 100000 | 0.4282ms | 0.7641ms | 1.78× faster, 44% less time | 3.5461ms |
| 200000 | 0.8524ms | 1.4984ms | 1.76× faster, 43.1% less time | 7.0060ms |
| 500000 | 2.0935ms | 3.7623ms | 1.8× faster, 44.4% less time | 17.75ms |
| 1000000 | 4.3923ms | 7.5243ms | 1.71× faster, 41.6% less time | 34.65ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1751ms | 0.1747ms |
| @ox-content/napi (parse only) | 0.0392ms | 0.0372ms |
| markdown-exit | 0.5654ms | 0.4997ms |
| markdown-it (baseline) | 0.2204ms | 0.1815ms |
| markdown-it-ts (stream+chunk) | 0.2087ms | 0.1824ms |
| micromark (parse only) | 3.3597ms | 3.2959ms |
| remark (parse only) | 4.0818ms | 4.0254ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7555ms | 0.7007ms |
| @ox-content/napi (parse only) | 0.1466ms | 0.1483ms |
| markdown-exit | 1.0629ms | 1.0077ms |
| markdown-it (baseline) | 0.7866ms | 0.7423ms |
| markdown-it-ts (stream+chunk) | 0.7897ms | 0.7366ms |
| micromark (parse only) | 14.00ms | 15.46ms |
| remark (parse only) | 19.02ms | 19.64ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7592ms | 1.7619ms |
| @ox-content/napi (parse only) | 0.3823ms | 0.3835ms |
| markdown-exit | 2.4355ms | 2.7698ms |
| markdown-it (baseline) | 1.8230ms | 2.0646ms |
| markdown-it-ts (stream+chunk) | 1.8975ms | 1.9843ms |
| micromark (parse only) | 40.55ms | 44.59ms |
| remark (parse only) | 61.62ms | 62.58ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5124ms | 3.5333ms |
| @ox-content/napi (parse only) | 0.7656ms | 0.7523ms |
| markdown-exit | 4.8690ms | 5.0345ms |
| markdown-it (baseline) | 3.5873ms | 3.7262ms |
| markdown-it-ts (stream+chunk) | 3.6861ms | 3.8824ms |
| micromark (parse only) | 94.52ms | 89.55ms |
| remark (parse only) | 135.39ms | 141.58ms |
