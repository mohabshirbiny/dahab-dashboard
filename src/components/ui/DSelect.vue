<template>
  <select
    :id="id"
    :aria-label="ariaLabel"
    class="d-select"
    :disabled="disabled"
    :value="modelValue"
    @change="onChange"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<script lang="ts" setup generic="T extends string">
  defineProps<{
    modelValue: T
    options: ReadonlyArray<{ value: T, label: string }>
    id?: string
    ariaLabel?: string
    disabled?: boolean
  }>()

  const emit = defineEmits<{ (e: 'update:model-value', value: T): void }>()

  function onChange (ev: Event) {
    emit('update:model-value', (ev.target as HTMLSelectElement).value as T)
  }
</script>

<style lang="scss" scoped>
.d-select {
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: var(--r-btn);
  background: var(--panel);
  color: var(--ink);
  font: 400 16px Inter, system-ui, sans-serif;
  cursor: pointer;
  max-width: 100%;
}
.d-select:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
.d-select:disabled { color: var(--ink-3); cursor: not-allowed; }
@media (min-width: 901px) {
  .d-select { font-size: 12px; }
}
</style>
