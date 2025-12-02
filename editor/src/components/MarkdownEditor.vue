<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { BubbleMenu, EditorContent, VueRenderer, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import CharacterCount from '@tiptap/extension-character-count'
import Mention from '@tiptap/extension-mention'
import MentionList from './MentionList.vue'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Extension, InputRule, Node, mergeAttributes } from '@tiptap/core'
import MarkdownIt from 'markdown-it-ts'
import { common, createLowlight } from 'lowlight'
import { nanoid } from 'nanoid'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

const lowlight = createLowlight(common)

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const escapeHtml = (input: string) => {
  if (!/[&<>"]/.test(input))
    return input
  return input.replace(/[&<>"]/g, char => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return char
    }
  })
}

md.renderer.rules.code_inline = (tokens, idx, _options, _env, self) => {
  const token = tokens[idx]
  return `<code${self.renderAttrs(token)}>${escapeHtml(token.content)}</code>`
}

interface MentionItem {
  id: string
  label: string
  role: string
  avatar: string
}

const mentionUsers: MentionItem[] = [
  { id: nanoid(), label: 'Ava Stone', role: 'Product Manager', avatar: '🧠' },
  { id: nanoid(), label: 'Leo Liang', role: 'Design lead', avatar: '🎨' },
  { id: nanoid(), label: 'Mia Chen', role: 'Frontend Dev', avatar: '💻' },
  { id: nanoid(), label: 'Kai Huang', role: 'QA Specialist', avatar: '🔍' },
  { id: nanoid(), label: 'Nova Tan', role: 'AI Assistant', avatar: '✨' },
]

const emojiMap: Record<string, string> = {
  sparkles: '✨',
  rocket: '🚀',
  party: '🥳',
  clap: '👏',
  idea: '💡',
  fire: '🔥',
  eyes: '👀',
  star: '🌟',
  wave: '👋',
  heart: '❤️',
}

const emojiInputRule = new InputRule({
  find: /:(\w+):$/,
  handler: ({ state, range, match }) => {
    const [, name] = match
    const emoji = emojiMap[name]
    if (!emoji)
      return null
    const tr = state.tr.insertText(emoji, range.from, range.to)
    return tr
  },
})

const EmojiPalette = Extension.create({
  name: 'emojiPalette',
  addInputRules() {
    return [emojiInputRule]
  },
  addCommands() {
    return {
      insertEmoji:
        (nameOrGlyph: string) =>
          ({ chain }) => {
            const glyph = emojiMap[nameOrGlyph] ?? nameOrGlyph
            return chain().focus().insertContent(glyph).run()
          },
    }
  },
})

const CalloutQuote = Node.create({
  name: 'calloutQuote',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      author: {
        default: '',
      },
    }
  },
  parseHTML() {
    return [{ tag: 'blockquote[data-callout]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, { 'data-callout': 'true' })
    const wrapper: any[] = ['blockquote', attrs, ['div', { class: 'quote-content' }, 0]]
    if (node.attrs.author)
      wrapper.push(['cite', { class: 'quote-author' }, node.attrs.author])
    return wrapper
  },
  addCommands() {
    return {
      setCalloutQuote:
        (attrs?: { text?: string, author?: string }) =>
          ({ chain }) => {
            return chain()
              .focus()
              .insertContent({
                type: this.name,
                attrs: { author: attrs?.author ?? '' },
                content: attrs?.text ? [{ type: 'text', text: attrs.text }] : undefined,
              })
              .run()
          },
    }
  },
})

const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '' },
      title: { default: 'Embedded video' },
      aspectRatio: { default: '16:9' },
    }
  },
  parseHTML() {
    return [{ tag: 'figure[data-video]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-video': 'true' }),
      ['iframe', {
        src: HTMLAttributes.src,
        title: HTMLAttributes.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowfullscreen: 'true',
      }],
    ]
  },
  addCommands() {
    return {
      setVideo:
        (attrs: { src: string, title?: string }) =>
          ({ chain }) => {
            if (!attrs.src)
              return false
            return chain().focus().insertContent({ type: this.name, attrs }).run()
          },
    }
  },
})

