<template>
  <DModal
    :max-width="500"
    :model-value="open"
    :persistent="busy"
    :title="target ? `Freeze ${target.name}` : 'Freeze'"
    @update:model-value="close"
  >
    <form v-if="target" novalidate @submit.prevent="onSubmit">
      <NoteBanner class="d-fz__warn" variant="bad">
        <span>
          <b>This takes effect at once.</b> Every session of {{ target.name }} ends and every action on that account is refused. Their
          pending device requests end. Unfreezing needs two confirmations, and you confirm last.
        </span>
      </NoteBanner>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Why you freeze it">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-fz__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name. Both founders get an email, a notice and an SMS. The frozen account never sees the reason.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="danger" :loading="busy" @click="onSubmit">Freeze now</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { StaffRefLite } from '@/types/security'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useFreezeFounder } from '@/composables/useSecurity'
  import { useToast } from '@/composables/useToast'
  import { backendCodeOf } from '@/services/errors'
  import { REASON_MAX, REASON_MIN, securityErrorMessage } from './securityErrors'

  // Freeze the other founder (Backend spec 021 R7). Never automatic: always this deliberate step.
  const props = defineProps<{ open: boolean, target: StaffRefLite | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useFreezeFounder()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const reason = ref('')
  const submitted = ref(false)

  const reasonError = computed(() => {
    if (submitted.value && reason.value.trim().length < REASON_MIN) return `Write a reason (at least ${REASON_MIN} characters).`
    if (backendCodeOf(mutation.error.value) === 'reason_required') return securityErrorMessage(mutation.error.value)
    return fieldError(mutation.error.value, 'reason')
  })
  const submitError = computed(() => (mutation.error.value && !reasonError.value ? securityErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.target?.id], () => {
    reason.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value || !props.target) return
    submitted.value = true
    if (reason.value.trim().length < REASON_MIN) return

    const payload = { staffId: props.target.id, reason: reason.value.trim() }
    try {
      const frozen = await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(`${frozen.frozenStaff.name} is frozen. ${frozen.sessionsEnded ?? 0} sessions ended.`)
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-fz__warn { margin-bottom: 14px; }
.d-fz__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
