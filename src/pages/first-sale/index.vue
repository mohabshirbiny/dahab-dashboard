<template>
  <div class="d-page">
    <PageLead>
      Money paid ahead to first-time gold sellers once IGI passes the piece. Each advance counts against the ceiling until the buyer pays;
      the room then comes back on its own. A written-off advance also leaves the count, as a loss.
    </PageLead>

    <StatGrid v-if="meta">
      <StatCard hero label="Room left under the ceiling" :value="`${formatMoney(meta.headroom_egp)} EGP`" />
      <StatCard :hint="`${meta.outstanding_count} waiting for the buyer to pay`" label="Paid ahead, not yet recovered" :value="`${formatMoney(meta.outstanding_egp)} EGP`" />
      <StatCard hint="Across every customer at once" label="Ceiling" :value="`${formatMoney(meta.ceiling_egp)} EGP`" />
      <StatCard hint="Most paid ahead on one sale" label="Cap per sale" :value="`${formatMoney(meta.cap_egp)} EGP`" />
      <StatCard label="Written off so far" :value="`${formatMoney(meta.written_off_total_egp)} EGP`" />
      <StatCard hint="A sale that paid less than its advance" label="Absorbed by Dahab" :value="`${formatMoney(meta.shortfall_total_egp)} EGP`" />
    </StatGrid>

    <NoteBanner v-if="meta && !meta.enabled" class="d-fs__note" variant="wait">
      The advance is switched off. Nothing is paid ahead until it is turned on in Platform settings.
    </NoteBanner>

    <NoteBanner v-if="meta" class="d-fs__note">
      To give more room, raise the ceiling in <RouterLink to="/dashboard/rates">Platform settings</RouterLink>. Nothing else needs topping up.
    </NoteBanner>

    <Panel subtitle="Newest first" title="Advances">
      <template #filters>
        <FilterChips v-model="filter" :options="FILTERS" />
      </template>

      <LoadingState v-if="pages.isPending.value" label="Loading the advances…" />
      <ErrorState v-else-if="pages.isError.value" :message="accessErrorMessage(pages.error.value)" title="Could not load the advances" @retry="pages.refetch()" />
      <EmptyState v-else-if="rows.length === 0" title="No advance here" />

      <template v-else>
        <DataTable>
          <template #head>
            <th>Order</th>
            <th>Seller</th>
            <th class="r">Paid ahead</th>
            <th>Paid on</th>
            <th>Where it stands</th>
            <th>Basis</th>
          </template>

          <tr v-for="a in rows" :key="a.advance_id">
            <td class="mono"><RouterLink :to="{ path: '/dashboard/orders', query: { id: a.order_id, group: 'all' } }">{{ a.order_ref ?? '—' }}</RouterLink></td>

            <td>
              <RouterLink v-if="a.seller.display_ref" :to="{ path: '/dashboard/customer', query: { q: a.seller.display_ref } }">{{ a.seller.full_name }}</RouterLink>
              <template v-else>{{ a.seller.full_name }}</template>
              <span class="who2">{{ a.seller.display_ref }}</span>
            </td>

            <td class="r mono">{{ formatMoney(a.amount_egp) }}</td>
            <td>{{ formatDateTime(a.advanced_at) }}</td>

            <td>
              <StatusTag :label="statusLabel(a)" :variant="a.status === 'recovered' ? 'ok' : a.status === 'written_off' ? 'bad' : 'wait'" />
              <div v-if="detail(a)" class="who2">{{ detail(a) }}</div>
            </td>

            <td>{{ a.basis === 'promo_code' ? `Code ${a.promo_code ?? ''}` : a.basis === 'staff_enablement' ? 'Enabled by staff' : 'First sale' }}</td>
          </tr>
        </DataTable>

        <div v-if="pages.hasNextPage.value" class="d-fs__more">
          <DBtn :loading="pages.isFetchingNextPage.value" @click="pages.fetchNextPage()">Load more</DBtn>
        </div>
      </template>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import type { AdvanceRow, AdvanceStatus } from '@/composables/useFirstSale'
  import { computed, ref } from 'vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useFirstSaleAdvancesPages } from '@/composables/useFirstSale'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'

  // First-sale advances (Backend spec 023 R13, first_sale.manage): every advance — who, which order,
  // how much, and whether the buyer paid (recovered), is still to pay (outstanding) or never paid (written off).
  type Filter = AdvanceStatus | 'all'
  const FILTERS: ReadonlyArray<{ value: Filter, label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'outstanding', label: 'Waiting for the buyer' },
    { value: 'recovered', label: 'Recovered' },
    { value: 'written_off', label: 'Written off' },
  ]
  const WRITE_OFF_REASONS: Record<string, string> = {
    buyer_did_not_pay: 'the buyer did not pay',
    cancelled_at_inspection: 'cancelled at inspection',
    cancelled_by_staff: 'cancelled by staff',
    dispute_against_sale: 'a dispute went against the sale',
  }

  const filter = ref<Filter>('all')
  const pages = useFirstSaleAdvancesPages(() => (filter.value === 'all' ? null : filter.value))
  const meta = computed(() => pages.data.value?.pages[0]?.meta)
  const rows = computed(() => pages.data.value?.pages.flatMap(p => p.data) ?? [])

  function statusLabel (a: AdvanceRow): string {
    if (a.status === 'recovered') return 'Buyer paid, recovered'
    if (a.status === 'written_off') return 'Written off'
    return 'Waiting for the buyer to pay'
  }

  function detail (a: AdvanceRow): string | null {
    if (a.status === 'recovered') {
      const shortfall = Number(a.shortfall_absorbed_egp ?? 0)
      const when = a.recovered_at ? `On ${formatDateTime(a.recovered_at)}` : null
      return shortfall > 0 ? `${when ?? ''}${when ? ', ' : ''}${formatMoney(a.shortfall_absorbed_egp ?? '0')} EGP absorbed` : when
    }
    if (a.status === 'written_off') {
      const why = a.written_off_reason ? (WRITE_OFF_REASONS[a.written_off_reason] ?? a.written_off_reason) : null
      return [a.written_off_at ? `On ${formatDateTime(a.written_off_at)}` : null, why].filter(Boolean).join(', ') || null
    }
    return null
  }
</script>

<style lang="scss" scoped>
.d-fs__note { margin-bottom: 12px; }
.d-fs__more { display: flex; justify-content: center; margin-top: 12px; }
</style>