const mentionSuggestion = {
  items: ({ query }: { query: string }) => {
    if (!query)
      return mentionUsers.slice(0, 5)
    return mentionUsers
      .filter(user => user.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
  },
  render: () => {
    let component: VueRenderer | null = null
    let popup: TippyInstance[] | null = null

    return {
      onStart: (props: any) => {
        component = new VueRenderer(MentionList, {
          props,
          editor: props.editor,
        })
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'mention',
        })
      },
      onUpdate(props: any) {
        component?.updateProps(props)
        popup?.[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },
      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0].hide()
          return true
        }
        if (!component?.ref)
          return false
        return component.ref.onKeyDown?.(props.event) ?? false
      },
      onExit() {
        popup?.[0].destroy()
        component?.destroy()
      },
    }
  },
}

const defaultMarkdown = `# Getting started

Welcome to the **Simple Editor** template! This template integrates open source UI components and TipTap extensions licensed under _MIT_.

Integrate it by following the [TipTap UI Components docs](https://tiptap.dev/docs) or using our CLI tool.

\`\`\`bash
npx @tiptap/cli init
\`\`\`

## Features

> A fully responsive rich text editor with built-in support for common formatting and layout tools.

- Type markdown \`**\` or use keyboard shortcuts \`Cmd + B\` for most marks
- Drop images, videos and callouts
- Use \`/\` to open the command menu and discover blocks

Add images, customize alignment, and apply **advanced formatting** to make your writing more engaging.

![Tiptap Placeholder](https://placehold.co/820x300/111827/ffffff?text=Tiptap+Placeholder)

### Next steps
1. Import your content from Markdown
2. Wire it to markdown-it-ts for full fidelity
3. Invite collaborators ✨`

const addPanelOpen = ref(false)

const editor = useEditor({
  content: md.render(defaultMarkdown),
  extensions: [
    StarterKit.configure({
      codeBlock: false,
      blockquote: {
        HTMLAttributes: {
          class: 'tiptap-blockquote',
        },
      },
    }),
    Placeholder.configure({
      placeholder: 'Write here or type / to open commands…',
      showOnlyWhenEditable: true,
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
    }),
    TextStyle,
    Color,
    Highlight,
    Underline,
    Superscript,
    Subscript,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'calloutQuote'],
    }),
    CharacterCount.configure({
      limit: 5000,
    }),
    Mention.configure({
      HTMLAttributes: {
        class: 'mention-chip',
      },
      renderLabel({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`
      },
      suggestion: mentionSuggestion,
    }),
    Image.configure({
      allowBase64: true,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    EmojiPalette,
    CalloutQuote,
    VideoNode,
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-prose simple-prose',
    },
  },
})

const stats = computed(() => {
  const store = editor.value?.storage.characterCount
  return {
    characters: store?.characters() ?? 0,
    words: store?.words() ?? 0,
  }
})

const emojiItems = computed(() => Object.entries(emojiMap).map(([name, glyph]) => ({ name, glyph })))

const toggleLink = () => {
  if (!editor.value)
    return
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  const previous = editor.value.getAttributes('link').href as string | undefined
  const url = window.prompt('输入链接地址', previous ?? 'https://')
  if (!url)
    return
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const insertImage = () => {
  if (!editor.value)
    return
  const src = window.prompt('图片地址（可粘贴 URL 或 base64）')
  if (!src)
    return
  editor.value.chain().focus().setImage({ src, alt: '插入图片' }).run()
}

const normalizeVideoUrl = (input: string) => {
  try {
    const url = new URL(input)
    if (url.hostname.includes('youtu.be'))
      return `https://www.youtube.com/embed/${url.pathname.replace('/', '')}`
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : input
    }
    if (url.hostname.includes('vimeo.com'))
      return `https://player.vimeo.com/video${url.pathname}`
    return input
  }
  catch {
    return input
  }
}

const insertVideo = () => {
  if (!editor.value)
    return
  const raw = window.prompt('输入视频链接（YouTube / Vimeo / MP4）')
  if (!raw)
    return
  editor.value.commands.setVideo({
    src: normalizeVideoUrl(raw),
    title: 'Embedded video',
  })
}

const insertQuote = () => {
  if (!editor.value)
    return
  const text = window.prompt('引用内容', 'A fully responsive editor out of the box!')
  if (!text)
    return
  const author = window.prompt('作者（可选）', 'markdown-it-ts')
  editor.value.commands.setCalloutQuote({ text, author: author ?? '' })
}

const insertMention = (user: MentionItem) => {
  if (!editor.value)
    return
  editor.value
    .chain()
    .focus()
    .insertContent([
      {
        type: 'mention',
        attrs: { id: user.id, label: user.label },
      },
      { type: 'text', text: ' ' },
    ])
    .run()
}

const insertEmoji = (name: string) => {
  editor.value?.commands.insertEmoji(name)
}

const insertCodeSnippet = () => {
  editor.value?.chain()?.focus()?.toggleCodeBlock({ language: 'ts' })?.run()
}

const toolbarHeadings = [
  { label: '正文', action: () => editor.value?.chain()?.focus()?.setParagraph()?.run() },
  { label: 'H1', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 1 })?.run() },
  { label: 'H2', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 2 })?.run() },
  { label: 'H3', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 3 })?.run() },
]

