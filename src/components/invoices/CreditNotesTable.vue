<template>
  <DataTable>
    <template #head>
      <th>Credit note</th>
      <th>Reverses</th>
      <th>Why</th>
      <th class="r">Amount</th>
      <th>Date</th>
      <th>By</th>
      <th class="r" />
    </template>

    <tr v-for="n in rows" :key="n.id">
      <td class="mono">{{ n.number }}</td>
      <td class="mono">{{ n.invoiceNumber }}</td>
      <td>{{ n.reason }}</td>
      <td class="r mono">− {{ formatMoney(n.gross) }}</td>
      <td class="nowrap">{{ formatDate(n.issuedAt, true) }}</td>
      <td>{{ n.issuedBy?.name ?? '—' }}</td>
      <td class="r"><DBtn :loading="opening === n.id" @click="emit('pdf', n)">PDF</DBtn></td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { CreditNote } from '@/types/invoice'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  // The credit notes list (Backend spec 016 FR-014): each reverses an invoice that was issued.
  defineProps<{ rows: CreditNote[], opening?: string | null }>()
  const emit = defineEmits<{ (e: 'pdf', note: CreditNote): void }>()
</script>
