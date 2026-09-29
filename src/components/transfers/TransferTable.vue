<template>
  <DataTable>
    <template #head>
      <th>Received</th>
      <th class="r">Amount</th>
      <th>From</th>
      <th>Reference</th>
      <th>Status</th>
      <th class="r" />
    </template>

    <tr v-for="t in rows" :key="t.id">
      <td>
        {{ formatDateTime(t.submittedAt) }}
        <div class="who2">{{ t.number }}{{ t.origin === 'by_hand' ? ' · by hand' : '' }}</div>
      </td>

      <td class="r mono d-tt__amount">
        {{ formatMoney(t.creditedAmount ?? t.claimedAmount) }}
        <div v-if="t.creditedAmount && t.claimedAmount && t.creditedAmount !== t.claimedAmount" class="who2">claimed {{ formatMoney(t.claimedAmount) }}</div>
        <div v-else-if="t.expectedAmount" class="who2">≈ {{ formatMoney(t.expectedAmount) }} after the fee</div>
      </td>

      <td>
        {{ TOPUP_METHOD_LABELS[t.method] }}
        <div class="who2">
          Wallet {{ t.customer.displayRef }}<template v-if="t.customer.fullName"> · {{ t.customer.fullName }}</template>
        </div>
      </td>

      <td class="mono">
        {{ t.reference }}
        <div v-if="t.hasReceipt" class="who2">Receipt attached</div>
      </td>

      <td>
        <StatusTag :label="TOPUP_STATUS_META[t.status].label" :variant="TOPUP_STATUS_META[t.status].variant" />
        <div v-if="t.customer.status === 'suspended'" class="who2 d-tt__warn">Customer suspended</div>
      </td>

      <td class="r">
        <DBtn :kind="t.allowedActions.includes('match') ? 'primary' : 'default'" @click="emit('open', t.id)">
          {{ t.allowedActions.includes('match') ? 'Check and match' : 'Open' }}
        </DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { TopUp } from '@/types/topup'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { TOPUP_METHOD_LABELS, TOPUP_STATUS_META } from '@/types/topup'

  defineProps<{ rows: TopUp[] }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()
</script>

<style lang="scss" scoped>
.d-tt__amount { font-weight: 600; color: var(--ink); }
.d-tt__warn { color: var(--bad); }
</style>
