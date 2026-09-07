# Streaming 单帧回退修正（2026-09-07）

此报告记录 Markstream PR #753 的 CI 修正，最终消费端提交为 `4479403310113f79f43e32c638469e3d849107b5`。[此前报告](./perf-stream-history-2026-09-07.md) 测量的是初版 `2f3ea6f1e3db36513578d71012419409743fa338`，其 streaming 指标不能直接当作修正后的收益。markdown-it-ts 仍没有运行时改动；本仓库 PR #31 是基准与证据维护。

## CI 发现与修正

初版并非只有测量噪声：Linux / Node 20 的 prose-code-math 在 1x/2x/4x 的七轮测量里，commitMax 从约 6.3ms 升至 11.1ms，超过未调整的 1.75 倍门槛，虽然总耗时降低。它将首帧的通用链接正则初始化推迟到第三帧，与 HTTP 校验正则初始化集中在一起。

本地逐帧诊断也复现了这个时机变化：97 字符首帧原生构建 schema/fuzzy 正则，381 字符第三帧只构建 HTTP 校验相关正则；初版首帧没有构建，第三帧一起构建两组。诊断保留每帧七轮耗时与前后缓存 key；它用于定位，不替代无诊断开销的性能门禁。

修正后，当 `__markstreamFinal === false` 且本实例的 fuzzy-link 正则尚未构建时，使用原有候选路径；已有正则时再启用整组 inline 筛选。配置清空缓存后同样遵循原有初始化时机。final:true 历史恢复仍可跳过无链接文本的正则初始化。没有增加公开选项、主动预热、共享正则或改变 CI 门槛。

新增首帧及重新配置回归测试在修正前失败、修正后通过，专项合计 21 项通过。原有逐字符中间态、自定义 schema/builder/method 和同一次 validator 内变更配置测试保持通过。

## 本地重跑原有 CI 性能门禁

执行消费端 `benchmark-parser-performance.mjs --profile=deep`，基线和修正版本各 7 轮、2 次预热；使用同一套依赖，从基线源码完整打包，包含内嵌的 markdown-it-ts。环境为 Node 23 / Apple M1 Pro；堆测量在 jitless 子进程中进行。调用原有 `check-parser-performance.mjs --reference=...`，绝对预算、同 runner 比较及 retained-heap 检查全部通过。

| 场景 | 规模 | 基线最慢帧 ms | 修正后最慢帧 ms | 基线总耗时 ms | 修正后总耗时 ms |
|---|---:|---:|---:|---:|---:|
| prose-code-math | 1x | 8.020 | 8.074 | 20.258 | 19.418 |
| prose-code-math | 2x | 7.923 | 7.876 | 25.189 | 24.988 |
| prose-code-math | 4x | 8.038 | 7.899 | 35.279 | 34.403 |
| headings-lists | 1x | 4.483 | 4.557 | 10.774 | 10.797 |
| headings-lists | 2x | 4.533 | 4.512 | 14.517 | 14.675 |
| headings-lists | 4x | 4.565 | 4.522 | 24.423 | 24.559 |

## 修正后的 61 场景结果

沿用此前矩阵方法和冻结的 README：相同 markdown-it-ts 构建、Node 24 / Apple M1 Pro、5 轮独立子进程、每轮 2 次预热、轮间反转版本顺序。所有逐帧 / 逐消息输出摘要一致。下表为五轮中位数，CPU 降低负数表示回退；完整保存回退数据，不以总 CPU 改善推断最慢帧改善，也不将解析耗时当作完整 UI 恢复耗时。小幅差异仍受桌面后台进程、JIT 和 GC 状态影响。

