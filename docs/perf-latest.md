# Performance Report (latest run)

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2182ms | 0.1682ms | 0.2149ms | 0.2085ms | 0.1607ms | **0.1534ms** | 0.2125ms | 3.4504ms | 0.6418ms | 0.2699ms | **0.2230ms** | 0.6365ms | 0.5516ms | 0.5074ms | 0.6853ms | 11.16ms | 1.8148ms | 0.4641ms | **0.3840ms** | 1.7092ms | 1.5665ms | 1.4815ms | 3.5591ms | 32.70ms | 0.2420ms | 0.1795ms | 0.2099ms | 0.2054ms | **0.1675ms** | 0.2073ms | 0.2411ms | 3.6939ms |
| 20000 | 0.8650ms | 0.7032ms | 0.8547ms | 0.8514ms | 0.6569ms | **0.6418ms** | 0.8420ms | 17.26ms | 2.8792ms | **1.0716ms** | 1.0971ms | 2.8586ms | 2.3233ms | 2.2502ms | 2.7779ms | 56.74ms | 7.9596ms | 1.4156ms | **1.3084ms** | 7.8013ms | 7.4517ms | 6.0777ms | 7.9085ms | 157.86ms | 0.8665ms | 0.7333ms | 0.8653ms | 0.8365ms | 0.6608ms | **0.6542ms** | 0.8540ms | 17.15ms |
| 50000 | 2.3127ms | 1.9702ms | 2.4362ms | 2.4422ms | **1.7537ms** | 1.8359ms | 2.1857ms | 72.84ms | 7.6726ms | **2.4638ms** | 2.5153ms | 7.8408ms | 6.0224ms | 5.8991ms | 6.9941ms | 226.94ms | 20.96ms | **3.2799ms** | 3.2860ms | 21.28ms | 16.99ms | 15.33ms | 19.29ms | 436.60ms | 2.2976ms | 1.9773ms | 2.3009ms | 2.1746ms | 1.8433ms | **1.6180ms** | 2.1153ms | 46.27ms |
| 100000 | 5.6005ms | 4.6206ms | 5.5851ms | 5.6727ms | 4.5378ms | **4.4884ms** | 5.3545ms | 94.82ms | 15.04ms | **4.6964ms** | 4.8650ms | 15.64ms | 13.70ms | 10.83ms | 14.06ms | 325.22ms | 40.72ms | 6.4098ms | **6.3402ms** | 41.78ms | 35.85ms | 29.74ms | 39.92ms | 903.42ms | 4.5067ms | 4.2502ms | 4.3276ms | 4.8545ms | 5.1308ms | **3.2689ms** | 4.4345ms | 93.73ms |
| 200000 | 10.10ms | 10.04ms | 9.7259ms | 12.43ms | 10.25ms | **9.4087ms** | 11.54ms | 189.84ms | 31.72ms | **11.27ms** | 12.88ms | 33.38ms | 32.27ms | 24.40ms | 29.89ms | 677.15ms | 92.49ms | **16.75ms** | 19.51ms | 89.44ms | 86.83ms | 70.64ms | 87.28ms | 1842.92ms | 8.8801ms | 10.33ms | 9.2817ms | 10.73ms | 10.94ms | **6.6314ms** | 8.3139ms | 191.38ms |

Best (one-shot) per size:
- 5000: M1 0.1534ms (markdown-it (baseline))
- 20000: M1 0.6418ms (markdown-it (baseline))
- 50000: S5 1.7537ms (stream OFF, chunk OFF)
- 100000: M1 4.4884ms (markdown-it (baseline))
- 200000: M1 9.4087ms (markdown-it (baseline))

Best (append workload) per size:
- 5000: S3 0.2230ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.0716ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.4638ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.6964ms (stream ON, cache ON, chunk OFF)
- 200000: S2 11.27ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.3840ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.3084ms (stream ON, cache ON, chunk ON)
- 50000: S2 3.2799ms (stream ON, cache ON, chunk OFF)
- 100000: S3 6.3402ms (stream ON, cache ON, chunk ON)
- 200000: S2 16.75ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1675ms (stream OFF, chunk OFF)
- 20000: M1 0.6542ms (markdown-it (baseline))
- 50000: M1 1.6180ms (markdown-it (baseline))
- 100000: M1 3.2689ms (markdown-it (baseline))
- 200000: M1 6.6314ms (markdown-it (baseline))

Recommendations (by majority across sizes):
- One-shot: M1(4), S5(1)
- Append-heavy: S2(4), S3(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).

## Render throughput (markdown → HTML)

