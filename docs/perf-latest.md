# Performance Report (latest run)

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0071ms | 0.0001ms | **0.0001ms** | 0.1841ms | 0.1165ms | 0.3991ms | 0.4216ms | 1.4840ms | 0.5648ms | **0.2744ms** | 0.4718ms | 0.3972ms | 0.7164ms | 0.6940ms | 2.4726ms | 0.8281ms | **0.7276ms** | 1.3648ms | 1.2673ms | 1.7432ms | 2.0746ms | 0.3558ms | 0.2034ms | 0.1863ms | 0.1519ms | **0.1152ms** | 0.3384ms | 0.3576ms |
| 20000 | 0.0002ms | 0.0001ms | **0.0001ms** | 0.6044ms | 0.4622ms | 0.5713ms | 0.6983ms | 2.0829ms | 1.0036ms | **0.8840ms** | 2.0127ms | 1.5784ms | 1.5012ms | 2.0164ms | 5.6535ms | **3.0471ms** | 3.3839ms | 5.4540ms | 4.3804ms | 3.9483ms | 5.5255ms | 0.5719ms | 0.4925ms | 0.5826ms | 0.5743ms | **0.4399ms** | 0.5437ms | 0.5939ms |
| 50000 | 0.0003ms | 0.0002ms | **0.0001ms** | 1.6392ms | 1.2964ms | 1.1322ms | 1.5266ms | 5.2540ms | 2.0738ms | **1.9366ms** | 5.0958ms | 4.2394ms | 3.6506ms | 5.2204ms | 13.91ms | 3.9204ms | **3.5886ms** | 13.65ms | 11.18ms | 10.14ms | 14.15ms | 1.8102ms | 1.4628ms | 1.6701ms | 1.4710ms | **1.0673ms** | 1.2622ms | 1.7563ms |
| 100000 | 0.0002ms | **0.0002ms** | 0.0003ms | 3.4722ms | 2.9075ms | 2.8605ms | 3.6253ms | 10.92ms | 4.3177ms | **4.0628ms** | 10.26ms | 9.9126ms | 7.8915ms | 9.9550ms | 29.19ms | 6.3514ms | **6.0363ms** | 27.95ms | 25.68ms | 22.58ms | 28.37ms | 3.8335ms | 3.9871ms | 3.8366ms | 3.2592ms | **3.1234ms** | 4.1530ms | 3.1676ms |
| 200000 | 6.9365ms | 7.0936ms | 6.7418ms | 8.0635ms | 6.7460ms | **5.7412ms** | 7.1496ms | 26.51ms | 15.04ms | **14.61ms** | 23.95ms | 22.62ms | 20.57ms | 24.72ms | 67.28ms | 29.97ms | **23.59ms** | 72.65ms | 67.72ms | 45.49ms | 60.40ms | 7.1558ms | 7.0077ms | 6.6425ms | 8.2194ms | 6.5194ms | **4.5521ms** | 6.3438ms |

Best (one-shot) per size:
- 5000: S3 0.0001ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.0001ms (stream ON, cache ON, chunk ON)
- 50000: S3 0.0001ms (stream ON, cache ON, chunk ON)
- 100000: S2 0.0002ms (stream ON, cache ON, chunk OFF)
- 200000: M1 5.7412ms (markdown-it (baseline))

Best (append workload) per size:
- 5000: S3 0.2744ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.8840ms (stream ON, cache ON, chunk ON)
- 50000: S3 1.9366ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.0628ms (stream ON, cache ON, chunk ON)
- 200000: S3 14.61ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.7276ms (stream ON, cache ON, chunk ON)
- 20000: S2 3.0471ms (stream ON, cache ON, chunk OFF)
- 50000: S3 3.5886ms (stream ON, cache ON, chunk ON)
- 100000: S3 6.0363ms (stream ON, cache ON, chunk ON)
- 200000: S3 23.59ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1152ms (stream OFF, chunk OFF)
- 20000: S5 0.4399ms (stream OFF, chunk OFF)
- 50000: S5 1.0673ms (stream OFF, chunk OFF)
- 100000: S5 3.1234ms (stream OFF, chunk OFF)
- 200000: M1 4.5521ms (markdown-it (baseline))

Recommendations (by majority across sizes):
- One-shot: S3(3), S2(1), M1(1)
- Append-heavy: S3(5)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).

## Render throughput (markdown → HTML)

