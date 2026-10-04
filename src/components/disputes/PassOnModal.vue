<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    title="Pass it to someone else"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-pom__lead">{{ dispute.ref }}. The dispute stays open and becomes theirs. Nothing is sent to the customer.</p>

      <LoadingState v-if="assignees.isPending.value" label="Loading colleagues…" />

      <NoteBanner v-else-if="options.length === 0" variant="info">No other colleague handles disputes right now.</NoteBanner>

      <template v-else>
        <FormField v-slot="{ controlId }" :error="assigneeError" label="Who takes it">
          <DSelect :id="controlId" v-model="assigneeId" :disabled="busy" :options="options" />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="What you need from them">
          <DTextarea
            :id="controlId"
            v-model="note"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="NOTE_MAX"
            :rows="3"
          />
        </FormField>
      </template>

      <NoteBanner v-if="submitError" class="d-pom__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Staff only. Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :disabled="options.length === 0" kind="primary" :loading="busy" @click="onSubmit">Pass it on</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { DisputeDetail } from '@/types/dispute'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useDisputeAssigneesQuery, usePassOnDispute } from '@/composables/useDisputes'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { disputeFormError, lengthError, NOTE_MAX, NOTE_MIN } from './disputeErrors'

  // Pass a dispute to a named colleague (Backend spec 014 FR-009, dispute.handle).
  const props = defineProps<{ open: boolean, dispute: DisputeDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const assignees = useDisputeAssigneesQuery(() => props.open)
  const mutation = usePassOnDispute()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const options = computed(() => (assignees.data.value ?? []).map(a => ({
    value: a.id,
    label: a.roles.length > 0 ? `${a.name} — ${a.roles.join(', ')}` : a.name,
  })))

  const assigneeId = ref('')
  const note = ref('')
  const submitted = ref(false)

  const assigneeError = computed(() => (submitted.value && assigneeId.value === '' ? 'Pick who takes it.' : undefined) ?? fieldError(mutation.error.value, 'assignee_id'))
  const noteError = computed(() => (submitted.value ? lengthError(note.value, NOTE_MIN, NOTE_MAX, 'what you need from them') : undefined) ?? fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => disputeFormError(mutation.error.value))

  watch(() => [props.open, props.dispute.id], () => {
    assigneeId.value = ''
    note.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  watch(options, list => {
    if (assigneeId.value === '' && list.length > 0) assigneeId.value = list[0]!.value
  }, { immediate: true })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (assigneeId.value === '' || lengthError(note.value, NOTE_MIN, NOTE_MAX, 'a note') !== undefined) return

    const payload = { id: props.dispute.id, assigneeId: assigneeId.value, note: note.value.trim() }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Passed on. It is theirs now.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-pom__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-pom__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
