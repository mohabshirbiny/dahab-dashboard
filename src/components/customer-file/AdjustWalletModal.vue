<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    title="Adjust the wallet"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <NoteBanner class="d-awm__banner" variant="wait">A correction moves money in or out of this customer's available balance. It is never an edit of the balance, and it can never take it below zero.</NoteBanner>

      <FormField v-slot="{ controlId }" label="Direction">
        <DSelect :id="controlId" v-model="direction" :disabled="busy" :options="DIRECTIONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountMessage" label="Amount in EGP">
        <DInput
          :id="controlId"
          v-model="amount"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="17"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonMessage" label="Reason">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="1000"
          placeholder="Required. Kept on the record; the customer is not shown it."
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-awm__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged with your name. The customer is told by SMS and email, and sees a Correction on their statement.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :kind="direction === 'debit' ? 'danger' : 'primary'" :loading="busy" @click="onSubmit">{{ direction === 'debit' ? 'Take from the wallet' : 'Add to the wallet' }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { AdjustmentDirection } from '@/types/finance'
  import { computed, ref, watch } from 'vue'
  import { amountError, financeFormError, lengthError } from '@/components/finance/financeErrors'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useAdjustWallet } from '@/composables/useFinance'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'

  // Adjust a wallet balance directly (Backend spec 015 FR-006, wallet.adjust — founders only by seed).
  const DIRECTIONS: ReadonlyArray<{ value: AdjustmentDirection, label: string }> = [
    { value: 'credit', label: 'Add to the available balance' },
    { value: 'debit', label: 'Take from the available balance' },
  ]

  const props = defineProps<{ open: boolean, customerId: string }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const direction = ref<AdjustmentDirection>('credit')
  const amount = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const mutation = useAdjustWallet()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const amountMessage = computed(() => (submitted.value ? amountError(amount.value) : undefined) ?? fieldError(mutation.error.value, 'amount'))
  const reasonMessage = computed(() => (submitted.value ? lengthError(reason.value, 10, 1000, 'the reason') : undefined) ?? fieldError(mutation.error.value, 'reason'))
  const submitError = computed(() => financeFormError(mutation.error.value))

  watch(() => props.open, () => {
    direction.value = 'credit'
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
    const body = { customerId: props.customerId, direction: direction.value, amount: amount.value.trim(), reason: reason.value.trim() }
    try {
      await mutation.mutateAsync({ ...body, idempotencyKey: idempotency.keyFor(body) })
      idempotency.reset()
      toast.ok(`${body.direction === 'credit' ? 'Added' : 'Taken'} ${formatMoney(body.amount)} EGP. The customer is told.`)
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-awm__banner { margin: 0 0 12px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
