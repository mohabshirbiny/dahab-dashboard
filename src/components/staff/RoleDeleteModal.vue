<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="role ? `Delete ${role.displayName}` : 'Delete role'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-rd__lead">
      Nobody holds this role now. Deleting it cannot be undone, and the reason is recorded in the audit log.
    </p>

    <form id="role-delete-form" novalidate @submit.prevent="onSubmit">
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

    <NoteBanner v-if="submitError" class="d-rd__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="role-delete-form" kind="danger" :loading="loading" type="submit">Delete role</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Role } from '@/types/access'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    role: Role | null
    loading?: boolean
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', reason: string): void
  }>()

  const reason = ref('')
  const submitted = ref(false)

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
.d-rd__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-rd__banner { margin-top: 12px; }
</style>
