<template>
  <div class="d-page">
    <PageLead>Every buyer waiting on a piece, soonest seller answer first. Read-only: the seller answers in the app, and an unanswered request ends by itself.</PageLead>

    <FilterChips :model-value="chipValue" :options="chips" @update:model-value="setChip" />

    <div v-if="branchOptions.length > 1" class="d-brq__tools">
      <DSelect v-model="branch" aria-label="Branch" :options="branchOptions" />
    </div>

    <LoadingState v-if="list.isPending.value" label="Loading buy requests…" />

    <Panel v-else-if="list.isError.value">
      <ErrorState :message="orderErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load the buy requests" @retry="list.refetch()" />
    </Panel>

    <Panel v-else :subtitle="SUBTITLES[filters.state]" :title="TITLES[chipValue]">
      <EmptyState v-if="rows.length === 0" title="No buy request here" />

      <template v-else>
        <BuyRequestsTable :rows="rows" />

        <div v-if="list.hasNextPage.value" class="d-brq__more">
          <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
        </div>
      </template>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import type { BuyRequestFilters, BuyRequestFilterState } from '@/types/buyRequest'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BuyRequestsTable from '@/components/orders/BuyRequestsTable.vue'
  import { orderErrorMessage } from '@/components/orders/orderErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useBuyRequestsQuery } from '@/composables/useBuyRequests'
  import { usePermissions } from '@/composables/usePermissions'
  import { useBranchesQuery } from '@/composables/useReference'
  import { errorCodeOf } from '@/services/errors'
  import { PERMISSIONS } from '@/types/staff'

  // Buy requests (Backend spec 012 US10, FR-023, buy_request.view). The filter lives in
  // the address. "Close to expiry" is the Backend's flag on queued requests.
  type Chip = BuyRequestFilterState | 'near'
  const TITLES: Record<Chip, string> = {
    queued: 'In line',
    near: 'Close to expiry',
    accepted: 'Accepted',
    ended: 'Ended',
  }
  const SUBTITLES: Record<BuyRequestFilterState, string> = {
    queued: 'Soonest seller answer first',
    accepted: 'The seller chose this buyer',
    ended: 'Not chosen, declined, expired or left the line',
  }

  const route = useRoute()
  const router = useRouter()
  const { can } = usePermissions()

  const chipValue = computed<Chip>(() => {
    const value = String(route.query.state ?? '')
    return value in TITLES ? value as Chip : 'queued'
  })

  const branches = useBranchesQuery(() => can(PERMISSIONS.referenceView))
  const branch = ref('')
  const branchOptions = computed(() => [
    { value: '', label: 'Every branch' },
    ...(branches.data.value ?? []).map(b => ({ value: String(b.id), label: b.nameEn })),
  ])

  const filters = computed<BuyRequestFilters>(() => ({
    state: chipValue.value === 'near' ? 'queued' : chipValue.value,
    nearExpiry: chipValue.value === 'near',
    branchId: branch.value === '' ? null : Number(branch.value),
    listingId: typeof route.query.listing === 'string' && route.query.listing !== '' ? route.query.listing : null,
  }))

  const list = useBuyRequestsQuery(filters)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const counts = computed(() => list.data.value?.pages[0]?.counts ?? null)

  const chips = computed(() => [
    { value: 'queued' as Chip, label: 'In line', count: counts.value?.queued },
    { value: 'near' as Chip, label: 'Close to expiry', count: counts.value?.nearExpiry },
    { value: 'accepted' as Chip, label: 'Accepted' },
    { value: 'ended' as Chip, label: 'Ended' },
  ])

  function setChip (value: Chip) {
    router.replace({ query: { ...route.query, state: value === 'queued' ? undefined : value } })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-brq__tools { display: flex; gap: 10px; margin-bottom: 14px; }
.d-brq__more { display: flex; justify-content: center; padding: 12px; }
</style>
