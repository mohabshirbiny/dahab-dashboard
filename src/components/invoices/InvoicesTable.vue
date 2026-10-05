<template>
  <DataTable>
    <template #head>
      <th>Number</th>
      <th>Date</th>
      <th>Order</th>
      <th>Party</th>
      <th>Customer</th>
      <th class="r">Net</th>
      <th class="r">VAT</th>
      <th>Status</th>
      <th class="r" />
    </template>

    <tr v-for="i in rows" :key="i.id">
      <td class="mono">{{ i.number }}</td>
      <td class="nowrap">{{ formatDate(i.issuedAt, true) }}</td>
      <td class="mono">{{ i.orderRef }}</td>
      <td>{{ i.party === 'seller' ? 'Seller' : 'Buyer' }}</td>

      <td>
        <span class="mono">{{ i.customer.displayRef ?? '—' }}</span>
        <div class="who2">{{ i.customer.name ?? '' }}</div>
      </td>

      <td class="r mono">
        {{ formatMoney(i.net) }}
        <div class="who2">{{ i.party === 'seller' ? 'Commission' : 'Price paid' }}</div>
      </td>

      <td class="r mono">{{ formatMoney(i.vat) }}</td>

      <td>
        <StatusTag :label="statusLabel(i.status)" :variant="statusVariant(i.status)" />
        <div v-if="i.status === 'partly_credited'" class="who2">{{ formatMoney(i.credited) }} credited</div>
      </td>

      <td class="r"><DBtn @click="emit('open', i.id)">View</DBtn></td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { InvoiceStatus, InvoiceSummary } from '@/types/invoice'
  import type { StatusVariant } from '@/types/status'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'
  import { INVOICE_STATUSES } from '@/types/invoice'

  // The invoices list (Backend spec 016 FR-010): the design's Tax Authority column is the
  // invoice's own status here — e-invoicing is not connected, so no filing status exists.
  defineProps<{ rows: InvoiceSummary[] }>()
  const emit = defineEmits<{ (e: 'open', id: string): void }>()

  const statusLabel = (s: InvoiceStatus) => INVOICE_STATUSES.find(x => x.value === s)?.label ?? s
  const statusVariant = (s: InvoiceStatus): StatusVariant => (s === 'issued' ? 'ok' : (s === 'credited' ? 'info' : 'wait'))
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
