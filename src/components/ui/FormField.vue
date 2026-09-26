<template>
  <div class="d-field" :class="{ 'd-field--invalid': Boolean(error) }">
    <label v-if="label" class="d-field__label" :for="controlId">{{ label }}</label>
    <slot :control-id="controlId" :described-by="describedBy" :invalid="Boolean(error)" />
    <div v-if="error" :id="`${controlId}-error`" class="d-field__error" role="alert">{{ error }}</div>
    <div v-else-if="hint" :id="`${controlId}-hint`" class="d-field__hint">{{ hint }}</div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, useId } from 'vue'

  const props = defineProps<{
    label?: string
    hint?: string
    error?: string
    // Pass an id to reuse it for the control, otherwise one is generated.
    id?: string
  }>()

  const generatedId = useId()
  const controlId = computed(() => props.id ?? generatedId)
  const describedBy = computed(() => {
    if (props.error) return `${controlId.value}-error`
    if (props.hint) return `${controlId.value}-hint`
    return undefined
  })
</script>

<style lang="scss" scoped>
.d-field { margin-bottom: 13px; }
.d-field__label {
  display: block;
  font-size: 11.5px;
  color: var(--ink-2);
  margin-bottom: 5px;
}
.d-field__hint { font-size: 11px; color: var(--ink-3); margin-top: 4px; }
.d-field__error { font-size: 11px; color: var(--bad); margin-top: 4px; }
</style>
