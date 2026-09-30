<template>
  <div>
    <p v-if="photos.length === 0" class="who2">No photos attached.</p>

    <div v-else class="d-lmg__photos">
      <ListingPhotoThumb
        v-for="(photo, index) in photos"
        :key="photo.id"
        :index="index"
        :listing-id="listingId"
        :media-id="photo.id"
        @open="opened = photo"
      />
    </div>

    <div v-if="files.length > 0" class="d-lmg__files">
      <button
        v-for="file in files"
        :key="file.id"
        class="d-lmg__file"
        type="button"
        @click="opened = file"
      >
        <b>{{ LISTING_MEDIA_LABELS[file.kind] }}</b>
        <span class="who2">{{ file.isPrivate ? 'Buyers never see this' : (file.kind === 'video' ? 'Check the piece turns and every side shows' : 'Shown to buyers') }}</span>
      </button>
    </div>

    <ListingMediaPreview :listing-id="listingId" :media="opened" @close="opened = null" />
  </div>
</template>

<script lang="ts" setup>
  import type { ListingMedia } from '@/types/listing'
  import { computed, ref, watch } from 'vue'
  import { LISTING_MEDIA_LABELS } from '@/types/listing'
  import ListingMediaPreview from './ListingMediaPreview.vue'
  import ListingPhotoThumb from './ListingPhotoThumb.vue'

  // The photos of a listing as thumbnails, and its video, invoice and certificate as
  // buttons that open at full size (Backend spec 010).
  const props = defineProps<{ listingId: string, media: ListingMedia[] }>()

  const photos = computed(() => props.media.filter(m => m.kind === 'photo'))
  const files = computed(() => props.media.filter(m => m.kind !== 'photo'))

  const opened = ref<ListingMedia | null>(null)
  watch(() => props.listingId, () => {
    opened.value = null
  })
</script>

<style lang="scss" scoped>
.d-lmg__photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.d-lmg__files { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 14px; }
.d-lmg__file {
  display: grid;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  text-align: left;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-lmg__file:hover { border-color: var(--ink-3); }
.d-lmg__file:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
</style>
