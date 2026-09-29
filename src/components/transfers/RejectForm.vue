<template>
  <form class="d-rf" novalidate @submit.prevent="onSubmit">
    <div class="d-rf__title">Reject this notice</div>
    <p class="who2 d-rf__lead">No money moves and it cannot be matched again. The customer is told the reason by SMS (and email), never your note.</p>

    <FormField v-slot="{ controlId }" label="Reason">
      <DSelect :id="controlId" v-model="reason" :disabled="busy" :options="REASON_OPTIONS" />
    </FormField>

    <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for the record">
      <DTextarea
        :id="controlId"
        v-model="note"
        :describedby="describedBy"
        :disabled="busy"
        :invalid="invalid"
        :maxlength="1000"
        placeholder="Required. Staff only; the customer never sees it."
        :rows="2"
      />
    </FormField>

    <NoteBanner v-if="submitError" class="d-rf__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <div class="d-rf__actions">
      <DBtn :disabled="busy" @click="emit('cancel')">Cancel</DBtn>
      <DBtn kind="danger" :loading="busy" type="submit">Reject</DBtn>
    </div>
  </form>
</template>

<script lang="ts" setup>
  import type { TopUpRejectReason } from '@/types/topup'
  import { computed, ref } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useRejectTopUp } from '@/composables/useTopUps'
  import { TOPUP_REJECT_REASON_LABELS } from '@/types/topup'
  import { formLevelError } from './transferErrors'

  const REASON_OPTIONS = (Object.keys(TOPUP_REJECT_REASON_LABELS) as TopUpRejectReason[])
    .map(value => ({ value, label: TOPUP_REJECT_REASON_LABELS[value] }))

  const props = defineProps<{ topUpId: string }>()
  const emit = defineEmits<{ (e: 'cancel' | 'done'): void }>()

  const mutation = useRejectTopUp()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const reason = ref<TopUpRejectReason>('money_not_received')
  const note = ref('')
  const submitted = ref(false)
  const noteError = computed(() => (submitted.value && note.value.trim() === '' ? 'Write a note for the record.' : undefined) ?? fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => formLevelError(mutation.error.value))

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (noteError.value) return
    const input = { id: props.topUpId, reason: reason.value, note: note.value.trim() }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok('Rejected. The customer is told the reason; logged with your name.')
      emit('done')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-rf { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.d-rf__title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.d-rf__lead { margin: 0 0 11px; }
.d-rf__error { margin-bottom: 10px; }
.d-rf__actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
