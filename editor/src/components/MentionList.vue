<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface MentionListItem {
  id: string
  label: string
  role?: string
  avatar?: string
}

const props = defineProps<{
  items: MentionListItem[]
  command: (item: MentionListItem) => void
}>()

const selectedIndex = ref(0)

const hasItems = computed(() => props.items.length > 0)

const selectItem = (index: number) => {
  const item = props.items[index]
  if (!item)
    return
  props.command(item)
}

const onKeyDown = (event: KeyboardEvent) => {
  if (!hasItems.value)
    return false

  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }

  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }

  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }

  return false
}

defineExpose({ onKeyDown })

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)
</script>

<template>
  <div v-if="hasItems" class="mention-list">
    <button
      v-for="(item, index) in props.items"
      :key="item.id"
      class="mention-list__item"
      :class="{ 'mention-list__item--active': index === selectedIndex }"
      type="button"
      @mousedown.prevent
      @click="selectItem(index)"
    >
      <div class="mention-list__avatar">
        {{ item.avatar ?? item.label.at(0) }}
      </div>
      <div>
        <div class="mention-list__label">{{ item.label }}</div>
        <div class="mention-list__meta">{{ item.role }}</div>
      </div>
    </button>
  </div>
  <div v-else class="mention-list mention-list--empty">
    暂无匹配
  </div>
</template>

<style scoped>
.mention-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 220px;
}

.mention-list--empty {
  padding: 0.5rem;
  color: #9a9fb8;
  font-size: 0.85rem;
}

.mention-list__item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 120ms ease;
}

.mention-list__item--active {
  background: rgba(127, 247, 212, 0.35);
}

.mention-list__avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #eef0fb;
  color: #4b4f65;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mention-list__label {
  font-weight: 600;
  color: #1e2134;
}

.mention-list__meta {
  font-size: 0.8rem;
  color: #8589a3;
}
</style>
