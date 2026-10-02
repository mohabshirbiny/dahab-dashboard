<template>
  <DataTable>
    <template #head>
      <th>Piece</th>
      <th>Buyer → Seller</th>
      <th>Place</th>
      <th class="r">Price locked</th>
      <th class="r">Deposit held</th>
      <th>Seller answers by</th>
      <th>State</th>
    </template>

    <tr v-for="r in rows" :key="r.id">
      <td>
        {{ pieceTitle(r.listing.category, r.listing.pieceType.nameEn, r.listing.karat) }}
        <div v-if="r.listing.weightG" class="who2">{{ formatWeight(r.listing.weightG) }} g</div>
      </td>

      <td>
        <RouterLink v-if="canOpenCustomer" :to="{ name: 'customer-file', params: { id: r.buyer.customerId } }">{{ r.buyer.displayRef }}</RouterLink>
        <template v-else>{{ r.buyer.displayRef ?? '—' }}</template>
        →
        <RouterLink v-if="canOpenCustomer" :to="{ name: 'customer-file', params: { id: r.seller.customerId } }">{{ r.seller.displayRef }}</RouterLink>
        <template v-else>{{ r.seller.displayRef ?? '—' }}</template>
      </td>

      <td class="mono">{{ r.placeInLine !== null ? `${r.placeInLine} of ${r.queueLength}` : '—' }}</td>
      <td class="r mono">{{ formatMoney(r.lockedTotalPrice) }}</td>
      <td class="r mono">{{ formatMoney(r.depositAmount) }}</td>

      <td>
        <template v-if="r.state === 'queued'">
          <span :class="{ 'd-brt__soon': r.nearExpiry }">{{ formatDateTime(r.sellerReplyDeadline) }}</span>
          <div v-if="r.nearExpiry" class="who2 d-brt__soon">Close to expiry</div>
        </template>

        <template v-else>—</template>
      </td>

      <td>
        <StatusTag :label="buyRequestStateMeta(r.state).label" :variant="buyRequestStateMeta(r.state).variant" />
        <div v-if="r.orderRef" class="who2 mono">{{ r.orderRef }}</div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { StaffBuyRequest } from '@/types/buyRequest'
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import { formatWeight } from '@/components/listings/listingFormat'
  import DataTable from '@/components/ui/DataTable.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { buyRequestStateMeta } from '@/types/buyRequest'
  import { pieceTitle } from '@/types/order'
  import { PERMISSIONS } from '@/types/staff'

  // Buy requests across listings (Backend spec 012 US10): read-only; buyers and sellers
  // by display reference, linked to the Customer file for holders of customer.view.
  defineProps<{ rows: StaffBuyRequest[] }>()

  const { can } = usePermissions()
  const canOpenCustomer = computed(() => can(PERMISSIONS.customerView))
</script>

<style lang="scss" scoped>
.d-brt__soon { color: var(--warn); font-weight: 500; }
</style>
