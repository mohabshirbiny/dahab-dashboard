<template>
  <DataTable>
    <template #head>
      <th>Day</th>
      <th class="r">Bank</th>
      <th class="r">Books</th>
      <th class="r">Difference</th>
      <th>Closed by</th>
    </template>

    <tr v-for="c in rows" :key="c.date">
      <td class="nowrap">{{ formatDate(c.date, true) }}</td>
      <td class="r mono">{{ formatMoney(c.bankBalance) }}</td>
      <td class="r mono">{{ formatMoney(c.booksBank) }}</td>
      <td class="r mono" :class="{ 'd-rc__bad': Number(c.difference) !== 0 }">{{ formatMoney(c.difference) }}</td>

      <td>
        <template v-if="c.isLocked">{{ c.closedBy?.name ?? '—' }}</template>
        <StatusTag v-else label="Saved, not closed" variant="wait" />
        <div v-if="c.explanation" class="who2">{{ c.explanation }}</div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { DailyClose } from '@/types/finance'
  import DataTable from '@/components/ui/DataTable.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  defineProps<{ rows: DailyClose[] }>()
</script>

<style lang="scss" scoped>
.d-rc__bad { color: var(--bad); }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
