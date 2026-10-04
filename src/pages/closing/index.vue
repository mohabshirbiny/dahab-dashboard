<template>
  <div class="d-page">
    <PageLead>Every day the bank balance is compared against everything the system says should be there. A difference that appears today is easy to find. The same difference found in three months is not.</PageLead>

    <StatGrid v-if="recent.data.value">
      <StatCard
        :hint="dayData?.close ? (Number(dayData.close.difference) === 0 ? 'The bank and the books agree' : 'Not explained yet') : 'Not compared yet'"
        label="Difference on this day"
        :value="dayData?.close ? `${formatMoney(dayData.close.difference)} EGP` : '—'"
      />

      <StatCard
        :hint="openDays > 0 ? `${openDays} still open` : undefined"
        label="Days closed this month"
        :value="`${recent.data.value.daysClosed} of ${recent.data.value.daysInPeriod}`"
      />

      <StatCard
        :hint="recent.data.value.lastDifference?.explanation ?? undefined"
        label="Last difference found"
        :value="recent.data.value.lastDifference ? `${formatDate(recent.data.value.lastDifference.date, true)} · ${formatMoney(recent.data.value.lastDifference.difference)} EGP` : 'None'"
      />
    </StatGrid>

    <div class="d-split d-cl__block">
      <Panel :subtitle="dayData ? (dayData.ended ? formatDate(dayData.date) : `Today ${formatDate(dayData.date)}, live`) : undefined" title="The day">
        <template #filters>
          <DInput v-model="date" aria-label="Day" type="date" />
        </template>

        <LoadingState v-if="day.isPending.value" label="Loading the day…" />
        <ErrorState v-else-if="day.isError.value" :message="financeErrorMessage(day.error.value)" title="Could not load the day" @retry="day.refetch()" />

        <div v-else-if="dayData" class="d-cl__body">
          <KeyValueRow label="Bank balance in the books"><span class="num">{{ formatMoney(dayData.books.bank) }}</span></KeyValueRow>
          <KeyValueRow label="Customer wallets, available"><span class="num">{{ formatMoney(dayData.books.customerAvailable) }}</span></KeyValueRow>
          <KeyValueRow label="Customer wallets, held"><span class="num">{{ formatMoney(dayData.books.customerHeld) }}</span></KeyValueRow>
          <KeyValueRow label="Dahab wallet, earned and not withdrawn"><span class="num">{{ formatMoney(dayData.books.dahabWallet) }}</span></KeyValueRow>

          <KeyValueRow label="Movements outside the app">
            <span class="num">in {{ formatMoney(dayData.books.movementsIn) }} · out {{ formatMoney(dayData.books.movementsOut) }}</span>
          </KeyValueRow>

          <template v-if="dayData.close">
            <KeyValueRow label="Bank balance at close"><span class="num">{{ formatMoney(dayData.close.bankBalance) }}</span></KeyValueRow>
            <KeyValueRow label="Difference"><span class="num">{{ formatMoney(dayData.close.difference) }}</span></KeyValueRow>

            <NoteBanner class="d-cl__note" :variant="dayData.close.isLocked ? 'ok' : 'wait'">
              {{ dayData.close.isLocked
                ? `Closed and locked by ${dayData.close.closedBy?.name ?? '—'}.${dayData.close.explanation ? ` ${dayData.close.explanation}` : ''}`
                : 'Saved with a difference. Close it again once the difference is explained.' }}
            </NoteBanner>
          </template>

          <NoteBanner v-if="!dayData.ended" class="d-cl__note" variant="info">A day can be closed from midnight. These are today's figures so far.</NoteBanner>

          <DBtn
            v-if="canClose && dayData.canClose"
            block
            class="d-cl__btn"
            kind="primary"
            @click="closing = true"
          >Close the day</DBtn>
        </div>
      </Panel>

      <Panel subtitle="This month" title="Recent days">
        <LoadingState v-if="recent.isPending.value" label="Loading recent days…" />
        <ErrorState v-else-if="recent.isError.value" :message="financeErrorMessage(recent.error.value)" title="Could not load recent days" @retry="recent.refetch()" />
        <EmptyState v-else-if="(recent.data.value?.rows.length ?? 0) === 0" title="No day closed yet this month" />
        <RecentClosesTable v-else :rows="recent.data.value?.rows ?? []" />
      </Panel>
    </div>

    <CloseDayModal v-if="dayData" :day="dayData" :open="closing" @close="closing = false" />
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import CloseDayModal from '@/components/finance/CloseDayModal.vue'
  import { financeErrorMessage } from '@/components/finance/financeErrors'
  import RecentClosesTable from '@/components/finance/RecentClosesTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { useCloseDayQuery, useRecentClosesQuery } from '@/composables/useFinance'
  import { formatDate, formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { cairoDate } from '@/types/audit'
  import { PERMISSIONS } from '@/types/staff'

  // Daily closing (Backend spec 015 US4): the day's books (day.close or wallet.view) and
  // closing an ended day against the statement (day.close). Opens on yesterday.
  const { can } = usePermissions()
  const canClose = computed(() => can(PERMISSIONS.dayClose))

  const date = ref(cairoDate(1))
  const closing = ref(false)
  const day = useCloseDayQuery(date, true)
  const dayData = computed(() => day.data.value ?? null)

  const monthStart = computed(() => `${cairoDate().slice(0, 8)}01`)
  const recent = useRecentClosesQuery(monthStart, () => cairoDate(), true)
  const openDays = computed(() => Math.max(0, (recent.data.value?.daysInPeriod ?? 0) - (recent.data.value?.daysClosed ?? 0)))
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-cl__block { margin-top: 16px; }
.d-cl__body { padding: 16px; }
.d-cl__note { margin: 10px 0 0; }
.d-cl__btn { margin-top: 14px; }
.d-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); align-items: start; }
@media (max-width: 1100px) {
  .d-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}
</style>
