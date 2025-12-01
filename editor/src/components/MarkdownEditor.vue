<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { JSONContent } from '@tiptap/core'
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

const defaultMarkdown = `# 欢迎来到 markdown-it-ts TipTap 编辑器

尝试输入 \`markdown\` 语法，例如 \`## 标题\`、\`> 引用\`、\`**加粗**\`。

- 使用 \`@\` 可以触发 mention
- 输入 \`:rocket:\` 会得到火箭 emoji
- 点击右侧 “注入插件” 面板插入图片、视频、引用、代码块等

> 创造与协作都应该优雅灵动 ✨`

const markdownSource = ref(defaultMarkdown)
let pendingMarkdownMirror = 0
const syncingFromMarkdown = ref(false)
const addPanelOpen = ref(false)

const serializeMarkdown = (node: JSONContent): string => {
  if (!node)
    return ''
  if (node.type === 'doc')
    return (node.content ?? []).map(serializeMarkdown).filter(Boolean).join('\n\n')

  if (node.type === 'paragraph')
    return (node.content ?? []).map(serializeMarkdown).join('')

  if (node.type === 'text') {
    const text = node.text ?? ''
    return applyMarks(text, node.marks)
  }

  if (node.type === 'heading') {
    const level = node.attrs?.level ?? 1
    return `${'#'.repeat(level)} ${(node.content ?? []).map(serializeMarkdown).join('')}`
  }

  if (node.type === 'bulletList')
    return serializeList(node.content ?? [], '-')

  if (node.type === 'orderedList')
    return serializeList(node.content ?? [], '1.', node.attrs?.start ?? 1)

  if (node.type === 'listItem')
    return (node.content ?? []).map(serializeMarkdown).join('\n')

  if (node.type === 'blockquote')
    return (node.content ?? []).map(serializeMarkdown).map(line => `> ${line}`).join('\n')

  if (node.type === 'calloutQuote') {
    const body = (node.content ?? []).map(serializeMarkdown).join('\n')
    const author = node.attrs?.author ? `\n> — ${node.attrs.author}` : ''
    return body
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n') + author
  }

  if (node.type === 'codeBlock') {
    const lang = node.attrs?.language ?? ''
    const content = (node.content ?? []).map(serializeMarkdown).join('')
    return `\`\`\`${lang}\n${content}\n\`\`\``
  }

  if (node.type === 'horizontalRule')
    return '---'

  if (node.type === 'hardBreak')
    return '  \n'

  if (node.type === 'image')
    return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`

  if (node.type === 'video')
    return `[video](${node.attrs?.src ?? ''})`

  if (node.type === 'mention')
    return `@${node.attrs?.label ?? node.attrs?.id}`

  return (node.content ?? []).map(serializeMarkdown).join('')
}

const serializeList = (items: JSONContent[], prefix: '-' | '1.', start?: number): string => {
  return items
    .map((item, index) => {
      const marker = prefix === '-' ? '-' : `${(start ?? 1) + index}.`
      const content = serializeMarkdown(item).split('\n')
      return content.map((line, lineIndex) => (lineIndex === 0 ? `${marker} ${line}` : `   ${line}`)).join('\n')
    })
    .join('\n')
}

const applyMarks = (text: string, marks?: { type: string, attrs?: Record<string, any> }[]) => {
  if (!marks || marks.length === 0)
    return text
  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${acc}**`
      case 'italic':
        return `*${acc}*`
      case 'strike':
        return `~~${acc}~~`
      case 'code':
        return `\`${acc}\``
      case 'underline':
        return `<u>${acc}</u>`
      case 'textStyle':
        return mark.attrs?.color ? `<span style="color:${mark.attrs.color}">${acc}</span>` : acc
      case 'highlight':
        return `==${acc}==`
      case 'superscript':
        return `^${acc}^`
      case 'subscript':
        return `~${acc}~`
      case 'link':
        return `[${acc}](${mark.attrs?.href ?? ''})`
      default:
        return acc
    }
  }, text)
}

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
      placeholder: '使用 Markdown 或工具栏开始创作…',
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
      class: 'tiptap-prose',
    },
  },
  onUpdate: ({ editor }) => {
    if (syncingFromMarkdown.value)
      return
    pendingMarkdownMirror += 1
    markdownSource.value = serializeMarkdown(editor.getJSON())
  },
})

