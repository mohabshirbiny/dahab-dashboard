<template>
  <textarea
    :id="id"
    ref="el"
    :aria-describedby="describedby"
    :aria-invalid="invalid || undefined"
    class="d-textarea"
    :class="{ 'd-textarea--invalid': invalid }"
    :disabled="disabled"
    :maxlength="maxlength"
    :placeholder="placeholder"
    :rows="rows"
    :value="modelValue"
    @blur="emit('blur')"
    @input="onInput"
  />
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  withDefaults(defineProps<{
    modelValue: string
    id?: string
    placeholder?: string
    rows?: number
    maxlength?: number
    disabled?: boolean
    invalid?: boolean
    describedby?: string
  }>(), { rows: 4 })

  const emit = defineEmits<{
    (e: 'update:model-value', value: string): void
    (e: 'blur'): void
  }>()

  const el = ref<HTMLTextAreaElement | null>(null)

  function onInput (ev: Event) {
    emit('update:model-value', (ev.target as HTMLTextAreaElement).value)
  }

  defineExpose({ focus: () => el.value?.focus() })
</script>

<style lang="scss" scoped>
.d-textarea {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-input);
  background: var(--panel);
  color: var(--ink);
  font: 400 16px/1.5 Inter, system-ui, sans-serif;
  resize: vertical;
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.d-textarea::placeholder { color: var(--ink-3); }
.d-textarea:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(139, 111, 61, .14);
}
.d-textarea--invalid,
.d-textarea--invalid:focus {
  border-color: var(--bad);
  box-shadow: none;
}
.d-textarea:disabled { color: var(--ink-3); cursor: not-allowed; }
@media (min-width: 901px) {
  .d-textarea { font-size: 12.5px; }
}
</style>
