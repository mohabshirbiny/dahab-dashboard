<template>
  <div class="d-prev">
    <div v-if="!available || image.state.value === 'deleted'" class="d-prev__stage d-prev__stage--empty" :style="{ aspectRatio }">
      The image of this document has been deleted.
    </div>

    <div v-else class="d-prev__stage" :style="{ aspectRatio }">
      <img
        v-show="showImage"
        :alt="caption"
        class="d-prev__img"
        draggable="false"
        referrerpolicy="no-referrer"
        :src="image.src.value"
        @error="broken = true"
      >

      <LoadingState v-if="image.state.value === 'loading'" class="d-prev__overlay" label="Loading the document…" />

      <ErrorState
        v-else-if="image.state.value === 'error' || broken"
        class="d-prev__overlay"
        message="The image could not be loaded. Try again."
        title="Cannot show this document"
        @retry="retry"
      />
    </div>

    <div v-if="available && image.state.value !== 'deleted'" class="d-prev__bar">
      <span class="d-prev__caption">{{ caption }}</span>
      <DBtn :disabled="!showImage" @click="enlarged = true">View larger</DBtn>
    </div>

    <DModal v-model="enlarged" :max-width="1000" :title="caption">
      <img
        v-if="showImage"
        :alt="`${caption}, enlarged`"
        class="d-prev__big"
        draggable="false"
        referrerpolicy="no-referrer"
        :src="image.src.value"
      >
    </DModal>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useIdentityDocumentImage } from '@/composables/useIdentityDocuments'
  import { IDENTITY_TYPE_LABELS, type IdentityDocumentSide, type IdentityDocumentType } from '@/types/identity'

  const props = withDefaults(defineProps<{
    documentId: string
    type: IdentityDocumentType
    // False once the Backend has deleted the image.
    available: boolean
    // Set when the document has two sides, so the caption says which one this is.
    side?: IdentityDocumentSide
    // Says the document has a back, so a lone front is not mistaken for the whole card.
    twoSided?: boolean
  }>(), { side: 'front', twoSided: false })

  const enlarged = ref(false)
  // The bytes arrived but the browser could not draw them.
  const broken = ref(false)

  // Opening the image is logged by the Backend, so it is asked for once per document.
  const image = useIdentityDocumentImage(() => (props.available ? props.documentId : null), () => props.side)

  const caption = computed(() => {
    const label = IDENTITY_TYPE_LABELS[props.type]
    if (!props.twoSided) return label
    return `${label}, ${props.side === 'back' ? 'back' : 'front'}`
  })
  const showImage = computed(() => image.state.value === 'loaded' && !broken.value)

  // ID cards are wider than they are tall, a passport page is closer to A5 landscape.
  const aspectRatio = computed(() => (props.type === 'passport' ? '880 / 620' : '856 / 540'))

  watch(image.src, () => {
    broken.value = false
  })

  function retry () {
    broken.value = false
    image.reload()
  }
</script>

<style lang="scss" scoped>
.d-prev__stage {
  position: relative;
  width: 100%;
  background: #F2F0EB;
  border: 1px solid var(--line);
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.d-prev__stage--empty { color: var(--ink-3); font-size: 12px; text-align: center; padding: 20px; }
.d-prev__img { width: 100%; height: 100%; object-fit: contain; display: block; user-select: none; }
.d-prev__overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
.d-prev__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}
.d-prev__caption { font-size: 11.5px; color: var(--ink-3); }
.d-prev__big { display: block; width: 100%; height: auto; border-radius: 7px; user-select: none; }
</style>
