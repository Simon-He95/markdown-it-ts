# Markstream streaming / history CPU 实验（2026-09-07）

最终仅保留 Markstream 消费端的整组 inline 候选筛选。每轮 core linkify 执行前验证一次原生方法、REBuilder 和配置；如果一组 inline 的所有文本都没有链接起始特征，直接排除这组候选。含候选的 inline 及本次 core 调用中其后的所有 inline 完整执行原有过滤路径，避免 validator 在调用中修改配置后误用旧判断，`linkify.test()` / `match()` 本身保持不变。

筛选包含 `:`、`@`、`//`、后接非空白字符的 `.`，不会把普通句末标点当作域名。自定义 test / matcher / REBuilder、实例正则生成方法、无冒号 schema、含正则语法的 TLD 都绕过筛选；`add()` / `set()` / `tlds()` 更换正则缓存后重新判断。使用真实解析后的文本，不依据原始 Markdown 猜测链接，也不共享正则、AST 或插件状态。

markdown-it-ts 的生产代码最终没有保留改动。此前的表格增量、core 筛选改动和 `test()` 包装都已撤回：有的只加速内置规则，有的在消费端引入回退，有的没有稳定独立收益。本仓库保留基准覆盖和实验数据；生产改动及回归测试提交到 markstream-vue。

## 范围与方法

- 基线：markdown-it-ts `215b8a69d509037b59021f3fde5ea5782dfbe806`。消费端基线为 markstream-vue `c7481e89ea06e5591fb4a1856793654a12e188ee`，候选为 `2f3ea6f1e3db36513578d71012419409743fa338`，从源码打包并将 markdown-it-ts externalize 到对应 dist。候选只修改消费端 factory 的候选过滤，底层两侧使用同一冻结构建。
- Node v24.16.0 / Apple M1 Pro / darwin arm64。5 轮独立子进程，每个子进程完整预热 2 次，轮间反转版本顺序；计时期间本任务不并行执行测试、构建或其他基准。桌面其他应用未关闭，小幅差异需要复测。
- 61 个场景覆盖正文、格式、链接、列表、表格、代码、公式、HTML、容器、引用、Unicode、CRLF、长段落、1/8/32/97/128/211/512 字符分片、source map、hook、同步、关闭节点复用、重复输入、编辑回退和 final 切换，以及真实 README。
- 每帧／每条历史消息的结构化 JSON SHA-256 在独立的非计时阶段对比；最终两侧全部一致。另用回归测试补充自定义扩展和严格输出断言。JSON digest 不证明原型、undefined 自有属性或对象身份完全一致。
- `restore-*` 包含新建解析器和首次 `final:true` 解析，保留全部返回节点；100 条消息每条约 3–4k 字符，family/options 为 60 条。`history-restore-100000/1000000` 是单篇大历史的首次解析；`history-tail-*` 是预先解析历史后再追加 31 帧，后者不含首次恢复。
- 模块／JIT 已预热，首次解析不等于进程冷启动。CPU 为 `process.cpuUsage()` 的 user+system 时间，包含进程内其他线程。测量不含网络、Vue mount、布局、Monaco、KaTeX 和 Mermaid；不将未强制回收的堆差值当作存活内存收益。
- Profile：恢复场景中正则相关构建和匹配占据明显 CPU；节点收尾 `visit` 自耗时约 10.7%。表格 streaming 的 block table、escapedSplit、结构分组和锚点验证仍会重复执行。样本百分比仅用于定位，不等于可实现的端到端提速。

## 结果与限制

有明确收益的是无链接长段落和首次消息解析：长段落 streaming CPU 降低 21.9%，长段落恢复降低 37.0%，100 条 mixed 历史恢复降低 14.6%，100 条表格历史恢复降低 10.2%。这是解析阶段的测量值，不能等同于完整 UI 恢复的提速比例。100k / 1m 单篇恢复 CPU 分别降低 6.6% / 5.4%，没有取得数量级提升。

