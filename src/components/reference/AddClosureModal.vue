<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    title="Add a holiday"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-ac__lead">
      Deadlines skip this whole day. Choose all branches for a public holiday, or one branch for a local closure.
    </p>

    <form id="add-closure-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="dateError" label="Date">
        <DInput
          :id="controlId"
          v-model="date"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          type="date"
        />
      </FormField>

      <FormField v-slot="{ controlId }" :error="fieldErrors?.branch_id" label="Branches">
        <DSelect :id="controlId" v-model="scope" :disabled="loading" :options="scopeOptions" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldErrors?.reason_en" label="What (English)">
        <DInput
          :id="controlId"
          v-model="reasonEn"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="200"
          placeholder="For example: Armed Forces Day"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldErrors?.reason_ar" label="What (Arabic)">
        <DInput
          :id="controlId"
          v-model="reasonAr"
          :describedby="describedBy"
          dir="rtl"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="200"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-ac__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="add-closure-form" kind="primary" :loading="loading" type="submit">Add holiday</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Branch, CreateClosureInput } from '@/types/reference'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'

  const props = defineProps<{
    modelValue: boolean
    branches: readonly Branch[]
    loading?: boolean
    submitError?: string
    fieldErrors?: Partial<Record<'closure_date' | 'branch_id' | 'reason_en' | 'reason_ar', string>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: CreateClosureInput): void
  }>()

  const ALL = 'all'
  const date = ref('')
  const scope = ref<string>(ALL)
  const reasonEn = ref('')
  const reasonAr = ref('')
  const submitted = ref(false)

  const scopeOptions = computed(() => [
    { value: ALL, label: 'All branches' },
    ...props.branches.map(b => ({ value: String(b.id), label: b.nameEn })),
  ])

  const dateError = computed(() =>
    submitted.value && !/^\d{4}-\d{2}-\d{2}$/.test(date.value) ? 'Pick a date.' : props.fieldErrors?.closure_date,
  )

  watch(() => props.modelValue, open => {
    if (!open) return
    date.value = ''
    scope.value = ALL
    reasonEn.value = ''
    reasonAr.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (dateError.value) return
    emit('confirm', {
      branchId: scope.value === ALL ? null : Number(scope.value),
      closureDate: date.value,
      reasonEn: reasonEn.value.trim() || null,
      reasonAr: reasonAr.value.trim() || null,
    })
  }
</script>

<style lang="scss" scoped>
.d-ac__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-ac__banner { margin-top: 12px; }
</style>
