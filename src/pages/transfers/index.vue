<template>
  <div class="d-page">
    <PageLead>Money coming in from banks and wallets. Find the customer's notice by the reference on the transfer, check the money in Dahab's own statement, then match it — or credit it by hand when there is no notice.</PageLead>

    <TransferFilters v-model:from="from" v-model:q="q" v-model:scope="scope" v-model:to="to" />

    <LoadingState v-if="list.isPending.value" class="d-tr__block" label="Loading incoming transfers…" />

    <Panel v-else-if="list.isError.value" class="d-tr__block">
      <ErrorState :message="topUpErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load incoming transfers" @retry="list.refetch()" />
    </Panel>

    <Panel v-else class="d-tr__block" :subtitle="subtitle" :title="SCOPE_TITLES[scope]">
      <template #actions>
        <DBtn v-if="canCreditByHand" kind="primary" @click="creditOpen = true">Credit by hand</DBtn>
        <DBtn :loading="exporting.isPending.value" @click="exportList">Export to Excel</DBtn>
      </template>

      <EmptyState v-if="rows.length === 0" :description="q ? 'Nothing matches this search in these dates.' : undefined" title="No transfers here" />

      <template v-else>
        <TransferTable :rows="rows" @open="selectedId = $event" />

        <div v-if="list.hasNextPage.value" class="d-tr__more">
          <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
        </div>
      </template>

      <template #footer>
        <NoteBanner class="d-tr__note" variant="info">
          Credit what actually arrived. When it differs from what the customer said (a provider fee, a split payment), write why. A notice is credited once; a second transfer is credited by hand.
        </NoteBanner>

        <NoteBanner v-if="exportNote" class="d-tr__note" :variant="exportNote.variant">{{ exportNote.text }}</NoteBanner>
      </template>
    </Panel>

    <TransferDrawer :accounts="accounts" :top-up="selected.data.value ?? null" @close="selectedId = null" />
    <CreditByHandForm v-if="canCreditByHand" v-model="creditOpen" :accounts="accounts" />
  </div>
</template>

<script lang="ts" setup>
  import type { TopUpListQuery } from '@/types/topup'
  import { computed, ref } from 'vue'
  import CreditByHandForm from '@/components/transfers/CreditByHandForm.vue'
  import TransferDrawer from '@/components/transfers/TransferDrawer.vue'
  import { topUpErrorMessage } from '@/components/transfers/transferErrors'
  import TransferFilters from '@/components/transfers/TransferFilters.vue'
  import { SCOPE_STATUSES, type TransferScope } from '@/components/transfers/transferScopes'
  import TransferTable from '@/components/transfers/TransferTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { useReceivingAccountsQuery } from '@/composables/useReceivingAccounts'
  import { useExportTopUps, useTopUpQuery, useTopUpsQuery } from '@/composables/useTopUps'
  import { errorCodeOf } from '@/services/errors'
  import { cairoDate } from '@/types/audit'
  import { PERMISSIONS } from '@/types/staff'

  // Incoming transfers (Backend spec 009). The route needs topup.match; crediting by
  // hand also needs customer.view, because the customer is found with the customer search.
  const SCOPE_TITLES: Record<TransferScope, string> = {
    open: 'To match',
    credited: 'Credited',
    rejected: 'Rejected',
    cancelled: 'Cancelled by the customer',
    all: 'All transfers',
  }

  const { can } = usePermissions()
  const canCreditByHand = computed(() => can(PERMISSIONS.topupMatch) && can(PERMISSIONS.customerView))

  const scope = ref<TransferScope>('open')
  const from = ref(cairoDate(29))
  const to = ref(cairoDate())
  const q = ref('')

  const query = computed<TopUpListQuery>(() => ({ statuses: SCOPE_STATUSES[scope.value], from: from.value, to: to.value, q: q.value }))
  const list = useTopUpsQuery(query)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const totals = computed(() => list.data.value?.pages[0]?.totals ?? null)
  const subtitle = computed(() => (totals.value ? `${totals.value.count} transfers · ${formatMoney(totals.value.claimed)} EGP claimed` : ''))

  const accountsQuery = useReceivingAccountsQuery(true)
  const accounts = computed(() => accountsQuery.data.value ?? [])

  const selectedId = ref<string | null>(null)
  const selected = useTopUpQuery(selectedId)
  const creditOpen = ref(false)

  const exporting = useExportTopUps()
  const exportNote = ref<{ text: string, variant: 'info' | 'bad' } | null>(null)

  function exportList () {
    exportNote.value = null
    exporting.mutate(query.value, {
      onSuccess: result => {
        exportNote.value = result.truncated ? { text: 'The file stopped at the export limit. Narrow the dates to get the rest.', variant: 'bad' } : null
      },
      onError: error => {
        exportNote.value = { text: topUpErrorMessage(error), variant: 'bad' }
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-tr__block { margin-top: 16px; }
.d-tr__more { display: flex; justify-content: center; padding: 12px; }
.d-tr__note { margin-top: 12px; }
</style>
