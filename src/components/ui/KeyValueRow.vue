<template>
  <div class="d-kv" :class="{ 'd-kv--big': big }">
    <span class="d-kv__k"><slot name="key">{{ label }}</slot></span>
    <span class="d-kv__v"><slot>{{ value }}</slot></span>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    label?: string
    value?: string | number
    big?: boolean
  }>()
</script>

<style lang="scss" scoped>
.d-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  font-size: 12.5px;
  border-bottom: 1px solid var(--line);
  gap: 12px;
}
.d-kv:last-child { border-bottom: 0; }
.d-kv__k { color: var(--ink-2); }
.d-kv__v { font-weight: 500; font-variant-numeric: tabular-nums; text-align: right; }
.d-kv--big { padding: 11px 0; }
.d-kv--big .d-kv__v { font-size: 16px; }
</style>
