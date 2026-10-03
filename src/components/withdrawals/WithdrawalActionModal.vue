<template>
  <DModal
    :max-width="520"
    :model-value="kind !== null"
    :persistent="busy"
    :title="TITLES[kind ?? 'review']"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-wam__lead">
        {{ withdrawal.number }} · {{ formatMoney(withdrawal.amount) }} EGP · {{ withdrawal.customer.fullName ?? withdrawal.customer.displayRef }}
        <template v-if="withdrawal.account"> · {{ withdrawal.account.bankName }} {{ withdrawal.account.number ?? withdrawal.account.numberMasked }}</template>
      </p>

      <template v-if="kind === 'review'">
        <p class="d-wam__text">You become the reviewer. Check the name on the account against the ID and the signals, then release, hold or reject it.</p>
      </template>

      <template v-else-if="kind === 'hold'">
        <FormField v-slot="{ controlId }" label="Why">
          <DSelect :id="controlId" v-model="holdReason" :disabled="busy" :options="HOLD_REASONS" />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="messageError" label="What the customer is told">
          <DTextarea
            :id="controlId"
            v-model="message"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="500"
            :rows="3"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for staff">
          <DTextarea
            :id="controlId"
            v-model="note"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="1000"
            placeholder="Required. Never shown to the customer."
            :rows="2"
          />
        </FormField>
      </template>

      <template v-else-if="kind === 'unhold'">
        <FormField v-slot="{ controlId }" label="Note (optional)">
          <DTextarea
            :id="controlId"
            v-model="note"
            :disabled="busy"
            :maxlength="1000"
            :rows="2"
          />
        </FormField>
      </template>

      <template v-else-if="kind === 'release'">
        <NoteBanner class="d-wam__banner" variant="info">Send the transfer at the bank first, then record its details here so the two records match.</NoteBanner>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="bankTxnError" label="Bank transaction number">
          <DInput
            :id="controlId"
            v-model="bankTxn"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="64"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError(mutation.error.value, 'transfer_reference')" label="Reference on the transfer">
          <DInput
            :id="controlId"
            v-model="reference"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="64"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError(mutation.error.value, 'value_date')" label="Value date">
          <DInput
            :id="controlId"
            v-model="valueDate"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            type="date"
          />
        </FormField>
      </template>

      <template v-else-if="kind === 'reject'">
        <p class="d-wam__text">The money goes back to the customer's available balance. They are told the reason, never the note.</p>

        <FormField v-slot="{ controlId }" label="Reason">
          <DSelect :id="controlId" v-model="rejectReason" :disabled="busy" :options="REJECT_REASONS" />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for staff">
          <DTextarea
            :id="controlId"
            v-model="note"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="1000"
            :rows="2"
          />
        </FormField>
      </template>

      <NoteBanner v-if="submitError" class="d-wam__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :kind="kind === 'reject' ? 'danger' : 'primary'" :loading="busy" @click="onSubmit">{{ BUTTONS[kind ?? 'review'] }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { WithdrawalAction } from '@/services/withdrawal.service'
  import type { Withdrawal, WithdrawalHoldReason, WithdrawalRejectReason } from '@/types/withdrawal'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useWithdrawalAction } from '@/composables/useWithdrawals'
  import { HOLD_REASONS, REJECT_REASONS } from '@/types/withdrawal'
  import { textError, withdrawalFormError } from './withdrawalErrors'

  type Kind = WithdrawalAction['kind']

  // Every action on a withdrawal (Backend spec 013 US6, withdrawal.release), in the shared modal.
  const props = defineProps<{ kind: Kind | null, withdrawal: Withdrawal }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const TITLES: Record<Kind, string> = {
    review: 'Take for review',
    hold: 'Hold this withdrawal',
    unhold: 'Remove the hold',
    release: 'Record the transfer and release',
    reject: 'Reject this withdrawal',
  }
  const BUTTONS: Record<Kind, string> = { review: 'Take it', hold: 'Hold it', unhold: 'Remove the hold', release: 'Record and release', reject: 'Reject' }
  const DONE: Record<Kind, string> = {
    review: 'Taken for review. You are the reviewer.',
    hold: 'On hold. The customer is told your message.',
    unhold: 'Hold removed.',
    release: 'Released. The customer is told.',
    reject: 'Rejected. The money is back in their available balance.',
  }

  const mutation = useWithdrawalAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const holdReason = ref<WithdrawalHoldReason>('name_mismatch')
  const rejectReason = ref<WithdrawalRejectReason>('account_not_in_name')
  const message = ref('')
  const note = ref('')
  const bankTxn = ref('')
  const reference = ref('')
  const valueDate = ref('')
  const submitted = ref(false)

  const messageError = computed(() => (submitted.value ? textError(message.value, 3, 500, 'what the customer is told') : undefined) ?? fieldError(mutation.error.value, 'message'))
  const noteError = computed(() => (submitted.value ? textError(note.value, 3, 1000, 'a note') : undefined) ?? fieldError(mutation.error.value, 'note'))
  const bankTxnError = computed(() => (submitted.value ? textError(bankTxn.value, 3, 64, 'the bank transaction number') : undefined) ?? fieldError(mutation.error.value, 'bank_txn_number'))
  const submitError = computed(() => withdrawalFormError(mutation.error.value))

  watch(() => [props.kind, props.withdrawal.id], () => {
    holdReason.value = 'name_mismatch'
    rejectReason.value = 'account_not_in_name'
    message.value = 'We need to check something before this goes out. We will come back to you within one working day.'
    note.value = ''
    bankTxn.value = ''
    reference.value = props.withdrawal.number
    valueDate.value = new Date().toISOString().slice(0, 10)
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  function action (): WithdrawalAction | null {
    switch (props.kind) {
      case 'review': { return { kind: 'review' } }
      case 'hold': {
        if (messageError.value || noteError.value) return null
        return { kind: 'hold', reason: holdReason.value, message: message.value.trim(), note: note.value.trim() }
      }
      case 'unhold': { return { kind: 'unhold', note: note.value.trim() || undefined } }
      case 'release': {
        if (bankTxnError.value) return null
        return { kind: 'release', bankTxnNumber: bankTxn.value.trim(), transferReference: reference.value.trim(), valueDate: valueDate.value }
      }
      case 'reject': {
        if (noteError.value) return null
        return { kind: 'reject', reason: rejectReason.value, note: note.value.trim() }
      }
    }
    return null
  }

  async function onSubmit () {
    if (busy.value || props.kind === null) return
    submitted.value = true
    const kind = props.kind
    const act = action()
    if (act === null) return
    const payload = { id: props.withdrawal.id, action: act }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(DONE[kind])
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-wam__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; font-weight: 500; }
.d-wam__text { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-wam__banner { margin: 0 0 12px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
