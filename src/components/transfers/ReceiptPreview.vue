<template>
  <div class="d-rp">
    <LoadingState v-if="receipt.isPending.value" label="Loading the receipt…" />
    <p v-else-if="receipt.isError.value" class="d-rp__note">The receipt could not be loaded.</p>

    <template v-else-if="receipt.data.value">
      <iframe
        v-if="receipt.data.value.type === 'application/pdf'"
        class="d-rp__pdf"
        :src="receipt.data.value.url"
        title="Transfer receipt"
      />

      <img v-else alt="Transfer receipt" class="d-rp__img" :src="receipt.data.value.url">

      <!-- The browser's own viewer, for a receipt it cannot show inline (a damaged or unusual PDF). -->
      <a class="d-rp__open" :href="receipt.data.value.url" rel="noopener" target="_blank">Open in a new tab</a>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, watch } from 'vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useTopUpReceiptQuery } from '@/composables/useTopUps'

  // The receipt the customer attached (Backend spec 009). Staff with topup.match only;
  // it is decrypted by the Backend and never cached.
  const props = defineProps<{ topUpId: string }>()

  const receipt = useTopUpReceiptQuery(() => props.topUpId)

  let lastUrl: string | null = null
  watch(() => receipt.data.value?.url, url => {
    if (lastUrl && lastUrl !== url) URL.revokeObjectURL(lastUrl)
    lastUrl = url ?? null
  })
  onBeforeUnmount(() => {
    if (lastUrl) URL.revokeObjectURL(lastUrl)
  })
</script>

<style lang="scss" scoped>
.d-rp { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--row-head); }
.d-rp__img { display: block; max-width: 100%; max-height: 420px; margin: 0 auto; }
.d-rp__pdf { width: 100%; height: 420px; border: 0; }
.d-rp__note { margin: 0; font-size: 12.5px; color: var(--ink-3); }
.d-rp__open { display: inline-block; margin-top: 6px; font-size: 12px; color: var(--ink-2); }
</style>
