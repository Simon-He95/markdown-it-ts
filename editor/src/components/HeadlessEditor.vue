<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'

const sampleContent = `<h1>Hi there,</h1>
<p>this is a <em>basic</em> example of <strong>Tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:</p>
<ul>
  <li>That’s a bullet list with one …</li>
  <li>… or two list items.</li>
</ul>
<p>Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:</p>
<pre><code>body {
  display: none;
}</code></pre>
<p>I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.</p>
<blockquote>
  <p>Wow, that’s amazing. Good work, boy! 👏</p>
  <cite>— Mom</cite>
</blockquote>`

const editor = useEditor({
  content: sampleContent,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: true,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
})

const controls = [
  { label: 'Bold', action: () => editor.value?.chain().focus().toggleBold().run(), active: () => editor.value?.isActive('bold') ?? false },
  { label: 'Italic', action: () => editor.value?.chain().focus().toggleItalic().run(), active: () => editor.value?.isActive('italic') ?? false },
  { label: 'Strike', action: () => editor.value?.chain().focus().toggleStrike().run(), active: () => editor.value?.isActive('strike') ?? false },
  { label: 'Code', action: () => editor.value?.chain().focus().toggleCode().run(), active: () => editor.value?.isActive('code') ?? false },
  { label: 'Clear marks', action: () => editor.value?.chain().focus().unsetAllMarks().run(), active: () => false },
  { label: 'Clear nodes', action: () => editor.value?.chain().focus().clearNodes().run(), active: () => false },
  { label: 'Paragraph', action: () => editor.value?.chain().focus().setParagraph().run(), active: () => editor.value?.isActive('paragraph') ?? false },
  { label: 'H1', action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => editor.value?.isActive('heading', { level: 1 }) ?? false },
  { label: 'H2', action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor.value?.isActive('heading', { level: 2 }) ?? false },
  { label: 'H3', action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor.value?.isActive('heading', { level: 3 }) ?? false },
  { label: 'H4', action: () => editor.value?.chain().focus().toggleHeading({ level: 4 }).run(), active: () => editor.value?.isActive('heading', { level: 4 }) ?? false },
  { label: 'H5', action: () => editor.value?.chain().focus().toggleHeading({ level: 5 }).run(), active: () => editor.value?.isActive('heading', { level: 5 }) ?? false },
  { label: 'H6', action: () => editor.value?.chain().focus().toggleHeading({ level: 6 }).run(), active: () => editor.value?.isActive('heading', { level: 6 }) ?? false },
  { label: 'Bullet list', action: () => editor.value?.chain().focus().toggleBulletList().run(), active: () => editor.value?.isActive('bulletList') ?? false },
  { label: 'Ordered list', action: () => editor.value?.chain().focus().toggleOrderedList().run(), active: () => editor.value?.isActive('orderedList') ?? false },
  { label: 'Code block', action: () => editor.value?.chain().focus().toggleCodeBlock().run(), active: () => editor.value?.isActive('codeBlock') ?? false },
  { label: 'Blockquote', action: () => editor.value?.chain().focus().toggleBlockquote().run(), active: () => editor.value?.isActive('blockquote') ?? false },
  { label: 'Horizontal rule', action: () => editor.value?.chain().focus().setHorizontalRule().run(), active: () => false },
  { label: 'Hard break', action: () => editor.value?.chain().focus().setHardBreak().run(), active: () => false },
]

const undo = () => editor.value?.chain().focus().undo().run()
const redo = () => editor.value?.chain().focus().redo().run()
const canUndo = () => editor.value?.can().undo() ?? false
const canRedo = () => editor.value?.can().redo() ?? false

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="headless-wrapper">
    <div class="headless-shell">
      <div class="headless-toolbar">
        <div class="headless-toolbar__group">
          <button
            v-for="control in controls"
            :key="control.label"
            class="headless-btn"
            :class="{ 'is-active': control.active() }"
            type="button"
            @mousedown.prevent
            @click="control.action"
          >
            {{ control.label }}
          </button>
        </div>
        <div class="headless-toolbar__history">
          <button class="headless-btn headless-btn--ghost" type="button" :disabled="!canUndo()" @mousedown.prevent @click="undo">
            Undo
          </button>
          <button class="headless-btn headless-btn--ghost" type="button" :disabled="!canRedo()" @mousedown.prevent @click="redo">
            Redo
          </button>
        </div>
      </div>

      <section class="headless-editor-card">
        <EditorContent v-if="editor" :editor="editor" class="tiptap-output" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.headless-wrapper {
  background: linear-gradient(135deg, rgba(152, 239, 221, 0.25), rgba(255, 211, 169, 0.25));
  padding: 1.25rem;
  border-radius: 2.25rem;
}

.headless-shell {
  background: #fff;
  border-radius: 1.8rem;
  padding: 1.5rem;
  box-shadow: 0 30px 80px rgba(12, 17, 49, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.headless-toolbar {
  background: #f6f6fb;
  border-radius: 1.25rem;
  padding: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.headless-toolbar__group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  flex: 1;
}

.headless-toolbar__history {
  display: flex;
  gap: 0.35rem;
}

.headless-btn {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  background: #ebebf2;
  font-weight: 600;
  color: #3e4156;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.headless-btn.is-active {
  background: #6f3dff;
  color: #fff;
  box-shadow: 0 6px 16px rgba(111, 61, 255, 0.25);
}

.headless-btn--ghost {
  background: #f2f2f5;
  color: #b3b5c7;
  border: 1px dashed rgba(179, 181, 199, 0.5);
}

.headless-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.headless-editor-card {
  border-radius: 1.7rem;
  padding: 1.75rem;
  background: #fff;
  box-shadow: 0 20px 50px rgba(10, 14, 43, 0.08);
}

.tiptap-output {
  min-height: 420px;
  font-size: 1.02rem;
  line-height: 1.7;
}

.tiptap-output pre {
  background: #26201c;
  color: #fff;
  padding: 1.2rem 1.4rem;
  border-radius: 1.2rem;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 0.95rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 18px 40px rgba(10, 10, 20, 0.35);
  overflow-x: auto;
}

.tiptap-output blockquote {
  border-left: 4px solid #e8e9f2;
  padding-left: 1.1rem;
  color: #50515f;
  font-style: italic;
  margin-left: 0;
  background: #fbfbfe;
  border-radius: 0 0.75rem 0.75rem 0;
}

.tiptap-output h1 {
  margin-top: 0;
}

@media (max-width: 900px) {
  .headless-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .headless-toolbar__history {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
