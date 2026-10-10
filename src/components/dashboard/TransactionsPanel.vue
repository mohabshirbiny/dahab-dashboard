<template>
  <Panel subtitle="Open orders, and the last 30 days" title="Transactions">
    <template #actions>
      <DBtn :loading="exporting.isPending.value" @click="exportGroup('all')">Export to Excel</DBtn>
    </template>

    <EmptyState v-if="rows.length === 0" title="No orders yet" />

    <DataTable v-else>
      <template #head>
        <th>Status</th>
        <th class="r">Count</th>
        <th class="r">Value</th>
        <th class="r">Held now</th>
        <th />
      </template>

      <tr v-for="row in rows" :key="row.status">
        <td><StatusTag :label="row.status" :variant="row.statusVariant" /></td>
        <td class="r mono">{{ formatNumber(row.count) }}</td>
        <td class="r mono">{{ formatMoney(row.value) }}</td>
        <td class="r mono">{{ row.heldNow === null ? '—' : formatMoney(row.heldNow) }}</td>

        <td class="r">
          <DBtn @click="onAction(row)">{{ row.action.label }}</DBtn>
        </td>
      </tr>
    </DataTable>

    <NoteBanner v-if="note" class="d-tp__note" variant="bad">{{ note }}</NoteBanner>
  </Panel>
</template>

<script lang="ts" setup>
  import type { OrderGroup } from '@/types/order'
  import type { TransactionRow } from '@/types/overview'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { financeErrorMessage } from '@/components/finance/financeErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatMoney, formatNumber } from '@/composables/useFormatters'
  import { useExportOrders } from '@/composables/useOrders'

  // Orders by state from the Backend (spec 015 FR-016); the exports are the Orders export.
  defineProps<{ rows: TransactionRow[] }>()

  const router = useRouter()
  const exporting = useExportOrders()
  const note = ref('')

  function exportGroup (group: OrderGroup) {
    note.value = ''
    exporting.mutate({ group, pastDeadline: false, branchId: null, q: '', freeRelist: null }, {
      onSuccess: result => {
        note.value = result.truncated ? 'The file stopped at the export limit. Use the filters on Orders to get the rest.' : ''
      },
      onError: error => {
        note.value = financeErrorMessage(error)
      },
    })
  }

  function onAction (row: TransactionRow) {
    if (row.action.kind === 'link') {
      router.push(row.action.target)
    } else {
      exportGroup(row.action.target as OrderGroup)
    }
  }
</script>

<style lang="scss" scoped>
.d-tp__note { margin: 12px 16px; }
</style>
