<template>
  <nav v-if="total > 0" aria-label="Pagination" class="d-pager">
    <span aria-live="polite" class="d-pager__info">
      {{ from }}–{{ to }} of {{ total }}
    </span>

    <div class="d-pager__nav">
      <DBtn :disabled="page <= 1" @click="emit('update:page', page - 1)">Previous</DBtn>
      <span class="d-pager__page">Page {{ page }} of {{ pageCount }}</span>
      <DBtn :disabled="page >= pageCount" @click="emit('update:page', page + 1)">Next</DBtn>
    </div>
  </nav>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'

  const props = defineProps<{
    page: number
    pageSize: number
    total: number
  }>()

  const emit = defineEmits<{ (e: 'update:page', page: number): void }>()

  const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
  const from = computed(() => (props.page - 1) * props.pageSize + 1)
  const to = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<style lang="scss" scoped>
.d-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 16px;
  border-top: 1px solid var(--line);
  background: var(--row-head);
  font-size: 11.5px;
  color: var(--ink-3);
}
.d-pager__info { font-variant-numeric: tabular-nums; }
.d-pager__nav { display: flex; align-items: center; gap: 9px; }
.d-pager__page { font-variant-numeric: tabular-nums; }
@media (max-width: 640px) {
  .d-pager { justify-content: center; }
}
</style>
