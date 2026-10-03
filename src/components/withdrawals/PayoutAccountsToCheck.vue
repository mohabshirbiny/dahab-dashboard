<template>
  <LoadingState v-if="list.isPending.value" label="Loading payout accounts…" />

  <Panel v-else-if="list.isError.value">
    <ErrorState :message="withdrawalErrorMessage(list.error.value)" title="Could not load the payout accounts" @retry="list.refetch()" />
  </Panel>

  <Panel v-else :subtitle="`${waiting} waiting for a name check`" title="Payout accounts to check">
    <EmptyState v-if="rows.length === 0" description="New accounts appear here as customers add them." title="Nothing to check" />

    <DataTable v-else>
      <template #head>
        <th>Added</th>
        <th>Customer</th>
        <th>Holder on the account</th>
        <th>Name on the verified ID</th>
        <th>Account</th>
        <th class="r" />
      </template>

      <tr v-for="a in rows" :key="a.id">
        <td>{{ a.addedAt ? formatDateTime(a.addedAt) : '—' }}</td>

        <td>
          {{ a.customer?.displayRef ?? '—' }}
          <div v-if="a.customer && !a.customer.identityVerified" class="who2 d-pac__bad">Identity not verified</div>
          <div v-if="a.customer?.suspended" class="who2 d-pac__bad">Suspended</div>
        </td>

        <td>{{ a.accountName }}</td>
        <td :class="{ 'd-pac__diff': a.customer?.fullName && a.customer.fullName.toLowerCase() !== a.accountName.toLowerCase() }">{{ a.customer?.fullName ?? '—' }}</td>
        <td>{{ a.bankName }}<div class="who2 mono">{{ a.number ?? a.numberMasked }}</div></td>

        <td class="r">
          <div class="d-pac__actions">
            <DBtn kind="primary" @click="openModal(a, 'verify')">Verify</DBtn>
            <DBtn @click="openModal(a, 'refuse')">Refuse</DBtn>
          </div>
        </td>
      </tr>
    </DataTable>

    <div v-if="list.hasNextPage.value" class="d-pac__more">
      <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
    </div>

    <template #footer>
      <NoteBanner variant="info">The name on the account must match the name on the ID exactly. A shortened name is a refusal: ask for the full name.</NoteBanner>
    </template>

    <PayoutAccountModal v-if="active" :account="active" :kind="modal" @close="modal = null" />
  </Panel>
</template>

<script lang="ts" setup>
  import type { PayoutAccount } from '@/types/withdrawal'
  import { computed, ref } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { usePayoutAccountsQuery } from '@/composables/useWithdrawals'
  import PayoutAccountModal from './PayoutAccountModal.vue'
  import { withdrawalErrorMessage } from './withdrawalErrors'

  // Payout accounts to check (Backend spec 013 US2, payout_account.verify): oldest first.
  const list = usePayoutAccountsQuery('pending_review', '')
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const waiting = computed(() => list.data.value?.pages[0]?.waiting ?? 0)

  const active = ref<PayoutAccount | null>(null)
  const modal = ref<'verify' | 'refuse' | null>(null)

  function openModal (account: PayoutAccount, kind: 'verify' | 'refuse') {
    active.value = account
    modal.value = kind
  }
</script>

<style lang="scss" scoped>
.d-pac__actions { display: flex; gap: 6px; justify-content: flex-end; }
.d-pac__more { display: flex; justify-content: center; padding: 12px; }
.d-pac__bad { color: var(--bad); }
.d-pac__diff { color: var(--wait); font-weight: 600; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
