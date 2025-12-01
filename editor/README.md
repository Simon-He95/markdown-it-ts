# markdown-it-ts TipTap Editor

基于 `markdown-it-ts` 与 TipTap 构建的可视化编辑器示例。它演示了如何使用 Markdown 语法驱动 TipTap 内容，并通过自定义扩展注入 `@mention`、emoji、Quote、Image、Video、Superscript/Subscript、Code 等能力。

## 快速开始

```bash
cd editor
pnpm install
pnpm dev
```

默认会在 `http://localhost:5174` 启动一个 Vite + Vue 3 的示例应用。

## 功能要点

- **Markdown 输入面板**实时调用 `markdown-it-ts` 解析，内容双向同步至 TipTap。
- TipTap 编辑器启用了 `StarterKit` 以及 link、image、color、highlight、superscript、subscript、text-align 等常用扩展。
- 自定义注入 `@mention`、emoji 快捷、Callout Quote、Video 等插件示例，展示如何扩展 TipTap。
- 工具栏覆盖撤销/重做、标题、列表、引用、代码、格式化、对齐等操作，并包含 `Add` 面板快捷插入资源。
- 右侧展示解析后的 HTML 预览，可直观验证 markdown-it-ts 的渲染结果。

## 扩展指北

该示例完全依照 TipTap 官方扩展系统编写，你可以直接参考 [TipTap 文档](https://tiptap.dev/guide) 添加自定义功能。项目中包含了三类典型扩展方式：

1. **内置扩展配置**：例如 `@tiptap/extension-link`、`@tiptap/extension-mention`，直接在 `extensions: []` 中 `.configure()` 即可。
2. **自定义 Extension**：在 `MarkdownEditor.vue` 里通过 `Extension.create()` 创建 `EmojiPalette`，重写 `addInputRules` 与 `addCommands` 演示如何注入快捷输入。
3. **自定义 Node**：如 `CalloutQuote`、`VideoNode`，使用 `Node.create()` 定义 schema、parse/render 规则，并提供链式 `commands`。

要追加新插件，只需：

```ts
const editor = useEditor({
  extensions: [
    // 现有扩展…
    YourCustomExtension,
  ],
})
```

如需直接注册 ProseMirror 插件，也可以通过 `editor.registerPlugin()` 或 `editor.view.dispatch()` 方式操作，完全兼容 TipTap 生态。这里只包裹了 UI/交互，数据流仍由 markdown-it-ts 与 TipTap 官方接口驱动。
