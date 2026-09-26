<template>
  <div aria-live="polite" class="d-loading" role="status">
    <span aria-hidden="true" class="d-loading__spin" />
    {{ label }}
  </div>
</template>

<script lang="ts" setup>
  withDefaults(defineProps<{ label?: string }>(), { label: 'Loading…' })
</script>

<style lang="scss" scoped>
.d-loading {
  padding: 44px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--ink-3);
  font-size: 12.5px;
}
.d-loading__spin {
  width: 13px;
  height: 13px;
  border: 2px solid var(--line-2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: d-loading-spin .8s linear infinite;
}
@keyframes d-loading-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .d-loading__spin { animation-duration: 1.8s; }
}
</style>
