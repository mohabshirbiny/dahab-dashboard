<template>
  <div class="d-table-wrap">
    <table class="d-table">
      <thead v-if="$slots.head">
        <tr>
          <slot name="head" />
        </tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  //
</script>

<style lang="scss" scoped>
.d-table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.d-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 480px;
}
:deep(th) {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-3);
  padding: 9px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--row-head);
  white-space: nowrap;
}
:deep(td) {
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
  vertical-align: middle;
  color: var(--ink);
}
:deep(tr:last-child td) { border-bottom: 0; }
:deep(tbody tr:hover) { background: var(--row-hover); }
:deep(td.r), :deep(th.r) { text-align: right; }
:deep(.mono) {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--ink-2);
}
:deep(.who2) {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 2px;
}
</style>
