<template>
  <DModal
    :max-width="560"
    :model-value="decision !== null"
    :persistent="busy"
    :title="copy.title"
    @update:model-value="close"
  >
    <form v-if="decision" novalidate @submit.prevent="onSubmit">
      <p class="d-ldm__lead">{{ copy.lead }}</p>

      <template v-if="decision === 'request-changes'">
        <div class="d-ldm__label">What needs changing</div>

        <label v-for="option in CHANGE_OPTIONS" :key="option.label" class="d-ldm__check">
          <input v-model="ticked" :disabled="busy" type="checkbox" :value="option.text"> {{ option.label }}
        </label>
      </template>

      <FormField v-if="decision !== 'approve'" v-slot="{ controlId, describedBy, invalid }" :error="textError" :label="copy.field">
        <DTextarea
          :id="controlId"
          v-model="text"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="NOTE_MAX"
          :placeholder="copy.placeholder"
          :rows="4"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-ldm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <p class="who2 d-ldm__foot">Whatever you choose is logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :kind="copy.kind" :loading="busy" @click="onSubmit">{{ copy.action }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ListingDecision } from '@/types/listing'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useDecideListing } from '@/composables/useListings'
  import { useToast } from '@/composables/useToast'
  import { formLevelError, NOTE_MAX, noteError } from './listingErrors'

  // The four decisions on a listing (Backend spec 010): approve, ask for changes,
  // reject, take down. Each is confirmed here, sent once (Idempotency-Key) and logged
  // by the Backend; the seller is told by SMS and email.
  const props = defineProps<{ listingId: string, title: string, decision: ListingDecision | null, queueCount?: number }>()
  const emit = defineEmits<{ (e: 'close' | 'done'): void }>()

  // The design's tick-boxes: each adds a ready sentence to the message.
  const CHANGE_OPTIONS = [
    { label: 'The hallmark photo is unreadable', text: 'The hallmark photo is blurred and we cannot read the karat. Please retake it in daylight.' },
    { label: 'Photos do not show the whole piece', text: 'The photos do not show the whole piece. Please add one with all of it in frame.' },
    { label: 'Damage visible but not described', text: 'The description does not mention the wear that is visible in the photos. Say it plainly, it protects you at inspection.' },
    { label: 'Weight or karat does not match', text: 'The weight or karat does not match what the hallmark shows. Please check and correct it.' },
    { label: 'No video', text: 'Please add a short video. Pieces with a video sell noticeably faster.' },
    { label: 'No original invoice', text: 'Please upload the original invoice if you still have it. It reassures buyers.' },
  ] as const

  const COPY: Record<ListingDecision, { title: string, lead: string, field: string, placeholder: string, action: string, kind: 'primary' | 'danger', what: string, done: string }> = {
    'approve': {
      title: 'Approve and publish',
      lead: 'goes live on the market at once. Check the photos show the piece and its condition, and that the description matches.',
      field: '',
      placeholder: '',
      action: 'Approve and publish',
      kind: 'primary',
      what: '',
      done: 'Approved. It is live now.',
    },
    'request-changes': {
      title: 'Ask for changes',
      lead: 'goes back to the seller, who can fix it and send it again.',
      field: 'Message to the seller',
      placeholder: 'This goes to the seller. Add anything else in your own words.',
      action: 'Send to the seller',
      kind: 'primary',
      what: 'what needs changing',
      done: 'Sent to the seller with your notes.',
    },
    'reject': {
      title: 'Reject this listing',
      lead: 'is rejected for good: the seller cannot edit or resend it, only list the piece again.',
      field: 'Reason',
      placeholder: 'This goes to the seller. Say plainly why the piece cannot be listed.',
      action: 'Reject',
      kind: 'danger',
      what: 'why it is rejected',
      done: 'Rejected and the seller was told why.',
    },
    'takedown': {
      title: 'Take this listing down',
      lead: 'leaves the market at once. It can be put back later from Taken down.',
      field: 'Reason',
      placeholder: 'This goes to the seller. Say plainly why the piece was taken down.',
      action: 'Take it down',
      kind: 'danger',
      what: 'why it is taken down',
      done: 'Taken down and the seller was told why.',
    },
    'relist': {
      title: 'Put it back on the market',
      lead: 'goes live again at once, at its current price, with no new review. The seller is told.',
      field: 'Reason',
      placeholder: 'This goes to the seller. Say plainly why the piece is back on the market.',
      action: 'Put it back',
      kind: 'primary',
      what: 'why it is back on the market',
      done: 'Back on the market and the seller was told.',
    },
  }

  const mutation = useDecideListing()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const copy = computed(() => {
    const base = COPY[props.decision ?? 'approve']
    // Backend spec 011: taking down a piece with buyers in line releases them and refunds their deposits.
    const queued = props.decision === 'takedown' && (props.queueCount ?? 0) > 0
      ? ` ${props.queueCount} ${props.queueCount === 1 ? 'buyer' : 'buyers'} in line get their deposits back at once and are told.`
      : ''
    return { ...base, lead: `${props.title} ${base.lead}${queued}` }
  })

  const text = ref('')
  const ticked = ref<string[]>([])
  const submitted = ref(false)

  // What is sent: the ticked sentences, then what the reviewer wrote.
  const note = computed(() => [...ticked.value, text.value.trim()].filter(Boolean).join(' '))

  const textError = computed(() => {
    if (props.decision === null || props.decision === 'approve') return undefined
    const local = submitted.value ? noteError(note.value, copy.value.what) : undefined
    return local ?? fieldError(mutation.error.value, props.decision === 'request-changes' ? 'message' : 'reason')
  })
  const submitError = computed(() => formLevelError(mutation.error.value))

  watch(() => [props.decision, props.listingId], () => {
    text.value = ''
    ticked.value = []
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  async function onSubmit () {
    if (busy.value || props.decision === null) return
    submitted.value = true
    if (props.decision !== 'approve' && noteError(note.value, copy.value.what)) return

    const input = { id: props.listingId, decision: props.decision, note: props.decision === 'approve' ? null : note.value }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok(copy.value.done)
      emit('done')
    } catch {
      // Shown in the dialog.
    }
  }

  function close (open: boolean) {
    if (!open && !busy.value) emit('close')
  }
</script>

<style lang="scss" scoped>
.d-ldm__lead { margin: 0 0 14px; font-size: 12.5px; line-height: 1.65; color: var(--ink-2); }
.d-ldm__label { font-size: 12px; font-weight: 600; margin-bottom: 10px; }
.d-ldm__check { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; margin-bottom: 8px; cursor: pointer; }
.d-ldm__check:last-of-type { margin-bottom: 12px; }
.d-ldm__error { margin-bottom: 10px; }
.d-ldm__foot { margin: 4px 0 0; }
</style>
