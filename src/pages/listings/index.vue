<template>
  <div class="d-page">
    <PageLead>A piece goes live only after someone here approves it. Check the photos show the piece and the condition, and that the description matches.</PageLead>

    <FilterChips :model-value="queue" :options="chips" @update:model-value="setQueue" />

    <LoadingState v-if="list.isPending.value" label="Loading listings…" />

    <Panel v-else-if="list.isError.value">
      <ErrorState :message="listingErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load the listings" @retry="list.refetch()" />
    </Panel>

    <div v-else class="d-split" :class="{ 'd-split--solo': !selectedId }">
      <Panel :subtitle="QUEUES[queue].subtitle" :title="QUEUES[queue].title">
        <EmptyState v-if="rows.length === 0" :title="QUEUES[queue].empty" />

        <template v-else>
          <ListingQueueTable :queue="queue" :rows="rows" :selected-id="selectedId" @open="select" />

          <div v-if="list.hasNextPage.value" class="d-lst__more">
            <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
          </div>
        </template>
      </Panel>

      <div v-if="selectedId" ref="detail">
        <LoadingState v-if="selected.isPending.value" label="Loading the listing…" />

        <Panel v-else-if="selected.isError.value">
          <ErrorState :message="listingErrorMessage(selected.error.value)" title="Could not load this listing" @retry="selected.refetch()" />
        </Panel>

        <ListingReviewPanel v-else-if="selected.data.value" :listing="selected.data.value" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { ListingQueue } from '@/types/listing'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { listingErrorMessage } from '@/components/listings/listingErrors'
  import ListingQueueTable from '@/components/listings/ListingQueueTable.vue'
  import ListingReviewPanel from '@/components/listings/ListingReviewPanel.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useListingQuery, useListingsQuery } from '@/composables/useListings'
  import { useSplitDetail } from '@/composables/useSplitDetail'
  import { errorCodeOf } from '@/services/errors'

  // Listings to review (Backend spec 010). The route needs any listing permission;
  // each decision needs its own, and the Backend says which apply (can*).
  // The queue and the open listing live in the address, so a link reopens the same view.
  const QUEUES: Record<ListingQueue, { title: string, subtitle: string, empty: string }> = {
    in_review: { title: 'Waiting for review', subtitle: 'Newest first', empty: 'Nothing is waiting for review' },
    changes_requested: { title: 'Changes asked', subtitle: 'Waiting for the seller', empty: 'No listing is waiting for its seller' },
    live: { title: 'Live on the market', subtitle: 'Most recent first', empty: 'Nothing is live' },
    reserved: { title: 'Buyers in line', subtitle: 'Most recent first', empty: 'No piece has buyers in line' },
    accepted: { title: 'Accepted', subtitle: 'A seller chose a buyer; waiting for delivery', empty: 'No accepted sale' },
    rejected: { title: 'Rejected', subtitle: 'Most recent first', empty: 'No listing was rejected' },
    withdrawn: { title: 'Taken down', subtitle: 'Off the market, most recent first. Open one to put it back', empty: 'No piece is taken down' },
  }

  const route = useRoute()
  const router = useRouter()

  const queue = computed<ListingQueue>(() => {
    const value = String(route.query.queue ?? '')
    return value in QUEUES ? value as ListingQueue : 'in_review'
  })
  const selectedId = computed(() => (typeof route.query.id === 'string' && route.query.id !== '' ? route.query.id : null))

  const list = useListingsQuery(queue)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const counts = computed(() => list.data.value?.pages[0]?.counts ?? null)
  const selected = useListingQuery(selectedId)

  // The design's chips. "Approved today" is a figure, not a list: the Backend has no
  // such queue, so it is shown but cannot be picked. Live is the way to the take-down.
  const chips = computed(() => [
    { value: 'in_review' as const, label: 'Waiting', count: counts.value?.inReview },
    { value: 'changes_requested' as const, label: 'Changes asked', count: counts.value?.changesRequested },
    { value: 'approved_today' as const, label: 'Approved today', count: counts.value?.approvedToday, disabled: true, title: 'A count for today. Open Live to see the pieces on the market.' },
    { value: 'rejected' as const, label: 'Rejected', count: counts.value?.rejected },
    { value: 'live' as const, label: 'Live', count: counts.value?.live },
    // Backend spec 011: pieces with buyers in line, and sales a seller accepted.
    { value: 'reserved' as const, label: 'Buyers in line', count: counts.value?.reserved },
    { value: 'accepted' as const, label: 'Accepted', count: counts.value?.accepted },
    { value: 'withdrawn' as const, label: 'Taken down', count: counts.value?.withdrawn },
  ])

  function setQueue (value: string) {
    if (value in QUEUES) {
      router.replace({ query: { queue: value === 'in_review' ? undefined : value } })
    }
  }

  // The detail opens beside the list on wide screens, under it below 1360px.
  const { detail, reveal } = useSplitDetail(1360, () => Boolean(selected.data.value) || selected.isError.value)

  async function select (id: string) {
    await router.replace({ query: { ...route.query, id } })
    reveal()
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.d-split > * { min-width: 0; }
.d-lst__more { display: flex; justify-content: center; padding: 12px; }
// Nothing open: the list takes the whole width.
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1360px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
