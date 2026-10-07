<template>
  <div>
    <FilterChips :model-value="state" :options="chips" @update:model-value="setState" />

    <LoadingState v-if="list.isPending.value" label="Loading reports…" />

    <Panel v-else-if="list.isError.value">
      <ErrorState :message="reportErrorMessage(list.error.value)" title="Could not load the reports" @retry="list.refetch()" />
    </Panel>

    <div v-else class="d-split" :class="{ 'd-split--solo': !selectedId }">
      <Panel :subtitle="subtitle" :title="STATE_TITLES[state]">
        <EmptyState v-if="rows.length === 0" title="No reports here" />
        <ReportsTable v-else :rows="rows" :selected-id="selectedId" @open="select" />
      </Panel>

      <div v-if="selectedId" ref="detail">
        <LoadingState v-if="selected.isPending.value" label="Loading the report…" />

        <Panel v-else-if="selected.isError.value">
          <ErrorState :message="reportErrorMessage(selected.error.value)" title="Could not load this report" @retry="selected.refetch()" />
        </Panel>

        <ReportDetailPanel v-else-if="selected.data.value" :report="selected.data.value" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { ReportState } from '@/types/listingReport'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useListingReportQuery, useListingReportsQuery } from '@/composables/useListingReports'
  import { useSplitDetail } from '@/composables/useSplitDetail'
  import ReportDetailPanel from './ReportDetailPanel.vue'
  import { reportErrorMessage } from './reportErrors'
  import ReportsTable from './ReportsTable.vue'

  // Listing reports (Backend spec 017 FR-053, listing_report.handle). The state and the open
  // report live in the address (`rstate`, `rid`), next to `view=reports`.
  const STATE_TITLES: Record<ReportState, string> = {
    open: 'Open reports',
    dismissed: 'Dismissed',
    actioned: 'Taken down',
    listing_gone: 'Piece left the market',
  }

  const route = useRoute()
  const router = useRouter()

  const state = computed<ReportState>(() => {
    const value = String(route.query.rstate ?? '')
    return value in STATE_TITLES ? value as ReportState : 'open'
  })
  const selectedId = computed(() => (typeof route.query.rid === 'string' && route.query.rid !== '' ? route.query.rid : null))

  const list = useListingReportsQuery(state)
  const rows = computed(() => list.data.value?.rows ?? [])
  const counts = computed(() => list.data.value?.counts ?? null)
  const selected = useListingReportQuery(selectedId)

  const chips = computed(() => [
    { value: 'open' as ReportState, label: 'Open', count: counts.value?.open },
    { value: 'actioned' as ReportState, label: 'Taken down', count: counts.value?.actioned },
    { value: 'dismissed' as ReportState, label: 'Dismissed', count: counts.value?.dismissed },
    { value: 'listing_gone' as ReportState, label: 'Left the market', count: counts.value?.listing_gone },
  ])

  const subtitle = computed(() => `${rows.value.length} ${rows.value.length === 1 ? 'report' : 'reports'}`)

  function go (patch: Record<string, string | undefined>) {
    return router.replace({ query: { ...route.query, ...patch } })
  }

  function setState (value: ReportState) {
    go({ rstate: value === 'open' ? undefined : value, rid: undefined })
  }

  const { detail, reveal } = useSplitDetail(1700, () => Boolean(selected.data.value) || selected.isError.value)

  async function select (id: string) {
    await go({ rid: id })
    reveal()
  }
</script>

<style lang="scss" scoped>
.d-split {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin-top: 12px;
}
.d-split > * { min-width: 0; }
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1700px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
