<template>
  <DataTable>
    <template #head>
      <th>Order</th>
      <th>Piece</th>
      <th>Seller → Buyer</th>
      <th class="r">Value</th>
      <th class="r">Held</th>
      <th>Stage</th>
      <th>Deadline</th>
      <th class="r" />
    </template>

    <tr v-for="o in rows" :key="o.id" :class="{ 'd-ot__on': o.id === selectedId }">
      <td class="mono">{{ o.orderRef }}</td>

      <td class="nowrap">
        {{ pieceTitle(o.piece.category, o.piece.pieceType.nameEn, o.piece.karat) }}
        <div v-if="o.piece.weightG" class="who2">{{ formatWeight(o.piece.weightG) }} g</div>
      </td>

      <td class="nowrap">{{ o.seller.displayRef ?? '—' }} → {{ o.buyer.displayRef ?? '—' }}</td>

      <td class="r mono">{{ formatMoney(o.value) }}</td>
      <td class="r mono">{{ formatMoney(o.held) }}</td>

      <td>
        <StatusTag :label="orderStateMeta(o.state).label" :variant="orderStateMeta(o.state).variant" />
        <div v-if="o.hasWaitingExtension" class="who2">More time asked</div>
        <div v-if="o.freeRelistStatus && o.freeRelistStatus !== 'none'" class="who2">Free relist · {{ freeRelistMeta(o.freeRelistStatus).label.toLowerCase() }}</div>
      </td>

      <td>
        <template v-if="o.deadline">
          <span class="nowrap" :class="{ 'd-ot__late': o.deadline.overdue }">{{ o.deadline.overdue ? 'Passed' : formatDateTime(o.deadline.at) }}</span>
          <div class="who2">{{ DEADLINE_LABELS[o.deadline.kind] ?? o.deadline.kind }}</div>
        </template>

        <template v-else>—</template>
      </td>

      <td class="r">
        <DBtn :kind="o.id === selectedId ? 'default' : 'primary'" @click="emit('open', o.id)">Open</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Order } from '@/types/order'
  import { formatWeight } from '@/components/listings/listingFormat'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { DEADLINE_LABELS, freeRelistMeta, orderStateMeta, pieceTitle } from '@/types/order'

  defineProps<{ rows: Order[], selectedId: string | null }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()
</script>

<style lang="scss" scoped>
.d-ot__on td { background: var(--row-head); }
.d-ot__late { color: var(--bad); font-weight: 500; }
</style>