const markdownShortcuts = ['`**bold**`', '`> quote`', '`/callout`']

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="simple-editor-shell">
    <header class="simple-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" type="button" :disabled="!(editor && editor.can().undo())" @mousedown.prevent @click="editor?.chain()?.focus()?.undo()?.run()">
          ⤺
        </button>
        <button class="toolbar-btn" type="button" :disabled="!(editor && editor.can().redo())" @mousedown.prevent @click="editor?.chain()?.focus()?.redo()?.run()">
          ⤻
        </button>
        <div class="toolbar-divider" />

        <div class="toolbar-segment">
          <button
            v-for="item in toolbarHeadings"
            :key="item.label"
            class="toolbar-btn"
            type="button"
            @mousedown.prevent
            @click="item.action"
          >
            {{ item.label }}
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('blockquote') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBlockquote()?.run()">
            Quote
          </button>
        </div>

        <div class="toolbar-segment">
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('bulletList') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBulletList()?.run()">
            •
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('orderedList') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleOrderedList()?.run()">
            1.
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('codeBlock') }" @mousedown.prevent @click="insertCodeSnippet">
            Code
          </button>
        </div>

        <div class="toolbar-segment">
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('bold') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBold()?.run()">
            B
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('italic') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleItalic()?.run()">
            I
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('underline') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleUnderline()?.run()">
            U
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('strike') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleStrike()?.run()">
            S
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('highlight') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleHighlight()?.run()">
            ✨
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('code') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleCode()?.run()">
            `
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('link') }" @mousedown.prevent @click="toggleLink">
            🔗
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('superscript') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleSuperscript()?.run()">
            x²
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('subscript') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleSubscript()?.run()">
            x₂
          </button>
        </div>

        <div class="toolbar-segment">
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }" @mousedown.prevent @click="editor?.chain()?.focus()?.setTextAlign('left')?.run()">
            ⬅
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }" @mousedown.prevent @click="editor?.chain()?.focus()?.setTextAlign('center')?.run()">
            ⬌
          </button>
          <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }" @mousedown.prevent @click="editor?.chain()?.focus()?.setTextAlign('right')?.run()">
            ➡
          </button>
        </div>

        <button class="toolbar-btn toolbar-btn--primary" type="button" @mousedown.prevent @click="addPanelOpen = !addPanelOpen">
          ＋ Add
        </button>
      </div>

      <div class="toolbar-right">
        <small>{{ stats.words }} words · {{ stats.characters }}/5000 chars</small>
      </div>
    </header>

    <div v-if="addPanelOpen" class="add-rail">
      <div class="add-rail__section">
        <h4>注入插件</h4>
        <div class="add-rail__grid">
          <button class="chip" type="button" @mousedown.prevent @click="insertQuote">Quote</button>
          <button class="chip" type="button" @mousedown.prevent @click="insertImage">Image</button>
          <button class="chip" type="button" @mousedown.prevent @click="insertVideo">Video</button>
          <button class="chip" type="button" @mousedown.prevent @click="insertCodeSnippet">Code</button>
        </div>
      </div>
      <div class="add-rail__section">
        <h4>@ Mentions</h4>
        <div class="mention-chips">
          <button
            v-for="user in mentionUsers"
            :key="user.id"
            class="chip chip--ghost"
            type="button"
            @mousedown.prevent
            @click="insertMention(user)"
          >
            {{ user.avatar }} {{ user.label }}
          </button>
        </div>
      </div>
      <div class="add-rail__section">
        <h4>Emoji</h4>
        <div class="emoji-grid">
          <button v-for="emoji in emojiItems" :key="emoji.name" class="emoji-btn" type="button" @mousedown.prevent @click="insertEmoji(emoji.name)">
            {{ emoji.glyph }}
          </button>
        </div>
      </div>
      <div class="add-rail__section">
        <h4>快捷语法</h4>
        <div class="shortcut-tags">
          <code v-for="item in markdownShortcuts" :key="item">{{ item }}</code>
        </div>
      </div>
    </div>

    <section class="editor-card">
      <EditorContent v-if="editor" :editor="editor" class="tiptap-wrapper" />
      <BubbleMenu v-if="editor" :editor="editor" class="bubble-menu">
        <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBold()?.run()">B</button>
        <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleItalic()?.run()">I</button>
        <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleUnderline()?.run()">U</button>
        <button class="bubble-btn" type="button" @mousedown.prevent @click="toggleLink">Link</button>
      </BubbleMenu>
    </section>
  </div>
</template>

<style scoped>
@import 'tippy.js/dist/tippy.css';

.simple-editor-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.simple-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 20px 60px rgba(15, 26, 70, 0.08);
  padding: 0.85rem 1.1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-right {
  color: #8b8ea7;
  font-size: 0.85rem;
}

.toolbar-btn {
  border: none;
  background: #f3f5ff;
  padding: 0.35rem 0.65rem;
  border-radius: 0.8rem;
  font-weight: 600;
  color: #44485c;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.is-active {
  background: #dfe4ff;
  color: #1f2157;
}

.toolbar-btn--primary {
  background: linear-gradient(120deg, #7ef7d4, #3fdeec);
  color: #0d1727;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e4e5f0;
}

.toolbar-segment {
  display: flex;
  gap: 0.35rem;
}

.add-rail {
  background: #fff;
  border-radius: 1.2rem;
  box-shadow: 0 20px 60px rgba(10, 12, 31, 0.08);
  padding: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.add-rail__section h4 {
  margin: 0 0 0.4rem;
}

.add-rail__grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  background: #f2f5ff;
  font-weight: 600;
  cursor: pointer;
}

.chip--ghost {
  background: transparent;
  border: 1px solid #e4e7fb;
}

.mention-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 0.35rem;
}

.emoji-btn {
  border: none;
  border-radius: 0.75rem;
  background: #f5f6ff;
  padding: 0.35rem 0;
  font-size: 1.1rem;
}

.shortcut-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.shortcut-tags code {
  background: #f3f5ff;
  padding: 0.2rem 0.5rem;
  border-radius: 0.6rem;
}

.editor-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 30px 80px rgba(9, 15, 42, 0.12);
  padding: 1.5rem;
}

.tiptap-wrapper {
  min-height: 600px;
}

.simple-prose {
  min-height: 560px;
  font-size: 1.05rem;
  line-height: 1.75;
}

.simple-prose pre {
  background: #f4f4f6;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
}

.simple-prose blockquote {
  border-left: 4px solid #e6e7ef;
  padding-left: 1rem;
  color: #4b4d63;
  font-style: italic;
}

.simple-prose img {
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(10, 12, 31, 0.2);
}

.bubble-menu {
  background: #0f172a;
  color: #fff;
  border-radius: 999px;
  padding: 0.25rem;
  display: flex;
  gap: 0.25rem;
}

.bubble-btn {
  border: none;
  background: transparent;
  color: inherit;
  padding: 0.25rem 0.55rem;
  border-radius: 0.65rem;
  cursor: pointer;
}

.bubble-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

@media (max-width: 900px) {
  .toolbar-left {
    width: 100%;
  }
}
</style>
