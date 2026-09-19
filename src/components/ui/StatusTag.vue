<template>
  <span class="d-tag" :class="`t-${variant}`">
    <slot>{{ label }}</slot>
  </span>
</template>

<script lang="ts" setup>
  import type { StatusVariant } from '@/types/status'

  defineProps<{
    label?: string
    variant: StatusVariant
  }>()
</script>

<style lang="scss" scoped>
.d-tag {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  white-space: nowrap;
  line-height: 1.5;
}
.t-ok   { background: var(--ok-bg);   color: var(--ok); }
.t-wait { background: var(--wait-bg); color: var(--wait); }
.t-bad  { background: var(--bad-bg);  color: var(--bad); }
.t-warn { background: var(--warn-bg); color: var(--warn); }
.t-info { background: var(--info-bg); color: var(--info); }
.t-off  { background: var(--off);     color: var(--ink-3); }
</style>