**没有证明所有场景都更快。** 最终全矩阵中 prose/mixed/table streaming 基本持平；链接、Unicode、CRLF、hook、关闭复用和 README streaming 存在 CPU 回退。短 fence 场景还出现较大的相对波动。下面完整保留所有数据，负数表示 CPU 增加，耗时和 CPU 均为五轮中位数、单位 ms。

| 场景 | 基线耗时 | 候选耗时 | 基线 CPU | 候选 CPU | CPU 降低 |
|---|---:|---:|---:|---:|---:|
| stream-prose | 93.07 | 94.43 | 125.66 | 125.92 | -0.2% |
| stream-mixed | 139.06 | 141.09 | 178.50 | 181.88 | -1.9% |
| stream-fence | 119.10 | 118.55 | 169.26 | 172.89 | -2.1% |
| stream-table | 540.43 | 552.40 | 752.81 | 746.43 | 0.8% |
| history-tail-100000 | 25.10 | 24.63 | 36.04 | 34.71 | 3.7% |
| history-tail-1000000 | 261.76 | 281.03 | 289.38 | 291.31 | -0.7% |
| restore-mixed-100-messages | 245.41 | 199.12 | 438.08 | 373.93 | 14.6% |
| restore-table-100-messages | 230.68 | 221.78 | 410.00 | 368.21 | 10.2% |
| family-stream-plain-text | 14.44 | 14.08 | 28.57 | 28.23 | 1.2% |
| family-restore-plain-text | 65.02 | 45.03 | 113.69 | 90.82 | 20.1% |
| family-stream-inline-formatting | 20.79 | 19.76 | 38.63 | 38.17 | 1.2% |
| family-restore-inline-formatting | 107.38 | 82.86 | 216.83 | 181.66 | 16.2% |
| family-stream-links-media-autolinks | 23.97 | 26.68 | 49.43 | 51.99 | -5.2% |
| family-restore-links-media-autolinks | 92.36 | 88.89 | 173.16 | 178.20 | -2.9% |
| family-stream-nested-blocks | 27.83 | 24.59 | 48.14 | 46.94 | 2.5% |
| family-restore-nested-blocks | 113.00 | 88.26 | 232.37 | 197.12 | 15.2% |
| family-stream-tables-strikethrough | 23.15 | 20.45 | 44.17 | 39.74 | 10.0% |
| family-restore-tables-strikethrough | 112.14 | 94.01 | 218.04 | 198.59 | 8.9% |
| family-stream-fenced-code | 8.98 | 8.97 | 22.75 | 23.07 | -1.4% |
| family-restore-fenced-code | 37.99 | 22.91 | 75.87 | 57.92 | 23.7% |
| family-stream-feature-mixed | 32.38 | 29.52 | 65.09 | 64.74 | 0.5% |
| family-restore-feature-mixed | 129.95 | 108.22 | 249.03 | 232.52 | 6.6% |
| family-stream-math | 62.48 | 61.11 | 112.70 | 115.53 | -2.5% |
| family-restore-math | 95.65 | 77.70 | 168.82 | 150.04 | 11.1% |
| family-stream-html | 49.47 | 49.53 | 102.77 | 104.13 | -1.3% |
| family-restore-html | 190.93 | 176.05 | 352.02 | 323.40 | 8.1% |
| family-stream-containers | 147.66 | 141.88 | 315.47 | 307.58 | 2.5% |
| family-restore-containers | 142.58 | 124.95 | 268.23 | 242.68 | 9.5% |
| family-stream-references | 96.55 | 96.73 | 185.46 | 189.85 | -2.4% |
| family-restore-references | 88.21 | 63.36 | 164.69 | 138.03 | 16.2% |
| family-stream-unicode-links | 53.88 | 61.17 | 89.19 | 94.11 | -5.5% |
| family-restore-unicode-links | 191.76 | 191.44 | 350.22 | 343.02 | 2.1% |
| family-stream-long-paragraph | 89.25 | 61.56 | 154.31 | 120.46 | 21.9% |
| family-restore-long-paragraph | 103.58 | 55.53 | 190.91 | 120.31 | 37.0% |
| family-stream-crlf | 31.12 | 37.85 | 67.71 | 72.70 | -7.4% |
| family-restore-crlf | 120.71 | 100.03 | 212.88 | 193.37 | 9.2% |
| chunks-mixed-1 | 262.53 | 272.29 | 418.09 | 431.11 | -3.1% |
| chunks-mixed-8 | 42.67 | 44.25 | 88.81 | 90.75 | -2.2% |
| chunks-mixed-128 | 8.43 | 8.16 | 25.17 | 25.06 | 0.4% |
| chunks-mixed-512 | 6.65 | 5.38 | 28.67 | 24.24 | 15.5% |
| chunks-table-1 | 2436.40 | 2351.57 | 2610.38 | 2508.26 | 3.9% |
| chunks-table-8 | 363.71 | 326.76 | 550.27 | 509.52 | 7.4% |
| chunks-table-128 | 52.31 | 48.05 | 99.10 | 94.56 | 4.6% |
| chunks-table-512 | 19.42 | 18.87 | 49.12 | 48.58 | 1.1% |
| chunks-fence-1 | 574.80 | 588.32 | 638.89 | 652.97 | -2.2% |
| chunks-fence-8 | 79.85 | 79.37 | 117.56 | 119.64 | -1.8% |
| chunks-fence-128 | 9.48 | 10.50 | 23.04 | 25.10 | -9.0% |
| chunks-fence-512 | 3.19 | 3.89 | 11.62 | 15.99 | -37.6% |
| options-source-map | 46.27 | 44.99 | 81.08 | 80.09 | 1.2% |
| options-restore-source-map | 133.33 | 108.13 | 248.25 | 226.87 | 8.6% |
| options-transform | 83.01 | 87.90 | 133.27 | 144.95 | -8.8% |
| options-restore-transform | 133.87 | 109.32 | 246.38 | 208.11 | 15.5% |
| options-no-reuse | 35.88 | 44.05 | 66.89 | 77.20 | -15.4% |
| options-restore-no-reuse | 125.79 | 105.13 | 245.33 | 213.11 | 13.1% |
| options-sync | 93.05 | 94.60 | 168.97 | 165.55 | 2.0% |
| options-restore-sync | 124.13 | 107.61 | 225.53 | 212.51 | 5.8% |
| history-restore-100000 | 84.43 | 79.91 | 162.76 | 151.98 | 6.6% |
| history-restore-1000000 | 511.09 | 463.02 | 791.61 | 748.99 | 5.4% |
| real-readme-stream | 120.48 | 126.36 | 178.76 | 190.32 | -6.5% |
| real-readme-restore | 170.23 | 172.40 | 268.04 | 270.30 | -0.8% |
| edits-and-final | 18.34 | 17.12 | 40.68 | 40.20 | 1.2% |