This measures end-to-end markdown → HTML rendering throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2102ms | 0.1885ms | 3.2989ms | 3.9446ms | 0.2413ms |
| 20000 | 0.8385ms | 0.7632ms | 19.90ms | 23.91ms | 0.9731ms |
| 50000 | 2.2585ms | 1.9327ms | 52.65ms | 66.25ms | 2.5148ms |
| 100000 | 5.5615ms | 5.0181ms | 108.30ms | 148.35ms | 6.1843ms |
| 200000 | 13.36ms | 12.28ms | 210.12ms | 348.34ms | 14.73ms |

Render vs markdown-it:
- 5,000 chars: 0.2102ms vs 0.1885ms → 0.90× faster
- 20,000 chars: 0.8385ms vs 0.7632ms → 0.91× faster
- 50,000 chars: 2.2585ms vs 1.9327ms → 0.86× faster
- 100,000 chars: 5.5615ms vs 5.0181ms → 0.90× faster
- 200,000 chars: 13.36ms vs 12.28ms → 0.92× faster

Render vs micromark:
- 5,000 chars: 0.2102ms vs 3.2989ms → 15.69× faster
- 20,000 chars: 0.8385ms vs 19.90ms → 23.73× faster
- 50,000 chars: 2.2585ms vs 52.65ms → 23.31× faster
- 100,000 chars: 5.5615ms vs 108.30ms → 19.47× faster
- 200,000 chars: 13.36ms vs 210.12ms → 15.72× faster

Render vs remark+rehype:
- 5,000 chars: 0.2102ms vs 3.9446ms → 18.77× faster
- 20,000 chars: 0.8385ms vs 23.91ms → 28.52× faster
- 50,000 chars: 2.2585ms vs 66.25ms → 29.34× faster
- 100,000 chars: 5.5615ms vs 148.35ms → 26.67× faster
- 200,000 chars: 13.36ms vs 348.34ms → 26.07× faster

Render vs markdown-exit:
- 5,000 chars: 0.2102ms vs 0.2413ms → 1.15× faster
- 20,000 chars: 0.8385ms vs 0.9731ms → 1.16× faster
- 50,000 chars: 2.2585ms vs 2.5148ms → 1.11× faster
- 100,000 chars: 5.5615ms vs 6.1843ms → 1.11× faster
- 200,000 chars: 13.36ms vs 14.73ms → 1.10× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |
|---:|---:|---:|---:|---:|---:|---:|:--|
| 5000 | 0.1607ms | 0.1534ms | 1.05x | 0.2230ms | 0.5074ms | 0.44x | S5/S3 |
| 20000 | 0.6569ms | 0.6418ms | 1.02x | 1.0716ms | 2.2502ms | 0.48x | S5/S2 |
| 50000 | 1.7537ms | 1.8359ms | 0.96x | 2.4638ms | 5.8991ms | 0.42x | S5/S2 |
| 100000 | 4.5378ms | 4.4884ms | 1.01x | 4.6964ms | 10.83ms | 0.43x | S5/S2 |
| 200000 | 9.7259ms | 9.4087ms | 1.03x | 11.27ms | 24.40ms | 0.46x | S3/S2 |

- One ratio < 1.00 means markdown-it-ts best one-shot is faster than baseline.
- Append ratio < 1.00 highlights stream cache optimizations (fast-path appends).


### Diagnostic: Chunk Info (if chunked)

| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 4 | 4 | 4 | 4 | 4 | 4 |
| 20000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 50000 | 14 | 14 | 8 | 14 | 14 | 8 |
| 100000 | 27 | 27 | 8 | 27 | 27 | 8 |
| 200000 | 27 | 7 | 8 | 27 | 7 | 8 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.2370ms | 0.3112ms |
| markdown-it (baseline) | 0.2260ms | 0.1704ms |
| markdown-it-ts (stream+chunk) | 0.3918ms | 0.3421ms |
| micromark (parse only) | 3.9646ms | 3.6706ms |
| remark (parse only) | 3.4032ms | 4.4247ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8272ms | 0.8420ms |
| markdown-it (baseline) | 0.6847ms | 0.6652ms |
| markdown-it-ts (stream+chunk) | 0.9037ms | 0.9889ms |
| micromark (parse only) | 25.20ms | 17.76ms |
| remark (parse only) | 21.55ms | 23.47ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.9882ms | 2.0957ms |
| markdown-it (baseline) | 1.4725ms | 1.5895ms |
| markdown-it-ts (stream+chunk) | 2.5701ms | 2.2454ms |
| micromark (parse only) | 49.82ms | 46.85ms |
| remark (parse only) | 60.60ms | 71.97ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.5590ms | 5.0409ms |
| markdown-it (baseline) | 4.4349ms | 4.0076ms |
| markdown-it-ts (stream+chunk) | 4.7235ms | 5.3822ms |
| micromark (parse only) | 107.83ms | 93.76ms |
| remark (parse only) | 134.95ms | 136.00ms |
