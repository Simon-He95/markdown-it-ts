# Markstream 消费场景性能审计（2026-09-05）

基线为 markdown-it-ts@2028739 和 markstream-vue@1dc6f7c37。目标是保持输出、插件和中间态语义不变，减少 Markstream 使用 markdown-it-ts 时的解析 CPU，以及历史消息恢复成本。本轮实验覆盖 12 个方向，最终保留 3 项生产改动；没有修改公开 API、Vue 组件、解析规则或默认功能开关。

## 保留的改动与独立验证

| 改动 | 原因 | 独立实验代表场景 | wall / CPU 降低 |
|---|---|---|---:|
| markdown-it-ts：复用已验证的 append delta | 完整源码 API 已确认追加关系，不再重复比较长历史前缀，并复用已有尾部状态 | 1m 历史尾部追加 | 32.9% / 30.9% |
| Markstream：linkify 语境缓存命中直接返回 | 避免热点 Map key 的反复 delete/set；保持容量和字节上限，改为插入顺序淘汰 | 表格 streaming | 34.0% / 27.4% |
| Markstream：普通单文本节点直接转换 | 省去无用的语境推断、闭包及分派；特殊恢复字符仍走原路径 | 100 条表格历史恢复 | 11.5% / 10.3% |

独立实验使用相同其他改动进行配对。delta/FIFO 各 3 轮；普通文本路径 3 轮，并对波动场景另做 5 轮复测。文本节点复制移除另做 5 轮组合消融，未保留。各实验配置、所有样本及失败方向见 [实验原始数据](./perf-markstream-experiments.json)。普通文本路径在恢复原有 Token 复制后仍有表格恢复收益；mixed streaming 的一次 3 轮实验波动较大，后续 5 轮独立消融 CPU 比为 1.011，不能据此声称它加速 mixed streaming。所有早期实验都明确标记所含其他改动；最终组合以下述矩阵为准。

## 最终代码的 59 场景矩阵

[基准脚本](../scripts/perf-markstream-consumer.mjs) · [全部五轮样本](./perf-markstream-consumer.json)

- Node v24.16.0，Apple M1 Pro，darwin/arm64；5 轮独立子进程，每个子进程完整预热 2 次，轮间反转版本顺序，各场景前 GC。表中为中位数。测试期间本任务不同时运行构建或其他基准；桌面其他应用未关闭，因此小幅波动不能视为保证收益。
- baseline：旧消费端 + 旧底层；candidate：旧消费端 + 新底层；combined：新消费端 + 新底层。Markstream 从源码构建且 externalize 到对应底层 dist；直接替换 node_modules 不能保证其发布 bundle 内嵌的解析器被替换。
- 每次中间结构化输出单独进行 JSON/SHA-256 对比，所有版本一致；序列化不在计时段。JSON 校验不覆盖 undefined 自有属性、对象原型或引用身份，另以严格相等回归测试和完整测试补充。
- CPU 为 process.cpuUsage()，包含同一进程其他线程的 CPU 时间，不是占用百分比。parserMetrics 同时开启以分解 tokenize/processTokens 开销。
- stream 默认约 16k 字符、32 字符一帧；family 约 6k、97 字符一帧；小 chunk 覆盖 1/8/128/512。包含链接、表格、代码、引用、HTML、公式、容器、转义、Unicode、长段落、CRLF、编辑回退、source map、hook、同步和关闭节点复用，以及项目 README。
- history-tail 先解析 100k/1m 历史，再计时尾部 31 帧，**不含首次恢复**。restore 每条消息新建 getMarkdown() 并 final:true，计入实例创建，保留本轮全部返回节点；没有历史 AST 缓存。100-message 每条约 3–4k，family/options 为 60 条。模块和 JIT 已预热，**不代表冷启动进程**。
- 堆差值只是未强制回收的瞬时值，不用于声称精确的存活内存节省。此处测量解析管线，不含 Vue mount、布局、Monaco、KaTeX、Mermaid 或网络。

耗时单位 ms；CPU 降低负值表示回退。小于数毫秒的场景噪声更大；保留完整矩阵，不隐藏回退样本。

