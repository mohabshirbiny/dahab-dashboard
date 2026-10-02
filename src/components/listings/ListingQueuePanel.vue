<template>
  <div class="d-lqp">
    <div class="d-lqp__label">Buyers in line</div>

    <EmptyState v-if="queue.length === 0" title="Nobody is in line" />

    <table v-else class="d-lqp__table">
      <thead>
        <tr>
          <th>#</th>
          <th>Buyer</th>
          <th class="r">Locked price</th>
          <th class="r">Deposit held</th>
          <th>Seller must reply by</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="item in queue" :key="item.id">
          <td>{{ item.placeInLine }}</td>
          <td class="mono">{{ item.buyer.displayRef }}</td>
          <td class="r mono">{{ formatMoney(item.lockedTotalPrice) }}</td>
          <td class="r mono">{{ formatMoney(item.depositAmount) }}</td>

          <td>
            <span :class="{ 'd-lqp__late': isPast(item.sellerReplyDeadline) }">{{ formatDateTime(item.sellerReplyDeadline) }}</span>
            <span v-if="isPast(item.sellerReplyDeadline)" class="who2"> · overdue, released within a minute</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="queue.length > 0" class="who2 d-lqp__foot">
      The seller answers the first in line. Each buyer's deposit stays theirs, held until the seller answers, they leave, or the reply time passes.
    </p>
  </div>
</template>

<script lang="ts" setup>
  import type { ListingQueueItem } from '@/types/listing'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'

  // The line on a piece (Backend spec 011 FR-025), read-only: staff follow it, the seller
  // answers it in the app. Buyers appear by their reference only.
  defineProps<{ queue: ListingQueueItem[] }>()

  const isPast = (at: string) => Date.parse(at) < Date.now()
</script>

<style lang="scss" scoped>
.d-lqp__label { margin: 14px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-lqp__table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.d-lqp__table th { text-align: left; font-weight: 500; color: var(--ink-2); padding: 6px 4px; border-bottom: 1px solid var(--line); }
.d-lqp__table td { padding: 7px 4px; border-bottom: 1px solid var(--line); }
.d-lqp__table .r { text-align: right; }
.d-lqp__late { color: var(--bad); }
.d-lqp__foot { margin: 8px 0 0; }
</style>
