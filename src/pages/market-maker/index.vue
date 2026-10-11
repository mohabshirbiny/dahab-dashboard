<template>
  <div class="d-page">
    <PageLead>Pieces that have been listed long enough to be offered to market makers. Approving keeps the numbers you saw; it changes nothing for anyone else. How often a piece was viewed is not measured, so it is not shown.</PageLead>

    <NoteBanner v-if="actionError" class="d-mm__note" role="alert" variant="bad">{{ actionError }}</NoteBanner>

    <Panel class="d-mm__block" :subtitle="`Listed for at least ${queue.data.value?.meta.min_list_age_days ?? '…'} days`" title="Waiting for approval">
      <LoadingState v-if="queue.isPending.value" label="Loading the queue…" />
      <ErrorState v-else-if="queue.isError.value" :message="accessErrorMessage(queue.error.value)" title="Could not load the queue" @retry="queue.refetch()" />
      <EmptyState v-else-if="(queue.data.value?.data ?? []).length === 0" description="No piece is waiting." title="Queue is empty" />

      <DataTable v-else>
        <template #head>
          <th>Piece</th>
          <th class="r">Asking</th>
          <th class="r">Gold value</th>
          <th class="r">Days listed</th>
          <th class="r" />
        </template>

        <tr v-for="r in queue.data.value?.data" :key="r.listing_id">
          <td>{{ r.title }} <div class="who2">{{ r.weight_g }} g</div></td>
          <td class="r">{{ r.current_price ?? r.asking_price ?? 'n/a' }}</td>
          <td class="r">{{ r.gold_value ?? 'n/a' }}</td>
          <td class="r">{{ r.days_listed }}</td>

          <td class="r">
            <DBtn :disabled="!canApprove || approve.isPending.value" kind="primary" @click="onApprove(r)">Price is sound</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>

    <Panel class="d-mm__block" subtitle="Newest first" title="Approved">
      <EmptyState v-if="(approvals.data.value ?? []).length === 0" description="Nothing approved yet." title="No approvals" />

      <DataTable v-else>
        <template #head>
          <th>Piece</th>
          <th class="r">Asking seen</th>
          <th class="r">Gold value seen</th>
          <th>By</th>
          <th>When</th>
        </template>

        <tr v-for="a in approvals.data.value" :key="a.approval_id">
          <td>{{ a.title }}</td>
          <td class="r">{{ a.asking_price }}</td>
          <td class="r">{{ a.gold_value ?? 'n/a' }}</td>
          <td>{{ a.approved_by?.full_name }}</td>
          <td>{{ formatDateTime(a.approved_at) }}</td>
        </tr>
      </DataTable>
    </Panel>

    <Panel class="d-mm__block" :subtitle="cost.data.value?.month ?? ''" title="What the programme gave up">
      <p v-if="cost.data.value" class="d-mm__cost">
        {{ cost.data.value.pieces_bought }} piece{{ cost.data.value.pieces_bought === 1 ? '' : 's' }} bought, worth {{ cost.data.value.value_egp }} EGP.
        Spread paid to dealers: {{ cost.data.value.spread_paid_to_dealers_egp }} EGP. Commission is waived on these sales.
      </p>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import type { QueueRow } from '@/composables/useMarketMakers'
  import { ref } from 'vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useApprovals, useApprovePiece, useCostPanel, useMarketMakerQueue } from '@/composables/useMarketMakers'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'

  // Market-maker approvals (Backend spec 019 FR-062). market_maker.approve approves; the cost panel
  // also opens for promo.manage.
  const { can } = usePermissions()
  const toast = useToast()
  const canApprove = can('market_maker.approve')
  const queue = useMarketMakerQueue()
  const approvals = useApprovals()
  const cost = useCostPanel(() => new Date().toISOString().slice(0, 7))
  const approve = useApprovePiece()
  const key = useIdempotencyKey()
  const actionError = ref('')

  function onApprove (r: QueueRow) {
    actionError.value = ''
    const input = { listingId: r.listing_id, askingPriceSeen: r.current_price ?? r.asking_price ?? '0', goldValueSeen: r.gold_value }
    approve.mutate({ ...input, idempotencyKey: key.keyFor(input) }, {
      onSuccess: () => {
        key.reset()
        toast.ok('Approved for market makers.')
      },
      onError: error => {
        actionError.value = accessErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-mm__block { margin-top: 16px; }
.d-mm__note { margin: 12px 0; }
.d-mm__cost { margin: 0; padding: 12px 16px; color: var(--ink-2); }
</style>
