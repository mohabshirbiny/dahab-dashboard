<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="title"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-ss__lead">
      <template v-if="action === 'disable'">
        {{ member?.fullName }} is signed out everywhere at once and can no longer sign in. Their history keeps their name.
        The reason is recorded in the audit log.
      </template>

      <template v-else-if="action === 'delete'">
        {{ member?.fullName }} is removed from the staff list and signed out everywhere, for good: this cannot be undone.
        Their history keeps their name, and their email can be used for a new account. The reason is recorded in the audit log.
      </template>

      <template v-else>
        {{ member?.fullName }} gets a new link by email and chooses a new password; the old password is deleted.
        Their authenticator setup is kept. The reason is recorded in the audit log.
      </template>
    </p>

    <form id="staff-status-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Why">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-ss__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn
        form="staff-status-form"
        :kind="action === 'enable' ? 'primary' : 'danger'"
        :loading="loading"
        type="submit"
      >
        {{ LABELS[action] }}
      </DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { StaffMember } from '@/types/access'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    member: StaffMember | null
    action: 'disable' | 'enable' | 'delete'
    loading?: boolean
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', reason: string): void
  }>()

  const reason = ref('')
  const submitted = ref(false)

  const LABELS = { disable: 'Disable', enable: 'Enable', delete: 'Delete' } as const

  const title = computed(() => `${LABELS[props.action]} ${props.member?.fullName ?? ''}`)

  const reasonError = computed(() =>
    submitted.value && reason.value.trim().length < REASON_MIN ? `Write at least ${REASON_MIN} characters.` : undefined,
  )

  watch(() => props.modelValue, open => {
    if (!open) return
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (reasonError.value) return
    emit('confirm', reason.value.trim())
  }
</script>

<style lang="scss" scoped>
.d-ss__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-ss__banner { margin-top: 12px; }
</style>
