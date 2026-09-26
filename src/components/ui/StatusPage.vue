<template>
  <div class="d-status">
    <div class="d-status__code">{{ code }}</div>
    <h2 class="d-status__title">{{ title }}</h2>
    <p class="d-status__text"><slot>{{ description }}</slot></p>

    <div v-if="$slots.actions" class="d-status__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    code: string
    title: string
    description?: string
  }>()
</script>

<style lang="scss" scoped>
.d-status {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  padding: 56px 20px;
  text-align: center;
}
.d-status__code {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -.6px;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}
.d-status__title { font-size: 14px; font-weight: 600; margin: 8px 0 6px; }
.d-status__text {
  font-size: 12.5px;
  color: var(--ink-3);
  max-width: 56ch;
  margin: 0 auto;
  line-height: 1.6;
}
.d-status__actions { margin-top: 18px; display: flex; justify-content: center; gap: 7px; flex-wrap: wrap; }
</style>
