<template>
  <Panel subtitle="Money paid ahead to first-time gold sellers" title="First-sale advances">
    <template #actions>
      <RouterLink to="/dashboard/first-sale">See every advance</RouterLink>
    </template>

    <template #body>
      <LoadingState v-if="advances.isPending.value" label="Loading…" />
      <ErrorState v-else-if="advances.isError.value" :message="accessErrorMessage(advances.error.value)" title="Could not load the advances" @retry="advances.refetch()" />

      <template v-else-if="meta">
        <NoteBanner v-if="!meta.enabled" class="d-fx__note" variant="wait">
          The advance is switched off. Nothing is paid ahead until Finance turns it on above.
        </NoteBanner>

        <KeyValueRow label="Paid ahead and not yet recovered" :value="`${formatMoney(meta.outstanding_egp)} EGP (${meta.outstanding_count})`" />
        <KeyValueRow label="Ceiling" :value="`${formatMoney(meta.ceiling_egp)} EGP`" />
        <KeyValueRow big label="Room left under the ceiling" :value="`${formatMoney(meta.headroom_egp)} EGP`" />
        <KeyValueRow label="Written off so far" :value="`${formatMoney(meta.written_off_total_egp)} EGP`" />
        <KeyValueRow label="Absorbed when a sale paid less than the advance" :value="`${formatMoney(meta.shortfall_total_egp)} EGP`" />
      </template>
    </template>

    <EmptyState v-if="meta && rows.length === 0" description="No advance is waiting for a buyer to pay." title="Nothing outstanding" />

    <DataTable v-else-if="rows.length > 0">
      <template #head>
        <th>Order</th>
        <th>Seller</th>
        <th>Basis</th>
        <th class="r">Paid ahead</th>
        <th>Since</th>
      </template>

      <tr v-for="a in rows" :key="a.advance_id">
        <td class="mono">{{ a.order_ref }}</td>
        <td>{{ a.seller.full_name }} <span class="who2">{{ a.seller.display_ref }}</span></td>
        <td>{{ a.basis === 'promo_code' ? `Code ${a.promo_code ?? ''}` : a.basis === 'staff_enablement' ? 'Enabled by staff' : 'First sale' }}</td>
        <td class="r mono">{{ formatMoney(a.amount_egp) }}</td>
        <td>{{ formatDateTime(a.advanced_at) }}</td>
      </tr>
    </DataTable>
  </Panel>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useFirstSaleAdvances } from '@/composables/useFirstSale'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'

  // The exposure and the outstanding list (Backend spec 023 R13), for first_sale.manage.
  const advances = useFirstSaleAdvances('outstanding')
  const meta = computed(() => advances.data.value?.meta)
  const rows = computed(() => advances.data.value?.data ?? [])
</script>

<style lang="scss" scoped>
.d-fx__note { margin-bottom: 10px; }
</style>
