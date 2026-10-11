<template>
  <DModal :max-width="760" :model-value="modelValue" :title="document ? `History, ${document.label}` : 'History'" @update:model-value="emit('update:model-value', $event)">
    <LoadingState v-if="versions.isPending.value" label="Loading the versions…" />
    <ErrorState v-else-if="versions.isError.value" :message="contentErrorMessage(versions.error.value)" title="Could not load the versions" @retry="versions.refetch()" />
    <EmptyState v-else-if="rows.length === 0" description="Nothing has been published for this document yet." title="No versions yet" />

    <ol v-else class="d-lh">
      <li v-for="v in rows" :key="v.legalDocId" class="d-lh__row">
        <div class="d-lh__head">
          <strong>Version {{ v.version }}</strong>
          <StatusTag v-if="v.version === document?.version" label="Live" variant="ok" />
          <StatusTag v-if="v.isMaterial" label="Material" variant="warn" />
          <span class="who2">{{ v.acceptedCount }} accepted</span>
        </div>

        <div class="who2">Published {{ formatDateTime(v.publishedAt) }}{{ v.publishedBy?.fullName ? ` by ${v.publishedBy.fullName}` : '' }}</div>

        <details class="d-lh__text">
          <summary>Read it</summary>
          <p>{{ v.bodyEn }}</p>
          <p dir="rtl">{{ v.bodyAr }}</p>
        </details>
      </li>
    </ol>
  </DModal>
</template>

<script lang="ts" setup>
  import type { LegalDocument } from '@/types/legal'
  import { computed } from 'vue'
  import { contentErrorMessage } from '@/components/content/contentErrors'
  import DModal from '@/components/ui/DModal.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useLegalVersionsQuery } from '@/composables/useLegal'

  const props = defineProps<{ modelValue: boolean, document: LegalDocument | null }>()
  const emit = defineEmits<{ (e: 'update:model-value', value: boolean): void }>()

  const versions = useLegalVersionsQuery(() => (props.modelValue && props.document ? props.document.code : null), true)
  const rows = computed(() => versions.data.value ?? [])
</script>

<style lang="scss" scoped>
.d-lh { list-style: none; margin: 0; padding: 0; }
.d-lh__row { padding: 12px 0; border-bottom: 1px solid var(--line); }
.d-lh__row:last-child { border-bottom: 0; }
.d-lh__head { display: flex; align-items: center; gap: 8px; }
.d-lh__text { margin-top: 6px; font-size: 12.5px; color: var(--ink-2); }
.d-lh__text summary { cursor: pointer; color: var(--ink-3); }
.d-lh__text p { margin: 6px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
