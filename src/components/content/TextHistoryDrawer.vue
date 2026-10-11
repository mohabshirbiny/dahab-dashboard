<template>
  <DModal :max-width="720" :model-value="modelValue" :title="text ? `History, ${text.key}` : 'History'" @update:model-value="emit('update:model-value', $event)">
    <LoadingState v-if="history.isPending.value" label="Loading history…" />
    <ErrorState v-else-if="history.isError.value" :message="contentErrorMessage(history.error.value)" title="Could not load the history" @retry="history.refetch()" />
    <EmptyState v-else-if="rows.length === 0" description="Nothing was ever written for this text; customers see the app's own wording." title="No versions yet" />

    <ol v-else class="d-th">
      <li v-for="v in rows" :key="v.version" class="d-th__row">
        <div class="d-th__head">
          <strong>Version {{ v.version }}</strong>
          <StatusTag :label="stateLabel(v)" :variant="stateVariant(v)" />
          <span v-if="v.state === 'published' && v.bundleVersion !== null" class="who2">bundle {{ v.bundleVersion }}</span>
        </div>

        <p v-if="v.isDefaultMarker" class="d-th__text d-th__text--muted">Back to the app's own wording.</p>

        <template v-else>
          <p class="d-th__text">{{ v.en }}</p>
          <p class="d-th__text d-th__ar" dir="rtl">{{ v.ar }}</p>
        </template>

        <div class="who2">
          Written {{ formatDateTime(v.editedAt) }}{{ v.editedBy ? ` by ${v.editedBy.fullName}` : '' }}<template v-if="v.publishedAt">; published {{ formatDateTime(v.publishedAt) }}{{ v.publishedBy ? ` by ${v.publishedBy.fullName}` : '' }}</template>
        </div>

        <DBtn v-if="canRestore(v)" class="d-th__restore" :disabled="restoring" @click="emit('restore', v.version)">Restore this wording</DBtn>
      </li>
    </ol>

    <NoteBanner v-if="error" class="d-th__error" role="alert" variant="bad">{{ error }}</NoteBanner>
  </DModal>
</template>

<script lang="ts" setup>
  import type { AppText, TextVersion } from '@/types/content'
  import type { StatusVariant } from '@/types/status'
  import { computed } from 'vue'
  import { contentErrorMessage } from '@/components/content/contentErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useTextHistoryQuery } from '@/composables/useContent'
  import { formatDateTime } from '@/composables/useFormatters'

  const props = defineProps<{
    modelValue: boolean
    text: AppText | null
    // Restoring makes a draft; only people who can edit see the button.
    canEdit: boolean
    restoring?: boolean
    error?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'restore', version: number): void
  }>()

  const history = useTextHistoryQuery(() => (props.modelValue && props.text ? props.text.key : null))
  const rows = computed(() => history.data.value ?? [])

  function stateLabel (v: TextVersion): string {
    if (v.state === 'draft') return v.isDefaultMarker ? 'Draft: back to default' : 'Draft'
    return v.state === 'published' ? 'Live' : 'Replaced'
  }

  function stateVariant (v: TextVersion): StatusVariant {
    if (v.state === 'draft') return 'wait'
    return v.state === 'published' ? 'ok' : 'off'
  }

  // A draft cannot be restored (it is not history yet), nor can a version that ended an override
  // or the one that is live now.
  function canRestore (v: TextVersion): boolean {
    return props.canEdit && !props.text?.readOnly && v.state === 'superseded' && !v.isDefaultMarker
  }
</script>

<style lang="scss" scoped>
.d-th { list-style: none; margin: 0; padding: 0; }
.d-th__row { padding: 12px 0; border-bottom: 1px solid var(--line); }
.d-th__row:last-child { border-bottom: 0; }
.d-th__head { display: flex; align-items: center; gap: 8px; }
.d-th__text { margin: 6px 0 0; overflow-wrap: anywhere; }
.d-th__text--muted { color: var(--ink-3); }
.d-th__ar { text-align: right; }
.d-th__restore { margin-top: 8px; }
.d-th__error { margin-top: 12px; }
</style>
