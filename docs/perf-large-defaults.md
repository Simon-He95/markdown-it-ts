# Large Strategy Tuning

Sizes: 100k, 500k, 1M, 5M, 20M chars. Lower is better.
Default API note: for normal string inputs, keep using `md.parse(src)` / `md.render(src)` and let the library auto-select the internal large-input path. `iterable-*` / `unbounded-*` rows are included as advanced explicit chunk-stream baselines, not as required public APIs for ordinary callers.

## 100,000 chars

- Fastest measured full parse: full-default 4.0953ms
- Fastest measured incremental append: unbounded-sink 4.3768ms
- Default one-shot path: full-default 4.0953ms (0.0% vs best default-eligible)
- Default append path: stream-default 5.7955ms (0.0% vs best default-eligible)
- markdown-it append: 17.06ms
- markdown-exit append: 19.08ms
- remark append: 554.27ms
- micromark append: 380.33ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 4.0953ms | 13.35ms | - |
| full | full-plain | 4.7275ms | 14.30ms | - |
| full | full-auto | 4.8240ms | 17.84ms | - |
| full | full-20k-12 | 4.5281ms | 17.45ms | - |
| full | full-32k-16 | 4.5270ms | 15.51ms | - |
| full | full-64k-16 | 4.5490ms | 15.95ms | - |
| full | iterable-auto | 4.9039ms | 18.40ms | - |
| full | iterable-sink | 4.5256ms | 16.02ms | - |
| stream | stream-default | 4.8620ms | 5.7955ms | stream-append mode=append |
| stream | stream-cache | 4.1590ms | 6.3382ms | stream-append mode=append |
| stream | stream-auto | 4.7969ms | 12.01ms | stream-append chunks=8 mode=append |
| stream | stream-20k-24 | 4.8113ms | 7.1580ms | stream-append chunks=8 mode=append |
| stream | stream-32k-16 | 4.5977ms | 7.2135ms | stream-append chunks=5 mode=append |
| stream | stream-64k-32 | 4.5650ms | 6.9228ms | stream-append chunks=3 mode=append |
| stream | unbounded-auto | 5.0446ms | 6.3693ms | - |
| stream | unbounded-sink | 4.5716ms | 4.3768ms | - |
| baseline | markdown-it | 4.5518ms | 17.06ms | - |
| baseline | markdown-exit | 5.7860ms | 19.08ms | - |
| baseline | remark | 181.73ms | 554.27ms | - |
| baseline | micromark | 107.60ms | 380.33ms | - |

## 500,000 chars

- Fastest measured full parse: iterable-sink 23.23ms
- Fastest measured incremental append: unbounded-sink 25.72ms
- Default one-shot path: full-default 29.03ms (0.0% vs best default-eligible)
- Default append path: stream-default 32.37ms (0.0% vs best default-eligible)
- markdown-it append: 95.51ms
- markdown-exit append: 124.36ms
- remark append: 4439.48ms
- micromark append: 1837.10ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 29.03ms | 113.21ms | - |
| full | full-plain | 28.73ms | 105.34ms | - |
| full | full-auto | 31.12ms | 96.37ms | - |
| full | full-20k-12 | 30.76ms | 106.51ms | - |
| full | full-32k-16 | 29.47ms | 99.19ms | - |
| full | full-64k-16 | 30.07ms | 96.20ms | - |
| full | iterable-auto | 36.50ms | 114.08ms | - |
| full | iterable-sink | 23.23ms | 81.19ms | - |
| stream | stream-default | 29.21ms | 32.37ms | stream-tail mode=tail |
| stream | stream-cache | 27.72ms | 34.56ms | stream-tail mode=tail |
| stream | stream-auto | 31.76ms | 35.89ms | stream-tail chunks=24 mode=tail |
| stream | stream-20k-24 | 32.94ms | 37.18ms | stream-tail chunks=24 mode=tail |
| stream | stream-32k-16 | 32.69ms | 33.94ms | stream-tail chunks=16 mode=tail |
| stream | stream-64k-32 | 30.24ms | 51.10ms | stream-tail chunks=11 mode=tail |
| stream | unbounded-auto | 31.93ms | 33.63ms | - |
| stream | unbounded-sink | 23.63ms | 25.72ms | - |
| baseline | markdown-it | 30.63ms | 95.51ms | - |
| baseline | markdown-exit | 37.05ms | 124.36ms | - |
| baseline | remark | 1607.87ms | 4439.48ms | - |
| baseline | micromark | 541.56ms | 1837.10ms | - |

## 1,000,000 chars

