<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    title="Take the piece down"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-rm__lead">{{ report.reference }}. The piece leaves the market and the seller is told why; every open report on it is closed.</p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="textFieldError" label="Reason for the seller">
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
      <DBtn kind="danger" :loading="busy" @click="onSubmit">Take it down</DBtn>
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
  import { useTakeDownReported } from '@/composables/useListingReports'
  import { useToast } from '@/composables/useToast'
  import { reportFormError, TAKEDOWN_REASON_MIN, TEXT_MAX, textError } from './reportErrors'

  // Take a reported piece down (Backend spec 017 FR-053; listing_report.handle + listing.takedown).
  const props = defineProps<{ open: boolean, report: ListingReport }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useTakeDownReported()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const text = ref('')
  const submitted = ref(false)
  const MIN = TAKEDOWN_REASON_MIN
  const WHAT = 'the reason'

  const textFieldError = computed(() => (submitted.value ? textError(text.value, MIN, WHAT) : undefined) ?? fieldError(mutation.error.value, 'reason'))
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

    const payload = { id: props.report.id, reason: text.value.trim() }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Taken down. The seller has been told.')
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
