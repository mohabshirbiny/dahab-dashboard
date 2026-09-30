<template>
  <DModal :max-width="860" :model-value="media !== null" :title="title" @update:model-value="emit('close')">
    <LoadingState v-if="file.isPending.value" label="Loading the file…" />
    <p v-else-if="file.isError.value" class="d-lmp__note">The file could not be loaded.</p>

    <template v-else-if="file.data.value">
      <!-- eslint-disable-next-line vuejs-accessibility/media-has-caption -- a seller's own clip of the piece; there is no speech to caption -->
      <video v-if="file.data.value.type.startsWith('video/')" class="d-lmp__video" controls :src="file.data.value.url" />
      <iframe v-else-if="file.data.value.type === 'application/pdf'" class="d-lmp__pdf" :src="file.data.value.url" :title="title" />
      <img v-else :alt="title" class="d-lmp__img" :src="file.data.value.url">

      <a class="d-lmp__open" :href="file.data.value.url" rel="noopener" target="_blank">Open in a new tab</a>
    </template>

    <p v-if="media?.isPrivate" class="who2 d-lmp__private">Buyers never see this.</p>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ListingMedia } from '@/types/listing'
  import { computed, onBeforeUnmount, watch } from 'vue'
  import DModal from '@/components/ui/DModal.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useListingMediaQuery } from '@/composables/useListings'
  import { LISTING_MEDIA_LABELS } from '@/types/listing'

  // One file of a listing at full size (Backend spec 010). The Backend decrypts it for
  // staff with a listing permission and never lets it be cached.
  const props = defineProps<{ listingId: string, media: ListingMedia | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const title = computed(() => (props.media ? LISTING_MEDIA_LABELS[props.media.kind] : ''))
  const file = useListingMediaQuery(() => props.listingId, () => props.media?.id ?? null, 'full')

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
.d-lmp__img { display: block; max-width: 100%; margin: 0 auto; border-radius: 8px; }
.d-lmp__video { display: block; width: 100%; max-height: 70vh; border-radius: 8px; background: #000; }
.d-lmp__pdf { width: 100%; height: 70vh; border: 0; }
.d-lmp__note { margin: 0; font-size: 12.5px; color: var(--ink-3); }
.d-lmp__open { display: inline-block; margin-top: 8px; font-size: 12px; color: var(--ink-2); }
.d-lmp__private { margin: 8px 0 0; }
</style>
