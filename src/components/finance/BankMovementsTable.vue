<template>
  <DataTable>
    <template #head>
      <th>Date</th>
      <th>What</th>
      <th class="r">In</th>
      <th class="r">Out</th>
      <th>By</th>
    </template>

    <tr v-for="m in rows" :key="m.id">
      <td class="nowrap">{{ formatDate(m.occurredOn, true) }}</td>

      <td>
        {{ m.kindLabel }}
        <div class="who2">{{ m.reason }}</div>

        <div class="who2">
          <span class="mono">{{ m.number }}</span>
          <template v-if="!m.postsToLedger"> · for the record only</template>
          <template v-if="m.hasProof"> · <a href="#" @click.prevent="emit('proof', m.id)">Proof</a></template>
        </div>
      </td>

      <td class="r mono">{{ m.direction === 'in' ? formatMoney(m.amount) : '—' }}</td>
      <td class="r mono">{{ m.direction === 'out' ? formatMoney(m.amount) : '—' }}</td>
      <td>{{ m.recordedBy.name ?? '—' }}</td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { BankMovement } from '@/types/finance'
  import DataTable from '@/components/ui/DataTable.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  defineProps<{ rows: BankMovement[] }>()
  const emit = defineEmits<{ (e: 'proof', id: string): void }>()
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
