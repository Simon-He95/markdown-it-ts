# Performance Report (latest run)

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0130ms | 0.0006ms | **0.0002ms** | 0.3243ms | 0.2424ms | 0.4191ms | 1.7282ms | 0.4688ms | **0.3748ms** | 0.8660ms | 0.7582ms | 0.7998ms | 3.2936ms | 1.1198ms | **0.9302ms** | 2.4804ms | 2.5359ms | 2.4830ms | 0.6136ms | **0.2775ms** | 0.2867ms | 0.2857ms | 0.2800ms | 0.6131ms |
| 20000 | 0.0003ms | **0.0002ms** | 0.0002ms | 1.1888ms | 0.9043ms | 0.8540ms | 4.0611ms | 1.5322ms | **1.3678ms** | 3.8707ms | 3.1604ms | 2.7996ms | 10.83ms | **5.7187ms** | 6.8465ms | 10.39ms | 8.4369ms | 7.6559ms | 1.1321ms | 0.8866ms | 1.1279ms | 1.2276ms | 1.1086ms | **0.8542ms** |
| 50000 | 0.0004ms | 0.0004ms | **0.0002ms** | 4.9786ms | 2.4028ms | 2.0386ms | 9.8316ms | 3.8207ms | **3.7555ms** | 9.7494ms | 7.9346ms | 7.1471ms | 26.93ms | **6.5425ms** | 6.6677ms | 26.72ms | 21.80ms | 18.75ms | 3.2887ms | 2.5929ms | 3.1452ms | 2.7364ms | 2.1028ms | **2.0391ms** |
| 100000 | **0.0005ms** | 0.0007ms | 0.0007ms | 6.6713ms | 5.2472ms | 4.9358ms | 21.20ms | **7.4134ms** | 7.6032ms | 20.44ms | 19.98ms | 13.91ms | 55.05ms | **11.64ms** | 11.70ms | 56.25ms | 48.74ms | 38.98ms | 7.0810ms | 5.9945ms | 7.0261ms | 6.2886ms | 5.7655ms | **3.9459ms** |
| 200000 | 14.68ms | **12.05ms** | 15.03ms | 17.42ms | 15.62ms | 12.44ms | 40.88ms | 29.64ms | **26.39ms** | 44.31ms | 49.64ms | 29.69ms | 121.68ms | **43.23ms** | 43.57ms | 126.38ms | 105.38ms | 83.26ms | 12.08ms | 12.20ms | 12.48ms | 14.64ms | 11.97ms | **8.1633ms** |

Best (one-shot) per size:
- 5000: S3 0.0002ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.0002ms (stream ON, cache ON, chunk OFF)
- 50000: S3 0.0002ms (stream ON, cache ON, chunk ON)
- 100000: S1 0.0005ms (stream ON, cache OFF, chunk ON)
- 200000: S2 12.05ms (stream ON, cache ON, chunk OFF)

Best (append workload) per size:
- 5000: S3 0.3748ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.3678ms (stream ON, cache ON, chunk ON)
- 50000: S3 3.7555ms (stream ON, cache ON, chunk ON)
- 100000: S2 7.4134ms (stream ON, cache ON, chunk OFF)
- 200000: S3 26.39ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.9302ms (stream ON, cache ON, chunk ON)
- 20000: S2 5.7187ms (stream ON, cache ON, chunk OFF)
- 50000: S2 6.5425ms (stream ON, cache ON, chunk OFF)
- 100000: S2 11.64ms (stream ON, cache ON, chunk OFF)
- 200000: S2 43.23ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S2 0.2775ms (stream ON, cache ON, chunk OFF)
- 20000: M1 0.8542ms (markdown-it (baseline))
- 50000: M1 2.0391ms (markdown-it (baseline))
- 100000: M1 3.9459ms (markdown-it (baseline))
- 200000: M1 8.1633ms (markdown-it (baseline))

Recommendations (by majority across sizes):
- One-shot: S3(2), S2(2), S1(1)
- Append-heavy: S3(4), S2(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).

## Render throughput (markdown → HTML)

This measures end-to-end markdown → HTML rendering throughput across markdown-it-ts, upstream markdown-it, and remark+rehype (parse + stringify). Lower is better.

| Size (chars) | markdown-it-ts.render | markdown-it.render | remark+rehype |
|---:|---:|---:|---:|
| 5000 | 0.3574ms | 0.2641ms | 6.5419ms |
| 20000 | 1.2340ms | 0.9844ms | 29.56ms |
| 50000 | 3.0913ms | 2.4276ms | 84.73ms |
| 100000 | 8.3501ms | 5.9070ms | 191.70ms |
| 200000 | 15.95ms | 15.57ms | 456.14ms |

Render vs markdown-it:
- 5,000 chars: 0.3574ms vs 0.2641ms → 0.74× faster
- 20,000 chars: 1.2340ms vs 0.9844ms → 0.80× faster
- 50,000 chars: 3.0913ms vs 2.4276ms → 0.79× faster
- 100,000 chars: 8.3501ms vs 5.9070ms → 0.71× faster
- 200,000 chars: 15.95ms vs 15.57ms → 0.98× faster

Render vs remark+rehype:
- 5,000 chars: 0.3574ms vs 6.5419ms → 18.31× faster
- 20,000 chars: 1.2340ms vs 29.56ms → 23.95× faster
- 50,000 chars: 3.0913ms vs 84.73ms → 27.41× faster
- 100,000 chars: 8.3501ms vs 191.70ms → 22.96× faster
- 200,000 chars: 15.95ms vs 456.14ms → 28.60× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |
|---:|---:|---:|---:|---:|---:|---:|:--|
| 5000 | 0.0002ms | 0.4191ms | 0.00x | 0.3748ms | 0.7998ms | 0.47x | S3/S3 |
| 20000 | 0.0002ms | 0.8540ms | 0.00x | 1.3678ms | 2.7996ms | 0.49x | S2/S3 |
| 50000 | 0.0002ms | 2.0386ms | 0.00x | 3.7555ms | 7.1471ms | 0.53x | S3/S3 |
| 100000 | 0.0005ms | 4.9358ms | 0.00x | 7.4134ms | 13.91ms | 0.53x | S1/S2 |
| 200000 | 12.05ms | 12.44ms | 0.97x | 26.39ms | 29.69ms | 0.89x | S2/S3 |

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
| markdown-it (baseline) | 0.3799ms | 0.1953ms |
| markdown-it-ts (stream+chunk) | 0.3741ms | 0.4238ms |
| remark (parse only) | 5.7937ms | 5.4431ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-it (baseline) | 0.8198ms | 0.8826ms |
| markdown-it-ts (stream+chunk) | 0.9138ms | 1.0390ms |
| remark (parse only) | 24.03ms | 27.91ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-it (baseline) | 1.9453ms | 2.0886ms |
| markdown-it-ts (stream+chunk) | 2.4090ms | 2.4565ms |
| remark (parse only) | 70.61ms | 79.45ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-it (baseline) | 5.2726ms | 4.8238ms |
| markdown-it-ts (stream+chunk) | 6.5489ms | 6.4004ms |
| remark (parse only) | 187.15ms | 197.54ms |
