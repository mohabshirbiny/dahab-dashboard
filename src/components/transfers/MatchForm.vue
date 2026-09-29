<template>
  <form class="d-mf" novalidate @submit.prevent="onSubmit">
    <div class="d-mf__title">Match and credit the wallet</div>
    <p class="who2 d-mf__lead">Only after you see the money in Dahab's {{ methodLabel }} account. The wallet gets what actually arrived.</p>

    <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountFieldError" :hint="claimHint" label="Amount that arrived (EGP)">
      <DInput
        :id="controlId"
        v-model="amount"
        :describedby="describedBy"
        :disabled="busy"
        inputmode="numeric"
        :invalid="invalid"
        :maxlength="14"
      />
    </FormField>

    <FormField v-slot="{ controlId }" :error="fieldError(mutation.error.value, 'receiving_account_id')" label="It arrived in">
      <DSelect :id="controlId" v-model="accountId" :disabled="busy" :options="accountOptions" />
    </FormField>

    <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" :label="differs ? 'Why the amount differs' : 'Note (optional)'">
      <DTextarea
        :id="controlId"
        v-model="note"
        :describedby="describedBy"
        :disabled="busy"
        :invalid="invalid"
        :maxlength="1000"
        placeholder="Staff only; the customer never sees it."
        :rows="2"
      />
    </FormField>

    <FormField
      v-slot="{ controlId, describedBy, invalid }"
      :error="referenceError"
      :hint="suspended ? 'This customer is suspended: enter the transaction reference from Dahab\'s statement that shows the money arrived.' : 'Optional: the bank or wallet transaction reference.'"
      :label="suspended ? 'Transaction reference (required)' : 'Transaction reference'"
    >
      <DInput
        :id="controlId"
        v-model="arrivalReference"
        :describedby="describedBy"
        :disabled="busy"
        :invalid="invalid"
        :maxlength="100"
      />
    </FormField>

    <NoteBanner v-if="submitError" class="d-mf__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <div class="d-mf__actions">
      <DBtn :disabled="busy" @click="emit('cancel')">Cancel</DBtn>
      <DBtn kind="success" :loading="busy" type="submit">Credit {{ amount.trim() ? `${amount.trim()} EGP` : 'wallet' }}</DBtn>
    </div>
  </form>
</template>

<script lang="ts" setup>
  import type { ReceivingAccount, TopUp } from '@/types/topup'
  import { computed, ref } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useMatchTopUp } from '@/composables/useTopUps'
  import { TOPUP_METHOD_LABELS } from '@/types/topup'
  import { amountError, formLevelError, plainAmount } from './transferErrors'

  const props = defineProps<{ topUp: TopUp, accounts: ReceivingAccount[] }>()
  const emit = defineEmits<{ (e: 'cancel' | 'done'): void }>()

  const mutation = useMatchTopUp()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const methodLabel = computed(() => TOPUP_METHOD_LABELS[props.topUp.method])
  const suspended = computed(() => props.topUp.customer.status === 'suspended')
  // Only accounts of the notice's method; an inactive one may still have received the money.
  const methodAccounts = computed(() => props.accounts.filter(a => a.method === props.topUp.method))
  const accountOptions = computed(() => methodAccounts.value.map(a => ({ value: String(a.id), label: a.isActive ? a.label : `${a.label} (inactive)` })))

  // Pre-filled with what should arrive after the provider fee when the account shows one
  // (display-only estimate from the Backend); staff change it to what really arrived.
  const prefill = props.topUp.expectedAmount ?? props.topUp.claimedAmount
  const amount = ref(prefill ? String(Number(prefill)) : '')
  const accountId = ref(String(props.topUp.noticeAccount?.id ?? methodAccounts.value[0]?.id ?? ''))
  const feePercent = props.topUp.noticeFeePercent
  const note = ref(props.topUp.expectedAmount && feePercent ? `${TOPUP_METHOD_LABELS[props.topUp.method]} fee, ${Number(feePercent)}%` : '')
  const arrivalReference = ref('')
  const submitted = ref(false)

  const claimHint = computed(() => {
    if (!props.topUp.claimedAmount) return undefined
    const said = `The customer said ${formatMoney(props.topUp.claimedAmount)} EGP`
    return props.topUp.expectedAmount
      ? `${said}; about ${formatMoney(props.topUp.expectedAmount)} EGP should arrive after the fee. Enter what really arrived.`
      : `${said}.`
  })
  const differs = computed(() => props.topUp.claimedAmount !== null && Number(plainAmount(amount.value)) !== Number(props.topUp.claimedAmount))

  const amountFieldError = computed(() => (submitted.value ? amountError(amount.value) : undefined) ?? fieldError(mutation.error.value, 'amount'))
  const noteError = computed(() => (submitted.value && differs.value && note.value.trim() === '' ? 'Say why the amount differs from what the customer sent.' : undefined) ?? fieldError(mutation.error.value, 'note'))
  const referenceError = computed(() => (submitted.value && suspended.value && arrivalReference.value.trim() === '' ? 'Required for a suspended customer.' : undefined) ?? fieldError(mutation.error.value, 'arrival_reference'))

  const submitError = computed(() => formLevelError(mutation.error.value))

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (amountFieldError.value || noteError.value || referenceError.value || accountId.value === '') return

    const input = {
      amount: plainAmount(amount.value),
      receivingAccountId: Number(accountId.value),
      note: note.value.trim() === '' ? null : note.value.trim(),
      arrivalReference: arrivalReference.value.trim() === '' ? null : arrivalReference.value.trim(),
    }
    try {
      await mutation.mutateAsync({ id: props.topUp.id, ...input, idempotencyKey: idempotency.keyFor({ id: props.topUp.id, ...input }) })
      idempotency.reset()
      toast.ok(`Matched and credited ${input.amount} EGP. Logged with your name.`)
      emit('done')
    } catch {
      // Shown in the form; a retry of the same input reuses the same key.
    }
  }
</script>

<style lang="scss" scoped>
.d-mf { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.d-mf__title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.d-mf__lead { margin: 0 0 11px; }
.d-mf__error { margin-bottom: 10px; }
.d-mf__actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