全矩阵 CRLF、hook、关闭复用的 CPU 分别增加 7.4%、8.8%、15.4%。针对这三项再做 7 轮、每轮 50 次完整预热，结果如下。原始数据中的 `combined` 是最终保留代码，`candidate` 是随后撤回的热正则旁路实验；不能将两个候选混为一谈。

| 充分预热复测 | 基线耗时 | 保留方案耗时 | 基线 CPU | 保留方案 CPU | CPU 降低 |
|---|---:|---:|---:|---:|---:|
| family-stream-crlf | 12.31 | 9.92 | 21.63 | 20.23 | 6.5% |
| options-transform | 73.06 | 70.05 | 131.44 | 124.37 | 5.4% |
| options-no-reuse | 24.44 | 26.51 | 61.13 | 61.59 | -0.7% |

这表明短流结果对 JIT、工作负载顺序和 GC 状态敏感；充分预热后的复测不能抹去全矩阵回退，也不能证明冷路径无代价。测量期间曾观察到系统文件索引占用较多 CPU，未停止用户应用或系统服务。保留此方案的依据是实际消费端的恢复和长段落收益、较小的实现范围及通过的输出检查；不是普遍加速承诺。

## 实验取舍

下列本轮实验的所有计时样本、版本标记、bundle/workload 哈希和一致性结果见 [原始数据](./perf-stream-history-2026-09-07.json)。早期候选可能组合了后来撤回的改动，不能用其结果替代最终 `final-results` 矩阵。