- Fastest measured full parse: iterable-sink 44.58ms
- Fastest measured incremental append: unbounded-sink 47.19ms
- Default one-shot path: full-default 57.94ms (0.0% vs best default-eligible)
- Default append path: stream-default 65.60ms (0.0% vs best default-eligible)
- markdown-it append: 202.07ms
- markdown-exit append: 256.35ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 57.94ms | 195.50ms | - |
| full | full-plain | 57.30ms | 210.84ms | - |
| full | full-auto | 63.03ms | 203.60ms | - |
| full | full-20k-12 | 57.01ms | 203.00ms | - |
| full | full-32k-16 | 61.91ms | 202.40ms | - |
| full | full-64k-16 | 56.37ms | 203.87ms | - |
| full | iterable-auto | 65.80ms | 220.77ms | - |
| full | iterable-sink | 44.58ms | 150.40ms | - |
| stream | stream-default | 61.89ms | 65.60ms | stream-tail chunks=22 mode=tail |
| stream | stream-cache | 59.11ms | 68.75ms | stream-tail mode=tail |
| stream | stream-auto | 63.19ms | 70.59ms | stream-tail chunks=22 mode=tail |
| stream | stream-20k-24 | 59.60ms | 70.28ms | stream-tail chunks=24 mode=tail |
| stream | stream-32k-16 | 61.78ms | 72.19ms | stream-tail chunks=16 mode=tail |
| stream | stream-64k-32 | 67.08ms | 71.34ms | stream-tail chunks=22 mode=tail |
| stream | unbounded-auto | 66.48ms | 66.12ms | - |
| stream | unbounded-sink | 44.54ms | 47.19ms | - |
| baseline | markdown-it | 61.72ms | 202.07ms | - |
| baseline | markdown-exit | 75.22ms | 256.35ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 5,000,000 chars

- Fastest measured full parse: iterable-sink 224.30ms
- Fastest measured incremental append: unbounded-sink 232.31ms
- Default one-shot path: full-default 290.97ms (0.0% vs best default-eligible)
- Default append path: stream-default 385.01ms (0.0% vs best default-eligible)
- markdown-it append: 1208.21ms
- markdown-exit append: 1393.92ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 290.97ms | 1095.76ms | - |
| full | full-plain | 315.23ms | 1121.70ms | - |
| full | full-auto | 327.55ms | 1178.29ms | - |
| full | full-20k-12 | 317.81ms | 1215.08ms | - |
| full | full-32k-16 | 349.86ms | 1183.57ms | - |
| full | full-64k-16 | 381.79ms | 1203.19ms | - |
| full | iterable-auto | 310.62ms | 1113.30ms | - |
| full | iterable-sink | 224.30ms | 777.36ms | - |
| stream | stream-default | 302.78ms | 385.01ms | stream-unbounded-append chunks=32 mode=append |
| stream | stream-cache | 282.13ms | 391.57ms | stream-unbounded-append mode=append |
| stream | stream-auto | 312.22ms | 394.84ms | stream-unbounded-append chunks=32 mode=append |
| stream | stream-20k-24 | 290.48ms | 386.77ms | stream-unbounded-append chunks=24 mode=append |
| stream | stream-32k-16 | 339.93ms | 391.43ms | stream-unbounded-append chunks=16 mode=append |
| stream | stream-64k-32 | 323.84ms | 617.60ms | stream-unbounded-append chunks=32 mode=append |
| stream | unbounded-auto | 306.68ms | 319.95ms | - |
| stream | unbounded-sink | 223.39ms | 232.31ms | - |
| baseline | markdown-it | 353.79ms | 1208.21ms | - |
| baseline | markdown-exit | 375.55ms | 1393.92ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 20,000,000 chars

- Fastest measured full parse: iterable-sink 924.82ms
- Fastest measured incremental append: unbounded-sink 1005.20ms
- Default one-shot path: full-default 1151.20ms (0.0% vs best default-eligible)
- Default append path: stream-default 4546.08ms (0.0% vs best default-eligible)
- markdown-it append: 5487.82ms
- markdown-exit append: 6461.59ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 1151.20ms | 4599.73ms | - |
| full | full-plain | 1221.22ms | 4224.19ms | - |
| full | full-auto | 1550.62ms | 6772.23ms | - |
| full | full-20k-12 | 1334.17ms | 5673.64ms | - |
| full | full-32k-16 | 1445.87ms | 5561.87ms | - |
| full | full-64k-16 | 1656.16ms | 5413.52ms | - |
| full | iterable-auto | 1267.48ms | 5181.49ms | - |
| full | iterable-sink | 924.82ms | 3467.00ms | - |
| stream | stream-default | 1343.67ms | 4546.08ms | stream-full mode=full |
| stream | stream-cache | 1177.35ms | 4729.37ms | stream-full mode=full |
| stream | stream-auto | 1262.13ms | 4553.33ms | stream-full mode=full |
| stream | stream-20k-24 | 1281.34ms | 4379.90ms | stream-full mode=full |
| stream | stream-32k-16 | 1567.37ms | 4359.07ms | stream-full mode=full |
| stream | stream-64k-32 | 1188.01ms | 4420.55ms | stream-full mode=full |
| stream | unbounded-auto | 1651.54ms | 1322.05ms | - |
| stream | unbounded-sink | 998.18ms | 1005.20ms | - |
| baseline | markdown-it | 1756.79ms | 5487.82ms | - |
| baseline | markdown-exit | 1704.10ms | 6461.59ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |
