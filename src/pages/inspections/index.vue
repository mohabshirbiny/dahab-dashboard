<template>
  <div class="d-page">
    <PageLead>Results come from the inspection branch. A submitted result cannot be edited; a correction is a new entry, and both are kept.</PageLead>

    <FilterChips v-if="tabs.length > 1" :model-value="tab" :options="tabs" @update:model-value="setTab" />

    <div v-if="branchOptions.length > 1" class="d-ins__tools">
      <DSelect v-model="branch" aria-label="Branch" :options="branchOptions" />
    </div>

    <template v-if="tab === 'work'">
      <LoadingState v-if="work.isPending.value" label="Loading the pieces at the branch…" />

      <Panel v-else-if="work.isError.value">
        <ErrorState :message="orderErrorMessage(work.error.value)" :retryable="errorCodeOf(work.error.value) !== 'forbidden'" title="Could not load the work list" @retry="work.refetch()" />
      </Panel>

      <Panel v-else subtitle="Oldest first" title="At the branch">
        <EmptyState v-if="workRows.length === 0" title="Nothing waiting at the branch" />

        <template v-else>
          <WorkListTable :rows="workRows" @act="act" />

          <div v-if="work.hasNextPage.value" class="d-ins__more">
            <DBtn :loading="work.isFetchingNextPage.value" @click="work.fetchNextPage()">Load more</DBtn>
          </div>
        </template>
      </Panel>
    </template>

    <template v-else>
      <div class="d-ins__tools">
        <FilterChips v-model="period" :options="PERIODS" />
        <DSelect v-model="outcome" aria-label="Outcome" :options="OUTCOME_OPTIONS" />
      </div>

      <LoadingState v-if="results.isPending.value" label="Loading results…" />

      <Panel v-else-if="results.isError.value">
        <ErrorState :message="orderErrorMessage(results.error.value)" :retryable="errorCodeOf(results.error.value) !== 'forbidden'" title="Could not load the results" @retry="results.refetch()" />
      </Panel>

      <Panel v-else subtitle="From the inspection branches, newest first" title="Results">
        <EmptyState v-if="resultRows.length === 0" title="No result in this period" />

        <template v-else>
          <InspectionsTable :rows="resultRows" />

          <div v-if="results.hasNextPage.value" class="d-ins__more">
            <DBtn :loading="results.isFetchingNextPage.value" @click="results.fetchNextPage()">Load more</DBtn>
          </div>
        </template>
      </Panel>
    </template>

    <ConfirmDialog
      confirm-label="Mark received"
      :error="receiveError"
      :loading="receive.isPending.value"
      :message="`The piece for ${receiving?.orderRef ?? ''} is at the branch. It goes to inspection.`"
      :model-value="receiving !== null"
      title="Piece received"
      @confirm="onReceive"
      @update:model-value="closeReceive"
    />

    <InspectionResultModal :open="inspection !== null" :target="inspection" @close="inspection = null" />

    <PeopleToWatchPanel v-if="can(PERMISSIONS.peopleToWatchView)" />

    <HandoverModal
      :buyer-id="handover?.buyerId ?? null"
      :can-view-buyer-id="handoverCanView"
      :can-view-id="handoverCanViewId"
      :open="handover !== null"
      :order-id="handover?.orderId ?? ''"
      :order-ref="handover?.orderRef ?? ''"
      :proxy="handover?.proxy ?? null"
      :to="handover?.to ?? 'buyer'"
      @close="handover = null"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { HandoverBuyerId, InspectionFilters, InspectionOutcome, InspectionTarget, OrderProxy, WorkListItem } from '@/types/order'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import PeopleToWatchPanel from '@/components/inspections/PeopleToWatchPanel.vue'
  import HandoverModal from '@/components/orders/HandoverModal.vue'
  import InspectionResultModal from '@/components/orders/InspectionResultModal.vue'
  import InspectionsTable from '@/components/orders/InspectionsTable.vue'
  import { orderErrorMessage } from '@/components/orders/orderErrors'
  import WorkListTable from '@/components/orders/WorkListTable.vue'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useInspectionsQuery, useOrderAction, useWorkListQuery } from '@/composables/useOrders'
  import { usePermissions } from '@/composables/usePermissions'
  import { useBranchesQuery } from '@/composables/useReference'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { OUTCOME_META, pieceTitle } from '@/types/order'
  import { PERMISSIONS } from '@/types/staff'

  // Inspections (Backend spec 012 FR-010, FR-022). "At the branch" needs order.receive,
  // inspection.enter or order.handover; "Results" needs inspection.enter or order.view.
  // A person with an assigned branch only sees that branch (the Backend scopes it).
  type Tab = 'work' | 'results'

  const route = useRoute()
  const router = useRouter()
  const { can, canAny } = usePermissions()

  const seesWork = computed(() => canAny([PERMISSIONS.orderReceive, PERMISSIONS.inspectionEnter, PERMISSIONS.orderHandover]))
  const seesResults = computed(() => canAny([PERMISSIONS.inspectionEnter, PERMISSIONS.orderView]))

  const tabs = computed(() => [
    ...(seesWork.value ? [{ value: 'work' as Tab, label: 'At the branch' }] : []),
    ...(seesResults.value ? [{ value: 'results' as Tab, label: 'Results' }] : []),
  ])
  const tab = computed<Tab>(() => {
    const wanted = route.query.tab === 'results' ? 'results' : 'work'
    return tabs.value.some(t => t.value === wanted) ? wanted : (tabs.value[0]?.value ?? 'work')
  })

  function setTab (value: Tab) {
    router.replace({ query: { ...route.query, tab: value === 'work' ? undefined : value } })
  }

  // Branch filter for people with reference.view (an assigned branch overrides it on the Backend).
  const branches = useBranchesQuery(() => can(PERMISSIONS.referenceView))
  const branch = ref('')
  const branchId = computed(() => (branch.value === '' ? null : Number(branch.value)))
  const branchOptions = computed(() => [
    { value: '', label: 'Every branch' },
    ...(branches.data.value ?? []).map(b => ({ value: String(b.id), label: b.nameEn })),
  ])

  const work = useWorkListQuery(branchId, () => tab.value === 'work' && seesWork.value)
  const workRows = computed(() => work.data.value?.pages.flatMap(p => p.rows) ?? [])

  const PERIODS = [
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'year', label: 'This year' },
  ] as const
  type Period = typeof PERIODS[number]['value']
  const period = ref<Period>('30')

  const OUTCOME_OPTIONS = [
    { value: '', label: 'Every outcome' },
    ...(Object.keys(OUTCOME_META) as InspectionOutcome[]).map(o => ({ value: o, label: OUTCOME_META[o].label })),
  ]
  const outcome = ref('')

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const resultFilters = computed<InspectionFilters>(() => {
    const today = new Date()
    const from = period.value === 'year'
      ? new Date(today.getFullYear(), 0, 1)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(period.value))
    return {
      from: ymd(from),
      to: ymd(today),
      branchId: branchId.value,
      outcome: outcome.value === '' ? null : outcome.value as InspectionOutcome,
    }
  })
  const results = useInspectionsQuery(resultFilters, () => tab.value === 'results' && seesResults.value)
  const resultRows = computed(() => results.data.value?.pages.flatMap(p => p.rows) ?? [])

  // The work-list actions.
  const inspection = ref<InspectionTarget | null>(null)
  const handover = ref<{ orderId: string, orderRef: string, to: 'buyer' | 'seller', proxy?: OrderProxy | null, buyerId?: HandoverBuyerId | null } | null>(null)
  // The ID of whoever collects — the person the buyer named (spec 014) or the buyer themself; the Backend
  // allows either with order.handover or order.view.
  const handoverCanView = computed(() => canAny([PERMISSIONS.orderHandover, PERMISSIONS.orderView]))
  const handoverCanViewId = computed(() => Boolean(handover.value?.proxy?.hasIdPhoto) && handoverCanView.value)
  const receiving = ref<WorkListItem | null>(null)

  function act (item: WorkListItem) {
    switch (item.task) {
      case 'receive': {
        receiving.value = item
        break
      }
      case 'inspect':
      case 'correct': {
        inspection.value = {
          orderId: item.orderId,
          orderRef: item.orderRef,
          category: item.category,
          pieceName: pieceTitle(item.category, item.pieceType.nameEn, item.statedKarat),
          statedKarat: item.statedKarat,
          statedWeightG: item.statedWeightG,
          correcting: item.task === 'correct' ? item.latestInspection : null,
        }
        break
      }
      case 'handover': {
        handover.value = { orderId: item.orderId, orderRef: item.orderRef, to: 'buyer', proxy: item.proxy, buyerId: item.buyerId }
        break
      }
      case 'return_handover': {
        handover.value = { orderId: item.orderId, orderRef: item.orderRef, to: 'seller' }
        break
      }
    }
  }

  const receive = useOrderAction()
  const receiveKey = useIdempotencyKey()
  const toast = useToast()
  const receiveError = computed(() => (receive.error.value ? orderErrorMessage(receive.error.value) : ''))

  function closeReceive (open: boolean) {
    if (!open && !receive.isPending.value) {
      receiving.value = null
      receive.reset()
      receiveKey.reset()
    }
  }

  async function onReceive () {
    if (receive.isPending.value || receiving.value === null) return
    const payload = { orderId: receiving.value.orderId, action: { kind: 'receive' as const } }
    try {
      await receive.mutateAsync({ ...payload, idempotencyKey: receiveKey.keyFor(payload) })
      toast.ok('Received. The piece is at inspection.')
      closeReceive(false)
    } catch {
      // Shown in the dialog.
    }
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-ins__tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; margin-bottom: 4px; }
.d-ins__tools :deep(.d-chips) { margin-bottom: 10px; }
.d-ins__more { display: flex; justify-content: center; padding: 12px; }
</style>
