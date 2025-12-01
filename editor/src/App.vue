<script setup lang="ts">
import MarkdownEditor from './components/MarkdownEditor.vue'
</script>

<template>
  <main class="page">
    <section class="hero">
      <div class="hero__titles">
        <p class="hero__eyebrow">markdown-it-ts × TipTap</p>
        <h1>Simple editor</h1>
        <p class="hero__lead">
          双向同步的富文本编辑器，使用 markdown-it-ts 解析 Markdown，并通过 TipTap
          提供实时所见即所得体验。
        </p>
      </div>
      <div class="hero__tabs">
        <button v-for="tab in tabs" :key="tab" class="hero__tab" :class="{ 'hero__tab--active': tab === 'Simple editor' }">
          {{ tab }}
        </button>
      </div>
    </section>

    <MarkdownEditor />
  </main>
</template>

<script lang="ts">
const tabs = ['Agent editor', 'Notion-like editor', 'Simple editor', 'Headless editor']
</script>

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
</style>
