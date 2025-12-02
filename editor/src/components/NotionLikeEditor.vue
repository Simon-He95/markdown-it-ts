<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import MarkdownIt from 'markdown-it-ts'

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const defaultDoc = `# Welcome to Notion-like template ✨

> 💌 **Invite your colleagues to make this fun!**  
> Just copy the URL from your browser and share it — everyone with the link can join in and collaborate in real time.

Start writing your thoughts here … ✏️
Try some **Markdown**:

\`\`\`
# Headings
- Lists
> Quotes
\`Inline code\`
\`\`\`

Or type \`/\` to open the command menu and discover blocks, formatting, and hidden features.

---

## Make it yours
- Swap the cover, add reactions, or drop in embeds.
- Press **Cmd + Shift + P** to open the global command palette.
- Run \`/callout\` to add more friendly hints.

### Next steps
1. Outline your plan for the week
2. Assign owners and due dates
3. Share the doc with your team 🚀`

const presence = ref(['AL', 'KP', 'JT'])
const shortcuts = ['⌘ + B bold', '⌘ + / command menu', '⌘ + Shift + P palette']

const editor = useEditor({
  content: md.render(defaultDoc),
  extensions: [
    StarterKit.configure({
      codeBlock: false,
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: '使用 Markdown 或输入 / 开始写作…',
      showOnlyWhenEditable: true,
    }),
    Highlight,
    Underline,
    Link.configure({
      openOnClick: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  editorProps: {
    attributes: {
      class: 'notion-prose',
    },
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="notion-app">
    <header class="notion-topbar">
      <div class="topbar-left">
        <button class="ghost-btn" type="button">☰</button>
        <button class="ghost-btn" type="button">＋</button>
      </div>
      <div class="topbar-right">
        <button class="ghost-btn" type="button">↺</button>
        <button class="ghost-btn" type="button">↻</button>
        <button class="ghost-btn" type="button">☀︎</button>
        <div class="presence">
          <span v-for="avatar in presence" :key="avatar">{{ avatar }}</span>
        </div>
      </div>
    </header>

    <section class="notion-board">
      <div class="board-toolbar">
        <div class="breadcrumbs">
          <span>Templates</span>
          <span>›</span>
          <strong>Notion-like editor</strong>
        </div>
        <div class="board-controls">
          <button class="ghost-btn" type="button">Undo</button>
          <button class="ghost-btn" type="button">Redo</button>
          <button class="pill-btn" type="button">Share</button>
        </div>
      </div>

      <div class="board-card">
        <div class="doc-pill">Try Markdown</div>
        <p class="doc-hint">Start with this template, then remix it for your own rituals.</p>
        <EditorContent v-if="editor" :editor="editor" class="notion-editor" />
        <div class="doc-shortcuts">
          <span v-for="tip in shortcuts" :key="tip">{{ tip }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notion-app {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.notion-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 0.85rem 1.2rem;
  border-radius: 1.25rem;
  box-shadow: 0 20px 60px rgba(19, 44, 91, 0.08);
}

.topbar-left,
.topbar-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ghost-btn {
  border: none;
  background: #f2f4ff;
  padding: 0.35rem 0.75rem;
  border-radius: 0.85rem;
  font-weight: 600;
  color: #43485f;
  cursor: pointer;
}

.presence {
  display: flex;
  gap: 0.35rem;
}

.presence span {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1f2235;
  color: #fff;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.notion-board {
  background: linear-gradient(145deg, rgba(126, 247, 212, 0.2), rgba(63, 222, 236, 0.25));
  border-radius: 1.75rem;
  padding: 1.25rem;
  box-shadow: 0 30px 90px rgba(25, 38, 100, 0.1);
}

.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.breadcrumbs {
  display: flex;
  gap: 0.35rem;
  color: #53576e;
  font-weight: 500;
}

.board-controls {
  display: flex;
  gap: 0.5rem;
}

.pill-btn {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.95rem;
  background: #fff;
  color: #0f172a;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1);
  cursor: pointer;
}

.board-card {
  background: #fff;
  border-radius: 1.5rem;
  padding: 2rem;
  box-shadow: 0 25px 80px rgba(12, 19, 70, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.doc-pill {
  align-self: flex-start;
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  background: #eef1ff;
  color: #4d5391;
  font-weight: 600;
  font-size: 0.85rem;
}

.doc-hint {
  margin: 0;
  color: #6a6f84;
}

.notion-editor {
  border-radius: 1.25rem;
  border: 1px solid #edf0ff;
  padding: 1.25rem 1.5rem;
}

.notion-prose {
  min-height: 420px;
  font-size: 1.05rem;
  line-height: 1.7;
}

.notion-prose h1,
.notion-prose h2,
.notion-prose h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.notion-prose blockquote {
  border-left: 4px solid #ffd4af;
  background: #fff5ec;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  color: #4b3a2d;
}

.notion-prose pre {
  background: #f5f6fb;
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 0.95rem;
  color: #2f3145;
}

.doc-shortcuts {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.doc-shortcuts span {
  padding: 0.3rem 0.75rem;
  border-radius: 0.9rem;
  background: #f4f6ff;
  color: #5d6077;
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .notion-board {
    padding: 1rem;
  }
  .board-card {
    padding: 1.25rem;
  }
  .notion-topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
}
</style>
