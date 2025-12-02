<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import SimpleEditor from './components/MarkdownEditor.vue'
import NotionLikeEditor from './components/NotionLikeEditor.vue'
import HeadlessEditor from './components/HeadlessEditor.vue'
import AgentEditor from './components/AgentEditor.vue'

type EditorId = 'agent' | 'notion' | 'simple' | 'headless'

interface EditorTab {
  id: EditorId
  label: string
  title: string
  lead: string
  component: Component
  badge?: string
}

const editorTabs: EditorTab[] = [
  {
    id: 'agent',
    label: 'Agent editor',
    title: 'Agent editor',
    lead: '通过 Agent 协同生成文案、摘要、行动项，实时注入 markdown-it-ts × TipTap 内容。',
    component: AgentEditor,
    badge: 'New',
  },
  {
    id: 'notion',
    label: 'Notion-like editor',
    title: 'Notion-like editor',
    lead: '沉浸式写作体验，包含 cover、属性、Outline 与 Slash 命令的 Notion 风格页面。',
    component: NotionLikeEditor,
  },
  {
    id: 'simple',
    label: 'Simple editor',
    title: 'Simple editor',
    lead: '双向同步 Markdown ↔︎ TipTap，包含 toolbar、mention、emoji、Markdown 面板与预览。',
    component: SimpleEditor,
    badge: 'Live',
  },
  {
    id: 'headless',
    label: 'Headless editor',
    title: 'Headless editor',
    lead: '以 Markdown 作为单一真相，利用 TipTap 提供的 schema 输出结构化数据，自由定制渲染 UI。',
    component: HeadlessEditor,
  },
]

const selectedId = ref<EditorId>('simple')

const activeTab = computed(() => editorTabs.find(tab => tab.id === selectedId.value) ?? editorTabs[2])

const selectTab = (id: EditorId) => {
  selectedId.value = id
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <div class="hero__titles">
        <p class="hero__eyebrow">markdown-it-ts × TipTap</p>
        <h1>{{ activeTab.title }}</h1>
        <p class="hero__lead">
          {{ activeTab.lead }}
        </p>
      </div>
      <div class="hero__tabs">
        <button
          v-for="tab in editorTabs"
          :key="tab.id"
          class="hero__tab"
          :class="{ 'hero__tab--active': tab.id === activeTab.id }"
          type="button"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="hero__tab-badge">{{ tab.badge }}</span>
        </button>
      </div>
    </section>

    <component :is="activeTab.component" />
  </main>
</template>

<style scoped>
.page {
  width: min(1200px, 100%);
  margin: 0 auto;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.hero__titles {
  max-width: 520px;
}

.hero__eyebrow {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6d6f7b;
}

.hero__lead {
  color: #6d6f7b;
}

.hero__tabs {
  display: flex;
  border-radius: 999px;
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 30px rgba(45, 51, 90, 0.08);
}

.hero__tab {
  border: none;
  background: transparent;
  font-size: 0.9rem;
  padding: 0.45rem 1.25rem;
  border-radius: 999px;
  color: #6d6f7b;
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}

.hero__tab--active {
  background: linear-gradient(120deg, #7ef7d4, #3fdeec);
  color: #0d1727;
  font-weight: 600;
}

.hero__tab-badge {
  margin-left: 0.35rem;
  font-size: 0.72rem;
  background: rgba(13, 23, 39, 0.08);
  color: inherit;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}
</style>
