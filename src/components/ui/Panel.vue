<template>
  <section class="d-panel">
    <header v-if="hasHeader" class="d-panel__head">
      <h2 v-if="title" class="d-panel__title">{{ title }}</h2>
      <span v-if="subtitle" class="d-panel__sub">{{ subtitle }}</span>
      <div v-if="$slots.actions" class="d-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-if="$slots.filters" class="d-panel__filters">
      <slot name="filters" />
    </div>
    <div v-if="$slots.body" class="d-panel__body">
      <slot name="body" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="d-panel__foot">
      <slot name="footer" />
    </div>
  </section>
</template>

<script lang="ts" setup>
  import { computed, useSlots } from 'vue'

  const props = defineProps<{
    title?: string
    subtitle?: string
  }>()

  const slots = useSlots()
  const hasHeader = computed(() => Boolean(props.title || props.subtitle || slots.actions))
</script>

<style lang="scss" scoped>
.d-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  margin-bottom: 18px;
  overflow: hidden;
}
.d-panel__head {
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.d-panel__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.d-panel__sub {
  font-size: 11.5px;
  color: var(--ink-3);
}
.d-panel__actions {
  margin-left: auto;
  display: flex;
  gap: 7px;
}
.d-panel__filters {
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--row-head);
}
.d-panel__body {
  padding: 16px;
}
.d-panel__foot {
  padding: 0 16px 16px;
}
</style>
