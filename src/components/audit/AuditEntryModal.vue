<template>
  <DModal
    :max-width="640"
    :model-value="entryId !== null"
    :title="entry.data.value?.label ?? 'Audit entry'"
    @update:model-value="!$event && emit('close')"
  >
    <LoadingState v-if="entry.isPending.value" label="Loading the entry…" />

    <NoteBanner v-else-if="entry.isError.value" role="alert" variant="bad">
      This entry could not be opened. It may not be one you are allowed to see.
    </NoteBanner>

    <template v-else-if="entry.data.value">
      <KeyValueRow label="When" :value="formatDateTime(entry.data.value.at)" />
      <KeyValueRow label="Who" :value="actorLabel(entry.data.value.actor)" />
      <KeyValueRow v-if="entry.data.value.subject" label="Subject" :value="entry.data.value.subject" />
      <KeyValueRow label="Action code" :value="entry.data.value.action" />
      <KeyValueRow v-if="entry.data.value.outcome" label="Outcome" :value="entry.data.value.outcome" />
      <KeyValueRow label="Reason" :value="entry.data.value.reason ?? '—'" />
      <KeyValueRow label="IP address" :value="entry.data.value.ip ?? '—'" />
      <KeyValueRow label="Device fingerprint" :value="entry.data.value.deviceFingerprint ?? '—'" />

      <div class="d-ae__json">
        <div>
          <div class="d-ae__head">Before</div>
          <pre class="mono">{{ pretty(entry.data.value.before) }}</pre>
        </div>

        <div>
          <div class="d-ae__head">After</div>
          <pre class="mono">{{ pretty(entry.data.value.after) }}</pre>
        </div>
      </div>

      <p class="who2">Exactly as recorded. Nobody can edit or delete an entry.</p>
    </template>

    <template #actions>
      <DBtn @click="emit('close')">Close</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useAuditEntryQuery } from '@/composables/useAuditLog'
  import { formatDateTime } from '@/composables/useFormatters'
  import { actorLabel } from '@/types/audit'

  const props = defineProps<{ entryId: number | null }>()

  const emit = defineEmits<{ (e: 'close'): void }>()

  const entry = useAuditEntryQuery(() => props.entryId)

  function pretty (value: unknown): string {
    return value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)
  }
</script>

<style lang="scss" scoped>
.d-ae__json {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 14px 0 8px;
}
@media (max-width: 640px) {
  .d-ae__json { grid-template-columns: 1fr; }
}
.d-ae__head { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.d-ae__json pre {
  margin: 0;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow: auto;
}
</style>
