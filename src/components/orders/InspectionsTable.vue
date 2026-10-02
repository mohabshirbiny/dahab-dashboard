<template>
  <DataTable>
    <template #head>
      <th>Order and piece</th>
      <th>Received</th>
      <th>Stated vs measured</th>
      <th class="r">Difference</th>
      <th>Outcome</th>
    </template>

    <tr v-for="r in rows" :key="r.id" :class="{ 'd-it__old': r.superseded }">
      <td>
        <span class="mono">{{ r.orderRef ?? '—' }}</span>
        {{ r.piece ? pieceTitle(r.piece.category, r.piece.pieceType.nameEn, r.statedKarat) : '' }}
        <div class="who2">Seller {{ r.sellerRef ?? '—' }} · {{ r.branch.nameEn ?? '—' }}</div>
      </td>

      <td>
        {{ r.receivedAt ? formatDateTime(r.receivedAt) : '—' }}
        <div class="who2">Result {{ formatDateTime(r.inspectedAt) }}</div>
      </td>

      <td class="mono">
        {{ stated(r) }}
        <div class="who2">Measured {{ measured(r) }}</div>
      </td>

      <td class="r mono">{{ formatPct(r.weightDiffPct) }}</td>

      <td>
        <StatusTag :label="outcomeMeta(r.outcome).label" :variant="outcomeMeta(r.outcome).variant" />
        <div v-if="r.superseded" class="who2">Corrected later</div>
        <div v-else-if="r.supersedesId" class="who2">A correction</div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { InspectionRow } from '@/types/order'
  import { formatWeight } from '@/components/listings/listingFormat'
  import DataTable from '@/components/ui/DataTable.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { outcomeMeta, pieceTitle } from '@/types/order'
  import { formatPct } from './orderFormat'

  // Inspection results (Backend spec 012 FR-022): newest first, measurements only.
  defineProps<{ rows: InspectionRow[] }>()

  function stated (r: InspectionRow): string {
    const parts = [r.statedKarat === null ? null : `${r.statedKarat}K`, r.statedWeightG ? `${formatWeight(r.statedWeightG)} g` : null].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : '—'
  }

  function measured (r: InspectionRow): string {
    const parts = [
      r.measuredKarat === null ? null : `${r.measuredKarat}K`,
      r.measuredWeightG ? `${formatWeight(r.measuredWeightG)} g` : null,
      r.measuredStoneGrade,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : '—'
  }
</script>

<style lang="scss" scoped>
.d-it__old td { opacity: .6; }
</style>
