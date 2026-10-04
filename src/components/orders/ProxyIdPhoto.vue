<template>
  <div class="d-pxp">
    <LoadingState v-if="photo.isPending.value" label="Loading the ID photo…" />
    <p v-else-if="photo.isError.value" class="d-pxp__note">The ID photo could not be loaded.</p>
    <img v-else-if="photo.data.value" alt="ID of the person collecting" class="d-pxp__img" :src="photo.data.value.url">
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, watch } from 'vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useProxyIdQuery } from '@/composables/useOrders'

  // The ID photo of the person the buyer named to collect (Backend spec 014): decrypted on
  // request, never cached, each view logged against the viewer.
  const props = defineProps<{ orderId: string }>()

  const photo = useProxyIdQuery(() => props.orderId)

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
.d-pxp { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--row-head); }
.d-pxp__img { display: block; max-width: 100%; max-height: 320px; margin: 0 auto; }
.d-pxp__note { margin: 0; font-size: 12.5px; color: var(--ink-3); }
</style>
