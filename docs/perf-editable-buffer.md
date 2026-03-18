# Editable Buffer Tuning

Replace workloads for arbitrary in-place edits. Lower is better.

## 100,000 chars

- Middle replace: editable 2.9318ms, full 6.0090ms, stream 5.6920ms
- Late replace: editable 1.5433ms, full 5.6026ms, stream 5.7300ms
- Last reparsed chars: middle 50,093, late 14,983

| Workload | EditableBuffer | Plain full parse | stream.parse | Notes |
|:--|---:|---:|---:|:--|
| middle replace | 2.9318ms | 6.0090ms | 5.6920ms | reparsed=50,093 chars |
| late replace | 1.5433ms | 5.6026ms | 5.7300ms | reparsed=14,983 chars |

## 500,000 chars

- Middle replace: editable 18.42ms, full 34.02ms, stream 34.55ms
- Late replace: editable 8.2465ms, full 33.96ms, stream 34.30ms
- Last reparsed chars: middle 251,155, late 75,327

| Workload | EditableBuffer | Plain full parse | stream.parse | Notes |
|:--|---:|---:|---:|:--|
| middle replace | 18.42ms | 34.02ms | 34.55ms | reparsed=251,155 chars |
| late replace | 8.2465ms | 33.96ms | 34.30ms | reparsed=75,327 chars |

## 1,000,000 chars

- Middle replace: editable 42.43ms, full 71.04ms, stream 76.26ms
- Late replace: editable 15.26ms, full 70.31ms, stream 70.63ms
- Last reparsed chars: middle 501,062, late 150,339

| Workload | EditableBuffer | Plain full parse | stream.parse | Notes |
|:--|---:|---:|---:|:--|
| middle replace | 42.43ms | 71.04ms | 76.26ms | reparsed=501,062 chars |
| late replace | 15.26ms | 70.31ms | 70.63ms | reparsed=150,339 chars |

## 5,000,000 chars

- Middle replace: editable 210.58ms, full 372.20ms, stream 338.09ms
- Late replace: editable 96.89ms, full 351.48ms, stream 335.18ms
- Last reparsed chars: middle 2,511,051, late 753,349

| Workload | EditableBuffer | Plain full parse | stream.parse | Notes |
|:--|---:|---:|---:|:--|
| middle replace | 210.58ms | 372.20ms | 338.09ms | reparsed=2,511,051 chars |
| late replace | 96.89ms | 351.48ms | 335.18ms | reparsed=753,349 chars |
