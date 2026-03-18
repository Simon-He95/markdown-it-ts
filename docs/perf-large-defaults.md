# Large Strategy Tuning

Sizes: 100k, 500k, 1M, 5M, 20M chars. Lower is better.
Default API note: for normal string inputs, keep using `md.parse(src)` / `md.render(src)` and let the library auto-select the internal large-input path. `iterable-*` / `unbounded-*` rows are included as advanced explicit chunk-stream baselines, not as required public APIs for ordinary callers.

## 100,000 chars

- Fastest measured full parse: iterable-sink 4.8560ms
- Fastest measured incremental append: unbounded-sink 4.7089ms
- markdown-it append: 17.61ms
- markdown-exit append: 24.72ms
- remark append: 572.77ms
- micromark append: 373.36ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-plain | 6.6188ms | 17.30ms | mode=idle |
| full | full-auto | 6.1322ms | 17.80ms | mode=idle |
| full | full-20k-12 | 6.7447ms | 20.27ms | mode=idle |
| full | full-32k-16 | 6.6392ms | 18.12ms | mode=idle |
| full | full-64k-16 | 6.4394ms | 17.78ms | mode=idle |
| full | iterable-auto | 7.0482ms | 19.11ms | mode=idle |
| full | iterable-sink | 4.8560ms | 17.36ms | mode=idle |
| stream | stream-cache | 7.1644ms | 7.1488ms | mode=append |
| stream | stream-auto | 7.2948ms | 7.9677ms | chunks=8 |
| stream | stream-20k-24 | 6.9781ms | 9.0236ms | chunks=8 |
| stream | stream-32k-16 | 6.6797ms | 7.7635ms | chunks=5 |
| stream | stream-64k-32 | 7.0139ms | 7.7829ms | chunks=3 |
| stream | unbounded-auto | 7.4122ms | 6.9932ms | chunks=33 |
| stream | unbounded-sink | 4.9489ms | 4.7089ms | chunks=33 |
| baseline | markdown-it | 6.5922ms | 17.61ms | - |
| baseline | markdown-exit | 7.5162ms | 24.72ms | - |
| baseline | remark | 182.48ms | 572.77ms | - |
| baseline | micromark | 110.25ms | 373.36ms | - |

## 500,000 chars

- Fastest measured full parse: iterable-sink 24.07ms
- Fastest measured incremental append: unbounded-sink 23.81ms
- markdown-it append: 105.97ms
- markdown-exit append: 129.21ms
- remark append: 4349.70ms
- micromark append: 1963.79ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-plain | 35.58ms | 114.51ms | mode=idle |
| full | full-auto | 32.61ms | 107.97ms | mode=idle |
| full | full-20k-12 | 32.50ms | 103.70ms | mode=idle |
| full | full-32k-16 | 32.85ms | 108.33ms | mode=idle |
| full | full-64k-16 | 32.11ms | 103.47ms | mode=idle |
| full | iterable-auto | 36.39ms | 120.11ms | mode=idle |
| full | iterable-sink | 24.07ms | 84.15ms | mode=idle |
| stream | stream-cache | 34.03ms | 40.13ms | mode=tail |
| stream | stream-auto | 35.51ms | 39.16ms | chunks=16 |
| stream | stream-20k-24 | 35.99ms | 37.50ms | chunks=24 |
| stream | stream-32k-16 | 35.78ms | 36.15ms | chunks=16 |
| stream | stream-64k-32 | 35.25ms | 41.43ms | chunks=11 |
| stream | unbounded-auto | 36.05ms | 32.66ms | chunks=136 |
| stream | unbounded-sink | 24.09ms | 23.81ms | chunks=136 |
| baseline | markdown-it | 32.89ms | 105.97ms | - |
| baseline | markdown-exit | 38.87ms | 129.21ms | - |
| baseline | remark | 1695.10ms | 4349.70ms | - |
| baseline | micromark | 540.89ms | 1963.79ms | - |

## 1,000,000 chars

