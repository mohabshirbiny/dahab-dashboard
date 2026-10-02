<template>
  <div class="d-lob">
    <div class="d-lob__label">Sale</div>

    <KeyValueRow label="Order" :value="order.orderRef" />

    <KeyValueRow label="State">
      <StatusTag :label="cancelled ? 'Cancelled by Dahab' : 'Waiting for the seller to deliver'" :variant="cancelled ? 'off' : 'wait'" />
    </KeyValueRow>

    <KeyValueRow label="Buyer" :value="order.buyer.displayRef" />
    <KeyValueRow label="Branch" :value="order.branch?.nameEn ?? '—'" />
    <KeyValueRow label="Price locked" :value="`${formatMoney(order.lockedTotalPrice)} EGP`" />
    <KeyValueRow v-if="order.depositAmount" :label="cancelled ? 'Deposit refunded' : 'Deposit held'" :value="`${formatMoney(order.depositAmount)} EGP`" />
    <KeyValueRow label="Accepted" :value="formatDateTime(order.acceptedAt)" />

    <KeyValueRow v-if="!cancelled" label="Must reach the branch by">
      <span :class="{ 'd-lob__late': isPast(order.reachBranchDeadline) }">{{ formatDateTime(order.reachBranchDeadline) }}</span>
    </KeyValueRow>

    <template v-if="cancelled">
      <KeyValueRow label="Cancelled" :value="order.cancelledAt ? formatDateTime(order.cancelledAt) : '—'" />
      <div class="d-lob__text">{{ order.cancelReason }}</div>
    </template>

    <div v-if="order.canCancel" class="d-lob__actions">
      <DBtn kind="danger" @click="open = true">Cancel acceptance</DBtn>
    </div>

    <CancelAcceptanceModal
      :listing-id="listingId"
      :open="open"
      :order="order"
      :title="title"
      @close="open = false"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { ListingOrder } from '@/types/listing'
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import CancelAcceptanceModal from './CancelAcceptanceModal.vue'

  // The accepted sale on a piece (Backend spec 011): read-only, plus the one staff action
  // until the orders module exists — cancel the acceptance (order.cancel; the Backend
  // says when it applies: canCancel).
  const props = defineProps<{ order: ListingOrder, listingId: string, title: string }>()

  const open = ref(false)
  const cancelled = computed(() => props.order.state === 'cancelled_staff')
  const isPast = (at: string) => Date.parse(at) < Date.now()
</script>

<style lang="scss" scoped>
.d-lob__label { margin: 14px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-lob__text {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.d-lob__actions { margin-top: 12px; }
.d-lob__late { color: var(--bad); }
</style>