| 场景 | 基线耗时 | 仅新底层 | 两边更新 | 仅新底层 CPU 降低 | 两边更新 CPU 降低 |
|---|---:|---:|---:|---:|---:|
| stream-prose | 102.32 | 92.86 | 93.06 | 5.7% | 5.8% |
| stream-mixed | 149.00 | 136.57 | 135.37 | 7.4% | 8.5% |
| stream-fence | 126.01 | 116.74 | 118.38 | 7.4% | 5.8% |
| stream-table | 692.23 | 687.34 | 524.59 | 1.3% | 20.4% |
| history-tail-100000 | 30.50 | 24.10 | 23.77 | 13.8% | 15.7% |
| history-tail-1000000 | 329.01 | 273.18 | 261.82 | 11.9% | 33.0% |
| restore-mixed-100-messages | 255.92 | 262.95 | 238.38 | -1.6% | 3.5% |
| restore-table-100-messages | 282.04 | 285.25 | 211.74 | -0.9% | 17.8% |
| family-stream-plain-text | 14.63 | 14.69 | 15.32 | -0.9% | 0.4% |
| family-restore-plain-text | 65.07 | 64.33 | 62.62 | 0.3% | 1.3% |
| family-stream-inline-formatting | 21.15 | 20.69 | 20.48 | -1.1% | 1.7% |
| family-restore-inline-formatting | 103.81 | 108.13 | 103.68 | -2.3% | -0.9% |
| family-stream-links-media-autolinks | 22.69 | 23.08 | 24.79 | -2.9% | 1.7% |
| family-restore-links-media-autolinks | 90.02 | 87.85 | 88.59 | -2.0% | 1.7% |
| family-stream-nested-blocks | 26.92 | 25.34 | 25.29 | 5.1% | 7.2% |
| family-restore-nested-blocks | 120.59 | 118.79 | 110.54 | 0.8% | 7.0% |
| family-stream-tables-strikethrough | 25.59 | 22.58 | 21.58 | 0.1% | 3.5% |
| family-restore-tables-strikethrough | 129.57 | 128.49 | 115.30 | -0.1% | 4.3% |
| family-stream-fenced-code | 9.85 | 9.82 | 9.79 | -2.6% | -5.0% |
| family-restore-fenced-code | 37.43 | 36.89 | 36.80 | -1.9% | -0.1% |
| family-stream-feature-mixed | 30.37 | 30.90 | 31.11 | -3.1% | -4.9% |
| family-restore-feature-mixed | 136.59 | 142.84 | 139.02 | 0.1% | 0.9% |
| family-stream-math | 83.10 | 83.92 | 63.77 | -5.5% | 10.6% |
| family-restore-math | 129.86 | 132.78 | 95.75 | -2.1% | 22.0% |
| family-stream-html | 47.33 | 47.24 | 47.07 | 0.5% | -0.5% |
| family-restore-html | 214.28 | 215.29 | 189.30 | -0.2% | 4.5% |
| family-stream-containers | 174.95 | 179.25 | 143.96 | -0.8% | 9.8% |
| family-restore-containers | 167.29 | 172.14 | 140.44 | -2.3% | 15.0% |
| family-stream-references | 136.83 | 136.18 | 98.29 | 0.7% | 17.8% |
| family-restore-references | 118.12 | 117.20 | 88.73 | -1.4% | 8.8% |
| family-stream-unicode-links | 56.08 | 56.16 | 55.38 | -0.6% | -0.5% |
| family-restore-unicode-links | 221.46 | 227.04 | 185.44 | -1.2% | 13.3% |
| family-stream-long-paragraph | 84.26 | 88.38 | 87.45 | -2.3% | -3.3% |
| family-restore-long-paragraph | 99.34 | 101.30 | 102.75 | -2.6% | -7.5% |
| family-stream-crlf | 32.13 | 32.44 | 31.67 | -1.9% | -3.4% |
| family-restore-crlf | 129.82 | 132.11 | 118.85 | -2.2% | 5.1% |
| chunks-mixed-1 | 283.64 | 279.73 | 277.38 | 0.3% | 2.3% |
| chunks-mixed-8 | 42.78 | 41.14 | 41.93 | 1.1% | 0.5% |
| chunks-mixed-128 | 8.42 | 8.88 | 8.65 | 2.0% | -4.3% |
| chunks-mixed-512 | 6.84 | 6.25 | 6.27 | 12.4% | 0.1% |
| chunks-table-1 | 3584.40 | 3521.46 | 2402.29 | 1.7% | 31.8% |
| chunks-table-8 | 508.76 | 500.69 | 353.74 | 0.6% | 22.0% |
| chunks-table-128 | 60.02 | 60.49 | 50.61 | -0.7% | 5.9% |
| chunks-table-512 | 23.74 | 23.82 | 19.13 | 2.5% | 16.3% |
| chunks-fence-1 | 572.56 | 582.43 | 575.49 | -1.4% | -1.2% |
| chunks-fence-8 | 79.94 | 78.65 | 78.83 | 1.6% | 0.9% |
| chunks-fence-128 | 9.91 | 9.67 | 9.72 | 1.2% | -2.1% |
| chunks-fence-512 | 3.35 | 3.32 | 3.07 | -59.5% | -25.1% |
| options-source-map | 50.15 | 49.32 | 45.52 | 2.2% | 5.4% |
| options-restore-source-map | 133.20 | 136.37 | 130.03 | -0.2% | 4.3% |
| options-transform | 93.83 | 90.33 | 84.66 | 1.1% | 8.8% |
| options-restore-transform | 129.52 | 132.54 | 128.87 | 2.5% | 4.4% |
| options-no-reuse | 44.30 | 42.01 | 36.04 | 1.0% | 21.1% |
| options-restore-no-reuse | 133.64 | 133.38 | 126.20 | -0.4% | 0.5% |
| options-sync | 97.39 | 98.31 | 92.72 | -0.1% | 0.5% |
| options-restore-sync | 125.14 | 127.34 | 126.28 | -2.1% | -5.0% |
| real-readme-stream | 127.93 | 121.90 | 121.74 | 2.3% | 2.7% |
| real-readme-restore | 171.16 | 170.22 | 165.44 | 1.9% | 2.3% |
| edits-and-final | 19.53 | 19.30 | 17.24 | 6.4% | 16.0% |

