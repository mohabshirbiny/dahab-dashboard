<template>
  <DataTable>
    <template #head>
      <th>Piece</th>
      <th>Seller</th>
      <th class="r">Asking</th>
      <th>{{ queue === 'in_review' ? 'Waiting' : 'Since' }}</th>
      <th class="r" />
    </template>

    <tr v-for="l in rows" :key="l.id" :class="{ 'd-lq__on': l.id === selectedId }">
      <td>
        {{ listingTitle(l) }}<template v-if="l.statedWeightG"> · {{ formatWeight(l.statedWeightG) }} g</template>
        <div class="who2">{{ l.makingChargePerG ? `Making charge ${formatMoney(l.makingChargePerG)}/g` : 'Set price' }}</div>
      </td>

      <td>
        {{ l.seller.displayRef }}
        <div v-if="l.seller.status === 'suspended'" class="who2 d-lq__warn">Suspended</div>
        <div v-else-if="l.seller.fullName" class="who2">{{ l.seller.fullName }}</div>
      </td>

      <td class="r mono">
        {{ formatMoney(l.currentPrice) }}
        <div v-if="!l.priceAvailable" class="who2">No price now</div>
      </td>

      <td>
        <StatusTag v-if="queue === 'in_review'" :label="waiting(l.stateChangedAt).label" :variant="waiting(l.stateChangedAt).variant" />
        <template v-else>{{ formatRelativeTime(l.stateChangedAt) }}</template>
      </td>

      <td class="r">
        <DBtn :kind="queue === 'in_review' && l.id !== selectedId ? 'primary' : 'default'" @click="emit('open', l.id)">
          {{ queue === 'in_review' ? 'Review' : 'Open' }}
        </DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Listing, ListingQueue } from '@/types/listing'
  import type { StatusVariant } from '@/types/status'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatMoney, formatRelativeTime } from '@/composables/useFormatters'
  import { listingTitle } from '@/types/listing'
  import { formatWeight } from './listingFormat'

  defineProps<{ rows: Listing[], queue: ListingQueue, selectedId: string | null }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()

  // "2 days" in red, "6 hours" in amber, "3 hours" in blue: how long a seller has waited.
  function waiting (since: string): { label: string, variant: StatusVariant } {
    const hours = Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 3_600_000))
    if (hours < 1) return { label: 'Just now', variant: 'info' }
    if (hours < 24) return { label: `${hours} ${hours === 1 ? 'hour' : 'hours'}`, variant: hours >= 6 ? 'wait' : 'info' }
    const days = Math.floor(hours / 24)
    return { label: `${days} ${days === 1 ? 'day' : 'days'}`, variant: days >= 2 ? 'bad' : 'wait' }
  }
</script>

<style lang="scss" scoped>
.d-lq__on td { background: var(--row-head); }
.d-lq__warn { color: var(--bad); }
</style>
