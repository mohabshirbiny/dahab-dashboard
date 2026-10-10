<template>
  <template v-if="relistedFrom">
    <div class="d-frp__label">Free relist</div>

    <KeyValueRow label="This sale is a free relist of">
      <RouterLink :to="{ name: 'orders', query: { id: relistedFrom.id } }">{{ relistedFrom.orderRef }}</RouterLink>
    </KeyValueRow>

    <div class="d-frp__text">No commission on this sale. The buy and sell difference still applies and only the buyer gets an invoice.</div>
  </template>

  <template v-if="freeRelist && freeRelist.status !== 'none'">
    <div class="d-frp__label">Free relist offer</div>

    <KeyValueRow label="Offer">
      <StatusTag :label="freeRelistMeta(freeRelist.status).label" :variant="freeRelistMeta(freeRelist.status).variant" />
    </KeyValueRow>

    <KeyValueRow v-if="freeRelist.endsAt" :label="freeRelist.status === 'open' ? 'Open until' : 'Window ended'" :value="formatDateTime(freeRelist.endsAt)" />

    <KeyValueRow v-if="freeRelist.listing" label="Relisted as">
      <RouterLink :to="{ name: 'listings', query: { id: freeRelist.listing.id } }">{{ freeRelist.listing.title ?? 'Open the listing' }}</RouterLink>
    </KeyValueRow>
  </template>
</template>

<script lang="ts" setup>
  import type { FreeRelist } from '@/types/order'
  import { RouterLink } from 'vue-router'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { freeRelistMeta } from '@/types/order'

  // Spec 018 (Backend, order.view): the buyer's 0% relist offer of a collected piece, and the
  // line on the order of a piece that was itself relisted. Read-only — staff never act on offers.
  defineProps<{
    freeRelist: FreeRelist | null
    relistedFrom: { id: string, orderRef: string } | null
  }>()
</script>

<style lang="scss" scoped>
.d-frp__label { margin: 16px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-frp__text {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
}
</style>