- Fastest measured full parse: iterable-sink 47.09ms
- Fastest measured incremental append: unbounded-sink 46.91ms
- markdown-it append: 220.77ms
- markdown-exit append: 290.89ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-plain | 67.07ms | 232.88ms | mode=idle |
| full | full-auto | 62.78ms | 232.10ms | mode=idle |
| full | full-20k-12 | 59.98ms | 215.61ms | mode=idle |
| full | full-32k-16 | 61.41ms | 224.77ms | mode=idle |
| full | full-64k-16 | 58.19ms | 218.95ms | mode=idle |
| full | iterable-auto | 66.59ms | 247.54ms | mode=idle |
| full | iterable-sink | 47.09ms | 163.18ms | mode=idle |
| stream | stream-cache | 62.82ms | 233.55ms | mode=full |
| stream | stream-auto | 63.77ms | 239.93ms | mode=full |
| stream | stream-20k-24 | 64.76ms | 233.73ms | mode=full |
| stream | stream-32k-16 | 68.91ms | 229.69ms | mode=full |
| stream | stream-64k-32 | 64.38ms | 232.34ms | mode=full |
| stream | unbounded-auto | 67.35ms | 79.70ms | chunks=200 |
| stream | unbounded-sink | 47.01ms | 46.91ms | chunks=200 |
| baseline | markdown-it | 64.85ms | 220.77ms | - |
| baseline | markdown-exit | 80.20ms | 290.89ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 5,000,000 chars

- Fastest measured full parse: iterable-sink 243.90ms
- Fastest measured incremental append: unbounded-sink 241.94ms
- markdown-it append: 1241.67ms
- markdown-exit append: 1333.45ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-plain | 343.85ms | 1205.18ms | mode=idle |
| full | full-auto | 296.98ms | 1266.21ms | mode=idle |
| full | full-20k-12 | 382.66ms | 1366.45ms | mode=idle |
| full | full-32k-16 | 344.00ms | 1324.83ms | mode=idle |
| full | full-64k-16 | 366.65ms | 1295.47ms | mode=idle |
| full | iterable-auto | 357.00ms | 1208.04ms | mode=idle |
| full | iterable-sink | 243.90ms | 849.43ms | mode=idle |
| stream | stream-cache | 353.47ms | 1133.85ms | mode=full |
| stream | stream-auto | 353.07ms | 1185.01ms | mode=full |
| stream | stream-20k-24 | 348.63ms | 1226.94ms | mode=full |
| stream | stream-32k-16 | 316.89ms | 1323.26ms | mode=full |
| stream | stream-64k-32 | 315.40ms | 1202.35ms | mode=full |
| stream | unbounded-auto | 349.27ms | 414.44ms | chunks=709 |
| stream | unbounded-sink | 244.29ms | 241.94ms | chunks=709 |
| baseline | markdown-it | 325.07ms | 1241.67ms | - |
| baseline | markdown-exit | 457.39ms | 1333.45ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 20,000,000 chars

- Fastest measured full parse: iterable-sink 1017.89ms
- Fastest measured incremental append: unbounded-sink 1012.79ms
- markdown-it append: 5843.14ms
- markdown-exit append: 6751.90ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-plain | 1355.39ms | 5570.50ms | mode=idle |
| full | full-auto | 1335.73ms | 6729.94ms | mode=idle |
| full | full-20k-12 | 1827.98ms | 6149.61ms | mode=idle |
| full | full-32k-16 | 1716.40ms | 6067.79ms | mode=idle |
| full | full-64k-16 | 1699.18ms | 6868.86ms | mode=idle |
| full | iterable-auto | 1432.75ms | 5925.82ms | mode=idle |
| full | iterable-sink | 1017.89ms | 3551.89ms | mode=idle |
| stream | stream-cache | 1356.88ms | 5705.25ms | mode=full |
| stream | stream-auto | 1354.85ms | 5749.08ms | mode=full |
| stream | stream-20k-24 | 1352.99ms | 5682.69ms | mode=full |
| stream | stream-32k-16 | 1357.36ms | 5640.42ms | mode=full |
| stream | stream-64k-32 | 1358.03ms | 5779.25ms | mode=full |
| stream | unbounded-auto | 1440.90ms | 1645.85ms | chunks=2601 |
| stream | unbounded-sink | 1044.77ms | 1012.79ms | chunks=2601 |
| baseline | markdown-it | 1484.60ms | 5843.14ms | - |
| baseline | markdown-exit | 1867.75ms | 6751.90ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |
