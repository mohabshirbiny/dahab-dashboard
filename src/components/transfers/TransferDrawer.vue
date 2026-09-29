<template>
  <DModal :max-width="720" :model-value="topUp !== null" :title="topUp ? `${topUp.number} · ${TOPUP_METHOD_LABELS[topUp.method]}` : ''" @update:model-value="close">
    <div v-if="topUp" class="d-scroll">
      <div class="d-td__head">
        <StatusTag :label="TOPUP_STATUS_META[topUp.status].label" :variant="TOPUP_STATUS_META[topUp.status].variant" />
        <span v-if="topUp.origin === 'by_hand'" class="who2">Credited by hand</span>
      </div>

      <NoteBanner v-if="topUp.customer.status === 'suspended' && topUp.allowedActions.includes('match')" class="d-td__banner" variant="wait">
        This customer is suspended. Credit only money that has already arrived, and record the transaction reference.
      </NoteBanner>

      <div class="d-td__grid">
        <KeyValueRow label="Customer" :value="`Wallet ${topUp.customer.displayRef}${topUp.customer.fullName ? ` · ${topUp.customer.fullName}` : ''}`" />
        <KeyValueRow label="Phone" :value="topUp.customer.phone ?? '—'" />
        <KeyValueRow label="Reference" :value="topUp.reference" />
        <KeyValueRow label="Received" :value="formatDateTime(topUp.submittedAt)" />
        <KeyValueRow v-if="topUp.claimedAmount" label="Customer says they sent" :value="`${formatMoney(topUp.claimedAmount)} EGP`" />

        <KeyValueRow
          v-if="topUp.expectedAmount"
          label="Expected to arrive"
          :value="`≈ ${formatMoney(topUp.expectedAmount)} EGP, after the ${TOPUP_METHOD_LABELS[topUp.method]} fee of ${Number(topUp.noticeFeePercent ?? 0)}%`"
        />

        <KeyValueRow v-if="topUp.noticeAccount" label="Sent to" :value="topUp.noticeAccount.label" />
        <KeyValueRow v-if="topUp.creditedAmount" label="Credited" :value="`${formatMoney(topUp.creditedAmount)} EGP · ${formatDateTime(topUp.creditedAt)}`" />
        <KeyValueRow v-if="topUp.receivingAccount" label="Arrived in" :value="topUp.receivingAccount.label" />
        <KeyValueRow v-if="topUp.creditedBy" label="Credited by" :value="topUp.creditedBy.fullName" />
        <KeyValueRow v-if="topUp.arrivalReference" label="Transaction reference" :value="topUp.arrivalReference" />
        <KeyValueRow v-if="topUp.creditNote" label="Note" :value="topUp.creditNote" />
        <KeyValueRow v-if="topUp.holdNote" :label="topUp.status === 'on_hold' ? 'On hold because' : 'Last hold note'" :value="`${topUp.holdNote}${topUp.heldBy ? ` — ${topUp.heldBy.fullName}` : ''}`" />
        <KeyValueRow v-if="topUp.rejectReason" label="Rejected" :value="`${TOPUP_REJECT_REASON_LABELS[topUp.rejectReason]}${topUp.rejectedBy ? ` — ${topUp.rejectedBy.fullName}` : ''}`" />
        <KeyValueRow v-if="topUp.rejectNote" label="Reject note" :value="topUp.rejectNote" />
        <KeyValueRow v-if="topUp.cancelledAt" label="Cancelled by the customer" :value="formatDateTime(topUp.cancelledAt)" />
      </div>

      <div v-if="topUp.hasReceipt" class="d-td__receipt">
        <div class="d-td__label">Receipt</div>
        <ReceiptPreview :top-up-id="topUp.id" />
      </div>

      <p v-else-if="topUp.origin === 'notice'" class="who2">No receipt attached. Match only by the reference, the phone or the sender you can see in Dahab's statement.</p>

      <MatchForm
        v-if="mode === 'match'"
        :accounts="accounts"
        :top-up="topUp"
        @cancel="mode = null"
        @done="close"
      />

      <HoldForm v-else-if="mode === 'hold'" :top-up-id="topUp.id" @cancel="mode = null" @done="mode = null" />
      <RejectForm v-else-if="mode === 'reject'" :top-up-id="topUp.id" @cancel="mode = null" @done="close" />

      <NoteBanner v-if="unholdError" class="d-td__banner" role="alert" variant="bad">{{ unholdError }}</NoteBanner>
    </div>

    <template v-if="topUp && mode === null && topUp.allowedActions.length > 0" #actions>
      <DBtn v-if="canWalletStatement" @click="openStatement">Wallet statement</DBtn>
      <DBtn v-if="topUp.allowedActions.includes('reject')" kind="danger" @click="mode = 'reject'">Reject</DBtn>
      <DBtn v-if="topUp.allowedActions.includes('hold')" @click="mode = 'hold'">Put on hold</DBtn>
      <DBtn v-if="topUp.allowedActions.includes('unhold')" :loading="unhold.isPending.value" @click="takeOffHold">Take off hold</DBtn>
      <DBtn v-if="topUp.allowedActions.includes('match')" kind="success" @click="mode = 'match'">Match and credit</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ReceivingAccount, TopUp } from '@/types/topup'
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { useUnholdTopUp } from '@/composables/useTopUps'
  import { PERMISSIONS } from '@/types/staff'
  import { TOPUP_METHOD_LABELS, TOPUP_REJECT_REASON_LABELS, TOPUP_STATUS_META } from '@/types/topup'
  import HoldForm from './HoldForm.vue'
  import MatchForm from './MatchForm.vue'
  import ReceiptPreview from './ReceiptPreview.vue'
  import RejectForm from './RejectForm.vue'
  import { formLevelError } from './transferErrors'

  const props = defineProps<{ topUp: TopUp | null, accounts: ReceivingAccount[] }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const router = useRouter()
  const { can } = usePermissions()
  const toast = useToast()
  const canWalletStatement = computed(() => can(PERMISSIONS.walletView))

  const mode = ref<'match' | 'hold' | 'reject' | null>(null)
  watch(() => props.topUp?.id, () => {
    mode.value = null
  })

  const unhold = useUnholdTopUp()
  const idempotency = useIdempotencyKey()
  const unholdError = computed(() => formLevelError(unhold.error.value))

  async function takeOffHold () {
    if (!props.topUp) return
    const input = { id: props.topUp.id }
    try {
      await unhold.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok('Back to waiting.')
    } catch {
      // Shown in the dialog.
    }
  }

  function openStatement () {
    if (!props.topUp) return
    router.push({ name: 'statement', query: { customer: props.topUp.customer.id } })
  }

  function close () {
    mode.value = null
    emit('close')
  }
</script>

<style lang="scss" scoped>
// The shared DModal does not limit its height yet: the body scrolls here so the
// title and the actions stay on screen.
.d-scroll { max-height: calc(100vh - 190px); max-height: calc(100dvh - 190px); overflow-y: auto; overscroll-behavior: contain; margin: -4px -8px; padding: 4px 8px; }
.d-td__head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.d-td__banner { margin-bottom: 12px; }
.d-td__grid { display: grid; gap: 2px; margin-bottom: 12px; }
.d-td__receipt { margin-bottom: 12px; }
.d-td__label { font-size: 11px; color: var(--ink-3); margin-bottom: 6px; }
</style>
