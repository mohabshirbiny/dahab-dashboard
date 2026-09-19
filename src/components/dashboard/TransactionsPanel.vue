<template>
  <Panel title="Transactions" subtitle="Last 30 days">
    <template #actions>
      <DBtn @click="onExport">Export to Excel</DBtn>
    </template>
    <DataTable>
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
        <td class="r mono">{{ formatNumber(row.value) }}</td>
        <td class="r mono">{{ row.heldNow === null ? '—' : formatNumber(row.heldNow) }}</td>
        <td class="r">
          <DBtn @click="onAction(row)">{{ row.action.label }}</DBtn>
        </td>
      </tr>
    </DataTable>
  </Panel>
</template>

<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import Panel from '@/components/ui/Panel.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import { formatNumber } from '@/composables/useFormatters'
  import { useToast } from '@/composables/useToast'
  import type { TransactionRow } from '@/types/overview'

  defineProps<{ rows: TransactionRow[] }>()

  const router = useRouter()
  const { exportToExcel } = useToast()

  function onExport () {
    exportToExcel('transactions')
  }
  function onAction (row: TransactionRow) {
    if (row.action.kind === 'link') {
      router.push(row.action.target)
    } else {
      exportToExcel(row.action.target)
    }
  }
</script>
