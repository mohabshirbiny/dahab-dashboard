<template>
  <DataTable>
    <template #head>
      <th>Person</th>
      <th>Type</th>
      <th>Document</th>
      <th>Submitted</th>
      <th aria-label="Action" class="r" />
    </template>

    <tr v-for="row in rows" :key="row.id" :class="{ 'd-cust--open': row.id === selectedId }">
      <td>
        <div class="d-cust__name">{{ row.fullName ?? `Customer ${row.displayRef}` }}</div>
        <div class="who2">{{ [governorateLabel(row.governorate), `joined ${formatRelativeTime(row.submittedAt)}`].filter(Boolean).join(' · ') }}</div>
      </td>

      <td>
        <StatusTag v-if="row.type === 'market_maker'" :label="CUSTOMER_TYPE_LABELS[row.type]" variant="info" />
        <template v-else>{{ CUSTOMER_TYPE_LABELS[row.type] }}</template>
      </td>

      <td>
        <template v-if="row.latestDocument">
          {{ IDENTITY_TYPE_LABELS[row.latestDocument.type] }}
          <div v-if="row.latestDocument.status === 'needs_resubmission'" class="who2">Waiting for a new upload</div>
        </template>

        <span v-else class="d-cust__none">No document</span>
      </td>

      <td>{{ formatRelativeTime(row.latestDocument?.submittedAt ?? row.submittedAt) }}</td>

      <td class="r">
        <DBtn
          :aria-label="`${isReviewable(row) ? 'Review' : 'View'} ${row.fullName ?? row.displayRef}`"
          :aria-pressed="row.id === selectedId"
          :kind="isReviewable(row) && row.id !== selectedId ? 'primary' : 'default'"
          @click="emit('select', row.id)"
        >
          {{ isReviewable(row) ? 'Review' : 'View' }}
        </DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatRelativeTime } from '@/composables/useFormatters'
  import { CUSTOMER_TYPE_LABELS, type CustomerVerification, governorateLabel } from '@/types/customer'
  import { IDENTITY_TYPE_LABELS } from '@/types/identity'

  defineProps<{
    rows: CustomerVerification[]
    selectedId: string | null
  }>()

  const emit = defineEmits<{ (e: 'select', id: string): void }>()

  // A decision is only open while the latest document is pending.
  function isReviewable (row: CustomerVerification): boolean {
    return row.latestDocument?.status === 'pending'
  }
</script>

<style lang="scss" scoped>
.d-cust__name { color: var(--ink); font-weight: 500; }
.d-cust__none { color: var(--ink-3); }
.d-cust--open td { background: var(--gold-bg, rgba(176, 141, 60, .08)); }
</style>
