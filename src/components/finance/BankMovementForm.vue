<template>
  <Panel title="Record a movement">
    <form class="d-bmf" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId }" label="What kind">
        <DSelect :id="controlId" v-model="kind" :disabled="busy" :options="BANK_MOVEMENT_KINDS" />
      </FormField>

      <p v-if="kind === 'other'" class="who2">If you pick something else, write what it was in the box below. That text is what you will read a year from now.</p>
      <p v-if="kind === 'own_transfer'" class="who2">Moving money between Dahab's own accounts changes nothing in the total. It moves the money from one account to the other in each account's books.</p>

      <!-- Owner notes of 2026-10-29: every movement names Dahab's account; a transfer names both. -->
      <FormField v-slot="{ controlId }" :error="bankMessage" :label="kind === 'own_transfer' ? 'From the account' : 'Which account'">
        <DSelect :id="controlId" v-model="bankId" :disabled="busy || banks.isLoading.value" :options="kind === 'own_transfer' ? fromOptions : bankOptions" />
      </FormField>

      <FormField v-if="kind === 'own_transfer'" v-slot="{ controlId }" :error="toBankMessage" label="To the account">
        <DSelect :id="controlId" v-model="toBankId" :disabled="busy || banks.isLoading.value" :options="bankOptions" />
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

      <FormField v-if="kind !== 'own_transfer'" v-slot="{ controlId }" label="In or out">
        <DSelect :id="controlId" v-model="direction" :disabled="busy" :options="DIRECTIONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError(mutation.error.value, 'occurred_on')" label="Date on the statement">
        <DInput
          :id="controlId"
          v-model="occurredOn"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          type="date"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonMessage" label="What it was for">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="500"
          :rows="2"
        />
      </FormField>

      <FormField v-slot="{ controlId }" :error="proofMessage" hint="Bank advice, receipt or invoice. PDF, JPG or PNG, up to 10 MB." label="Proof">
        <input
          :id="controlId"
          ref="fileInput"
          accept=".pdf,.jpg,.jpeg,.png"
          class="d-bmf__file"
          :disabled="busy"
          type="file"
          @change="onFile"
        >
      </FormField>

      <NoteBanner v-if="submitError" class="d-bmf__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <DBtn block kind="primary" :loading="busy" type="submit">Record it</DBtn>
      <p class="who2">Logged with your name.</p>
    </form>
  </Panel>
</template>

<script lang="ts" setup>
  import type { BankMovementKind } from '@/types/finance'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useBanksQuery, useRecordMovement } from '@/composables/useFinance'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { cairoDate } from '@/types/audit'
  import { BANK_MOVEMENT_KINDS } from '@/types/finance'
  import { amountError, financeFormError, lengthError } from './financeErrors'

  // Money in or out of Dahab's bank outside the app (Backend spec 015 FR-010, bank.record), naming
  // the account it used (owner notes of 2026-10-29).
  const DIRECTIONS: ReadonlyArray<{ value: 'in' | 'out', label: string }> = [
    { value: 'out', label: 'Out of the account' },
    { value: 'in', label: 'Into the account' },
  ]
  const MAX_BYTES = 10 * 1024 * 1024

  const kind = ref<BankMovementKind>('bank_charge')
  const direction = ref<'in' | 'out'>('out')
  const amount = ref('')
  const occurredOn = ref(cairoDate())
  const reason = ref('')
  const proof = ref<File | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)
  const submitted = ref(false)
  // Select values are strings; '' is nothing picked, 'none' (a transfer only) is cash not yet assigned to an account.
  const bankId = ref('')
  const toBankId = ref('')

  const banks = useBanksQuery()
  const bankOptions = computed(() => [
    { value: '', label: 'Pick an account' },
    ...(banks.data.value ?? []).map(b => ({ value: String(b.id), label: `${b.label}${b.bankName && b.bankName !== b.label ? ` · ${b.bankName}` : ''}${b.isActive ? '' : ' (not in use)'}` })),
  ])
  const fromOptions = computed(() => [...bankOptions.value, { value: 'none', label: 'Not assigned yet (from before banks were named)' }])

  watch(kind, value => {
    direction.value = BANK_MOVEMENT_KINDS.find(k => k.value === value)?.usually ?? 'out'
  })

  const mutation = useRecordMovement()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const amountMessage = computed(() => (submitted.value ? amountError(amount.value) : undefined) ?? fieldError(mutation.error.value, 'amount'))
  const reasonMessage = computed(() => (submitted.value ? lengthError(reason.value, 10, 500, 'what it was for') : undefined) ?? fieldError(mutation.error.value, 'reason'))
  const proofMessage = computed(() => (proof.value && proof.value.size > MAX_BYTES ? 'The file is over 10 MB.' : undefined) ?? fieldError(mutation.error.value, 'file'))
  const bankMessage = computed(() => (submitted.value && bankId.value === '' ? 'Pick the account.' : undefined) ?? fieldError(mutation.error.value, 'receiving_account_id'))
  const toBankMessage = computed(() => (submitted.value && kind.value === 'own_transfer' && (toBankId.value === '' || toBankId.value === bankId.value)
    ? 'Pick the account the money reached, not the one it left.'
    : undefined) ?? fieldError(mutation.error.value, 'to_receiving_account_id'))
  const submitError = computed(() => financeFormError(mutation.error.value))

  function onFile (event: Event) {
    proof.value = (event.target as HTMLInputElement).files?.[0] ?? null
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (amountMessage.value || reasonMessage.value || proofMessage.value || bankMessage.value || toBankMessage.value) return
    const own = kind.value === 'own_transfer'
    const body = {
      kind: kind.value,
      direction: own ? 'out' as const : direction.value,
      amount: amount.value.trim(),
      occurredOn: occurredOn.value,
      reason: reason.value.trim(),
      receivingAccountId: bankId.value === 'none' || bankId.value === '' ? null : Number(bankId.value),
      toReceivingAccountId: own ? Number(toBankId.value) : null,
    }
    try {
      await mutation.mutateAsync({ body, proof: proof.value, idempotencyKey: idempotency.keyFor({ ...body, proof: proof.value?.name ?? null }) })
      idempotency.reset()
      toast.ok(own ? `Recorded: ${formatMoney(body.amount)} EGP moved between accounts.` : `Recorded: ${direction.value === 'in' ? 'in' : 'out'} ${formatMoney(body.amount)} EGP.`)
      amount.value = ''
      reason.value = ''
      proof.value = null
      if (fileInput.value) fileInput.value.value = ''
      submitted.value = false
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-bmf { display: grid; gap: 4px; padding: 16px; }
.d-bmf__banner { margin: 8px 0; }
.d-bmf__file { font-size: 12px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 4px 0; }
</style>
