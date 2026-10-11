<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    :title="decision === 'approve' ? 'Approve this device' : 'Refuse this device'"
    @update:model-value="close"
  >
    <form v-if="approval" novalidate @submit.prevent="onSubmit">
      <p class="d-dd__lead">
        <template v-if="decision === 'approve'">
          {{ approval.founder.name }} signs in on device <b class="mono">{{ formatDeviceRef(approval.deviceRef) }}</b> as soon as you approve.
          From then on this device is known for them and is not held again.
        </template>

        <template v-else>
          {{ approval.founder.name }}'s sign-in on device <b class="mono">{{ formatDeviceRef(approval.deviceRef) }}</b> is refused. Nothing is frozen.
        </template>
      </p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note (optional)">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="NOTE_MAX"
          :rows="2"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-dd__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name. Both founders are told.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>

      <DBtn :kind="decision === 'approve' ? 'primary' : 'danger'" :loading="busy" @click="onSubmit">
        {{ decision === 'approve' ? 'Approve' : 'Refuse' }}
      </DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { DeviceApproval } from '@/types/security'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useDecideDevice } from '@/composables/useSecurity'
  import { useToast } from '@/composables/useToast'
  import { formatDeviceRef, NOTE_MAX, securityErrorMessage } from './securityErrors'

  // Approve or refuse the other founder's new device (Backend spec 021 R6).
  const props = defineProps<{ open: boolean, approval: DeviceApproval | null, decision: 'approve' | 'refuse' }>()
  const emit = defineEmits<{ (e: 'close'): void, (e: 'decided', approval: DeviceApproval): void }>()

  const mutation = useDecideDevice()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const note = ref('')
  const noteError = computed(() => fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => (mutation.error.value && !noteError.value ? securityErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.approval?.id, props.decision], () => {
    note.value = ''
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value || !props.approval) return
    const payload = { id: props.approval.id, decision: props.decision, note: note.value.trim() || null }
    try {
      const decided = await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(props.decision === 'approve' ? 'Approved. Their device signs in on its next check.' : 'Refused. Their device is told.')
      emit('decided', decided)
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-dd__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-dd__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
.mono { font-variant-numeric: tabular-nums; }
</style>
