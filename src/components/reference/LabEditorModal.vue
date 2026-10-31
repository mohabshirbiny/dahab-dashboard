<template>
  <DModal
    :max-width="560"
    :model-value="modelValue"
    :persistent="loading"
    :title="lab ? `Edit ${lab.nameEn}` : 'Add a lab'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <form id="lab-editor-form" novalidate @submit.prevent="onSubmit">
      <div class="d-le__grid">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('name_en', form.nameEn)" label="Name (English)">
          <DInput
            :id="controlId"
            v-model="form.nameEn"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="150"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('name_ar', form.nameAr)" label="Name (Arabic)">
          <DInput
            :id="controlId"
            v-model="form.nameAr"
            :describedby="describedBy"
            dir="rtl"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="150"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="moneyError('certificate_own_cost_egp', form.ownCost)" hint="EGP. The seller holds this lab's certificate. 0 shows as Free." label="Its own certificate">
          <DInput
            :id="controlId"
            v-model="form.ownCost"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="moneyError('certificate_other_cost_egp', form.otherCost)" hint="EGP. The seller holds a certificate from any other lab." label="Another lab's certificate">
          <DInput
            :id="controlId"
            v-model="form.otherCost"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="moneyError('certificate_none_cost_egp', form.noneCost)" hint="EGP. The seller holds no certificate." label="No certificate">
          <DInput
            :id="controlId"
            v-model="form.noneCost"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="moneyError('gold_inspection_cost_egp', form.goldCost)" hint="EGP, gold only. While it is 0 sellers never see it." label="Gold inspection">
          <DInput
            :id="controlId"
            v-model="form.goldCost"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
          />
        </FormField>
      </div>

      <label class="d-le__check">
        <input v-model="form.isEnabled" :disabled="loading" type="checkbox">
        Taking pieces
      </label>

      <NoteBanner v-if="lab && lab.isEnabled && !form.isEnabled && lab.livePieces > 0" variant="wait">
        {{ lab.livePieces }} live {{ lab.livePieces === 1 ? 'piece leaves' : 'pieces leave' }} the market until their sellers choose another lab.
      </NoteBanner>

      <p class="who2">A changed cost applies to pieces not yet accepted, and their sellers are told. Orders keep the cost they locked.</p>

      <NoteBanner v-if="submitError" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </form>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="loading" @click="onSubmit">Save</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Lab, LabInput } from '@/types/reference'
  import { reactive, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'

  const props = defineProps<{
    modelValue: boolean
    // null = a new lab.
    lab: Lab | null
    loading?: boolean
    submitError?: string
    fieldErrors?: Readonly<Record<string, string[]>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: LabInput): void
  }>()

  const MONEY = /^\d{1,8}(?:\.\d{1,2})?$/
  const form = reactive({ nameEn: '', nameAr: '', ownCost: '', otherCost: '', noneCost: '', goldCost: '0', isEnabled: true })
  const submitted = ref(false)

  const plain = (value: string | undefined) => (value === undefined ? '' : String(Number(value)))

  watch(() => props.modelValue, open => {
    if (!open) return
    const l = props.lab
    form.nameEn = l?.nameEn ?? ''
    form.nameAr = l?.nameAr ?? ''
    form.ownCost = plain(l?.ownCost)
    form.otherCost = plain(l?.otherCost)
    form.noneCost = plain(l?.noneCost)
    form.goldCost = l ? plain(l.goldCost) : '0'
    form.isEnabled = l?.isEnabled ?? true
    submitted.value = false
  })

  function errorFor (field: string, value: string): string | undefined {
    if (submitted.value && value.trim() === '') return 'Required.'
    return props.fieldErrors?.[field]?.[0]
  }

  function moneyError (field: string, value: string): string | undefined {
    if (submitted.value && !MONEY.test(value.trim())) return 'Enter an amount in EGP, up to 2 decimals.'
    return props.fieldErrors?.[field]?.[0]
  }

  function onSubmit () {
    submitted.value = true
    const invalid = form.nameEn.trim() === '' || form.nameAr.trim() === ''
      || [form.ownCost, form.otherCost, form.noneCost, form.goldCost].some(v => !MONEY.test(v.trim()))
    if (invalid) return
    emit('confirm', {
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      ownCost: form.ownCost.trim(),
      otherCost: form.otherCost.trim(),
      noneCost: form.noneCost.trim(),
      goldCost: form.goldCost.trim(),
      isEnabled: form.isEnabled,
    })
  }
</script>

<style lang="scss" scoped>
.d-le__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.d-le__check { display: flex; gap: 8px; align-items: center; font-size: 13px; margin: 4px 0 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 10px; }
@media (max-width: 600px) { .d-le__grid { grid-template-columns: 1fr; } }
</style>