watch(markdownSource, (value) => {
  if (!editor.value)
    return
  if (pendingMarkdownMirror > 0) {
    pendingMarkdownMirror -= 1
    return
  }
  syncingFromMarkdown.value = true
  editor.value.commands.setContent(md.render(value))
  syncingFromMarkdown.value = false
})

watch(
  () => editor.value,
  (instance) => {
    if (!instance)
      return
    pendingMarkdownMirror += 1
    markdownSource.value = serializeMarkdown(instance.getJSON())
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const htmlPreview = computed(() => md.render(markdownSource.value))

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
    if (url.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${url.pathname.replace('/', '')}`
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : input
    }
    if (url.hostname.includes('vimeo.com')) {
      return `https://player.vimeo.com/video${url.pathname}`
    }
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
  const text = window.prompt('引用内容', '创造与协作都应该优雅灵动。')
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

const refreshFromMarkdown = () => {
  if (!editor.value)
    return
  syncingFromMarkdown.value = true
  editor.value.commands.setContent(md.render(markdownSource.value))
  syncingFromMarkdown.value = false
}

const toolbarHeadings = [
  { label: '正文', action: () => editor.value?.chain()?.focus()?.setParagraph()?.run() },
  { label: 'H1', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 1 })?.run() },
  { label: 'H2', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 2 })?.run() },
  { label: 'H3', action: () => editor.value?.chain()?.focus()?.toggleHeading({ level: 3 })?.run() },
]

const markdownShortcuts = [
  '````code```',
  '`**bold**`',
  '`> quote`',
  '`- list item`',
  '`[link](url)`',
]
</script>

<template>
  <div class="editor-layout">
    <section class="editor-surface">
      <header class="editor-toolbar">
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
          </div>

          <div class="toolbar-segment">
            <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('bulletList') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBulletList()?.run()">
              • List
            </button>
            <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('orderedList') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleOrderedList()?.run()">
              1. List
            </button>
            <button class="toolbar-btn" type="button" :class="{ 'is-active': editor?.isActive('blockquote') }" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBlockquote()?.run()">
              Quote
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
              \</\>
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

          <div class="toolbar-segment">
            <button class="toolbar-btn toolbar-btn--primary" type="button" @mousedown.prevent @click="addPanelOpen = !addPanelOpen">
              ＋ Add
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <small>{{ stats.words }} words · {{ stats.characters }}/5000 chars</small>
        </div>
      </header>

      <div class="editor-body">
        <div v-if="addPanelOpen" class="add-panel">
          <div class="add-panel__section">
            <h4>注入插件</h4>
            <div class="add-panel__grid">
              <button class="chip" type="button" @mousedown.prevent @click="insertQuote">Quote</button>
              <button class="chip" type="button" @mousedown.prevent @click="insertImage">Image</button>
              <button class="chip" type="button" @mousedown.prevent @click="insertVideo">Video</button>
              <button class="chip" type="button" @mousedown.prevent @click="insertCodeSnippet">Code</button>
            </div>
          </div>
          <div class="add-panel__section">
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
          <div class="add-panel__section">
            <h4>Emoji</h4>
            <div class="emoji-grid">
              <button v-for="emoji in emojiItems" :key="emoji.name" class="emoji-btn" type="button" @mousedown.prevent @click="insertEmoji(emoji.name)">
                {{ emoji.glyph }}
              </button>
            </div>
          </div>
        </div>

        <EditorContent v-if="editor" :editor="editor" class="tiptap-wrapper" />

        <BubbleMenu v-if="editor" :editor="editor" class="bubble-menu">
          <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleBold()?.run()">B</button>
          <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleItalic()?.run()">I</button>
          <button class="bubble-btn" type="button" @mousedown.prevent @click="editor?.chain()?.focus()?.toggleUnderline()?.run()">U</button>
          <button class="bubble-btn" type="button" @mousedown.prevent @click="toggleLink">Link</button>
        </BubbleMenu>
      </div>
    </section>

    <aside class="markdown-panel">
      <div class="markdown-card">
        <div class="markdown-card__header">
          <div>
            <h3>Markdown 输入</h3>
            <p>实时使用 markdown-it-ts 解析并同步到 TipTap。</p>
          </div>
          <button class="chip chip--ghost" type="button" @click="refreshFromMarkdown">
            重新解析
          </button>
        </div>
        <textarea v-model="markdownSource" spellcheck="false" rows="12" class="markdown-input" />
        <div class="markdown-shortcuts">
          <span>快捷语法：</span>
          <code v-for="item in markdownShortcuts" :key="item">{{ item }}</code>
        </div>
      </div>

      <div class="markdown-card">
        <div class="markdown-card__header">
          <div>
            <h3>Markdown 预览</h3>
            <p>markdown-it-ts 渲染结果</p>
          </div>
        </div>
        <div class="markdown-preview" v-html="htmlPreview" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