This measures end-to-end markdown → HTML rendering throughput across markdown-it-ts, upstream markdown-it, and remark+rehype (parse + stringify). Lower is better.

| Size (chars) | markdown-it-ts.render | markdown-it.render | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|
| 5000 | 0.2091ms | 0.1694ms | 3.4914ms | 0.2390ms |
| 20000 | 0.6078ms | 0.5493ms | 18.46ms | 0.7321ms |
| 50000 | 1.5064ms | 1.3452ms | 44.63ms | 1.7705ms |
| 100000 | 4.5276ms | 3.4122ms | 103.02ms | 4.2106ms |
| 200000 | 9.9405ms | 7.7041ms | 238.86ms | 9.3248ms |

Render vs markdown-it:
- 5,000 chars: 0.2091ms vs 0.1694ms → 0.81× faster
- 20,000 chars: 0.6078ms vs 0.5493ms → 0.90× faster
- 50,000 chars: 1.5064ms vs 1.3452ms → 0.89× faster
- 100,000 chars: 4.5276ms vs 3.4122ms → 0.75× faster
- 200,000 chars: 9.9405ms vs 7.7041ms → 0.78× faster

Render vs remark+rehype:
- 5,000 chars: 0.2091ms vs 3.4914ms → 16.70× faster
- 20,000 chars: 0.6078ms vs 18.46ms → 30.37× faster
- 50,000 chars: 1.5064ms vs 44.63ms → 29.63× faster
- 100,000 chars: 4.5276ms vs 103.02ms → 22.75× faster
- 200,000 chars: 9.9405ms vs 238.86ms → 24.03× faster

Render vs markdown-exit:
- 5,000 chars: 0.2091ms vs 0.2390ms → 1.14× faster
- 20,000 chars: 0.6078ms vs 0.7321ms → 1.20× faster
- 50,000 chars: 1.5064ms vs 1.7705ms → 1.18× faster
- 100,000 chars: 4.5276ms vs 4.2106ms → 0.93× faster
- 200,000 chars: 9.9405ms vs 9.3248ms → 0.94× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |
|---:|---:|---:|---:|---:|---:|---:|:--|
| 5000 | 0.0001ms | 0.3991ms | 0.00x | 0.2744ms | 0.7164ms | 0.38x | S3/S3 |
| 20000 | 0.0001ms | 0.5713ms | 0.00x | 0.8840ms | 1.5012ms | 0.59x | S3/S3 |
| 50000 | 0.0001ms | 1.1322ms | 0.00x | 1.9366ms | 3.6506ms | 0.53x | S3/S3 |
| 100000 | 0.0002ms | 2.8605ms | 0.00x | 4.0628ms | 7.8915ms | 0.51x | S2/S3 |
| 200000 | 6.7418ms | 5.7412ms | 1.17x | 14.61ms | 20.57ms | 0.71x | S3/S3 |

- One ratio < 1.00 means markdown-it-ts best one-shot is faster than baseline.
- Append ratio < 1.00 highlights stream cache optimizations (fast-path appends).


### Diagnostic: Chunk Info (if chunked)

| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 4 | 2 | 4 | 4 | 2 | 4 |
| 20000 | 8 | 6 | 8 | 8 | 6 | 8 |
| 50000 | 14 | 14 | 8 | 14 | 14 | 8 |
| 100000 | 27 | 27 | 8 | 27 | 27 | 8 |
| 200000 | 27 | 3 | 8 | 27 | 3 | 8 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.2598ms | 0.1415ms |
| markdown-it (baseline) | 0.2225ms | 0.1046ms |
| markdown-it-ts (stream+chunk) | 0.1669ms | 0.2275ms |
| remark (parse only) | 6.4865ms | 3.4893ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.5912ms | 0.6555ms |
| markdown-it (baseline) | 0.4525ms | 0.4440ms |
| markdown-it-ts (stream+chunk) | 0.4894ms | 0.4720ms |
| remark (parse only) | 12.74ms | 12.61ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.4836ms | 1.5606ms |
| markdown-it (baseline) | 1.0501ms | 1.1586ms |
| markdown-it-ts (stream+chunk) | 1.1541ms | 1.3551ms |
| remark (parse only) | 35.78ms | 38.86ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 3.7352ms | 3.5940ms |
| markdown-it (baseline) | 2.9489ms | 2.7068ms |
| markdown-it-ts (stream+chunk) | 2.9834ms | 3.3957ms |
| remark (parse only) | 125.07ms | 94.94ms |
