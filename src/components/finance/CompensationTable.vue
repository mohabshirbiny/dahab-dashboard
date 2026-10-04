<template>
  <DataTable>
    <template #head>
      <th>When</th>
      <th>Wallet</th>
      <th class="r">Amount</th>
      <th>Reason</th>
      <th>By</th>
    </template>

    <tr v-for="c in rows" :key="c.id">
      <td class="nowrap">{{ formatDate(c.paidAt, true) }}</td>

      <td>
        <span class="mono">{{ c.customer.displayRef ?? '—' }}</span>
        <div class="who2">{{ c.customer.name ?? '' }}</div>
      </td>

      <td class="r mono">{{ formatMoney(c.amount) }}</td>

      <td>
        {{ c.reasonLabel }}
        <div class="who2">
          <template v-if="c.dispute">{{ c.dispute.ref }}<template v-if="c.order"> · {{ c.order.ref }}</template></template>
          <template v-else-if="c.order">{{ c.order.ref }}</template>
          <template v-else>Paid outside a dispute</template>
        </div>

        <div class="who2">{{ c.note }}</div>
      </td>

      <td>{{ c.paidBy.name ?? '—' }}</td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Compensation } from '@/types/finance'
  import DataTable from '@/components/ui/DataTable.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  defineProps<{ rows: Compensation[] }>()
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