底层保留的 delta 改动针对流式尾部路径，不能将普通 final:true 恢复的“仅新底层”波动解释成它的收益。历史恢复的可归因收益集中在消费端缓存和文本转换；并非每种内容都得到相同比例改善。README 语料来自 2028739 的 README，报告记录每个 workload 的哈希和 bundle 哈希；后续 README 性能指标更新会改变默认读取的语料。

最终矩阵仍包含持平和回退：例如长段落恢复 combined CPU +7.5%，显式同步恢复 +5.0%；此前 5 轮独立复测中这些场景接近持平，说明结果对工作负载顺序、GC/JIT 状态敏感。这不等于回退不存在，因此保留两组数据，不声称所有场景都更快。小样本 CPU 的相对波动尤其大（如 fence 512 字符分片），需结合毫秒绝对值阅读。

## 已尝试但撤回的方向

| 方向 | 证据 | 决策 |
|---|---|---|
| 未开启 profiling 时省去 core rule 时钟 | 首轮部分小 chunk 约快 6%，但后续独立消融 mixed streaming CPU 反而 +4.3%，缺乏稳定消费端收益 | 撤回 |
| 多行 getLines 连续源码切片 | 23 场景三轮；小 chunk 的 fence/mixed 有约 6–8% 回退，没有稳定总收益 | 撤回 |
| 缓存 core rule 安全性分析 | 13 场景三轮，没有一致收益 | 撤回 |
| 表格最后一行增量 token 拼接 | 默认表格耗时下降约 50–62%；但读取 table_open.map 并设置 meta 的合法 post-block 插件得到旧行数 61，基线为 62 | 输出契约不成立，撤回 |
| 表格行节点缓存 | 完整 Token JSON 签名使 32/1 字符 streaming 慢约 2.1/2.4 倍 | 比较成本超过转换，撤回 |
| 移除消费端 linkify candidate filter | Unicode streaming 约快 37%，但 restore 和小 chunk 广泛回退，部分约 15% | 撤回 |
| 文本节点不再复制整个 Token | 最初有小幅收益；普通文本路径加入后，五轮消融的大多数 streaming 持平，部分变慢 | 无稳定边际收益，撤回 |
| history Worker（1/2/4） | 100×4k：4 Worker 约 257→116ms，但 CPU 429→551ms；20×100k：811→577ms，但 CPU 1231→2587ms；另有启动和传输成本 | 不能作为 CPU 优化默认启用 |
| history 节点 JSON / structuredClone 缓存 | 100×4k：JSON 约 25ms、clone 56ms；20×100k：129/334ms。节点 JSON 约为 Markdown 的 13 倍；源文相同的有状态 postTransformNodes 两次结果不同 | 自动跳过解析会改变 hook 语义，未加默认缓存 |

[历史架构实验脚本](../scripts/perf-history-experiments.mjs) 包含 Worker 启动、传输、总 CPU、返回结构校验、缓存大小与有状态 hook 反例。JSON 命中速度不包含首次解析、持久化和缓存失效成本。需要 app 明确选择持久化格式和插件契约后，这两条路线才适合另行开发；本次没有留下实验性生产开关。

表格增量反例为 post-block 规则对 table_open 设置 meta.rows = map[1] - map[0] - 2，先输入表头 + 60 行 + 未完成行，再补齐末行并新增一行。即使声明 streamTailLocalPostBlockRules:true，规则仍可依赖整张表，不能推断为行级局部。

## 复现

下面从两个基线提交提取源码，构建相同配置的包；不需要改消费者的依赖文件。

