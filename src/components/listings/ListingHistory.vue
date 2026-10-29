<template>
  <ol class="d-lh">
    <li v-for="(entry, index) in newestFirst" :key="index" class="d-lh__row">
      <div class="d-lh__what">
        {{ entry.fromState === null ? 'Created' : listingStateMeta(entry.toState).label }}
        <span class="who2">· {{ entry.actor.type === 'staff' ? (entry.actor.name ?? 'Staff') : 'Seller' }} · {{ formatDateTime(entry.changedAt) }}</span>
      </div>

      <div v-if="noteOf(entry)" class="d-lh__note">{{ noteOf(entry) }}</div>
    </li>
  </ol>
</template>

<script lang="ts" setup>
  import type { ListingHistoryEntry } from '@/types/listing'
  import { computed } from 'vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { listingStateMeta } from '@/types/listing'

  // Every move of a listing, newest first (the Backend sends them oldest first), with who
  // made it and what they wrote (Backend spec 010: listing_state_change).
  const props = defineProps<{ history: ListingHistoryEntry[] }>()
  const newestFirst = computed(() => props.history.map((_, i, all) => all[all.length - 1 - i]!))

  // The suspension hold writes fixed notes; say them in plain words.
  function noteOf (entry: ListingHistoryEntry): string | null {
    if (entry.note === 'account_suspended') return 'The seller was suspended.'
    if (entry.note === 'account_reinstated') return 'The seller was reinstated.'
    return entry.note
  }
</script>

<style lang="scss" scoped>
.d-lh { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.d-lh__row { font-size: 12.5px; }
.d-lh__what { font-weight: 500; }
.d-lh__what .who2 { font-weight: 400; }
.d-lh__note {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--bg);
  color: var(--ink-2);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
