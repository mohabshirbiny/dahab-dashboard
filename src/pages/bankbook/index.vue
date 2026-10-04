<template>
  <div class="d-page">
    <PageLead>Money that moves in or out of the Dahab bank account without going through the app. Without these entries, the bank balance and the wallets will never agree.</PageLead>

    <div class="d-split d-bb__block" :class="{ 'd-split--solo': !canRecord }">
      <div>
        <FilterChips :model-value="tab" :options="TABS" @update:model-value="tab = $event" />

        <Panel class="d-bb__block" :title="tab === 'hand' ? 'Recorded by hand' : 'Everything through the bank'">
          <template #actions>
            <DBtn :loading="exportBusy" @click="exportList">Export to Excel</DBtn>
          </template>

          <template #filters>
            <PeriodFilter v-model:from="from" v-model:to="to" />
            <DSelect v-if="tab === 'hand'" v-model="kind" aria-label="Kind" :options="KIND_FILTER" />
          </template>

          <NoteBanner v-if="note" class="d-bb__note" variant="bad">{{ note }}</NoteBanner>

          <template v-if="tab === 'hand'">
            <StatGrid v-if="movementsPage" class="d-bb__stats">
              <StatCard label="In" :value="`${formatMoney(movementsPage.totals.in)} EGP`" />
              <StatCard label="Out" :value="`${formatMoney(movementsPage.totals.out)} EGP`" />
            </StatGrid>

            <LoadingState v-if="movements.isPending.value" label="Loading movements…" />
            <ErrorState v-else-if="movements.isError.value" :message="financeErrorMessage(movements.error.value)" title="Could not load the movements" @retry="movements.refetch()" />
            <EmptyState v-else-if="movementRows.length === 0" title="Nothing recorded by hand in these dates" />

            <template v-else>
              <BankMovementsTable :rows="movementRows" @proof="openProof" />

              <div v-if="movements.hasNextPage.value" class="d-bb__more">
                <DBtn :loading="movements.isFetchingNextPage.value" @click="movements.fetchNextPage()">Load more</DBtn>
              </div>
            </template>
          </template>

          <template v-else>
            <StatGrid v-if="bookPage" class="d-bb__stats">
              <StatCard label="Opening" :value="formatMoney(bookPage.summary.opening)" />
              <StatCard label="In" :value="formatMoney(bookPage.summary.in)" />
              <StatCard label="Out" :value="formatMoney(bookPage.summary.out)" />
              <StatCard label="Closing" :value="formatMoney(bookPage.summary.closing)" />
            </StatGrid>

            <LoadingState v-if="book.isPending.value" label="Loading the bank book…" />
            <ErrorState v-else-if="book.isError.value" :message="financeErrorMessage(book.error.value)" title="Could not load the bank book" @retry="book.refetch()" />
            <EmptyState v-else-if="bookRows.length === 0" title="Nothing went through the bank in these dates" />

            <template v-else>
              <BankBookTable :rows="bookRows" />

              <div v-if="book.hasNextPage.value" class="d-bb__more">
                <DBtn :loading="book.isFetchingNextPage.value" @click="book.fetchNextPage()">Load more</DBtn>
              </div>
            </template>
          </template>
        </Panel>
      </div>

      <BankMovementForm v-if="canRecord" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BankMovementKind } from '@/types/finance'
  import { computed, ref } from 'vue'
  import BankBookTable from '@/components/finance/BankBookTable.vue'
  import BankMovementForm from '@/components/finance/BankMovementForm.vue'
  import BankMovementsTable from '@/components/finance/BankMovementsTable.vue'
  import { financeErrorMessage } from '@/components/finance/financeErrors'
  import PeriodFilter from '@/components/finance/PeriodFilter.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { useBankBookQuery, useExportBankBook, useExportMovements, useMovementsQuery } from '@/composables/useFinance'
  import { formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { financeService } from '@/services/finance.service'
  import { cairoDate } from '@/types/audit'
  import { BANK_MOVEMENT_KINDS } from '@/types/finance'
  import { PERMISSIONS } from '@/types/staff'

  // Bank movements (Backend spec 015 US3): record a movement (bank.record); read the movements
  // recorded by hand and every posting through the bank (bank.record or wallet.view).
  type Tab = 'hand' | 'book'
  const TABS: ReadonlyArray<{ value: Tab, label: string }> = [
    { value: 'hand', label: 'Recorded by hand' },
    { value: 'book', label: 'Everything through the bank' },
  ]
  const KIND_FILTER: ReadonlyArray<{ value: BankMovementKind | '', label: string }> = [{ value: '', label: 'Every kind' }, ...BANK_MOVEMENT_KINDS]

  const { can } = usePermissions()
  const canRecord = computed(() => can(PERMISSIONS.bankRecord))

  const tab = ref<Tab>('hand')
  const from = ref(cairoDate(29))
  const to = ref(cairoDate())
  const kind = ref<BankMovementKind | ''>('')

  const movements = useMovementsQuery(from, to, kind, () => tab.value === 'hand')
  const movementRows = computed(() => movements.data.value?.pages.flatMap(p => p.rows) ?? [])
  const movementsPage = computed(() => movements.data.value?.pages[0] ?? null)
  const book = useBankBookQuery(from, to, () => tab.value === 'book')
  const bookRows = computed(() => book.data.value?.pages.flatMap(p => p.rows) ?? [])
  const bookPage = computed(() => book.data.value?.pages[0] ?? null)

  const exportMovements = useExportMovements()
  const exportBook = useExportBankBook()
  const exportBusy = computed(() => exportMovements.isPending.value || exportBook.isPending.value)
  const note = ref('')

  function exportList () {
    note.value = ''
    const handlers = {
      onSuccess: (result: { truncated: boolean }) => {
        note.value = result.truncated ? 'The file stopped at the export limit. Narrow the dates to get the rest.' : ''
      },
      onError: (error: unknown) => {
        note.value = financeErrorMessage(error)
      },
    }
    if (tab.value === 'hand') {
      exportMovements.mutate({ from: from.value, to: to.value, kind: kind.value }, handlers)
    } else {
      exportBook.mutate({ from: from.value, to: to.value }, handlers)
    }
  }

  // The Backend records each time a proof is opened.
  async function openProof (id: string) {
    note.value = ''
    try {
      const url = URL.createObjectURL(await financeService.proof(id))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      note.value = financeErrorMessage(error)
    }
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-bb__block { margin-top: 16px; }
.d-bb__note { margin: 0 16px 12px; }
.d-bb__stats { margin: 0 16px 12px; }
.d-bb__more { display: flex; justify-content: center; padding: 12px; }
.d-split { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: start; }
.d-split--solo { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1100px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