| 方向 | 证据与决策 |
|---|---|
| 内置表格末行增量复用 | 30 个底层场景验证，合成表格 CPU 可降低约 64–85%；但 Markstream 自定义规则使这一路径不可用，消费端没有稳定收益。撤回全部底层改动。 |
| core linkify 起始字符筛选 | 消费端已在调用 core 前执行 `.test()`；不少场景根本没有进入 `.match()`，组合消融未证明独立收益。撤回。 |
| 包装原生 `.test()`，包括持续包装、一次性包装、句末点筛选和小正则 | 恢复有所改善，但多种 streaming 出现回退；公开方法身份和重复 guard 也是额外负担。全部撤回，原生方法保持不变。 |
| 预热 / 克隆默认 RegExp | 无可靠额外收益，且有语义反例：先 `test('example.com')`，再替换 `re.get_mail_name` 返回 `/CUSTOM/`，最后 `test('mailto:foo@example.com')`；原生返回 false，预热版为 true。撤回。 |
| cache identity / for-in guard、节点 finalizer 跳过 primitive | 消费端恢复变化约 0–2%，没有稳定独立收益。未保留。 |
| 消费端逐 text 筛选 | 每个节点重复筛选使链接场景变慢。撤回，改为只筛选整个 inline 组。 |
| 消费端整组 inline 筛选 | **唯一保留的生产改动。** 见最终 61 场景和完整回归测试。首次出现可能执行 validator 的 inline 后停止本批筛选；新增同调用修改 schema 的反例在修正前失败、修正后通过。 |
| 已编译正则的额外旁路 | 5 轮聚焦与 7 轮充分预热对比未证明稳定边际收益，部分场景只是噪声。撤回，最终源码与完整测试时的版本逐字节一致。 |
| Worker 并行恢复、持久化 AST、表格节点签名缓存 | 沿用 [9 月 5 日已执行的实验](./perf-markstream-consumer.md)，本轮未重新测量。4 Worker 降低 wall 但增加总 CPU；AST 序列化约为源文 13 倍且绕过有状态 hook 会改变效果；表格 JSON 签名成本超过转换。没有将它们默认启用。 |

仍未消除的主要成本包括长表格的 block 解析、escapedSplit、分组/锚点检查和消费端节点遍历。支持任意插件、回调副作用和所有 streaming 中间态时，不能直接把这些阶段改成局部更新。进一步重写需要先建立可验证的插件契约；本轮没有为潜在收益加入生产开关或共享可变缓存。

## 验证

