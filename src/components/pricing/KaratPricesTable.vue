<template>
  <DataTable>
    <template #head>
      <th>Karat</th>
      <th class="r">Market bid / ask</th>
      <th class="r">Sellers get</th>
      <th class="r">Buyers pay</th>
      <th class="r">Difference</th>
      <th>Adjustments</th>
      <th v-if="canEdit" aria-label="Action" class="r" />
    </template>

    <tr v-for="row in rows" :key="row.code" :class="{ 'd-kp__off': !row.isEnabled }">
      <td>
        <div class="d-kp__code">
          {{ row.code }}K
          <StatusTag v-if="!row.isEnabled" label="Off" variant="off" />
          <StatusTag v-if="row.inverted" label="Inverted" variant="bad" />
        </div>

        <div class="who2 mono">{{ purityLabel(row.purity) }}</div>
      </td>

      <td class="r mono">{{ formatEgp(row.marketBid) }} / {{ formatEgp(row.marketAsk) }}</td>
      <td class="r mono d-kp__strong">{{ formatEgp(row.sellersGet) }}</td>
      <td class="r mono d-kp__strong">{{ formatEgp(row.buyersPay) }}</td>
      <td class="r mono">{{ formatEgp(row.difference) }}</td>

      <td class="mono">
        <div>Buy {{ formatAdjustment(row.adjustments.buy) }}</div>
        <div>Sell {{ formatAdjustment(row.adjustments.sell) }}</div>
      </td>

      <td v-if="canEdit" class="r">
        <DBtn :aria-label="`Edit ${row.code}K adjustments`" @click="emit('edit', row)">Edit</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { KaratPrice } from '@/types/pricing'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatAdjustment, formatEgp } from '@/types/pricing'
  import { purityPerMille } from '@/types/reference'

  defineProps<{
    rows: readonly KaratPrice[]
    // Only holders of pricing.rates.manage can change adjustments.
    canEdit?: boolean
  }>()

  const emit = defineEmits<{ (e: 'edit', row: KaratPrice): void }>()

  function purityLabel (purity: string): string {
    return purityPerMille(purity)
  }
</script>

<style lang="scss" scoped>
.d-kp__code { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.d-kp__strong { font-weight: 600; }
.d-kp__off td { color: var(--ink-3); }
</style>
