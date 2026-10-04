<template>
  <DModal
    :max-width="560"
    :model-value="open"
    :persistent="busy"
    title="Send the reply and close"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-rsm__lead">{{ dispute.ref }} · {{ dispute.order.orderRef }}. Every dispute ends with a reply to the person who raised it. There is no way to close one silently.</p>

      <FormField v-slot="{ controlId }" label="What you are doing about it">
        <DSelect :id="controlId" v-model="outcome" :disabled="busy" :options="outcomeOptions" />
      </FormField>

      <NoteBanner v-if="outcome === 'resume'" class="d-rsm__note" variant="info">
        The order goes back to {{ frozenFromLabel }} and every running deadline gets back the time it was frozen.
      </NoteBanner>

      <NoteBanner v-else class="d-rsm__note" variant="info">
        The sale is cancelled at inspection, the buyer's deposit goes back to their wallet in full, and the piece waits at the branch for the seller.
      </NoteBanner>

      <p v-if="!dispute.can.resolveAgainstSale" class="who2">
        {{ paid ? 'This order is already paid, so it can only be resumed here.' : 'Cancelling and refunding needs the refund permission.' }}
      </p>

      <div class="d-rsm__label">Reply to the person who raised it</div>

      <div class="d-rsm__chips">
        <button
          v-for="c in CANNED_REPLIES"
          :key="c.label"
          class="d-rsm__chip"
          :disabled="busy"
          type="button"
          @click="reply = c.text"
        >{{ c.label }}</button>
      </div>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="replyError" label="Write your own">
        <DTextarea
          :id="controlId"
          v-model="reply"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="REPLY_MAX"
          :rows="4"
        />
      </FormField>

      <template v-if="dispute.can.compensate">
        <label class="d-rsm__check">
          <input v-model="withCompensation" :disabled="busy" type="checkbox">
          <span>Pay compensation</span>
        </label>

        <template v-if="withCompensation">
          <div class="d-rsm__row">
            <FormField v-slot="{ controlId }" label="To">
              <DSelect :id="controlId" v-model="party" :disabled="busy" :options="PARTIES" />
            </FormField>

            <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountError" label="Amount (EGP)">
              <DInput
                :id="controlId"
                v-model="amount"
                :describedby="describedBy"
                :disabled="busy"
                inputmode="text"
                :invalid="invalid"
                placeholder="0.00"
              />
            </FormField>
          </div>

          <p v-if="dispute.can.compensationCaps" class="who2">
            Your limit: {{ formatMoney(dispute.can.compensationCaps.perPayment) }} EGP a payment, {{ formatMoney(dispute.can.compensationCaps.leftToday) }} EGP left today.
          </p>

          <FormField v-slot="{ controlId }" label="Why">
            <DSelect :id="controlId" v-model="compReason" :disabled="busy" :options="COMPENSATION_REASONS" />
          </FormField>

          <FormField v-slot="{ controlId, describedBy, invalid }" :error="compNoteError" label="Note for the record">
            <DTextarea
              :id="controlId"
              v-model="compNote"
              :describedby="describedBy"
              :disabled="busy"
              :invalid="invalid"
              :maxlength="NOTE_MAX"
              :rows="2"
            />
          </FormField>
        </template>
      </template>

      <template v-if="dispute.can.suspendSeller && outcome === 'against_sale'">
        <label class="d-rsm__check">
          <input v-model="withSuspension" :disabled="busy" type="checkbox">
          <span>Suspend the seller</span>
        </label>

        <template v-if="withSuspension">
          <FormField v-slot="{ controlId }" label="Reason">
            <DSelect :id="controlId" v-model="suspendReason" :disabled="busy" :options="SUSPEND_REASONS" />
          </FormField>

          <FormField v-slot="{ controlId }" label="Note for staff (optional)">
            <DTextarea
              :id="controlId"
              v-model="suspendNote"
              :disabled="busy"
              :maxlength="NOTE_MAX"
              :rows="2"
            />
          </FormField>
        </template>
      </template>

      <NoteBanner v-if="submitError" class="d-rsm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Send the reply and close</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CompensationReason, DisputeDetail, DisputeOutcome, ResolveInput, SuspendReason } from '@/types/dispute'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useResolveDispute } from '@/composables/useDisputes'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { CANNED_REPLIES, COMPENSATION_REASONS, SUSPEND_REASONS } from '@/types/dispute'
  import { orderStateMeta } from '@/types/order'
  import { disputeFormError, lengthError, NOTE_MAX, NOTE_MIN, REPLY_MAX, REPLY_MIN } from './disputeErrors'

  // Resolve a dispute (Backend spec 014 FR-010–FR-016): resume, or — before payment and
  // with order.refund — cancel and refund; optional compensation and seller suspension,
  // each shown only when the Backend says the caller may (`can`). The Backend re-checks.
  const props = defineProps<{ open: boolean, dispute: DisputeDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const PARTIES: ReadonlyArray<{ value: 'buyer' | 'seller', label: string }> = [
    { value: 'buyer', label: 'The buyer' },
    { value: 'seller', label: 'The seller' },
  ]

  const mutation = useResolveDispute()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const paid = computed(() => props.dispute.order.frozenFrom === 'ready_to_collect')
  const frozenFromLabel = computed(() => orderStateMeta(props.dispute.order.frozenFrom).label.toLowerCase())
  const outcomeOptions = computed(() => [
    { value: 'resume' as DisputeOutcome, label: 'Resume the order' },
    ...(props.dispute.can.resolveAgainstSale ? [{ value: 'against_sale' as DisputeOutcome, label: 'Cancel and refund' }] : []),
  ])

  const outcome = ref<DisputeOutcome>('resume')
  const reply = ref('')
  const withCompensation = ref(false)
  const party = ref<'buyer' | 'seller'>(props.dispute.raisedAs)
  const amount = ref('')
  const compReason = ref<CompensationReason>('dispute_settlement')
  const compNote = ref('')
  const withSuspension = ref(false)
  const suspendReason = ref<SuspendReason>('piece_misrepresented')
  const suspendNote = ref('')
  const submitted = ref(false)

  const amountValid = computed(() => /^\d{1,12}(?:\.\d{1,4})?$/.test(amount.value.trim()) && Number(amount.value) > 0)
  const replyError = computed(() => (submitted.value ? lengthError(reply.value, REPLY_MIN, REPLY_MAX, 'the reply') : undefined) ?? fieldError(mutation.error.value, 'reply'))
  const amountError = computed(() => (submitted.value && withCompensation.value && !amountValid.value ? 'Enter an amount above zero.' : undefined) ?? fieldError(mutation.error.value, 'compensation.amount'))
  const compNoteError = computed(() => (submitted.value && withCompensation.value ? lengthError(compNote.value, NOTE_MIN, NOTE_MAX, 'a note') : undefined) ?? fieldError(mutation.error.value, 'compensation.note'))
  const submitError = computed(() => disputeFormError(mutation.error.value))

  watch(() => [props.open, props.dispute.id], () => {
    outcome.value = 'resume'
    reply.value = ''
    withCompensation.value = false
    party.value = props.dispute.raisedAs
    amount.value = ''
    compReason.value = 'dispute_settlement'
    compNote.value = ''
    withSuspension.value = false
    suspendReason.value = 'piece_misrepresented'
    suspendNote.value = ''
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
    if (replyError.value !== undefined || amountError.value !== undefined || compNoteError.value !== undefined) return

    const resolution: ResolveInput = {
      outcome: outcome.value,
      reply: reply.value.trim(),
      compensation: withCompensation.value
        ? { party: party.value, amount: amount.value.trim(), reason: compReason.value, note: compNote.value.trim() }
        : null,
      suspendSeller: withSuspension.value && outcome.value === 'against_sale'
        ? { reason: suspendReason.value, note: suspendNote.value.trim() === '' ? null : suspendNote.value.trim() }
        : null,
    }
    const payload = { id: props.dispute.id, resolution }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Reply sent and the dispute closed. Logged against your name.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-rsm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-rsm__note { margin: 4px 0 8px; }
.d-rsm__label { margin: 14px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-rsm__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.d-rsm__chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  background: var(--bg);
  cursor: pointer;
}
.d-rsm__chip:disabled { cursor: default; opacity: .6; }
.d-rsm__check { display: flex; gap: 8px; align-items: center; margin: 14px 0 6px; font-size: 13px; }
.d-rsm__row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.d-rsm__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
