# Large Strategy Tuning

Sizes: 100k, 500k, 1M, 5M, 20M chars. Lower is better.
Default API note: for normal string inputs, keep using `md.parse(src)` / `md.render(src)`. Stock parser instances may auto-select an internal large-input path; plugin/custom-rule instances keep plain full-parse behavior unless chunking is explicitly enabled. `iterable-*` / `unbounded-*` rows are included as advanced explicit chunk-stream baselines, not as required public APIs for ordinary callers.

## 100,000 chars

- Fastest measured full parse: full-default 3.3600ms
- Fastest measured incremental append: unbounded-sink 4.3625ms
- Default one-shot path: full-default 3.3600ms (0.0% vs best default-eligible)
- Default append path: stream-default 4.8536ms (0.0% vs best default-eligible)
- markdown-it append: 13.00ms
- markdown-exit append: 14.46ms
- remark append: 423.84ms
- micromark append: 287.47ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 3.3600ms | 10.88ms | - |
| full | full-plain | 3.3753ms | 11.92ms | - |
| full | full-auto | 4.0230ms | 13.98ms | - |
| full | full-20k-12 | 3.5980ms | 13.06ms | - |
| full | full-32k-16 | 3.6019ms | 12.78ms | - |
| full | full-64k-16 | 3.5940ms | 13.07ms | - |
| full | iterable-auto | 4.0417ms | 14.63ms | - |
| full | iterable-sink | 3.7119ms | 13.07ms | - |
| stream | stream-default | 3.4203ms | 4.8536ms | stream-append mode=append |
| stream | stream-cache | 3.5139ms | 5.4181ms | stream-append mode=append |
| stream | stream-auto | 4.0237ms | 6.1660ms | stream-append chunks=8 mode=append |
| stream | stream-20k-24 | 3.8448ms | 6.7453ms | stream-append chunks=8 mode=append |
| stream | stream-32k-16 | 3.8426ms | 4.9900ms | stream-append chunks=5 mode=append |
| stream | stream-64k-32 | 3.8394ms | 6.3191ms | stream-append chunks=3 mode=append |
| stream | unbounded-auto | 4.0923ms | 5.5101ms | - |
| stream | unbounded-sink | 3.6980ms | 4.3625ms | - |
| baseline | markdown-it | 3.5233ms | 13.00ms | - |
| baseline | markdown-exit | 4.4308ms | 14.46ms | - |
| baseline | remark | 127.35ms | 423.84ms | - |
| baseline | micromark | 83.84ms | 287.47ms | - |

## 500,000 chars

- Fastest measured full parse: iterable-sink 18.57ms
- Fastest measured incremental append: unbounded-auto 24.87ms
- Default one-shot path: full-default 24.60ms (3.0% vs best default-eligible)
- Default append path: stream-default 30.28ms (0.0% vs best default-eligible)
- markdown-it append: 91.82ms
- markdown-exit append: 94.42ms
- remark append: 3543.15ms
- micromark append: 1480.33ms

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 24.60ms | 75.55ms | - |
| full | full-plain | 24.88ms | 77.68ms | - |
| full | full-auto | 23.88ms | 84.29ms | - |
| full | full-20k-12 | 24.28ms | 75.46ms | - |
| full | full-32k-16 | 24.76ms | 80.35ms | - |
| full | full-64k-16 | 24.82ms | 81.16ms | - |
| full | iterable-auto | 27.65ms | 86.07ms | - |
| full | iterable-sink | 18.57ms | 69.19ms | - |
| stream | stream-default | 24.67ms | 30.28ms | stream-tail mode=tail |
| stream | stream-cache | 24.20ms | 33.01ms | stream-tail mode=tail |
| stream | stream-auto | 24.35ms | 32.26ms | stream-tail chunks=24 mode=tail |
| stream | stream-20k-24 | 25.92ms | 34.14ms | stream-tail chunks=24 mode=tail |
| stream | stream-32k-16 | 25.15ms | 32.13ms | stream-tail chunks=16 mode=tail |
| stream | stream-64k-32 | 25.30ms | 33.87ms | stream-tail chunks=11 mode=tail |
| stream | unbounded-auto | 26.48ms | 24.87ms | - |
| stream | unbounded-sink | 19.13ms | 47.25ms | - |
| baseline | markdown-it | 24.46ms | 91.82ms | - |
| baseline | markdown-exit | 27.88ms | 94.42ms | - |
| baseline | remark | 1251.41ms | 3543.15ms | - |
| baseline | micromark | 420.76ms | 1480.33ms | - |

## 1,000,000 chars

