<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import MarkdownIt from 'markdown-it-ts'
import { nanoid } from 'nanoid'

interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

interface ToolkitAction {
  title: string
  description: string
  prompt: string
}

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const defaultDoc = `# Cover Page

## Project Title
Enhancing Neural Plasticity Through Multi-Modal Interventions in Aging Adults: A Randomized Controlled Trial

**Principal Investigator (PI):** [Your Name, PhD]
**Institution:** [Your University or Research Center]
**Funding Mechanism:** NIH R01 Research Project Grant
**Proposed Project Period:** 24 months
**Total Direct Costs Requested:** [To be determined]
**Keywords:** Cognitive aging, neural plasticity, fMRI, EEG, physical exercise, nutritional supplementation

## Collaborating Institutions
- [Institution A] — Neuroimaging Core
- [Institution B] — Exercise Physiology Unit
- [Institution C] — Nutrition and Metabolism Laboratory

## Contacts
**Email:** team@example.com
**Phone:** +1 777-9999-8888`

const editor = useEditor({
  content: md.render(defaultDoc),
  extensions: [
    StarterKit.configure({
      codeBlock: false,
    }),
    Placeholder.configure({
      placeholder: '让 Agent 协助总结、重写或生成内容…',
    }),
    Highlight,
    Underline,
    Link.configure({ openOnClick: false }),
    TextStyle,
    Color,
  ],
  editorProps: {
    attributes: {
      class: 'agent-prose',
    },
  },
})

const agentMessages = ref<AgentMessage[]>([
  {
    id: nanoid(),
    role: 'assistant',
    text: '👋 已连接 markdown-it-ts 内容。随时告诉我需要插入什么或如何润色全文。',
  },
])

const customPrompt = ref('')
const isRunning = ref(false)
const lastRunAt = ref<Date | null>(null)
const selectedToolkit = ref('AI Toolkit examples')
const toolkitMenuOpen = ref(false)

const toolkitVariants = ['AI Toolkit examples', 'Product PR template', 'Launch announcement']

const toolkitActions: ToolkitAction[] = [
  {
    title: 'Add AI comment',
    description: '在段落旁插入摘要或建议',
    prompt: 'Add an inline AI comment summarizing risks and next steps for the highlighted content.',
  },
  {
    title: 'Add new paragraph',
    description: '扩展内容，保持正式语气',
    prompt: 'Write a new supporting paragraph for this research cover page with formal academic tone.',
  },
  {
    title: 'Proofread',
    description: '检查语法与格式',
    prompt: 'Proofread the document, fix grammar issues, and keep Markdown structure intact.',
  },
  {
    title: 'Adjust text selection',
    description: '重新措辞当前段落',
    prompt: 'Rewrite the current paragraph to be more concise but keep technical accuracy.',
  },
  {
    title: 'Add custom component',
    description: '插入结构化信息块',
    prompt: 'Insert a structured checklist with review owners and deadlines.',
  },
  {
    title: 'Justify edit',
    description: '给出修改原因说明',
    prompt: 'Explain why the last edit improves clarity for stakeholders.',
  },
]

const toolbarButtons = ['−', '100%', '+', 'Hz ▾', '•', 'B', 'I', 'S', 'U', '≡', '≡', '≡']

const lastRunLabel = computed(() => {
  if (!lastRunAt.value)
    return '尚未执行'
  return lastRunAt.value.toLocaleTimeString('zh-CN', { hour12: false })
})

const handlePrompt = (prompt: string) => {
  const clean = prompt.trim()
  if (!clean || isRunning.value)
    return
  agentMessages.value.push({ id: nanoid(), role: 'user', text: clean })
  isRunning.value = true
  customPrompt.value = ''

  window.setTimeout(() => {
    const { reply, insertion } = buildAgentResponse(clean)
    agentMessages.value.push({ id: nanoid(), role: 'assistant', text: reply })
    if (insertion) {
      editor.value?.chain()?.focus()?.insertContent(insertion)?.run()
    }
    lastRunAt.value = new Date()
    isRunning.value = false
  }, 360)
}

const buildAgentResponse = (prompt: string) => {
  const normalized = prompt.toLowerCase()
  if (normalized.includes('comment')) {
    const text = `> Agent comment: 强调预算范围与伦理审批同步进行，建议在下一版显著突出。`
    return { reply: text, insertion: text }
  }
  if (normalized.includes('proofread')) {
    const text = `### Agent · Proofread
- 调整术语一致性（将 "triang" 修复为 "training"）
- 统一粗体标签语法，确保 markdown-it-ts 正确解析`
    return { reply: text, insertion: text }
  }
  if (normalized.includes('paragraph')) {
    const text = `### Agent · New paragraph
This trial couples cognitive training with supervised exercise and nutrition tracking, ensuring each cohort records measurable neuroplasticity deltas.`
    return { reply: text, insertion: text }
  }
  if (normalized.includes('checklist')) {
    const text = `- [ ] Ethical board review — Owner: PI — Due: Week 2
- [ ] Funding memo update — Owner: Finance — Due: Week 3`
    return { reply: text, insertion: text }
  }
  const text = `### Agent · Insight
- Prompt: ${prompt}
- 建议：保持 Markdown 为真相，必要时同步 TipTap。`
  return { reply: text, insertion: text }
}

const submitPrompt = () => handlePrompt(customPrompt.value)

const toggleToolkitMenu = () => {
  toolkitMenuOpen.value = !toolkitMenuOpen.value
}

