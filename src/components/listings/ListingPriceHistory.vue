<template>
  <ol class="d-lph">
    <li v-for="(change, index) in newestFirst" :key="index" class="d-lph__row">
      <div class="d-lph__what">
        {{ FIELD_LABELS[change.field] }} {{ formatMoney(change.oldValue) }} → {{ formatMoney(change.newValue) }}{{ change.field === 'making_charge_per_g' ? ' /g' : '' }}
      </div>

      <div class="who2">
        {{ change.actor.type === 'staff' ? (change.actor.name ?? 'Staff') : 'Seller' }} · {{ formatDateTime(change.changedAt) }}
      </div>
    </li>
  </ol>
</template>

<script lang="ts" setup>
  import type { ListingPriceChange, ListingPriceField } from '@/types/listing'
  import { computed } from 'vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'

  // The seller's price changes while the piece was live, newest first (the Backend sends them
  // oldest first; Backend spec 022: listing_price_change). Read-only; nobody on staff changes a price.
  const props = defineProps<{ changes: ListingPriceChange[] }>()
  const newestFirst = computed(() => props.changes.map((_, i, all) => all[all.length - 1 - i]!))

  const FIELD_LABELS: Record<ListingPriceField, string> = {
    making_charge_per_g: 'Making charge',
    asking_price: 'Asking price',
  }
</script>

<style lang="scss" scoped>
.d-lph { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.d-lph__row { font-size: 12.5px; }
.d-lph__what { font-weight: 500; }
</style>
