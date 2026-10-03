<template>
  <div class="d-page">
    <PageLead>Every withdrawal is checked by a person before it leaves. Money only goes to an account in the wallet holder's own name.</PageLead>

    <FilterChips v-if="tabs.length > 1" :model-value="tab" :options="tabs" @update:model-value="setTab" />

    <PayoutAccountsToCheck v-if="tab === 'accounts'" class="d-wp__block" />

    <template v-else>
      <StatGrid v-if="figures">
        <StatCard :hint="`${formatMoney(figures.waitingSum)} EGP`" label="Waiting for review" :value="String(figures.waitingCount)" />
        <StatCard :hint="`${formatMoney(figures.releasedTodaySum)} EGP`" label="Released today" :value="String(figures.releasedTodayCount)" />
        <StatCard hint="Under review, waiting on a check" label="On hold" :value="String(figures.onHoldCount)" />
        <StatCard hint="Over the last 30 days" label="Average time to release" :value="figures.avgHoursToRelease === null ? '—' : `${figures.avgHoursToRelease}h`" />
      </StatGrid>

      <FilterChips :model-value="scope" :options="SCOPES" @update:model-value="setScope" />

      <form class="d-wp__tools" role="search" @submit.prevent="applySearch">
        <DInput
          v-model="search"
          aria-label="Search by name, phone or customer reference"
          inputmode="search"
          :maxlength="100"
          placeholder="Name, phone or customer reference"
        />

        <DBtn type="submit">Search</DBtn>
        <DInput v-model="from" aria-label="From" type="date" />
        <DInput v-model="to" aria-label="To" type="date" />
        <DBtn v-if="canRelease" :loading="exporting.isPending.value" @click="exportList">Export to Excel</DBtn>
      </form>

      <NoteBanner v-if="exportNote" class="d-wp__block" :variant="exportNote.variant">{{ exportNote.text }}</NoteBanner>

      <LoadingState v-if="list.isPending.value" class="d-wp__block" label="Loading withdrawals…" />

      <Panel v-else-if="list.isError.value" class="d-wp__block">
        <ErrorState :message="withdrawalErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load the withdrawals" @retry="list.refetch()" />
      </Panel>

      <div v-else class="d-split d-wp__block" :class="{ 'd-split--solo': !selectedId }">
        <Panel :title="SCOPE_TITLES[scope]">
          <EmptyState v-if="rows.length === 0" :description="applied ? 'Nothing matches this search in these dates.' : undefined" title="No withdrawals here" />

          <template v-else>
            <WithdrawalsTable :rows="rows" :selected-id="selectedId" @open="select" />

            <div v-if="list.hasNextPage.value" class="d-wp__more">
              <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
            </div>
          </template>
        </Panel>

        <div v-if="selectedId" ref="detail">
          <LoadingState v-if="selected.isPending.value" label="Loading the withdrawal…" />

          <Panel v-else-if="selected.isError.value">
            <ErrorState :message="withdrawalErrorMessage(selected.error.value)" title="Could not load this withdrawal" @retry="selected.refetch()" />
          </Panel>

          <WithdrawalDetailPanel v-else-if="selected.data.value" :withdrawal="selected.data.value" />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { WithdrawalListQuery, WithdrawalScope } from '@/types/withdrawal'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import PayoutAccountsToCheck from '@/components/withdrawals/PayoutAccountsToCheck.vue'
  import WithdrawalDetailPanel from '@/components/withdrawals/WithdrawalDetailPanel.vue'
  import { withdrawalErrorMessage } from '@/components/withdrawals/withdrawalErrors'
  import WithdrawalsTable from '@/components/withdrawals/WithdrawalsTable.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { useSplitDetail } from '@/composables/useSplitDetail'
  import { useExportWithdrawals, useWithdrawalQuery, useWithdrawalsQuery } from '@/composables/useWithdrawals'
  import { errorCodeOf } from '@/services/errors'
  import { cairoDate } from '@/types/audit'
  import { PERMISSIONS } from '@/types/staff'

  // Withdrawals (Backend spec 013 US6): the queue for withdrawal.release (read-only with
  // wallet.view) and, for payout_account.verify, the accounts waiting for a name check.
  // The tab, the chip and the open withdrawal live in the address.
  const SCOPES: ReadonlyArray<{ value: WithdrawalScope, label: string }> = [
    { value: 'open', label: 'Waiting for review' },
    { value: 'held', label: 'On hold' },
    { value: 'released', label: 'Released' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all', label: 'All' },
  ]
  const SCOPE_TITLES: Record<WithdrawalScope, string> = {
    open: 'Waiting for review',
    held: 'On hold',
    released: 'Released',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    all: 'All withdrawals',
  }

  const route = useRoute()
  const router = useRouter()
  const { can, canAny } = usePermissions()

  const canRelease = computed(() => can(PERMISSIONS.withdrawalRelease))
  const canReadQueue = computed(() => canAny([PERMISSIONS.withdrawalRelease, PERMISSIONS.walletView]))
  const canVerify = computed(() => can(PERMISSIONS.payoutAccountVerify))

  const tabs = computed(() => [
    ...(canReadQueue.value ? [{ value: 'queue', label: 'Withdrawals' }] : []),
    ...(canVerify.value ? [{ value: 'accounts', label: 'Payout accounts to check' }] : []),
  ])
  const tab = computed(() => {
    const wanted = route.query.tab === 'accounts' ? 'accounts' : 'queue'
    return tabs.value.some(t => t.value === wanted) ? wanted : (tabs.value[0]?.value ?? 'queue')
  })
  const scope = computed<WithdrawalScope>(() => {
    const value = String(route.query.scope ?? '')
    return value in SCOPE_TITLES ? value as WithdrawalScope : 'open'
  })
  const selectedId = computed(() => (typeof route.query.id === 'string' && route.query.id !== '' ? route.query.id : null))
  const applied = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))

  const search = ref(applied.value)
  const from = ref(cairoDate(89))
  const to = ref(cairoDate())

  const query = computed<WithdrawalListQuery>(() => ({ scope: scope.value, from: from.value, to: to.value, q: applied.value }))
  const list = useWithdrawalsQuery(query, () => tab.value === 'queue' && canReadQueue.value)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const figures = computed(() => list.data.value?.pages[0]?.figures ?? null)
  const selected = useWithdrawalQuery(selectedId)

  function go (patch: Record<string, string | undefined>) {
    return router.replace({ query: { ...route.query, ...patch } })
  }

  function setTab (value: string) {
    go({ tab: value === 'accounts' ? 'accounts' : undefined, id: undefined })
  }

  function setScope (value: WithdrawalScope) {
    go({ scope: value === 'open' ? undefined : value, id: undefined })
  }

  // The detail opens beside the list on wide screens, under it below 1700px.
  const { detail, reveal } = useSplitDetail(1700, () => Boolean(selected.data.value) || selected.isError.value)

  async function select (id: string) {
    await go({ id })
    reveal()
  }

  function applySearch () {
    go({ q: search.value.trim() === '' ? undefined : search.value.trim(), id: undefined })
  }

  const exporting = useExportWithdrawals()
  const exportNote = ref<{ text: string, variant: 'info' | 'bad' } | null>(null)

  function exportList () {
    exportNote.value = null
    exporting.mutate(query.value, {
      onSuccess: result => {
        exportNote.value = result.truncated ? { text: 'The file stopped at the export limit. Narrow the dates to get the rest.', variant: 'bad' } : null
      },
      onError: error => {
        exportNote.value = { text: withdrawalErrorMessage(error), variant: 'bad' }
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-wp__block { margin-top: 16px; }
.d-wp__tools { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center; }
.d-wp__more { display: flex; justify-content: center; padding: 12px; }
.d-split { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
// Nothing open: the list takes the whole width.
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1700px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
