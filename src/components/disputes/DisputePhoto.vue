<template>
  <div class="d-dph">
    <LoadingState v-if="photo.isPending.value" label="Loading the photo…" />
    <p v-else-if="photo.isError.value" class="d-dph__note">The photo could not be loaded.</p>
    <img v-else-if="photo.data.value" :alt="`Photo ${position} from the customer`" class="d-dph__img" :src="photo.data.value.url">
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, watch } from 'vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useDisputePhotoQuery } from '@/composables/useDisputes'

  // One private photo of a dispute (Backend spec 014): decrypted on request, never cached,
  // each view logged against the viewer.
  const props = defineProps<{ disputeId: string, photoId: string, position: number }>()

  const photo = useDisputePhotoQuery(() => props.disputeId, () => props.photoId)

  let lastUrl: string | null = null
  watch(() => photo.data.value?.url, url => {
    if (lastUrl && lastUrl !== url) URL.revokeObjectURL(lastUrl)
    lastUrl = url ?? null
  })
  onBeforeUnmount(() => {
    if (lastUrl) URL.revokeObjectURL(lastUrl)
  })
</script>

<style lang="scss" scoped>
.d-dph { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--row-head); }
.d-dph__img { display: block; max-width: 100%; max-height: 360px; margin: 0 auto; }
.d-dph__note { margin: 0; font-size: 12.5px; color: var(--ink-3); }
</style>
