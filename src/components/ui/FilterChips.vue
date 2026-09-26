<template>
  <div aria-label="Filter" class="d-chips" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      :aria-pressed="option.value === modelValue"
      class="d-chip"
      :class="{ 'd-chip--on': option.value === modelValue }"
      :disabled="option.disabled"
      :title="option.title"
      type="button"
      @click="emit('update:model-value', option.value)"
    >
      {{ option.label }}<template v-if="option.count !== undefined">, {{ option.count }}</template>
    </button>
  </div>
</template>

<script lang="ts" setup generic="T extends string">
  defineProps<{
    modelValue: T
    // A disabled option stays visible but cannot be picked; `title` says why.
    options: ReadonlyArray<{ value: T, label: string, count?: number, disabled?: boolean, title?: string }>
  }>()

  const emit = defineEmits<{ (e: 'update:model-value', value: T): void }>()
</script>

<style lang="scss" scoped>
.d-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.d-chip {
  padding: 5px 11px;
  border: 1px solid var(--line);
  border-radius: var(--r-chip);
  font: 400 11.5px Inter, system-ui, sans-serif;
  cursor: pointer;
  background: var(--panel);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.d-chip:hover:not(:disabled) { background: var(--bg); }
.d-chip:disabled { opacity: .5; cursor: not-allowed; }
.d-chip:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.d-chip--on,
.d-chip--on:hover {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
</style>
