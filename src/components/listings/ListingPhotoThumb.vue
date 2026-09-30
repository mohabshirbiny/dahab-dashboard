<template>
  <button :aria-label="`Open photo ${index + 1}`" class="d-lpt" type="button" @click="emit('open')">
    <img v-if="file.data.value" :alt="`Photo ${index + 1}`" class="d-lpt__img" :src="file.data.value.url">
    <span v-else-if="file.isError.value" class="d-lpt__text">Could not load</span>
    <span v-else class="d-lpt__text">Loading…</span>
  </button>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, watch } from 'vue'
  import { useListingMediaQuery } from '@/composables/useListings'

  // One photo of a listing, small (Backend spec 010). Click opens it at full size.
  const props = defineProps<{ listingId: string, mediaId: string, index: number }>()
  const emit = defineEmits<{ (e: 'open'): void }>()

  const file = useListingMediaQuery(() => props.listingId, () => props.mediaId, 'thumb')

  let lastUrl: string | null = null
  watch(() => file.data.value?.url, url => {
    if (lastUrl && lastUrl !== url) URL.revokeObjectURL(lastUrl)
    lastUrl = url ?? null
  })
  onBeforeUnmount(() => {
    if (lastUrl) URL.revokeObjectURL(lastUrl)
  })
</script>

<style lang="scss" scoped>
.d-lpt {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  overflow: hidden;
  cursor: zoom-in;
}
.d-lpt:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.d-lpt__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.d-lpt__text { font-size: 11px; color: var(--ink-3); }
</style>
