<template>
  <div class="d-page">
    <PageLead>While a dispute is open the order is frozen. No money moves and no deadline runs against either side.</PageLead>

    <div v-if="canDisputes && canReports" class="d-dsp__views" role="tablist">
      <DBtn :aria-selected="view === 'disputes'" :kind="view === 'disputes' ? 'primary' : 'default'" role="tab" @click="setView('disputes')">Disputes</DBtn>
      <DBtn :aria-selected="view === 'reports'" :kind="view === 'reports' ? 'primary' : 'default'" role="tab" @click="setView('reports')">Listing reports</DBtn>
    </div>

    <ListingReportsSection v-if="view === 'reports'" />

    <template v-else>
      <FilterChips :model-value="filter" :options="chips" @update:model-value="setFilter" />

      <form class="d-dsp__tools" role="search" @submit.prevent="applySearch">
        <DInput
          v-model="search"
          aria-label="Search by dispute or order reference"
          inputmode="search"
          :maxlength="40"
          placeholder="DSP-… or DH-…"
        />

        <DBtn type="submit">Search</DBtn>

        <label class="d-dsp__mine">
          <input :checked="mine" type="checkbox" @change="setMine(($event.target as HTMLInputElement).checked)">
          <span>Assigned to me</span>
        </label>
      </form>

      <LoadingState v-if="list.isPending.value" label="Loading disputes…" />

      <Panel v-else-if="list.isError.value">
        <ErrorState :message="disputeErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load the disputes" @retry="list.refetch()" />
      </Panel>

      <div v-else class="d-split" :class="{ 'd-split--solo': !selectedId }">
        <Panel :subtitle="subtitle" :title="FILTER_TITLES[filter]">
          <EmptyState v-if="rows.length === 0" :description="applied ? 'Nothing matches this search.' : undefined" title="No disputes here" />

          <template v-else>
            <DisputesTable :rows="rows" :selected-id="selectedId" @open="select" />

            <div v-if="list.hasNextPage.value" class="d-dsp__more">
              <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
            </div>
          </template>
        </Panel>

        <div v-if="selectedId" ref="detail">
          <LoadingState v-if="selected.isPending.value" label="Loading the dispute…" />

          <Panel v-else-if="selected.isError.value">
            <ErrorState :message="disputeErrorMessage(selected.error.value)" title="Could not load this dispute" @retry="selected.refetch()" />
          </Panel>

          <DisputeDetailPanel v-else-if="selected.data.value" :dispute="selected.data.value" />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { DisputeFilter } from '@/types/dispute'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DisputeDetailPanel from '@/components/disputes/DisputeDetailPanel.vue'
  import { disputeErrorMessage } from '@/components/disputes/disputeErrors'
  import DisputesTable from '@/components/disputes/DisputesTable.vue'
  import ListingReportsSection from '@/components/listingReports/ListingReportsSection.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useDisputeQuery, useDisputesQuery } from '@/composables/useDisputes'
  import { usePermissions } from '@/composables/usePermissions'
  import { useSplitDetail } from '@/composables/useSplitDetail'
  import { errorCodeOf } from '@/services/errors'
  import { PERMISSIONS } from '@/types/staff'

  // Disputes and reports (Backend spec 014 US2, dispute.handle; spec 017: listing reports,
  // listing_report.handle). The view, the filter, "Assigned to me", the search and the open
  // dispute live in the address.
  const FILTER_TITLES: Record<DisputeFilter, string> = {
    unresolved: 'Open',
    open: 'Not yet picked up',
    passed_on: 'Passed on',
    resolved: 'Resolved',
  }

  const route = useRoute()
  const router = useRouter()

  const { can } = usePermissions()
  const canDisputes = computed(() => can(PERMISSIONS.disputeHandle))
  const canReports = computed(() => can(PERMISSIONS.listingReportHandle))
  const view = computed<'disputes' | 'reports'>(() => (!canDisputes.value || (canReports.value && route.query.view === 'reports') ? 'reports' : 'disputes'))

  function setView (value: 'disputes' | 'reports') {
    router.replace({ query: { view: value === 'reports' ? 'reports' : undefined } })
  }

  const filter = computed<DisputeFilter>(() => {
    const value = String(route.query.state ?? '')
    return value in FILTER_TITLES ? value as DisputeFilter : 'unresolved'
  })
  const mine = computed(() => route.query.mine === '1')
  const selectedId = computed(() => (typeof route.query.id === 'string' && route.query.id !== '' ? route.query.id : null))
  const applied = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
  const search = ref(applied.value)

  const list = useDisputesQuery(filter, mine, applied, () => view.value === 'disputes')
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const counts = computed(() => list.data.value?.pages[0]?.counts ?? null)
  const selected = useDisputeQuery(selectedId)

  const chips = computed(() => [
    { value: 'unresolved' as DisputeFilter, label: 'Open', count: counts.value ? counts.value.open + counts.value.passedOn : undefined },
    { value: 'open' as DisputeFilter, label: 'Not yet picked up', count: counts.value?.open },
    { value: 'passed_on' as DisputeFilter, label: 'Passed on', count: counts.value?.passedOn },
    { value: 'resolved' as DisputeFilter, label: 'Resolved' },
  ])

  const subtitle = computed(() => {
    const n = rows.value.length
    return `${n}${list.hasNextPage.value ? '+' : ''} ${n === 1 ? 'dispute' : 'disputes'}`
  })

  function go (patch: Record<string, string | undefined>) {
    return router.replace({ query: { ...route.query, ...patch } })
  }

  function setFilter (value: DisputeFilter) {
    go({ state: value === 'unresolved' ? undefined : value, id: undefined })
  }

  function setMine (value: boolean) {
    go({ mine: value ? '1' : undefined, id: undefined })
  }

  function applySearch () {
    const q = search.value.trim()
    go({ q: q === '' ? undefined : q, id: undefined })
  }

  // The detail opens beside the list on wide screens, under it below 1700px.
  const { detail, reveal } = useSplitDetail(1700, () => Boolean(selected.data.value) || selected.isError.value)

  async function select (id: string) {
    await go({ id })
    reveal()
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-dsp__views { display: flex; gap: 8px; margin: 0 0 14px; }
.d-dsp__tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 12px 0 14px; }
.d-dsp__tools > :first-child { flex: 1 1 220px; max-width: 320px; }
.d-dsp__mine { display: flex; gap: 6px; align-items: center; font-size: 13px; }
.d-dsp__more { display: flex; justify-content: center; padding: 12px; }
.d-split {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.d-split > * { min-width: 0; }
// Nothing open: the list takes the whole width.
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1700px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
