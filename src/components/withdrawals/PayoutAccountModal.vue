<template>
  <DModal
    :max-width="500"
    :model-value="kind !== null"
    :persistent="busy"
    :title="kind === 'refuse' ? 'Refuse this account' : 'The name matches the ID'"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <KeyValueRow label="Account" :value="`${account.bankName} · ${account.number ?? account.numberMasked}`" />
      <KeyValueRow label="Holder on the account" :value="account.accountName" />
      <KeyValueRow v-if="account.customer" label="Name on the verified ID" :value="account.customer.fullName ?? '—'" />

      <template v-if="kind === 'verify'">
        <p class="d-pam__text">
          The account becomes usable. If the customer has no account in use, it becomes the one their money goes to;
          when it replaces an earlier one, open withdrawals are cancelled and new ones pause for the set window.
        </p>
      </template>

      <template v-else>
        <FormField v-slot="{ controlId }" label="Reason the customer sees">
          <DSelect :id="controlId" v-model="reason" :disabled="busy" :options="REFUSAL_REASONS" />
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

      <NoteBanner v-if="submitError" class="d-pam__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :kind="kind === 'refuse' ? 'danger' : 'primary'" :loading="busy" @click="onSubmit">{{ kind === 'refuse' ? 'Refuse' : 'Verify' }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { PayoutAccount, PayoutRefusalReason } from '@/types/withdrawal'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useRefusePayoutAccount, useVerifyPayoutAccount } from '@/composables/useWithdrawals'
  import { REFUSAL_REASONS } from '@/types/withdrawal'
  import { textError, withdrawalFormError } from './withdrawalErrors'

  // Verify or refuse a payout account (Backend spec 013 US2, payout_account.verify).
  const props = defineProps<{ kind: 'verify' | 'refuse' | null, account: PayoutAccount }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const verify = useVerifyPayoutAccount()
  const refuse = useRefusePayoutAccount()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => verify.isPending.value || refuse.isPending.value)

  const reason = ref<PayoutRefusalReason>('name_mismatch')
  const note = ref('')
  const submitted = ref(false)
  const noteError = computed(() => (submitted.value ? textError(note.value, 3, 1000, 'a note') : undefined) ?? fieldError(refuse.error.value, 'note'))
  const submitError = computed(() => withdrawalFormError(props.kind === 'refuse' ? refuse.error.value : verify.error.value))

  watch(() => [props.kind, props.account.id], () => {
    reason.value = 'name_mismatch'
    note.value = ''
    submitted.value = false
    verify.reset()
    refuse.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value || props.kind === null) return
    submitted.value = true
    try {
      if (props.kind === 'verify') {
        const payload = { id: props.account.id, kind: 'verify' }
        const result = await verify.mutateAsync({ id: props.account.id, idempotencyKey: idempotency.keyFor(payload) })
        toast.ok(result.pauseUntil
          ? `Verified and now in use. Withdrawals pause until ${formatDateTime(result.pauseUntil)}${result.cancelled.length > 0 ? `; ${result.cancelled.length} cancelled` : ''}.`
          : 'Verified. The customer is told.')
      } else {
        if (noteError.value) return
        const payload = { id: props.account.id, reason: reason.value, note: note.value.trim() }
        await refuse.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
        toast.ok('Refused. The customer is told the reason.')
      }
      idempotency.reset()
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-pam__text { margin: 12px 0; font-size: 13px; line-height: 1.6; }
.d-pam__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
