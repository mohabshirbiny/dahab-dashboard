<template>
  <Panel title="Payout accounts">
    <template #body>
      <NoteBanner v-if="pauseUntil" class="d-pap__note" variant="info">Withdrawals are paused until {{ formatDateTime(pauseUntil) }} after {{ PAUSE_TRIGGER_LABELS[pauseTrigger ?? 'payout_account'] }}.</NoteBanner>

      <EmptyState v-if="accounts.length === 0" description="The customer has not added a bank account yet." title="Not added yet" />

      <div v-for="a in accounts" :key="a.id" class="d-pap__row">
        <div class="d-pap__head">
          <span>{{ a.bankName }} · <span class="mono">{{ a.number ?? a.numberMasked }}</span></span>

          <span class="d-pap__tags">
            <StatusTag v-if="a.inUse" label="In use" variant="ok" />
            <StatusTag :label="PAYOUT_ACCOUNT_STATES[a.state].label" :variant="PAYOUT_ACCOUNT_STATES[a.state].variant" />
          </span>
        </div>

        <div class="who2">{{ a.accountName }}<template v-if="a.addedAt"> · added {{ formatDate(a.addedAt) }}</template></div>
        <div v-if="a.checked" class="who2">{{ a.state === 'refused' ? 'Refused' : 'Name checked' }}{{ a.checked.by ? ` by ${a.checked.by}` : '' }}, {{ formatDate(a.checked.at) }}</div>
        <div v-if="a.refusal" class="who2">{{ reasonLabel(REFUSAL_REASONS, a.refusal.reason) }}<template v-if="a.refusal.note"> — {{ a.refusal.note }}</template></div>

        <div v-if="canVerify && a.state === 'pending_review'" class="d-pap__actions">
          <DBtn kind="primary" @click="openModal(a, 'verify')">Verify</DBtn>
          <DBtn @click="openModal(a, 'refuse')">Refuse</DBtn>
        </div>
      </div>

      <template v-if="canReadWithdrawals">
        <div class="d-pap__sub">Withdrawals</div>
        <LoadingState v-if="withdrawals.isPending.value" label="Loading withdrawals…" />
        <p v-else-if="withdrawals.isError.value" class="who2">Could not load the withdrawals.</p>
        <p v-else-if="withdrawalRows.length === 0" class="who2">No withdrawals yet.</p>

        <RouterLink
          v-for="w in withdrawalRows"
          v-else
          :key="w.id"
          class="d-pap__wd"
          :to="{ name: 'withdrawals', query: { scope: 'all', id: w.id } }"
        >
          <span>{{ w.number }} · {{ formatMoney(w.amount) }} EGP · {{ formatDate(w.requestedAt) }}</span>
          <StatusTag :label="withdrawalStateMeta(w).label" :variant="withdrawalStateMeta(w).variant" />
        </RouterLink>
      </template>
    </template>

    <PayoutAccountModal v-if="active" :account="active" :kind="modal" @close="modal = null" />
  </Panel>
</template>

<script lang="ts" setup>
  import type { WithdrawalPauseTrigger } from '@/types/customer'
  import type { PayoutAccount } from '@/types/withdrawal'
  import { computed, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import PayoutAccountModal from '@/components/withdrawals/PayoutAccountModal.vue'
  import { formatDate, formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { useWithdrawalsQuery } from '@/composables/useWithdrawals'
  import { PAUSE_TRIGGER_LABELS } from '@/types/customer'
  import { PERMISSIONS } from '@/types/staff'
  import { PAYOUT_ACCOUNT_STATES, reasonLabel, REFUSAL_REASONS, withdrawalStateMeta } from '@/types/withdrawal'

  // The customer's payout accounts and withdrawals (Backend spec 013 US8). The full number
  // shows only to holders of payout_account.verify / withdrawal.release (the Backend decides).
  const props = defineProps<{ customerId: string, accounts: PayoutAccount[], pauseUntil: string | null, pauseTrigger?: WithdrawalPauseTrigger | null }>()

  const { can, canAny } = usePermissions()
  const canVerify = computed(() => can(PERMISSIONS.payoutAccountVerify))
  const canReadWithdrawals = computed(() => canAny([PERMISSIONS.withdrawalRelease, PERMISSIONS.walletView]))

  const withdrawals = useWithdrawalsQuery(
    () => ({ scope: 'all', from: '', to: '', q: '', customerId: props.customerId }),
    canReadWithdrawals,
  )
  const withdrawalRows = computed(() => withdrawals.data.value?.pages[0]?.rows.slice(0, 10) ?? [])

  const active = ref<PayoutAccount | null>(null)
  const modal = ref<'verify' | 'refuse' | null>(null)

  function openModal (account: PayoutAccount, kind: 'verify' | 'refuse') {
    active.value = account
    modal.value = kind
  }
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
.d-pap__note { margin-bottom: 12px; }
.d-pap__row { padding: 10px 0; border-bottom: 1px solid var(--line); }
.d-pap__head { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.d-pap__tags { display: flex; gap: 6px; }
.d-pap__actions { display: flex; gap: 6px; margin-top: 8px; }
.d-pap__sub { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3); margin: 16px 0 6px; }
.d-pap__wd { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; font-size: 12.5px; color: inherit; text-decoration: none; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
