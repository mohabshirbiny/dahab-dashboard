<template>
  <Panel :subtitle="`${withdrawal.number} · requested ${formatDateTime(withdrawal.requestedAt)}`" :title="`${formatMoney(withdrawal.amount)} EGP`">
    <template #actions>
      <StatusTag :label="withdrawalStateMeta(withdrawal).label" :variant="withdrawalStateMeta(withdrawal).variant" />
    </template>

    <template #body>
      <KeyValueRow label="Customer" :value="`${withdrawal.customer.fullName ?? '—'} · ${withdrawal.customer.displayRef ?? '—'}`" />
      <KeyValueRow label="Available now" :value="`${formatMoney(withdrawal.customer.available)} EGP`" />

      <template v-if="withdrawal.account">
        <KeyValueRow label="Goes to" :value="`${withdrawal.account.bankName} · ${withdrawal.account.number ?? withdrawal.account.numberMasked}`" />
        <KeyValueRow label="Account holder" :value="withdrawal.account.accountName" />

        <KeyValueRow
          label="Name check"
          :value="withdrawal.account.checked ? `${withdrawal.account.checked.by ?? 'Staff'}, ${formatDate(withdrawal.account.checked.at)}` : 'Not checked'"
        />
      </template>

      <RouterLink v-if="can(PERMISSIONS.customerView)" class="d-wd__link" :to="{ name: 'customer-file', params: { id: withdrawal.customer.id } }">Open the customer file</RouterLink>

      <div class="d-wd__sub">Before you release</div>
      <div v-for="signal in signalLines(withdrawal)" :key="signal.text" class="d-wd__signal" :class="`d-wd__signal--${signal.tone}`">{{ signal.text }}</div>

      <template v-if="withdrawal.hold">
        <div class="d-wd__sub">{{ withdrawal.hold.onHold ? 'On hold' : 'Was on hold' }}</div>
        <KeyValueRow label="Why" :value="reasonLabel(HOLD_REASONS, withdrawal.hold.reason)" />
        <KeyValueRow label="Customer told" :value="withdrawal.hold.message" />
        <KeyValueRow label="Staff note" :value="withdrawal.hold.note" />
        <KeyValueRow label="By" :value="`${withdrawal.hold.by ?? '—'}, ${formatDateTime(withdrawal.hold.at)}`" />
      </template>

      <template v-if="withdrawal.releasedAt">
        <div class="d-wd__sub">Released</div>
        <KeyValueRow label="When" :value="formatDateTime(withdrawal.releasedAt)" />
        <KeyValueRow label="Bank transaction" :value="withdrawal.bankTxnNumber ?? '—'" />
        <KeyValueRow label="Reference" :value="withdrawal.transferReference ?? '—'" />
        <KeyValueRow label="Value date" :value="withdrawal.valueDate ? formatDate(withdrawal.valueDate) : '—'" />
      </template>

      <template v-if="withdrawal.rejection">
        <div class="d-wd__sub">Rejected</div>
        <KeyValueRow label="Reason" :value="reasonLabel(REJECT_REASONS, withdrawal.rejection.reason)" />
        <KeyValueRow label="Staff note" :value="withdrawal.rejection.note" />
      </template>

      <NoteBanner v-if="withdrawal.cancelledByChange" class="d-wd__note" variant="info">Cancelled because the customer changed the account their money goes to.</NoteBanner>

      <KeyValueRow v-if="withdrawal.reviewer" label="Reviewer" :value="withdrawal.reviewer.fullName" />

      <template v-if="withdrawal.ledger.length > 0">
        <div class="d-wd__sub">Money moved</div>

        <div v-for="entry in withdrawal.ledger" :key="entry.id" class="d-wd__entry">
          <span>{{ LEDGER_LABELS[entry.kind] }} · {{ formatDateTime(entry.createdAt) }}</span>
          <span class="who2">{{ entry.lines.map(l => `${ACCOUNT_LABELS[l.account] ?? l.account} ${formatMoney(l.amount)}`).join(' · ') }}</span>
        </div>
      </template>
    </template>

    <template #footer>
      <div v-if="hasActions" class="d-wd__actions">
        <DBtn v-if="withdrawal.can.review" kind="primary" @click="open('review')">Take for review</DBtn>
        <DBtn v-if="withdrawal.can.release" kind="primary" @click="open('release')">Release</DBtn>
        <DBtn v-if="withdrawal.can.hold" @click="open('hold')">Hold</DBtn>
        <DBtn v-if="withdrawal.can.unhold" @click="open('unhold')">Remove the hold</DBtn>
        <DBtn v-if="withdrawal.can.reject" kind="danger" @click="open('reject')">Reject</DBtn>
      </div>
    </template>

    <WithdrawalActionModal :kind="modal" :withdrawal="withdrawal" @close="modal = null" />
  </Panel>
</template>

<script lang="ts" setup>
  import type { WithdrawalAction } from '@/services/withdrawal.service'
  import type { Withdrawal } from '@/types/withdrawal'
  import { computed, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { PERMISSIONS } from '@/types/staff'
  import { HOLD_REASONS, reasonLabel, REJECT_REASONS, withdrawalStateMeta } from '@/types/withdrawal'
  import WithdrawalActionModal from './WithdrawalActionModal.vue'
  import { signalLines } from './withdrawalSignals'

  const props = defineProps<{ withdrawal: Withdrawal }>()

  const LEDGER_LABELS = { hold: 'Held from available', release: 'Sent to the bank', return: 'Returned to available' } as const
  const ACCOUNT_LABELS: Record<string, string> = { cust_available: 'available', cust_held: 'held', bank: 'bank' }

  const { can } = usePermissions()
  const modal = ref<WithdrawalAction['kind'] | null>(null)
  // `can` comes from the Backend: it is false for wallet.view-only readers.
  const hasActions = computed(() => Object.values(props.withdrawal.can).some(Boolean))

  function open (kind: WithdrawalAction['kind']) {
    modal.value = kind
  }
</script>

<style lang="scss" scoped>
.d-wd__sub { margin: 16px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-wd__signal { font-size: 12.5px; line-height: 1.6; }
.d-wd__signal--wait { color: var(--wait); }
.d-wd__signal--bad { color: var(--bad); }
.d-wd__link { display: inline-block; margin-top: 8px; font-size: 12.5px; }
.d-wd__note { margin-top: 12px; }
.d-wd__entry { display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; }
.d-wd__actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
