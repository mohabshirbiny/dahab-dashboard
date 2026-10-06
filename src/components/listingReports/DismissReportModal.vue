<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    title="Dismiss this report"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-rm__lead">{{ report.reference }}. The piece stays on the market. The reporter only hears that we looked at it.</p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="textFieldError" label="Why you dismiss it (staff only)">
        <DTextarea
          :id="controlId"
          v-model="text"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="TEXT_MAX"
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-rm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Staff only. Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Dismiss</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ListingReport } from '@/types/listingReport'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useDismissReport } from '@/composables/useListingReports'
  import { useToast } from '@/composables/useToast'
  import { DISMISS_NOTE_MIN, reportFormError, TEXT_MAX, textError } from './reportErrors'

  // Dismiss a listing report (Backend spec 017 FR-053, listing_report.handle).
  const props = defineProps<{ open: boolean, report: ListingReport }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useDismissReport()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const text = ref('')
  const submitted = ref(false)
  const MIN = DISMISS_NOTE_MIN
  const WHAT = 'a note'

  const textFieldError = computed(() => (submitted.value ? textError(text.value, MIN, WHAT) : undefined) ?? fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => reportFormError(mutation.error.value))

  watch(() => [props.open, props.report.id], () => {
    text.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (textError(text.value, MIN, WHAT) !== undefined) return

    const payload = { id: props.report.id, note: text.value.trim() }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Dismissed. The reporter will hear we looked at it.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-rm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-rm__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