| 场景 | 基线耗时 ms | 修正后耗时 ms | 基线 CPU ms | 修正后 CPU ms | CPU 降低 |
|---|---:|---:|---:|---:|---:|
| stream-prose | 91.52 | 92.31 | 122.63 | 124.00 | -1.1% |
| stream-mixed | 140.11 | 132.58 | 177.49 | 175.37 | 1.2% |
| stream-fence | 117.00 | 118.04 | 166.22 | 168.53 | -1.4% |
| stream-table | 530.17 | 506.65 | 739.12 | 723.56 | 2.1% |
| history-tail-100000 | 23.85 | 23.21 | 34.28 | 34.15 | 0.4% |
| history-tail-1000000 | 259.52 | 258.76 | 286.84 | 286.54 | 0.1% |
| restore-mixed-100-messages | 238.30 | 193.68 | 426.96 | 366.10 | 14.3% |
| restore-table-100-messages | 212.46 | 175.34 | 389.79 | 353.07 | 9.4% |
| family-stream-plain-text | 15.03 | 17.09 | 28.35 | 30.96 | -9.2% |
| family-restore-plain-text | 62.69 | 41.23 | 111.19 | 87.03 | 21.7% |
| family-stream-inline-formatting | 19.75 | 22.87 | 37.86 | 41.42 | -9.4% |
| family-restore-inline-formatting | 104.00 | 81.16 | 210.60 | 178.82 | 15.1% |
| family-stream-links-media-autolinks | 23.38 | 26.43 | 48.45 | 51.32 | -5.9% |
| family-restore-links-media-autolinks | 88.14 | 87.94 | 171.64 | 173.63 | -1.2% |
| family-stream-nested-blocks | 25.66 | 24.86 | 45.28 | 44.68 | 1.3% |
| family-restore-nested-blocks | 108.91 | 87.29 | 222.53 | 194.47 | 12.6% |
| family-stream-tables-strikethrough | 21.36 | 24.78 | 40.47 | 45.66 | -12.8% |
| family-restore-tables-strikethrough | 109.76 | 93.57 | 218.72 | 196.63 | 10.1% |
| family-stream-fenced-code | 9.19 | 11.17 | 23.56 | 25.09 | -6.5% |
| family-restore-fenced-code | 37.43 | 22.80 | 73.34 | 57.00 | 22.3% |
| family-stream-feature-mixed | 31.11 | 32.79 | 64.70 | 66.81 | -3.3% |
| family-restore-feature-mixed | 132.31 | 106.95 | 245.25 | 226.74 | 7.5% |
| family-stream-math | 63.26 | 65.59 | 111.43 | 119.16 | -6.9% |
| family-restore-math | 94.51 | 78.29 | 165.36 | 150.21 | 9.2% |
| family-stream-html | 47.53 | 48.97 | 99.12 | 103.25 | -4.2% |
| family-restore-html | 193.87 | 165.64 | 357.50 | 312.70 | 12.5% |
| family-stream-containers | 145.97 | 142.00 | 315.84 | 310.07 | 1.8% |
| family-restore-containers | 142.10 | 124.76 | 269.59 | 242.87 | 9.9% |
| family-stream-references | 96.51 | 93.71 | 195.54 | 183.11 | 6.4% |
| family-restore-references | 89.20 | 63.60 | 166.72 | 136.26 | 18.3% |
| family-stream-unicode-links | 55.06 | 61.31 | 87.50 | 94.82 | -8.4% |
| family-restore-unicode-links | 186.71 | 191.12 | 343.20 | 338.98 | 1.2% |
| family-stream-long-paragraph | 88.21 | 61.49 | 151.91 | 121.16 | 20.2% |
| family-restore-long-paragraph | 101.63 | 55.78 | 186.54 | 119.38 | 36.0% |
| family-stream-crlf | 31.68 | 37.31 | 67.72 | 72.77 | -7.4% |
| family-restore-crlf | 118.11 | 97.87 | 216.52 | 189.32 | 12.6% |
| chunks-mixed-1 | 267.48 | 272.94 | 419.87 | 429.42 | -2.3% |
| chunks-mixed-8 | 44.65 | 44.47 | 94.44 | 91.55 | 3.1% |
| chunks-mixed-128 | 8.51 | 8.16 | 25.33 | 25.05 | 1.1% |
| chunks-mixed-512 | 5.71 | 5.49 | 25.44 | 26.24 | -3.1% |
| chunks-table-1 | 2414.51 | 2264.56 | 2611.61 | 2479.43 | 5.1% |
| chunks-table-8 | 342.71 | 323.34 | 529.89 | 505.61 | 4.6% |
| chunks-table-128 | 51.55 | 48.43 | 99.42 | 91.67 | 7.8% |
| chunks-table-512 | 18.96 | 18.47 | 45.39 | 52.04 | -14.7% |
| chunks-fence-1 | 572.61 | 569.16 | 646.03 | 632.49 | 2.1% |
| chunks-fence-8 | 78.75 | 78.33 | 118.91 | 113.97 | 4.2% |
| chunks-fence-128 | 9.83 | 9.67 | 25.38 | 22.02 | 13.2% |
| chunks-fence-512 | 3.11 | 3.07 | 12.58 | 11.35 | 9.8% |
| options-source-map | 44.70 | 43.59 | 83.28 | 74.00 | 11.1% |
| options-restore-source-map | 130.35 | 108.71 | 247.15 | 213.91 | 13.4% |
| options-transform | 82.53 | 87.55 | 135.14 | 138.86 | -2.8% |
| options-restore-transform | 128.60 | 103.87 | 236.23 | 200.59 | 15.1% |
| options-no-reuse | 35.02 | 41.36 | 70.70 | 73.03 | -3.3% |
| options-restore-no-reuse | 124.17 | 103.33 | 246.34 | 209.24 | 15.1% |
| options-sync | 91.03 | 90.82 | 166.52 | 163.05 | 2.1% |
| options-restore-sync | 124.58 | 104.00 | 227.85 | 204.41 | 10.3% |
| history-restore-100000 | 81.92 | 73.38 | 158.04 | 153.73 | 2.7% |
| history-restore-1000000 | 510.01 | 452.82 | 801.43 | 728.56 | 9.1% |
| real-readme-stream | 125.52 | 124.26 | 188.71 | 183.47 | 2.8% |
| real-readme-restore | 170.83 | 169.66 | 268.43 | 266.49 | 0.7% |
| edits-and-final | 18.28 | 16.81 | 41.80 | 39.02 | 6.6% |

[全部原始样本、初版 CI 数据、逐帧诊断与修正后的本地门禁数据](./perf-stream-history-ci-followup.json)。矩阵原始样本按 `sampleFields` 列序压缩，其余 CI 数据保留原结构。

复现矩阵时使用[此前报告的命令](./perf-stream-history-2026-09-07.md#复现最终方案)，将消费端候选提交 `2f3ea6f1e3db36513578d71012419409743fa338` 替换为 `4479403310113f79f43e32c638469e3d849107b5`，保持基线、底层构建、冻结 README 和参数不变。CI 门禁按 markstream-vue `.github/workflows/benchmark-1-0.yml` 的 base/head 构建与测量步骤执行；本地命令没有放宽门槛或重置性能基线。
