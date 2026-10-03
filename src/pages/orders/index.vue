<template>
  <div class="d-page">
    <PageLead>Every live order and where it is stuck. Use the filters to find what needs chasing.</PageLead>

    <FilterChips :model-value="chipValue" :options="chips" @update:model-value="setChip" />

    <form class="d-ord__tools" role="search" @submit.prevent="applySearch">
      <DInput
        v-model="search"
        aria-label="Search by order or customer reference"
        inputmode="search"
        :maxlength="40"
        placeholder="Order DH-… or customer reference"
      />

      <DBtn type="submit">Search</DBtn>
      <DSelect v-if="branchOptions.length > 1" v-model="branch" aria-label="Branch" :options="branchOptions" />
    </form>

    <LoadingState v-if="list.isPending.value" label="Loading orders…" />

    <Panel v-else-if="list.isError.value">
      <ErrorState :message="orderErrorMessage(list.error.value)" :retryable="errorCodeOf(list.error.value) !== 'forbidden'" title="Could not load the orders" @retry="list.refetch()" />
    </Panel>

    <div v-else class="d-split" :class="{ 'd-split--solo': !selectedId }">
      <Panel :subtitle="subtitle" :title="GROUP_TITLES[filters.group]">
        <EmptyState v-if="rows.length === 0" title="No order matches" />

        <template v-else>
          <OrdersTable :rows="rows" :selected-id="selectedId" @open="select" />

          <div v-if="list.hasNextPage.value" class="d-ord__more">
            <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
          </div>
        </template>
      </Panel>

      <div v-if="selectedId" ref="detail">
        <LoadingState v-if="selected.isPending.value" label="Loading the order…" />

        <Panel v-else-if="selected.isError.value">
          <ErrorState :message="orderErrorMessage(selected.error.value)" title="Could not load this order" @retry="selected.refetch()" />
        </Panel>

        <OrderDetailPanel v-else-if="selected.data.value" :order="selected.data.value" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { OrderFilters, OrderGroup } from '@/types/order'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import OrderDetailPanel from '@/components/orders/OrderDetailPanel.vue'
  import { orderErrorMessage } from '@/components/orders/orderErrors'
  import OrdersTable from '@/components/orders/OrdersTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useOrderQuery, useOrdersQuery } from '@/composables/useOrders'
  import { usePermissions } from '@/composables/usePermissions'
  import { useBranchesQuery } from '@/composables/useReference'
  import { useSplitDetail } from '@/composables/useSplitDetail'
  import { errorCodeOf } from '@/services/errors'
  import { PERMISSIONS } from '@/types/staff'

  // Orders (Backend spec 012 FR-022, order.view). The group and the open order live in
  // the address, so a link reopens the same view. "Past deadline" is a filter on top.
  const GROUP_TITLES: Record<OrderGroup, string> = {
    open: 'Open orders',
    waiting_seller: 'Waiting for the seller',
    at_igi: 'At IGI',
    needs_decision: 'Buyer deciding on a new price',
    waiting_balance: 'Waiting for the balance',
    ready_to_collect: 'Ready to collect',
    returns: 'Pieces held for their seller',
    closed: 'Closed orders',
    all: 'All orders',
  }

  const route = useRoute()
  const router = useRouter()
  const { can } = usePermissions()

  const group = computed<OrderGroup>(() => {
    const value = String(route.query.group ?? '')
    return value in GROUP_TITLES ? value as OrderGroup : 'open'
  })
  const pastDeadline = computed(() => route.query.past === '1')
  const selectedId = computed(() => (typeof route.query.id === 'string' && route.query.id !== '' ? route.query.id : null))

  const applied = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
  const search = ref(applied.value)
  const branch = ref('')

  const branches = useBranchesQuery(() => can(PERMISSIONS.referenceView))
  const branchOptions = computed(() => [
    { value: '', label: 'Every branch' },
    ...(branches.data.value ?? []).map(b => ({ value: String(b.id), label: b.nameEn })),
  ])

  const filters = computed<OrderFilters>(() => ({
    group: group.value,
    pastDeadline: pastDeadline.value,
    branchId: branch.value === '' ? null : Number(branch.value),
    q: applied.value,
  }))

  const list = useOrdersQuery(filters)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const counts = computed(() => list.data.value?.pages[0]?.counts ?? null)
  const selected = useOrderQuery(selectedId)

  // Held on what is on screen: the sum of the Backend's figures, for display only.
  const subtitle = computed(() => {
    const held = rows.value.reduce((sum, o) => sum + Number(o.held), 0)
    const shown = `${rows.value.length}${list.hasNextPage.value ? '+' : ''} ${rows.value.length === 1 ? 'order' : 'orders'}`
    return held > 0 ? `${shown}, ${formatMoney(held.toFixed(4))} EGP held` : shown
  })

  type Chip = OrderGroup | 'past'
  const chipValue = computed<Chip>(() => (pastDeadline.value ? 'past' : group.value))
  const chips = computed(() => [
    { value: 'open' as Chip, label: 'All open', count: counts.value?.open },
    { value: 'waiting_seller' as Chip, label: 'Waiting for the seller', count: counts.value?.waitingSeller },
    { value: 'at_igi' as Chip, label: 'At IGI', count: counts.value?.atIgi },
    { value: 'needs_decision' as Chip, label: 'Needs a decision', count: counts.value?.needsDecision },
    { value: 'waiting_balance' as Chip, label: 'Waiting for the balance', count: counts.value?.waitingBalance },
    { value: 'ready_to_collect' as Chip, label: 'Ready to collect', count: counts.value?.readyToCollect },
    { value: 'returns' as Chip, label: 'Held for the seller', count: counts.value?.returns },
    { value: 'past' as Chip, label: 'Past deadline', count: counts.value?.pastDeadline },
    { value: 'closed' as Chip, label: 'Closed' },
  ])

  function setChip (value: Chip) {
    const query = { ...route.query, id: undefined, group: undefined as string | undefined, past: undefined as string | undefined }
    if (value === 'past') {
      query.past = '1'
    } else if (value !== 'open') {
      query.group = value
    }
    router.replace({ query })
  }

  function applySearch () {
    const q = search.value.trim()
    router.replace({ query: { ...route.query, id: undefined, q: q === '' ? undefined : q } })
  }

  // The detail opens beside the list on wide screens, under it below 1700px.
  const { detail, reveal } = useSplitDetail(1700, () => Boolean(selected.data.value) || selected.isError.value)

  async function select (id: string) {
    await router.replace({ query: { ...route.query, id } })
    reveal()
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-ord__tools { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.d-ord__tools > :first-child { flex: 1 1 260px; max-width: 360px; }
.d-split {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.d-split > * { min-width: 0; }
.d-ord__more { display: flex; justify-content: center; padding: 12px; }
// Nothing open: the list takes the whole width.
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1700px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
