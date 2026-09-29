<template>
  <form class="d-hf" novalidate @submit.prevent="onSubmit">
    <div class="d-hf__title">Put on hold</div>
    <p class="who2 d-hf__lead">While you check it. It stays matchable, and the customer sees "we're checking your transfer". No message is sent.</p>

    <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="What you are checking">
      <DTextarea
        :id="controlId"
        v-model="note"
        :describedby="describedBy"
        :disabled="busy"
        :invalid="invalid"
        :maxlength="1000"
        placeholder="Required. Staff only."
        :rows="2"
      />
    </FormField>

    <NoteBanner v-if="submitError" class="d-hf__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <div class="d-hf__actions">
      <DBtn :disabled="busy" @click="emit('cancel')">Cancel</DBtn>
      <DBtn :loading="busy" type="submit">Put on hold</DBtn>
    </div>
  </form>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useHoldTopUp } from '@/composables/useTopUps'
  import { formLevelError } from './transferErrors'

  const props = defineProps<{ topUpId: string }>()
  const emit = defineEmits<{ (e: 'cancel' | 'done'): void }>()

  const mutation = useHoldTopUp()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const note = ref('')
  const submitted = ref(false)
  const noteError = computed(() => (submitted.value && note.value.trim() === '' ? 'Write what you are checking.' : undefined) ?? fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => formLevelError(mutation.error.value))

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (noteError.value) return
    const input = { id: props.topUpId, note: note.value.trim() }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok('On hold. Logged with your name.')
      emit('done')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-hf { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.d-hf__title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.d-hf__lead { margin: 0 0 11px; }
.d-hf__error { margin-bottom: 10px; }
.d-hf__actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
