<template>
  <DModal
    :max-width="520"
    :model-value="open"
    :persistent="busy"
    title="Issue a credit note"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-icn__lead">
        {{ invoice.number }} · {{ formatMoney(invoice.remaining) }} EGP left to credit.
        The invoice never changes; the credit note gives the commission and VAT back to the seller's wallet.
      </p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountMessage" :hint="`Commission and VAT together, at most ${formatMoney(invoice.remaining)} EGP.`" label="Amount to credit">
        <DInput
          :id="controlId"
          v-model="amount"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="15"
        />
      </FormField>

      <KeyValueRow v-if="split" label="Of which VAT">
        <span class="num">{{ formatMoney(split.vat) }}</span>
      </KeyValueRow>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonMessage" label="Why">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="1000"
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-icn__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged with your name and the reason. The seller is told by SMS and email.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Issue the credit note</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { InvoiceDetail } from '@/types/invoice'
  import { computed, ref, watch } from 'vue'
  import { lengthError } from '@/components/finance/financeErrors'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useIssueCreditNote } from '@/composables/useInvoices'
  import { useToast } from '@/composables/useToast'
  import { isServiceError } from '@/services/errors'
  import { invoiceErrorMessage } from './invoiceErrors'

  // Issue or correct a tax invoice (Backend spec 016 FR-019, invoice.correct): a credit note on a
  // seller invoice, never above what is left. The VAT shown is a preview; the Backend splits it.
  const props = defineProps<{ open: boolean, invoice: InvoiceDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const amount = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const mutation = useIssueCreditNote()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const amountValid = computed(() => /^\d{1,12}(?:\.\d{1,2})?$/.test(amount.value.trim()) && Number(amount.value) > 0)
  const overLimit = computed(() => amountValid.value && Number(amount.value) > Number(props.invoice.remaining))
  const split = computed(() => {
    if (!amountValid.value) return null
    const rate = Number(props.invoice.vatRate)
    const vat = Math.round(Number(amount.value) * rate / (100 + rate) * 10_000) / 10_000
    return { vat: vat.toFixed(4) }
  })

  const amountMessage = computed(() => {
    if (submitted.value && !amountValid.value) return 'Write an amount in EGP, for example 300 or 300.50.'
    if (submitted.value && overLimit.value) return `At most ${formatMoney(props.invoice.remaining)} EGP is left on this invoice.`
    return fieldError(mutation.error.value, 'amount')
  })
  const reasonMessage = computed(() => (submitted.value ? lengthError(reason.value, 10, 1000, 'why the invoice is corrected') : undefined)
    ?? fieldError(mutation.error.value, 'reason'))
  const submitError = computed(() => {
    const error = mutation.error.value
    if (!error) return ''
    if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) return ''
    return invoiceErrorMessage(error)
  })

  watch(() => [props.open, props.invoice.id], () => {
    amount.value = ''
    reason.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (amountMessage.value || reasonMessage.value) return
    const body = { amount: amount.value.trim(), reason: reason.value.trim() }
    try {
      const note = await mutation.mutateAsync({ invoiceId: props.invoice.id, body, idempotencyKey: idempotency.keyFor({ invoice: props.invoice.id, ...body }) })
      idempotency.reset()
      toast.ok(`${note.number} issued. ${formatMoney(note.gross)} EGP went back to the seller.`)
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-icn__lead { margin: 0 0 14px; color: var(--ink-2); font-size: 13px; }
.d-icn__banner { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin-top: 10px; }
</style>