- 最终 61 个消费场景逐帧 / 逐消息 JSON 摘要全部一致；时间测量与摘要计算分开。
- linkify 专项 20 项通过，包括七份语料的每字符前缀、final、协议相对链接、IDN、HTML anchor、表格、引用，以及替换 test/matcher/REBuilder、无冒号 schema、正则 TLD 和同一次 validator 内修改配置。
- markstream-vue：350 个测试文件、3088 项通过；`pnpm lint`、`pnpm typecheck`、parser package typecheck 和生产构建通过。完整测试命令排除 `.tmp/**`，因为其中存在之前基准用的源码副本，不排除真实项目测试。
- markdown-it-ts：开启慢速 streaming 测试后 61 个文件、1187 项通过（另 2 个文件 / 9 项跳过）；lint、typecheck、test:types、构建及基准脚本语法检查通过。
- 两侧底层 dist 的 JS 内容哈希完全相同：`d3469685c4ef6b51f84c7b13aa582a5037f44a5ecaf06ba3576a0d1e918fb074`。算法为按文件名排序，将每个 dist/*.js 的 basename 和内容依次输入 SHA-256。
- 主 playground 加载 / replay smoke 通过，LCP 340ms、CLS 0。该首页样本没有重型渲染块，不能据此声称 Monaco/Mermaid/D2 的完整历史恢复已验证。

- 富内容 `/test` playground：代码、Mermaid、Infographic、D2 完整滚动后全部就绪，fallback 为 0，LCP 552ms、CLS 0、完整滚动后 DOM 513 个。首轮原脚本运行超过 5 分钟没有完成；停止本次检查的进程树后，用临时副本增加阶段日志、120 秒总时限和 100 次滚动上限，重跑原有断言通过（实际仅 6 次滚动）。没有更改产品代码或放宽任何预算。这是当前版本 smoke，不是基线配对的 UI 提速实验。

## 复现最终方案

在本仓库执行，要求相邻 markstream-vue 的依赖已通过 pnpm 安装。以下固定两个源码版本、README 和同一底层构建；消费端必须 externalize markdown-it-ts，不能只替换 node_modules 后比较已内嵌底层的发布 bundle。

```sh
export MDTS_PERF_DIR="$(mktemp -d /tmp/mdts-consumer.XXXXXX)"
export MARKSTREAM_PROJECT_ROOT="$(cd ../markstream-vue && pwd)"
mkdir -p "$MDTS_PERF_DIR/parser" "$MDTS_PERF_DIR/base" "$MDTS_PERF_DIR/retained"
git archive 215b8a69d509037b59021f3fde5ea5782dfbe806 | tar -x -C "$MDTS_PERF_DIR/parser"
ln -s "$PWD/node_modules" "$MDTS_PERF_DIR/parser/node_modules"
(cd "$MDTS_PERF_DIR/parser" && pnpm build)
git -C "$MARKSTREAM_PROJECT_ROOT" archive c7481e89ea06e5591fb4a1856793654a12e188ee packages/markdown-parser/src | tar -x -C "$MDTS_PERF_DIR/base"
git -C "$MARKSTREAM_PROJECT_ROOT" archive 2f3ea6f1e3db36513578d71012419409743fa338 packages/markdown-parser/src | tar -x -C "$MDTS_PERF_DIR/retained"
for variant in base retained; do
  ln -s "$MARKSTREAM_PROJECT_ROOT/packages/markdown-parser/node_modules" "$MDTS_PERF_DIR/$variant/packages/markdown-parser/node_modules"
  pnpm exec tsdown "$MDTS_PERF_DIR/$variant/packages/markdown-parser/src/index.ts" --no-config --no-dts --external markdown-it-ts --out-dir "$MDTS_PERF_DIR/$variant-bundle"
done
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const dir = process.env.MDTS_PERF_DIR
for (const variant of ['base', 'retained']) {
  const source = readFileSync(`${dir}/${variant}-bundle/index.js`, 'utf8')
  if (!source.includes('from "markdown-it-ts"'))
    throw new Error('markdown-it-ts must be externalized')
  writeFileSync(`${dir}/${variant}.mjs`, source.replace('from "markdown-it-ts"', `from ${JSON.stringify(pathToFileURL(`${dir}/parser/dist/index.js`).href)}`))
}
JS
node scripts/perf-markstream-consumer.mjs \
  --baseline="$MDTS_PERF_DIR/base.mjs" --candidate="$MDTS_PERF_DIR/retained.mjs" \
  --readme="$MDTS_PERF_DIR/parser/README.md" \
  --suite=extended --rounds=5 --warmups=2 --output="$MDTS_PERF_DIR/results.json"
node scripts/perf-markstream-consumer.mjs \
  --baseline="$MDTS_PERF_DIR/base.mjs" --candidate="$MDTS_PERF_DIR/retained.mjs" \
  --readme="$MDTS_PERF_DIR/parser/README.md" \
  '--cases=^(family-stream-crlf|options-transform|options-no-reuse)$' \
  --suite=extended --rounds=7 --warmups=50 --output="$MDTS_PERF_DIR/steady-state.json"
```

原始数据为控制体积，将逐轮样本保存为 `[wallMs, cpuMs, tokenizeMs, processTokensMs]`；JSON 的 `sampleFields` 定义列序。早期 stock-only 样本只有 wall/CPU 两列。所有最终中位数可从逐轮样本重新计算；实验路径只用于溯源，复现无需依赖本机 `/tmp` 文件。已撤回的实验数据用于解释取舍，不是对这些未保留实现的独立源码复现承诺。
