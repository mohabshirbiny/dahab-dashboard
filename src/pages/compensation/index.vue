<template>
  <div class="d-page">
    <PageLead>Pays money into a customer wallet outside the normal flow. Every payment is logged with your name and appears on their statement as compensation from Dahab.</PageLead>

    <StatGrid v-if="page">
      <StatCard label="Paid out this month" :value="`${formatMoney(page.totals.thisMonth)} EGP`" />
      <StatCard hint="In the dates below" label="Paid in this period" :value="`${formatMoney(page.totals.period)} EGP`" />
      <StatCard hint="Per payment" label="Cap" :value="page.caps.uncapped ? 'No limit' : `${formatMoney(page.caps.perPayment)} EGP`" />

      <StatCard
        :hint="page.caps.uncapped ? undefined : `Of ${formatMoney(page.caps.perDay)} EGP a day`"
        label="Your remaining limit today"
        :value="page.caps.uncapped ? 'No limit' : `${formatMoney(page.caps.leftToday)} EGP`"
      />
    </StatGrid>

    <div class="d-split d-cp__block" :class="{ 'd-split--solo': !canPay }">
      <Panel :subtitle="page ? `Paid out ${formatMoney(page.totals.thisMonth)} EGP this month` : undefined" title="Compensation paid">
        <template #actions>
          <DBtn :loading="exporting.isPending.value" @click="exportList">Export to Excel</DBtn>
        </template>

        <template #filters>
          <PeriodFilter v-model:from="from" v-model:to="to" />
          <DSelect v-model="reason" aria-label="Reason" :options="REASON_FILTER" />
        </template>

        <NoteBanner v-if="exportNote" class="d-cp__note" variant="bad">{{ exportNote }}</NoteBanner>

        <LoadingState v-if="list.isPending.value" label="Loading compensation…" />
        <ErrorState v-else-if="list.isError.value" :message="financeErrorMessage(list.error.value)" title="Could not load compensation" @retry="list.refetch()" />
        <EmptyState v-else-if="rows.length === 0" title="No compensation in these dates" />

        <template v-else>
          <CompensationTable :rows="rows" />

          <div v-if="list.hasNextPage.value" class="d-cp__more">
            <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
          </div>
        </template>
      </Panel>

      <PayCompensationForm v-if="canPay" :caps="page?.caps ?? null" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { CompensationQuery, CompensationReason } from '@/types/finance'
  import { computed, ref } from 'vue'
  import CompensationTable from '@/components/finance/CompensationTable.vue'
  import { financeErrorMessage } from '@/components/finance/financeErrors'
  import PayCompensationForm from '@/components/finance/PayCompensationForm.vue'
  import PeriodFilter from '@/components/finance/PeriodFilter.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { useCompensationQuery, useExportCompensation } from '@/composables/useFinance'
  import { formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { cairoDate } from '@/types/audit'
  import { COMPENSATION_REASONS } from '@/types/finance'
  import { PERMISSIONS } from '@/types/staff'

  // Compensation (Backend spec 015 US1): every payment with the totals and your caps
  // (compensation.pay or wallet.view); paying outside a dispute needs compensation.pay.
  const REASON_FILTER: ReadonlyArray<{ value: CompensationReason | '', label: string }> = [{ value: '', label: 'Every reason' }, ...COMPENSATION_REASONS]

  const { can } = usePermissions()
  const canPay = computed(() => can(PERMISSIONS.compensationPay))

  const from = ref(cairoDate(29))
  const to = ref(cairoDate())
  const reason = ref<CompensationReason | ''>('')
  const query = computed<CompensationQuery>(() => ({ from: from.value, to: to.value, reason: reason.value, customerId: null }))

  const list = useCompensationQuery(query)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const page = computed(() => list.data.value?.pages[0] ?? null)

  const exporting = useExportCompensation()
  const exportNote = ref('')

  function exportList () {
    exportNote.value = ''
    exporting.mutate(query.value, {
      onSuccess: result => {
        exportNote.value = result.truncated ? 'The file stopped at the export limit. Narrow the dates to get the rest.' : ''
      },
      onError: error => {
        exportNote.value = financeErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-cp__block { margin-top: 16px; }
.d-cp__note { margin: 0 16px 12px; }
.d-cp__more { display: flex; justify-content: center; padding: 12px; }
.d-split { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: start; }
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1100px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