```sh
# 在 markdown-it-ts 仓库执行，要求相邻 markstream-vue 的依赖已安装。
pnpm build
export MDTS_PERF_DIR="$(mktemp -d /tmp/mdts-consumer.XXXXXX)"
export MDTS_PROJECT_ROOT="$PWD"
export MARKSTREAM_PROJECT_ROOT="$(cd ../markstream-vue && pwd)"
mkdir -p "$MDTS_PERF_DIR/base" "$MDTS_PERF_DIR/old-consumer"
git show 2028739:README.md > "$MDTS_PERF_DIR/README.md"
git archive 2028739 | tar -x -C "$MDTS_PERF_DIR/base"
ln -s "$PWD/node_modules" "$MDTS_PERF_DIR/base/node_modules"
(cd "$MDTS_PERF_DIR/base" && pnpm build)
git -C "$MARKSTREAM_PROJECT_ROOT" archive 1dc6f7c37 packages/markdown-parser/src | tar -x -C "$MDTS_PERF_DIR/old-consumer"
ln -s "$MARKSTREAM_PROJECT_ROOT/packages/markdown-parser/node_modules" "$MDTS_PERF_DIR/old-consumer/packages/markdown-parser/node_modules"
pnpm exec tsdown "$MDTS_PERF_DIR/old-consumer/packages/markdown-parser/src/index.ts" --no-config --no-dts --external markdown-it-ts --out-dir "$MDTS_PERF_DIR/old-bundle"
pnpm exec tsdown "$MARKSTREAM_PROJECT_ROOT/packages/markdown-parser/src/index.ts" --no-config --no-dts --external markdown-it-ts --out-dir "$MDTS_PERF_DIR/new-bundle"
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const dir = process.env.MDTS_PERF_DIR
const root = process.env.MDTS_PROJECT_ROOT
for (const [name, bundle, mdts] of [
  ['baseline', 'old-bundle', `${dir}/base/dist/index.js`],
  ['candidate', 'old-bundle', `${root}/dist/index.js`],
  ['combined', 'new-bundle', `${root}/dist/index.js`],
]) {
  const source = readFileSync(`${dir}/${bundle}/index.js`, 'utf8')
  if (!source.includes('from "markdown-it-ts"'))
    throw new Error('markdown-it-ts must be externalized')
  writeFileSync(`${dir}/${name}.mjs`, source.replace('from "markdown-it-ts"', `from ${JSON.stringify(pathToFileURL(mdts).href)}`))
}
JS
node scripts/check-markstream-text-parity.mjs \
  --baseline="$MDTS_PERF_DIR/baseline.mjs" \
  --candidate="$MDTS_PERF_DIR/combined.mjs"
node scripts/perf-markstream-consumer.mjs \
  --baseline="$MDTS_PERF_DIR/baseline.mjs" \
  --candidate="$MDTS_PERF_DIR/candidate.mjs" \
  --combined="$MDTS_PERF_DIR/combined.mjs" \
  --readme="$MDTS_PERF_DIR/README.md" \
  --suite=extended --rounds=5 --warmups=2 --output="$MDTS_PERF_DIR/results.json"
```



## 正确性与检查

- markdown-it-ts：1,187 项测试通过，包括慢速逐字符测试；lint、typecheck、公开类型测试、build、publint、attw 和 bundler smoke 通过。
- Markstream 使用原有依赖：349 文件 / 3,077 项测试通过；全库 lint、全库 typecheck、parser typecheck 通过。排除已有 .tmp 源码副本，避免将临时副本当成测试工程。
- 新回归覆盖完整归一化源码与绝对 map、CR/LF 跨增量、NUL、编辑、后置 reference、snapshot、full-source/delta API 交替、缓存命中与淘汰，以及普通文本的精确对象形状与恢复边界。
- 普通文本 fast path 使用 [严格对比脚本](../scripts/check-markstream-text-parity.mjs)，对最终版本与原始基线做 2,328 个去重后的 content/raw/final 组合检查，全部通过，覆盖 ASCII 字符和恢复边界。
- 为使全库 lint 通过，等价改写了基线已有的 5 项 lint 错误：URL 字符类使用 ASCII \w，三个 indexOf 检查改 includes。最终构建及矩阵包含这两处语法改写。

- 最终本地联动验证：启用 MARKSTREAM_VUE_BUILD_PARSER=1 重建并链接底层与消费端，349 文件 / 3,077 项测试全部通过；dependency files、lockfile、parser dist 和依赖安装均已恢复。
- Markstream playground 的现有 main-playground-performance E2E（加载、滚动、重播）通过；这是 sanity check，不作为浏览器端提速比例的证据。
- 最终性能方法校验、README 指标校验通过；生产依赖 audit 无已知漏洞。perf:check:latest 因归档基线为 Linux/Node 20、本机为 macOS/Node 24 自动跳过，不能声称该跨机器回归门禁通过；上面的相同机器配对基准才是本次性能证据。