- Fastest measured full parse: iterable-sink 38.10ms
- Fastest measured incremental append: unbounded-sink 40.65ms
- Default one-shot path: full-default 52.39ms (13.0% vs best default-eligible)
- Default append path: stream-default 64.05ms (0.0% vs best default-eligible)
- markdown-it append: 171.34ms
- markdown-exit append: 218.97ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 52.39ms | 170.57ms | - |
| full | full-plain | 47.04ms | 171.29ms | - |
| full | full-auto | 55.36ms | 172.02ms | - |
| full | full-20k-12 | 46.34ms | 172.15ms | - |
| full | full-32k-16 | 46.41ms | 171.37ms | - |
| full | full-64k-16 | 51.83ms | 174.69ms | - |
| full | iterable-auto | 54.95ms | 192.10ms | - |
| full | iterable-sink | 38.10ms | 129.74ms | - |
| stream | stream-default | 55.49ms | 64.05ms | stream-tail chunks=22 mode=tail |
| stream | stream-cache | 55.82ms | 71.91ms | stream-tail mode=tail |
| stream | stream-auto | 58.92ms | 65.19ms | stream-tail chunks=22 mode=tail |
| stream | stream-20k-24 | 57.24ms | 68.72ms | stream-tail chunks=24 mode=tail |
| stream | stream-32k-16 | 55.63ms | 67.93ms | stream-tail chunks=16 mode=tail |
| stream | stream-64k-32 | 57.90ms | 116.49ms | stream-tail chunks=22 mode=tail |
| stream | unbounded-auto | 57.12ms | 55.04ms | - |
| stream | unbounded-sink | 38.28ms | 40.65ms | - |
| baseline | markdown-it | 49.80ms | 171.34ms | - |
| baseline | markdown-exit | 60.03ms | 218.97ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 5,000,000 chars

- Fastest measured full parse: iterable-sink 190.04ms
- Fastest measured incremental append: unbounded-sink 198.46ms
- Default one-shot path: full-default 288.48ms (12.3% vs best default-eligible)
- Default append path: stream-default 388.18ms (0.0% vs best default-eligible)
- markdown-it append: 976.50ms
- markdown-exit append: 1143.71ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 288.48ms | 942.52ms | - |
| full | full-plain | 246.10ms | 948.94ms | - |
| full | full-auto | 256.84ms | 1010.35ms | - |
| full | full-20k-12 | 323.22ms | 1016.42ms | - |
| full | full-32k-16 | 295.92ms | 1049.40ms | - |
| full | full-64k-16 | 311.21ms | 1008.91ms | - |
| full | iterable-auto | 273.08ms | 1003.84ms | - |
| full | iterable-sink | 190.04ms | 667.24ms | - |
| stream | stream-default | 284.31ms | 388.18ms | stream-unbounded-append chunks=32 mode=append |
| stream | stream-cache | 261.06ms | 402.54ms | stream-unbounded-append mode=append |
| stream | stream-auto | 271.52ms | 398.90ms | stream-unbounded-append chunks=32 mode=append |
| stream | stream-20k-24 | 279.79ms | 399.51ms | stream-unbounded-append chunks=24 mode=append |
| stream | stream-32k-16 | 264.20ms | 400.47ms | stream-unbounded-append chunks=16 mode=append |
| stream | stream-64k-32 | 309.29ms | 797.25ms | stream-unbounded-append chunks=32 mode=append |
| stream | unbounded-auto | 285.23ms | 290.98ms | - |
| stream | unbounded-sink | 196.11ms | 198.46ms | - |
| baseline | markdown-it | 290.16ms | 976.50ms | - |
| baseline | markdown-exit | 323.93ms | 1143.71ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |

## 20,000,000 chars

- Fastest measured full parse: iterable-sink 785.01ms
- Fastest measured incremental append: unbounded-sink 787.77ms
- Default one-shot path: full-default 998.70ms (0.0% vs best default-eligible)
- Default append path: stream-default 3920.46ms (4.3% vs best default-eligible)
- markdown-it append: 3969.76ms
- markdown-exit append: 4807.05ms
- remark append: skipped
- micromark append: skipped

| Group | Scenario | One-shot | Append workload | Notes |
|:--|:--|---:|---:|:--|
| full | full-default | 998.70ms | 3939.36ms | - |
| full | full-plain | 1048.11ms | 3898.14ms | - |
| full | full-auto | 1352.03ms | 4531.97ms | - |
| full | full-20k-12 | 1123.24ms | 4306.81ms | - |
| full | full-32k-16 | 1244.72ms | 4428.32ms | - |
| full | full-64k-16 | 1285.27ms | 4179.28ms | - |
| full | iterable-auto | 1089.12ms | 4053.40ms | - |
| full | iterable-sink | 785.01ms | 2670.22ms | - |
| stream | stream-default | 1127.49ms | 3920.46ms | stream-full mode=full |
| stream | stream-cache | 1019.07ms | 3854.68ms | stream-full mode=full |
| stream | stream-auto | 1096.33ms | 3815.75ms | stream-full mode=full |
| stream | stream-20k-24 | 1124.85ms | 3995.04ms | stream-full mode=full |
| stream | stream-32k-16 | 1026.26ms | 3758.66ms | stream-full mode=full |
| stream | stream-64k-32 | 1253.36ms | 4013.43ms | stream-full mode=full |
| stream | unbounded-auto | 1072.88ms | 1081.26ms | - |
| stream | unbounded-sink | 782.14ms | 787.77ms | - |
| baseline | markdown-it | 1149.76ms | 3969.76ms | - |
| baseline | markdown-exit | 1417.11ms | 4807.05ms | - |
| baseline | remark | skipped | skipped | - |
| baseline | micromark | skipped | skipped | - |
