<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    title="Add a karat"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-ak__lead">
      A new karat starts off, so sellers only see it once you turn it on. Its code and purity can't be changed later.
    </p>

    <form id="add-karat-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="codeError" hint="1 to 24, e.g. 14" label="Karat">
        <DInput
          :id="controlId"
          v-model="code"
          :describedby="describedBy"
          :disabled="loading"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="2"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="purityError" hint="Gold share, e.g. 0.585 for 14K" label="Purity">
        <DInput
          :id="controlId"
          v-model="purity"
          :describedby="describedBy"
          :disabled="loading"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="7"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-ak__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="add-karat-form" kind="primary" :loading="loading" type="submit">Add karat</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CreateKaratInput } from '@/types/reference'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { KARAT_CODE_MAX, KARAT_CODE_MIN, PURITY_PATTERN } from '@/types/reference'

  const props = defineProps<{
    modelValue: boolean
    loading?: boolean
    submitError?: string
    // Backend validation messages, by field.
    fieldErrors?: Partial<Record<'code' | 'purity', string>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: CreateKaratInput): void
  }>()

  const code = ref('')
  const purity = ref('')
  const submitted = ref(false)

  const codeValue = computed(() => Number(code.value.trim()))
  const codeError = computed(() => {
    if (submitted.value) {
      const n = codeValue.value
      if (!Number.isInteger(n) || n < KARAT_CODE_MIN || n > KARAT_CODE_MAX) {
        return `Enter a whole number from ${KARAT_CODE_MIN} to ${KARAT_CODE_MAX}.`
      }
    }
    return props.fieldErrors?.code
  })
  const purityError = computed(() => {
    if (submitted.value) {
      const text = purity.value.trim()
      if (!PURITY_PATTERN.test(text) || Number(text) <= 0) {
        return 'Enter a number above 0 and up to 1, with at most 5 decimals.'
      }
    }
    return props.fieldErrors?.purity
  })

  watch(() => props.modelValue, open => {
    if (!open) return
    code.value = ''
    purity.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (codeError.value || purityError.value) return
    emit('confirm', { code: codeValue.value, purity: purity.value.trim() })
  }
</script>

<style lang="scss" scoped>
.d-ak__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-ak__banner { margin-top: 12px; }
</style>
