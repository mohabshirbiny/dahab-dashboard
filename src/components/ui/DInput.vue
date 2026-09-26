<template>
  <div class="d-input" :class="{ 'd-input--invalid': invalid, 'd-input--lg': size === 'lg' }">
    <input
      :id="id"
      ref="el"
      :aria-describedby="describedby"
      :aria-invalid="invalid || undefined"
      :aria-label="ariaLabel"
      :autocomplete="autocomplete"
      class="d-input__el"
      :disabled="disabled"
      :inputmode="inputmode"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :type="type"
      :value="modelValue"
      @blur="emit('blur')"
      @input="onInput"
    >

    <slot name="append" />
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  withDefaults(defineProps<{
    modelValue: string
    id?: string
    type?: string
    placeholder?: string
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'email' | 'search'
    maxlength?: number
    disabled?: boolean
    invalid?: boolean
    describedby?: string
    ariaLabel?: string
    size?: 'md' | 'lg'
  }>(), {
    type: 'text',
    size: 'md',
  })

  const emit = defineEmits<{
    (e: 'update:model-value', value: string): void
    (e: 'blur'): void
  }>()

  const el = ref<HTMLInputElement | null>(null)

  function onInput (ev: Event) {
    emit('update:model-value', (ev.target as HTMLInputElement).value)
  }

  defineExpose({ focus: () => el.value?.focus() })
</script>

<style lang="scss" scoped>
.d-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r-input);
  background: var(--panel);
  transition: border-color .12s ease, box-shadow .12s ease;
}
.d-input:focus-within {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(139, 111, 61, .14);
}
.d-input--invalid,
.d-input--invalid:focus-within {
  border-color: var(--bad);
  box-shadow: none;
}
.d-input__el {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  // 16px on small screens stops iOS from zooming the page on focus.
  font: 400 16px Inter, system-ui, sans-serif;
  border-radius: var(--r-input);
}
.d-input__el::placeholder { color: var(--ink-3); }
.d-input__el:disabled { color: var(--ink-3); cursor: not-allowed; }
.d-input--lg .d-input__el { padding: 11px 12px; }
@media (min-width: 901px) {
  .d-input__el { font-size: 12.5px; }
  .d-input--lg .d-input__el { font-size: 13.5px; }
}
</style>