@import 'tippy.js/dist/tippy.css';

.editor-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.editor-surface {
  flex: 1;
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 30px 80px rgba(61, 80, 255, 0.08);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f2f2f7;
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
  background: #f7f7fb;
  padding: 0.35rem 0.65rem;
  border-radius: 0.75rem;
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
  background: #e3ecff;
  color: #1d2c6b;
}

.toolbar-btn--primary {
  background: #1dd1a1;
  color: #03262d;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #ececf4;
}

.toolbar-segment {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.editor-body {
  position: relative;
  padding: 1.5rem;
}

.add-panel {
  border: 1px dashed #cbd5ff;
  padding: 1rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-panel__section h4 {
  margin: 0 0 0.5rem;
  color: #1e2649;
}

.add-panel__grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mention-chips {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
  gap: 0.25rem;
}

.emoji-btn {
  border: none;
  background: #fff;
  border-radius: 0.75rem;
  height: 40px;
  font-size: 1.25rem;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.chip {
  border: none;
  background: #181b34;
  color: #fff;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
}

.chip--ghost {
  background: #f0f2ff;
  color: #3e4b7d;
}

.tiptap-wrapper {
  min-height: 480px;
}

.tiptap-prose {
  min-height: 480px;
  line-height: 1.7;
  font-size: 1.05rem;
  padding: 0;
}

.tiptap-prose :global(.mention-chip) {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  border-radius: 0.75rem;
  background: rgba(95, 211, 178, 0.25);
  color: #0f725d;
  font-weight: 600;
}

.tiptap-prose :global(figure[data-video]) {
  margin: 1.25rem 0;
}

.tiptap-prose :global(figure[data-video] iframe) {
  width: 100%;
  min-height: 280px;
  border: none;
  border-radius: 1rem;
}

.tiptap-prose :global(.quote-content) {
  font-size: 1.2rem;
  color: #162056;
  margin-bottom: 0.5rem;
}

.tiptap-prose :global(.quote-author) {
  font-size: 0.9rem;
  color: #7c82a2;
}

.tiptap-prose :global(.tiptap-blockquote) {
  border-left: 4px solid #c8e7ff;
  padding-left: 1rem;
  color: #445071;
  background: #f5faff;
  border-radius: 0 1rem 1rem 0;
}

.bubble-menu {
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(23, 33, 68, 0.95);
}

.bubble-btn {
  border: none;
  background: transparent;
  color: #e8ecff;
  padding: 0.25rem 0.4rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.markdown-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.markdown-card {
  background: #fff;
  border-radius: 1.5rem;
  padding: 1.25rem;
  box-shadow: 0 25px 60px rgba(39, 52, 126, 0.1);
}

.markdown-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.markdown-card__header p {
  margin: 0;
  color: #7d82a7;
}

.markdown-input {
  width: 100%;
  border: 1px solid #edf0ff;
  border-radius: 1rem;
  min-height: 220px;
  padding: 0.75rem;
  font-family: 'JetBrains Mono', 'SFMono-Regular', monospace;
  background: #fbfcff;
}

.markdown-shortcuts {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  color: #7b7e99;
  font-size: 0.85rem;
}

.markdown-shortcuts code {
  background: #f0f4ff;
  padding: 0.1rem 0.35rem;
  border-radius: 0.5rem;
}

.markdown-preview :deep(h1) {
  margin-top: 0;
}

.markdown-preview :deep(pre) {
  background: #0f172a;
  color: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.75rem;
  overflow-x: auto;
}

@media (max-width: 1100px) {
  .editor-layout {
    flex-direction: column;
  }

  .markdown-panel {
    width: 100%;
  }
}
</style>

<style>
.tippy-box[data-theme='mention'] {
  background: #10163a;
  border-radius: 1rem;
  padding: 0.4rem;
}
</style>
