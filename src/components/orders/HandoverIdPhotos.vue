<template>
  <div class="d-hip">
    <div class="d-hip__kind">{{ kindLabel }}</div>

    <div class="d-hip__sides">
      <figure class="d-hip__side">
        <figcaption>{{ kind === 'passport' ? 'Photo page' : 'Front' }}</figcaption>
        <LoadingState v-if="front.isPending.value" label="Loading the ID photo…" />
        <p v-else-if="front.isError.value" class="d-hip__note">The ID photo could not be loaded.</p>

        <a v-else-if="front.data.value" :href="front.data.value.url" rel="noopener" target="_blank">
          <img :alt="`${alt}, ${kind === 'passport' ? 'photo page' : 'front'}`" class="d-hip__img" :src="front.data.value.url">
        </a>
      </figure>

      <figure v-if="hasBack" class="d-hip__side">
        <figcaption>{{ kind === 'passport' ? 'Another page' : 'Back' }}</figcaption>
        <LoadingState v-if="back.isPending.value" label="Loading the ID photo…" />
        <p v-else-if="back.isError.value" class="d-hip__note">The ID photo could not be loaded.</p>

        <a v-else-if="back.data.value" :href="back.data.value.url" rel="noopener" target="_blank">
          <img :alt="`${alt}, ${kind === 'passport' ? 'another page' : 'back'}`" class="d-hip__img" :src="back.data.value.url">
        </a>
      </figure>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { IdKind } from '@/types/order'
  import { computed, onBeforeUnmount, watch } from 'vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useHandoverIdQuery } from '@/composables/useOrders'
  import { ID_KIND_LABEL } from '@/types/order'

  // The ID of the person collecting a paid piece: the person the buyer named (Backend spec 014) or the buyer
  // themself (their verified sign-up ID). Both sides, decrypted on request, never cached, each view logged
  // against the viewer. Click a side to open it full size.
  const props = defineProps<{ orderId: string, who: 'buyer' | 'proxy', kind: IdKind | null, hasBack: boolean }>()

  const front = useHandoverIdQuery(() => props.orderId, props.who, 'front')
  const back = useHandoverIdQuery(() => (props.hasBack ? props.orderId : null), props.who, 'back')

  const kindLabel = computed(() => (props.kind ? ID_KIND_LABEL[props.kind] : 'ID photo'))
  const alt = computed(() => (props.who === 'buyer' ? 'The buyer\'s ID' : 'ID of the person collecting'))

  const urls = new Set<string>()
  watch(() => [front.data.value?.url, back.data.value?.url], now => {
    for (const url of now) {
      if (url) urls.add(url)
    }
  })
  onBeforeUnmount(() => {
    for (const url of urls) URL.revokeObjectURL(url)
  })
</script>

<style lang="scss" scoped>
.d-hip { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--row-head); }
.d-hip__kind { font-size: 11.5px; color: var(--ink-2); margin-bottom: 6px; }
.d-hip__sides { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.d-hip__side { margin: 0; }
.d-hip__side figcaption { font-size: 11px; color: var(--ink-3); margin-bottom: 4px; }
.d-hip__img { display: block; max-width: 100%; max-height: 240px; margin: 0 auto; border-radius: 4px; }
.d-hip__note { margin: 0; font-size: 12.5px; color: var(--ink-3); }
</style>
