<template>
  <div class="d-page">
    <PageLead>Only pieces older than the waiting period appear here, so a market maker never gets ahead of an ordinary buyer. Approving is a judgement about price, not about the piece.</PageLead>

    <NoteBanner v-if="queue.data.value" class="d-mm__note">
      The waiting period is <b>{{ queue.data.value.meta.min_list_age_days }} days</b> and the approval requirement is
      {{ queue.data.value.meta.require_approval ? 'on' : 'off' }}. Both are set in
      <RouterLink class="d-mm__link" to="/dashboard/rates">commission rates</RouterLink>. This screen is yours, not the
      market maker's. They see approved pieces marked in the app, with a filter to show only those.
    </NoteBanner>

    <NoteBanner v-if="actionError" class="d-mm__note" role="alert" variant="bad">{{ actionError }}</NoteBanner>

    <div class="d-mm__split">
      <Panel title="Waiting for approval">
        <LoadingState v-if="queue.isPending.value" label="Loading the pieces…" />
        <ErrorState v-else-if="queue.isError.value" :message="accessErrorMessage(queue.error.value)" title="Could not load the pieces" @retry="queue.refetch()" />
        <EmptyState v-else-if="rows.length === 0" description="No piece has waited long enough yet." title="Nothing waiting" />

        <DataTable v-else>
          <template #head>
            <th>Piece</th>
            <th>Listed</th>
            <th class="r">Asking</th>
            <th>Against the guide</th>
            <th class="r" />
          </template>

          <tr v-for="p in rows" :key="p.listing_id">
            <td>
              {{ p.title }}
              <div class="who2">{{ pieceLine(p) }}</div>

              <div class="who2 d-mm__files">
                <template v-for="f in fileLinks(p)" :key="f.label">
                  <button v-if="f.mediaId" class="d-mm__file" type="button" @click="openFile(p.listing_id, f.mediaId)">{{ f.label }}</button>
                  <span v-else class="d-mm__nofile">{{ f.label }}</span>
                </template>
              </div>
            </td>

            <td>{{ p.days_listed }} days</td>
            <td class="r mono">{{ formatMoney(p.asking_price ?? p.current_price) }}</td>

            <td :class="`d-mm__guide d-mm__guide--${p.guide.tone}`">{{ guideWords(p) }}</td>

            <td class="r">
              <DBtn :disabled="!canApprove || approve.isPending.value" kind="success" @click="onApprove(p)">Price is sound</DBtn>
              <DBtn :disabled="!canApprove || leave.isPending.value" @click="onLeave(p)">Leave</DBtn>
            </td>
          </tr>
        </DataTable>
      </Panel>

      <Panel subtitle="This month" title="What this costs">
        <template #body>
          <LoadingState v-if="cost.isPending.value" label="Loading…" />

          <template v-else-if="cost.data.value">
            <KeyValueRow label="Pieces bought by market makers" :value="cost.data.value.pieces_bought" />
            <KeyValueRow label="Commission given up" :value="`${formatMoney(cost.data.value.commission_given_up_egp)} EGP`" />
            <KeyValueRow label="Spread given up" :value="`${formatMoney(cost.data.value.spread_given_up_egp)} EGP`" />
            <KeyValueRow big label="Total cost" :value="`${formatMoney(cost.data.value.total_cost_egp)} EGP`" />

            <p v-if="cost.data.value.not_recorded > 0" class="who2 d-mm__unrecorded">
              {{ cost.data.value.not_recorded }} earlier {{ cost.data.value.not_recorded === 1 ? 'sale is' : 'sales are' }} not recorded.
            </p>
          </template>

          <NoteBanner class="d-mm__note">
            This is what you pay for liquidity. Sellers get their money faster and the market looks active. Watch it
            against the sell-through rate to know whether it is working.
          </NoteBanner>
        </template>
      </Panel>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { QueueRow } from '@/composables/useMarketMakers'
  import { computed, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import { http } from '@/api/axios'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useApprovePiece, useCostPanel, useLeavePiece, useMarketMakerQueue } from '@/composables/useMarketMakers'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'

  // Market maker approvals, as designed (Backend spec 019 FR-062, spec 023 Story 6). The old "Approved"
  // list is not on the design and is gone from this page; its endpoint stays.
  const { can } = usePermissions()
  const toast = useToast()
  const canApprove = can('market_maker.approve')
  const queue = useMarketMakerQueue()
  const rows = computed(() => queue.data.value?.data ?? [])
  const month = ref(new Date().toISOString().slice(0, 7))
  const cost = useCostPanel(month)

  const approve = useApprovePiece()
  const leave = useLeavePiece()
  const key = useIdempotencyKey()
  const actionError = ref('')

  /** "30.00 g · 127 views, no requests" as in the design. */
  function pieceLine (p: QueueRow): string {
    const parts: string[] = []
    if (p.weight_g !== null) parts.push(`${Number(p.weight_g).toFixed(2)} g`)
    const views = `${p.views} ${p.views === 1 ? 'view' : 'views'}`
    const requests = p.requests === 0 ? 'no requests' : `${p.requests} ${p.requests === 1 ? 'request' : 'requests'}`
    parts.push(`${views}, ${requests}`)
    return parts.join(' · ')
  }

  /** Video · Original invoice · N photos · (the grey "No video") · GIA certificate. */
  function fileLinks (p: QueueRow): Array<{ label: string, mediaId: string | null }> {
    const first = (kind: string) => p.media.find(m => m.kind === kind)?.media_id ?? null
    const photos = p.media.filter(m => m.kind === 'photo')
    const links: Array<{ label: string, mediaId: string | null }> = []

    if (p.category !== 'diamond' || first('video') !== null) {
      links.push(first('video') === null ? { label: 'No video', mediaId: null } : { label: 'Video', mediaId: first('video') })
    } else {
      links.push({ label: 'No video', mediaId: null })
    }
    if (first('invoice') !== null) links.push({ label: 'Original invoice', mediaId: first('invoice') })
    if (first('stone_certificate') !== null) links.push({ label: 'GIA certificate', mediaId: first('stone_certificate') })
    if (photos.length > 0) links.push({ label: `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`, mediaId: photos[0]?.media_id ?? null })

    return links
  }

  function guideWords (p: QueueRow): string {
    if (p.guide.kind === 'making_charge' && p.guide.value_pct !== null) return `Making charge ${p.guide.value_pct}% of gold`
    return 'No guide yet'
  }

  // The file is an audited, authenticated read: fetch it with the token and open it in a tab.
  async function openFile (listingId: string, mediaId: string) {
    actionError.value = ''
    try {
      const res = await http.get(`/dashboard/market-maker/queue/${listingId}/media/${mediaId}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      actionError.value = accessErrorMessage(error)
    }
  }

  function onApprove (p: QueueRow) {
    actionError.value = ''
    const asking = p.asking_price ?? p.current_price ?? '0'
    approve.mutate({ listingId: p.listing_id, askingPriceSeen: asking, goldValueSeen: p.gold_value, idempotencyKey: key.keyFor([p.listing_id, 'approve']) }, {
      onSuccess: () => {
        key.reset()
        toast.ok('Approved and logged against your name.')
      },
      onError: error => {
        actionError.value = accessErrorMessage(error)
      },
    })
  }

  function onLeave (p: QueueRow) {
    actionError.value = ''
    leave.mutate({ listingId: p.listing_id, idempotencyKey: key.keyFor([p.listing_id, 'leave']) }, {
      onSuccess: () => {
        key.reset()
        toast.ok('Left as it is.')
      },
      onError: error => {
        actionError.value = accessErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-mm__note { margin: 12px 0; }
.d-mm__link { color: var(--gold); text-decoration: none; cursor: pointer; }
.d-mm__split { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items: start; }
.d-mm__files { margin-top: 4px; display: flex; gap: 10px; flex-wrap: wrap; }
.d-mm__file { background: none; border: 0; padding: 0; color: var(--gold); cursor: pointer; font: inherit; }
.d-mm__nofile { color: var(--ink-3); }
.d-mm__guide--ok { color: var(--ok); }
.d-mm__guide--bad { color: var(--bad); }
.d-mm__guide--none { color: var(--ink-3); }
.d-mm__unrecorded { margin: 8px 0 0; }
@media (max-width: 900px) {
  .d-mm__split { grid-template-columns: 1fr; }
}
</style>
