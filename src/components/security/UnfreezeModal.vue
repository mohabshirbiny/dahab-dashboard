<template>
  <DModal
    :max-width="500"
    :model-value="open"
    :persistent="busy"
    :title="freeze ? `Unfreeze ${freeze.frozenStaff.name}` : 'Unfreeze'"
    @update:model-value="close"
  >
    <form v-if="freeze" novalidate @submit.prevent="onSubmit">
      <ol class="d-uf__slots">
        <li :class="{ 'is-done': slot1 }">
          <b>1. The frozen founder, or the named stand-in</b>
          <span v-if="slot1">{{ slot1.by?.name ?? '—' }} · {{ slot1.kind === 'frozen_founder' ? 'the frozen founder' : 'the stand-in' }} · {{ formatDateTime(slot1.at) }}</span>
          <span v-else>Not given yet</span>
        </li>

        <li>
          <b>2. A founder who is not frozen (always last)</b>
          <span>{{ freeze.mySlot === 2 ? 'You, now' : 'Not given yet' }}</span>
        </li>
      </ol>

      <p class="d-uf__lead">
        <template v-if="freeze.mySlot === 2">
          Your confirmation is the last one: the account works again, but none of its old sessions come back. {{ freeze.frozenStaff.name }}
          signs in again.
        </template>

        <template v-else>
          You give the first confirmation as the stand-in, because the frozen founder cannot. A founder who is not frozen confirms last.
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

      <NoteBanner v-if="submitError" class="d-uf__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name. Both founders are told.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Confirm</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { AccountFreeze } from '@/types/security'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useConfirmUnfreeze } from '@/composables/useSecurity'
  import { useToast } from '@/composables/useToast'
  import { NOTE_MAX, securityErrorMessage } from './securityErrors'

  // One unfreeze confirmation (Backend spec 021 R8): the server picks the slot.
  const props = defineProps<{ open: boolean, freeze: AccountFreeze | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useConfirmUnfreeze()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const note = ref('')
  const slot1 = computed(() => props.freeze?.confirmations.find(c => c.slot === 1) ?? null)
  const noteError = computed(() => fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => (mutation.error.value && !noteError.value ? securityErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.freeze?.id], () => {
    note.value = ''
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value || !props.freeze) return
    const payload = { freezeId: props.freeze.id, note: note.value.trim() || null }
    try {
      const result = await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(result.stage === 'unfrozen'
        ? `${result.frozenStaff.name} is unfrozen and can sign in again.`
        : 'Your confirmation is recorded. A founder who is not frozen confirms last.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-uf__slots { margin: 0 0 12px; padding: 0; list-style: none; display: grid; gap: 8px; }
.d-uf__slots li {
  display: grid;
  gap: 2px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12.5px;
}
.d-uf__slots li span { font-size: 11.5px; color: var(--ink-3); }
.d-uf__slots li.is-done { border-color: var(--gold); }
.d-uf__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-uf__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
