<template>
  <div class="d-note" :class="`n-${variant}`">
    <slot />
  </div>
</template>

<script lang="ts" setup>
  type NoteVariant = 'info' | 'wait' | 'bad' | 'ok'
  withDefaults(defineProps<{ variant?: NoteVariant }>(), { variant: 'info' })
</script>

<style lang="scss" scoped>
.d-note {
  padding: 11px 13px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.65;
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.n-info { background: var(--info-bg); color: #22485F; }
.n-wait { background: var(--wait-bg); color: #6E5112; }
.n-bad  { background: var(--bad-bg);  color: #7E2F24; }
.n-ok   { background: var(--ok-bg);   color: #17543B; }
</style>
