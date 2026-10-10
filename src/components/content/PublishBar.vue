<template>
  <div class="d-pb">
    <div class="d-pb__text">
      <template v-if="count === 0">No pending changes. Customers see what is already published.</template>

      <template v-else>
        <strong>{{ countLabel }}</strong> waiting. Customers see none of them until you publish.
      </template>
    </div>

    <div class="d-pb__actions">
      <DBtn :loading="exporting" @click="emit('export')">Export to Excel</DBtn>

      <DBtn
        v-if="canPublish"
        :disabled="count === 0"
        kind="primary"
        :loading="publishing"
        @click="emit('publish')"
      >Publish changes</DBtn>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  const props = defineProps<{
    count: number
    // More drafts than the list shows (the Backend sends 200 at a time).
    more?: boolean
    canPublish: boolean
    publishing?: boolean
    exporting?: boolean
  }>()

  const emit = defineEmits<{ (e: 'publish' | 'export'): void }>()

  const countLabel = computed(() => `${props.count}${props.more ? '+' : ''} ${props.count === 1 && !props.more ? 'change' : 'changes'}`)
</script>

<style lang="scss" scoped>
.d-pb {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--row-head);
  font-size: 12.5px;
}
.d-pb__text { flex: 1 1 260px; color: var(--ink-2); }
.d-pb__actions { display: flex; gap: 8px; }
</style>
