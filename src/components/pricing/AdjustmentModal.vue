<template>
  <DModal
    :max-width="560"
    :model-value="modelValue"
    :persistent="loading"
    :title="karat ? `${karat.code}K price adjustments` : 'Price adjustments'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-am__lead">
      Buy side is what sellers get (applied to the market bid); sell side is what buyers pay (applied to the market ask).
      A fixed amount is EGP per gram of this karat.
    </p>

    <form id="adjustment-form" novalidate @submit.prevent="onSubmit">
      <div v-for="side in sides" :key="side.key" class="d-am__row">
        <span class="d-am__label">{{ side.label }}</span>
        <DSelect v-model="form[side.key].kind" :aria-label="`${side.label} kind`" :disabled="loading" :options="kindOptions" />

        <DInput
          v-model="form[side.key].value"
          :aria-label="`${side.label} value`"
          :disabled="loading"
          inputmode="numeric"
          :invalid="Boolean(valueError(side.key))"
          :maxlength="12"
        />

        <div v-if="valueError(side.key)" class="d-am__error" role="alert">{{ valueError(side.key) }}</div>
      </div>

      <div class="d-am__preview">
        <div class="d-am__previewhead">
          <span>Result at today's price</span>
          <DBtn :disabled="loading || !valid" :loading="preview.isPending.value" @click="runPreview">Preview</DBtn>
        </div>

        <template v-if="previewRow">
          <KeyValueRow label="Sellers get" :value="formatEgp(previewRow.sellersGet)" />
          <KeyValueRow label="Buyers pay" :value="formatEgp(previewRow.buyersPay)" />
          <KeyValueRow big label="Published difference per gram" :value="formatEgp(previewRow.difference)" />
          <NoteBanner v-if="previewRow.inverted" variant="bad">Buyers would pay less than sellers get. This can't be saved.</NoteBanner>
        </template>

        <p v-else class="who2">Calculated by the server from the current price. Nothing is saved until you confirm.</p>
      </div>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Why (recorded with the change)">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          placeholder="For example: aligning with the market this week."
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError || previewError" class="d-am__banner" role="alert" variant="bad">
      {{ submitError ?? previewError }}
    </NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="adjustment-form" kind="primary" :loading="loading" type="submit">Save adjustments</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Adjustment, AdjustmentKind, KaratPrice } from '@/types/pricing'
  import { computed, reactive, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { usePreviewPrices } from '@/composables/usePricing'
  import { DECIMAL_PATTERN, formatEgp, REASON_MAX, REASON_MIN, trimDecimal } from '@/types/pricing'
  import { pricingErrorMessage } from './pricingErrors'

  type Side = 'buy' | 'sell'

  const props = defineProps<{
    modelValue: boolean
    karat: KaratPrice | null
    loading?: boolean
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: { buy: Adjustment, sell: Adjustment, reason: string }): void
  }>()

  const sides: Array<{ key: Side, label: string }> = [
    { key: 'buy', label: 'Buy side' },
    { key: 'sell', label: 'Sell side' },
  ]
  const kindOptions: Array<{ value: AdjustmentKind, label: string }> = [
    { value: 'fixed', label: 'EGP per gram' },
    { value: 'percent', label: 'Percent' },
  ]

  const form = reactive<Record<Side, { kind: AdjustmentKind, value: string }>>({
    buy: { kind: 'fixed', value: '' },
    sell: { kind: 'fixed', value: '' },
  })
  const reason = ref('')
  const submitted = ref(false)

  const preview = usePreviewPrices()
  const previewRow = computed(() => preview.data.value?.karats.find(k => k.code === props.karat?.code))
  const previewError = computed(() => (preview.isError.value ? pricingErrorMessage(preview.error.value) : undefined))

  function valueError (side: Side): string | undefined {
    const v = form[side].value.trim()
    if (!DECIMAL_PATTERN.test(v)) return 'A number with at most 4 decimals.'
    if (form[side].kind === 'percent' && Number(v) <= -100) return 'A percentage must be above −100.'
    return undefined
  }

  const valid = computed(() => !valueError('buy') && !valueError('sell'))
  const reasonError = computed(() =>
    submitted.value && reason.value.trim().length < REASON_MIN ? `Write at least ${REASON_MIN} characters.` : undefined,
  )

  // Every opening starts from the saved adjustments.
  watch(() => props.modelValue, open => {
    if (!open || !props.karat) return
    for (const side of ['buy', 'sell'] as const) {
      form[side].kind = props.karat.adjustments[side].kind
      form[side].value = trimDecimal(props.karat.adjustments[side].value)
    }
    reason.value = ''
    submitted.value = false
    preview.reset()
  })

  function current (): { buy: Adjustment, sell: Adjustment } {
    return {
      buy: { kind: form.buy.kind, value: form.buy.value.trim() },
      sell: { kind: form.sell.kind, value: form.sell.value.trim() },
    }
  }

  function runPreview () {
    if (!props.karat || !valid.value) return
    preview.mutate({ price: null, adjustments: { [props.karat.code]: current() } })
  }

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (!valid.value || reasonError.value) return
    emit('confirm', { ...current(), reason: reason.value.trim() })
  }
</script>

<style lang="scss" scoped>
.d-am__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-am__row {
  display: grid;
  grid-template-columns: 90px 1fr 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.d-am__label { font-size: 12px; font-weight: 600; color: var(--ink); }
.d-am__error { grid-column: 2 / -1; font-size: 11.5px; color: var(--bad); }
.d-am__preview {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin: 6px 0 14px;
}
.d-am__previewhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 600; }
.d-am__banner { margin-top: 12px; }
</style>
