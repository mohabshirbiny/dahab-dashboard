<template>
  <DataTable>
    <template #head>
      <th>Reference</th>
      <th>What</th>
      <th>Piece</th>
      <th>Raised by</th>
      <th>Age</th>
      <th class="r" />
    </template>

    <tr v-for="r in rows" :key="r.id" :class="{ 'd-rt__on': r.id === selectedId }">
      <td><span class="mono">{{ r.reference }}</span></td>
      <td>{{ r.reasonLabel }}</td>

      <td>
        {{ r.listing.title ?? '—' }}
        <div class="who2">Seller {{ r.listing.sellerRef ?? '—' }}</div>
      </td>

      <td>Anonymous to the seller</td>

      <td>
        <span class="nowrap">{{ formatRelativeTime(r.createdAt) }}</span>
        <div class="who2"><StatusTag :label="reportStateMeta(r.state).label" :variant="reportStateMeta(r.state).variant" /></div>
      </td>

      <td class="r">
        <DBtn :kind="r.id === selectedId ? 'default' : 'primary'" @click="emit('open', r.id)">Open</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { ListingReport } from '@/types/listingReport'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatRelativeTime } from '@/composables/useFormatters'
  import { reportStateMeta } from '@/types/listingReport'

  defineProps<{ rows: ListingReport[], selectedId: string | null }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()
</script>

<style lang="scss" scoped>
.d-rt__on td { background: var(--row-head); }
</style>
