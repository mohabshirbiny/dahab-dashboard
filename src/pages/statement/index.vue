<template>
  <div class="d-page">
    <PageLead>Every movement with the balance before and after it, so any single row makes sense on its own. This is the ledger, not the person.</PageLead>

    <StatementFilters
      v-model:from="customFrom"
      v-model:grain="grain"
      v-model:period="period"
      v-model:to="customTo"
      :can-search="can(PERMISSIONS.customerView)"
      :customer-id="customerId"
      :view="view"
      @pick="pickCustomer"
      @update:view="setView"
    />

    <EmptyState
      v-if="query === null"
      class="d-st__empty"
      description="Find the customer by their reference or phone number, or open their file and choose Wallet statement."
      title="Choose a customer wallet"
    />

    <template v-else>
      <LoadingState v-if="statement.isPending.value" label="Loading the statement…" />

      <Panel v-else-if="statement.isError.value">
        <ErrorState
          :message="errorMessage"
          :retryable="failure !== 'forbidden' && failure !== 'not_found'"
          title="Could not load the statement"
          @retry="statement.refetch()"
        />
      </Panel>

      <template v-else-if="summary">
        <StatementSummary class="d-st__summary" :summary="summary" />

        <Panel :subtitle="subtitle" :title="title">
          <template #actions>
            <DBtn v-if="summary.customer && can(PERMISSIONS.customerView)" @click="openFile(summary.customer.id)">Open their file</DBtn>
            <DBtn :loading="exporting.isPending.value" @click="exportStatement">Export to Excel</DBtn>
          </template>

          <EmptyState v-if="rows.length === 0" title="No movements in this period" />

          <template v-else>
            <StatementTable :grain="query.grain" :rows="rows" />

            <div v-if="statement.hasNextPage.value" class="d-st__more">
              <DBtn :loading="statement.isFetchingNextPage.value" @click="statement.fetchNextPage()">Load more</DBtn>
            </div>
          </template>

          <template #footer>
            <NoteBanner v-if="query.grain === 'each'" class="d-st__note" variant="info">
              Rows shaded amber were entered by hand rather than produced by a transaction. They are the ones to look at first when a balance does not make sense.
            </NoteBanner>

            <NoteBanner v-if="exportNote" class="d-st__note" :variant="exportNote.variant">{{ exportNote.text }}</NoteBanner>
          </template>
        </Panel>
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { StatementGrain, StatementQuery, StatementView } from '@/types/wallet'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatementFilters from '@/components/wallet/StatementFilters.vue'
  import { presetRange, type StatementPeriodPreset } from '@/components/wallet/statementPeriods'
  import StatementSummary from '@/components/wallet/StatementSummary.vue'
  import StatementTable from '@/components/wallet/StatementTable.vue'
  import { usePermissions } from '@/composables/usePermissions'
  import { useExportWalletStatement, useWalletStatementQuery } from '@/composables/useWallet'
  import { errorCodeOf } from '@/services/errors'
  import { cairoDate } from '@/types/audit'
  import { PERMISSIONS } from '@/types/staff'

  // Wallet statement (Backend spec 008). The chosen customer lives in the URL
  // (?customer=<id>), so the customer file can link straight to their wallet.
  const route = useRoute()
  const router = useRouter()
  const { can } = usePermissions()

  const customerId = computed(() => (typeof route.query.customer === 'string' && route.query.customer !== '' ? route.query.customer : null))
  const view = ref<StatementView>(customerId.value === null ? 'customers' : 'customer')
  const period = ref<StatementPeriodPreset>('this-month')
  const grain = ref<StatementGrain>('each')
  const customFrom = ref(cairoDate(29))
  const customTo = ref(cairoDate())

  const query = computed<StatementQuery | null>(() => {
    if (view.value === 'customer' && customerId.value === null) return null
    const range = period.value === 'custom' ? { from: customFrom.value, to: customTo.value } : presetRange(period.value)
    return { view: view.value, customerId: view.value === 'customer' ? customerId.value : null, ...range, grain: grain.value }
  })

  const statement = useWalletStatementQuery(query)
  const summary = computed(() => statement.data.value?.pages[0]?.summary ?? null)
  const rows = computed(() => statement.data.value?.pages.flatMap(p => p.rows) ?? [])

  const title = computed(() => {
    const s = summary.value
    if (s?.customer) return `Wallet ${s.customer.displayRef}${s.customer.fullName ? ` · ${s.customer.fullName}` : ''}`
    return view.value === 'customers' ? 'All customer wallets' : 'The Dahab wallet'
  })
  const subtitle = computed(() => (query.value ? `${query.value.from} to ${query.value.to}` : ''))

  function setView (value: StatementView) {
    view.value = value
  }

  function pickCustomer (id: string) {
    view.value = 'customer'
    router.replace({ query: { ...route.query, customer: id } })
  }

  function openFile (id: string) {
    router.push({ name: 'customer-file', params: { id } })
  }

  const failure = computed(() => errorCodeOf(statement.error.value))
  const errorMessage = computed(() => {
    if (failure.value === 'not_found') return 'We could not find this customer.'
    return accessErrorMessage(statement.error.value)
  })

  const exporting = useExportWalletStatement()
  const exportNote = ref<{ text: string, variant: 'info' | 'bad' } | null>(null)

  function exportStatement () {
    if (query.value === null) return
    exportNote.value = null
    exporting.mutate(query.value, {
      onSuccess: result => {
        exportNote.value = result.truncated
          ? { text: 'The file stopped at the export limit. Narrow the period to get the rest.', variant: 'bad' }
          : null
      },
      onError: error => {
        exportNote.value = { text: accessErrorMessage(error), variant: 'bad' }
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-st__empty, .d-st__summary { margin-top: 16px; }
.d-st__more { display: flex; justify-content: center; padding: 12px; }
.d-st__note { margin-top: 12px; }
</style>
