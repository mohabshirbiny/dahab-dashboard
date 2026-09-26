<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="mode === 'reject' ? 'Reject this document' : 'Ask for a new upload'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-rev__lead">
      <template v-if="mode === 'reject'">
        The customer is told why, and the reasons are recorded against your name.
      </template>

      <template v-else>
        They get a notification and a text message, and the app shows them exactly what to fix.
      </template>
    </p>

    <form id="review-reasons-form" novalidate @submit.prevent="onSubmit">
      <fieldset class="d-rev__reasons" :disabled="loading">
        <legend class="d-rev__legend">What is wrong with it</legend>

        <label v-for="reason in IDENTITY_REVIEW_REASONS" :key="reason.value" class="d-rev__reason">
          <input v-model="picked" type="checkbox" :value="reason.value">
          {{ reason.label }}
        </label>

        <p v-if="reasonsError" class="d-rev__error" role="alert">{{ reasonsError }}</p>
      </fieldset>

      <FormField v-slot="{ controlId, describedBy, invalid }" label="Anything else, in your own words (optional)">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="MAX_NOTE"
          placeholder="This goes to them along with the reasons."
          :rows="3"
        />
      </FormField>

      <div class="d-rev__count" :class="{ 'd-rev__count--near': note.length > MAX_NOTE - 80 }">
        {{ note.length }} / {{ MAX_NOTE }}
      </div>
    </form>

    <NoteBanner v-if="submitError" class="d-rev__banner" role="alert" variant="bad">
      {{ submitError }}
    </NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn
        form="review-reasons-form"
        :kind="mode === 'reject' ? 'danger' : 'primary'"
        :loading="loading"
        type="submit"
      >
        {{ mode === 'reject' ? 'Confirm rejection' : 'Send it' }}
      </DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { IDENTITY_REVIEW_REASONS, type IdentityReviewReason } from '@/types/identity'

  // The Backend accepts up to 1000 characters.
  const MAX_NOTE = 1000

  const props = defineProps<{
    modelValue: boolean
    mode: 'request_resubmission' | 'reject'
    loading?: boolean
    // Failure reported by the server for the last attempt.
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: { reasons: IdentityReviewReason[], note: string }): void
  }>()

  const picked = ref<IdentityReviewReason[]>([])
  const note = ref('')
  const submitted = ref(false)

  const reasonsError = computed(() =>
    submitted.value && picked.value.length === 0 ? 'Pick at least one reason.' : '',
  )

  // Every opening starts clean.
  watch(() => props.modelValue, open => {
    if (!open) return
    picked.value = []
    note.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (picked.value.length === 0) return
    // Keep the order of the list, whatever order the boxes were ticked in.
    const reasons = IDENTITY_REVIEW_REASONS.map(r => r.value).filter(value => picked.value.includes(value))
    emit('confirm', { reasons, note: note.value.trim() })
  }
</script>

<style lang="scss" scoped>
.d-rev__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-rev__reasons { margin: 0 0 14px; padding: 0; border: 0; min-width: 0; }
.d-rev__legend { padding: 0; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--ink); }
.d-rev__reason {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-rev__reason input { accent-color: var(--gold); }
.d-rev__error { margin: 6px 0 0; font-size: 11.5px; color: var(--bad, #A83A2B); }
.d-rev__count {
  margin: -8px 0 0;
  text-align: right;
  font-size: 11px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.d-rev__count--near { color: var(--wait); }
.d-rev__banner { margin-top: 12px; }
</style>
