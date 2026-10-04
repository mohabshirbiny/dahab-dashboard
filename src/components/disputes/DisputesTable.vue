<template>
  <DataTable>
    <template #head>
      <th>Reference</th>
      <th>What</th>
      <th>Raised by</th>
      <th>Assigned</th>
      <th>Age</th>
      <th class="r" />
    </template>

    <tr v-for="d in rows" :key="d.id" :class="{ 'd-dt__on': d.id === selectedId }">
      <td>
        <span class="mono">{{ d.ref }}</span>
        <div class="who2">Order {{ d.order.ref ?? '—' }}</div>
      </td>

      <td>{{ d.reasonLabel }}</td>

      <td>
        {{ d.raisedAs === 'buyer' ? 'Buyer' : 'Seller' }} {{ d.raisedBy.displayRef ?? '—' }}
      </td>

      <td>{{ d.assignedTo?.name ?? '—' }}</td>

      <td>
        <span class="nowrap">{{ ageLabel(d.ageSeconds) }}</span>
        <div class="who2"><StatusTag :label="disputeStateMeta(d.state).label" :variant="disputeStateMeta(d.state).variant" /></div>
      </td>

      <td class="r">
        <DBtn :kind="d.id === selectedId ? 'default' : 'primary'" @click="emit('open', d.id)">Open</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Dispute } from '@/types/dispute'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { disputeStateMeta } from '@/types/dispute'

  defineProps<{ rows: Dispute[], selectedId: string | null }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()

  // "14h", "3 days" — how long the order has been frozen.
  function ageLabel (seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    if (hours < 1) return `${Math.max(1, Math.floor(seconds / 60))}m`
    if (hours < 48) return `${hours}h`
    return `${Math.floor(hours / 24)} days`
  }
</script>

<style lang="scss" scoped>
.d-dt__on td { background: var(--row-head); }
</style>