const selectToolkit = (option: string) => {
  selectedToolkit.value = option
  toolkitMenuOpen.value = false
}

const runToolkitAction = (action: ToolkitAction) => {
  handlePrompt(action.prompt)
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="agent-page">
    <aside class="agent-sidebar">
      <div class="sidebar-header">
        <button class="toolkit-select" type="button" @click="toggleToolkitMenu">
          {{ selectedToolkit }}
          <span>▾</span>
        </button>
        <div v-if="toolkitMenuOpen" class="toolkit-dropdown">
          <button v-for="variant in toolkitVariants" :key="variant" type="button" @click="selectToolkit(variant)">
            {{ variant }}
          </button>
        </div>
      </div>
      <div class="sidebar-actions">
        <button
          v-for="action in toolkitActions"
          :key="action.title"
          class="sidebar-action"
          type="button"
          @click="runToolkitAction(action)"
        >
          <div>
            <strong>{{ action.title }}</strong>
            <p>{{ action.description }}</p>
          </div>
          <span>→</span>
        </button>
      </div>
      <p class="sidebar-note">
        想了解实现细节？AI Toolkit add-on 提供完整源码与文档。
      </p>
    </aside>

    <section class="agent-main">
      <header class="agent-toolbar">
        <div class="toolbar-group">
          <button v-for="button in toolbarButtons" :key="button" type="button">
            {{ button }}
          </button>
        </div>
        <button class="custom-component" type="button">+ Custom component</button>
      </header>

      <div class="agent-editor-card">
        <EditorContent v-if="editor" :editor="editor" class="agent-editor__surface" />
        <button class="assistant-pin" type="button">
          🜂
        </button>
        <form class="agent-input" @submit.prevent="submitPrompt">
          <input v-model="customPrompt" :disabled="isRunning" placeholder="Tell AI what else needs to be changed..." />
          <button type="submit" :disabled="isRunning">{{ isRunning ? 'Working…' : 'Send' }}</button>
        </form>
      </div>

      <div class="agent-status">
        <span>Last run · {{ lastRunLabel }}</span>
        <span>Responses · {{ agentMessages.filter(msg => msg.role === 'assistant').length }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.agent-page {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
  gap: 1.5rem;
}

.agent-sidebar {
  background: #fff;
  border-radius: 1.2rem;
  padding: 1rem;
  box-shadow: 0 25px 70px rgba(22, 34, 91, 0.08);
  position: relative;
}

.sidebar-header {
  position: relative;
}

.toolkit-select {
  width: 100%;
  border: none;
  border-radius: 0.8rem;
  padding: 0.65rem 0.85rem;
  background: #f1f4ff;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  color: #1c2030;
  cursor: pointer;
}

.toolkit-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 100%;
  background: #fff;
  border-radius: 0.8rem;
  box-shadow: 0 12px 40px rgba(28, 34, 72, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 5;
}

.toolkit-dropdown button {
  border: none;
  background: transparent;
  padding: 0.6rem 0.85rem;
  text-align: left;
  cursor: pointer;
}

.toolkit-dropdown button:hover {
  background: #f7f8ff;
}

.sidebar-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-action {
  border: none;
  background: #f7f8ff;
  border-radius: 1rem;
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

.sidebar-action:hover {
  background: #eef2ff;
}

.sidebar-action strong {
  color: #1f2336;
}

.sidebar-action p {
  margin: 0.2rem 0 0;
  color: #7b7f90;
  font-size: 0.85rem;
}

.sidebar-note {
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: #8f92a9;
}

.agent-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.agent-toolbar {
  background: #fff;
  border-radius: 1.2rem;
  padding: 0.85rem 1rem;
  box-shadow: 0 20px 60px rgba(25, 44, 105, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-group {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.toolbar-group button {
  border: none;
  background: #f4f6ff;
  border-radius: 0.75rem;
  padding: 0.4rem 0.7rem;
  font-weight: 600;
  color: #5a5e75;
}

.custom-component {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.95rem;
  background: linear-gradient(120deg, #7ef7d4, #3fdeec);
  color: #081225;
  font-weight: 600;
}

.agent-editor-card {
  position: relative;
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 30px 80px rgba(15, 24, 82, 0.08);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.agent-editor__surface {
  min-height: 480px;
  border-radius: 1rem;
  border: 1px solid #edf0ff;
  padding: 1rem 1.5rem;
}

.agent-prose {
  min-height: 440px;
  line-height: 1.6;
}

.assistant-pin {
  position: absolute;
  right: 1.25rem;
  top: 40%;
  border-radius: 999px;
  border: none;
  width: 40px;
  height: 40px;
  background: #eef9ff;
  box-shadow: 0 12px 24px rgba(18, 63, 89, 0.2);
}

.agent-input {
  display: flex;
  gap: 0.5rem;
  border-radius: 1rem;
  border: 1px solid #dde1f2;
  padding: 0.5rem 0.6rem;
}

.agent-input input {
  flex: 1;
  border: none;
  font-size: 0.95rem;
}

.agent-input input:focus {
  outline: none;
}

.agent-input button {
  border: none;
  border-radius: 0.9rem;
  padding: 0 1.1rem;
  background: #151b2f;
  color: #fff;
  font-weight: 600;
}

.agent-status {
  display: flex;
  gap: 1.5rem;
  color: #8487a0;
  font-size: 0.9rem;
}

@media (max-width: 1100px) {
  .agent-page {
    grid-template-columns: 1fr;
  }
}
</style>
