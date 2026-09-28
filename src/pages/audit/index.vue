<template>
  <div class="d-page">
    <PageLead>Every sensitive action, in order. Nobody can edit or delete an entry, including you.</PageLead>

    <NoteBanner v-if="ownOnly" class="d-al__own">You can see your own actions only.</NoteBanner>

    <FilterChips v-model="category" :options="chipOptions" />

    <Panel :subtitle="subtitle" title="Log">
      <template #actions>
        <DSelect v-model="period" aria-label="Period" :options="periodOptions" />
        <DBtn :loading="exporting.isPending.value" @click="exportLog">Export to Excel</DBtn>
      </template>

      <template v-if="period === 'custom'" #filters>
        <div class="d-al__range">
          <FormField v-slot="{ controlId }" label="From">
            <DInput :id="controlId" v-model="customFrom" type="date" />
          </FormField>

          <FormField v-slot="{ controlId }" label="To">
            <DInput :id="controlId" v-model="customTo" type="date" />
          </FormField>
        </div>
      </template>

      <LoadingState v-if="log.isPending.value" label="Loading the log…" />

      <ErrorState
        v-else-if="log.isError.value"
        :message="accessErrorMessage(log.error.value)"
        :retryable="errorCodeOf(log.error.value) !== 'forbidden'"
        title="Could not load the log"
        @retry="log.refetch()"
      />

      <EmptyState v-else-if="entries.length === 0" title="Nothing recorded in this period" />

      <template v-else>
        <AuditTable :rows="entries" @open="openEntry = $event" />

        <div v-if="log.hasNextPage.value" class="d-al__more">
          <DBtn :loading="log.isFetchingNextPage.value" @click="log.fetchNextPage()">Load more</DBtn>
        </div>
      </template>

      <template #footer>
        <NoteBanner v-if="exportNote" class="d-al__note" :variant="exportNote.variant">{{ exportNote.text }}</NoteBanner>
      </template>
    </Panel>

    <AuditEntryModal :entry-id="openEntry" @close="openEntry = null" />
  </div>
</template>

<script lang="ts" setup>
  import type { AuditFilters } from '@/types/audit'
  import { computed, ref } from 'vue'
  import AuditEntryModal from '@/components/audit/AuditEntryModal.vue'
  import AuditTable from '@/components/audit/AuditTable.vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useAuditCategoriesQuery, useAuditLogQuery, useExportAuditLog } from '@/composables/useAuditLog'
  import { formatNumber } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { errorCodeOf } from '@/services/errors'
  import { cairoDate } from '@/types/audit'
  import { PERMISSIONS } from '@/types/staff'

  const EVERYTHING = 'all'
  type Period = '7' | '30' | 'custom'

  const { can } = usePermissions()
  // The Backend limits own-actions viewers; this only explains what they see.
  const ownOnly = computed(() => !can(PERMISSIONS.auditViewAll))

  const categories = useAuditCategoriesQuery()
  const category = ref<string>(EVERYTHING)
  const chipOptions = computed(() => [
    { value: EVERYTHING, label: 'Everything' },
    ...(categories.data.value ?? []).map(c => ({ value: c.value, label: c.label })),
  ])

  const period = ref<Period>('7')
  const periodOptions: Array<{ value: Period, label: string }> = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom range' },
  ]
  const customFrom = ref(cairoDate(6))
  const customTo = ref(cairoDate())

  const filters = computed<AuditFilters>(() => ({
    from: period.value === 'custom' ? customFrom.value : cairoDate(Number(period.value) - 1),
    to: period.value === 'custom' ? customTo.value : cairoDate(),
    category: category.value === EVERYTHING ? null : category.value,
    actor: null,
  }))

  const log = useAuditLogQuery(filters)
  const entries = computed(() => log.data.value?.pages.flatMap(p => p.entries) ?? [])
  const total = computed(() => log.data.value?.pages[0]?.total ?? 0)

  const subtitle = computed(() => {
    const range = period.value === 'custom' ? `${customFrom.value} to ${customTo.value}` : `Last ${period.value} days`
    return log.isPending.value ? range : `${range}, ${formatNumber(total.value)} ${total.value === 1 ? 'entry' : 'entries'}`
  })

  const openEntry = ref<number | null>(null)

  const exporting = useExportAuditLog()
  const exportNote = ref<{ text: string, variant: 'info' | 'bad' } | null>(null)

  function exportLog () {
    exportNote.value = null
    exporting.mutate(filters.value, {
      onSuccess: result => {
        exportNote.value = result.truncated
          ? { text: 'The file stopped at the export limit. Narrow the period to get the rest.', variant: 'bad' }
          : null
      },
      onError: error => {
        exportNote.value = { text: accessErrorMessage(error), variant: 'bad' }
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-al__own { margin-bottom: 12px; }
.d-al__range { display: flex; flex-wrap: wrap; gap: 12px; }
.d-al__more { display: flex; justify-content: center; padding: 12px; }
.d-al__note { margin-top: 12px; }
</style>
