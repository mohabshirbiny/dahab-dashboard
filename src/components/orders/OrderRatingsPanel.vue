<template>
  <div class="d-orp__label">Ratings</div>

  <div v-if="ratings.length === 0" class="d-orp__empty">Nobody has rated this order yet.</div>

  <div v-for="r in ratings" :key="r.partyRole" class="d-orp__row">
    <div class="d-orp__head">
      <span class="d-orp__who">{{ r.partyRole === 'seller' ? 'Seller' : 'Buyer' }}</span>
      <span :aria-label="`${r.stars} out of 5 stars`" class="d-orp__stars">{{ '★'.repeat(r.stars) }}{{ '☆'.repeat(5 - r.stars) }}</span>
      <span class="d-orp__date">{{ formatDateTime(r.createdAt) }}</span>
    </div>

    <div v-if="r.note" class="d-orp__note">{{ r.note }}</div>
  </div>
</template>

<script lang="ts" setup>
  import type { OrderRating } from '@/types/order'
  import { formatDateTime } from '@/composables/useFormatters'

  // Spec 018 (Backend, rating.view): each party's one rating of the experience with Dahab.
  // Immutable and read-only: no score is computed and nothing here acts on a customer.
  defineProps<{ ratings: OrderRating[] }>()
</script>

<style lang="scss" scoped>
.d-orp__label { margin: 16px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-orp__empty { font-size: 12.5px; color: var(--ink-3); }
.d-orp__row { padding: 8px 0; border-bottom: 1px solid var(--line); }
.d-orp__row:last-child { border-bottom: 0; }
.d-orp__head { display: flex; gap: 10px; align-items: baseline; }
.d-orp__who { font-weight: 500; }
.d-orp__stars { letter-spacing: 1px; }
.d-orp__date { margin-inline-start: auto; font-size: 11px; color: var(--ink-3); }
.d-orp__note {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
</style>
