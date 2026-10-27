<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="`Edit ${member?.fullName ?? ''}`"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-es__lead">
      Change their name, work email or phone. A new email gets any pending set-password link again; sign-in codes on a new device go to the phone.
    </p>

    <form id="edit-staff-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.fullName" label="Full name">
        <DInput
          :id="controlId"
          v-model="fullName"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.email" label="Work email">
        <DInput
          :id="controlId"
          v-model="email"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="loading"
          inputmode="email"
          :invalid="invalid"
          type="email"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.phone" hint="International format, for example +201000000009." label="Phone">
        <DInput
          :id="controlId"
          v-model="phone"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.reason" label="Why (recorded in the audit log)">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          placeholder="For example: new phone number."
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-es__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="edit-staff-form" kind="primary" :loading="loading" type="submit">Save</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { StaffMember, UpdateStaffInput } from '@/types/access'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    member: StaffMember | null
    loading?: boolean
    submitError?: string
    // Backend validation messages by form field (for example `email` already used).
    fieldErrors?: Partial<Record<'full_name' | 'email' | 'phone', string>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: UpdateStaffInput): void
  }>()

  const fullName = ref('')
  const email = ref('')
  const phone = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

  const errors = computed(() => {
    const result: Partial<Record<'fullName' | 'email' | 'phone' | 'reason', string>> = {}
    if (submitted.value) {
      if (fullName.value.trim().length < 2) result.fullName = 'Enter their full name.'
      if (!EMAIL_PATTERN.test(email.value.trim())) result.email = 'Enter a valid email, for example name@dahab.eg.'
      if (!PHONE_PATTERN.test(phone.value.trim())) result.phone = 'Use the international format, for example +201000000009.'
      if (reason.value.trim().length < REASON_MIN) result.reason = `Write at least ${REASON_MIN} characters.`
    }
    // What the Backend said wins until the form is edited again.
    return {
      ...result,
      fullName: props.fieldErrors?.full_name ?? result.fullName,
      email: props.fieldErrors?.email ?? result.email,
      phone: props.fieldErrors?.phone ?? result.phone,
    }
  })

  watch(() => props.modelValue, open => {
    if (!open) return
    fullName.value = props.member?.fullName ?? ''
    email.value = props.member?.email ?? ''
    phone.value = props.member?.phone ?? ''
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading || !props.member) return
    submitted.value = true
    if (errors.value.fullName || errors.value.email || errors.value.phone || errors.value.reason) return
    // Only what changed is sent.
    const next = { fullName: fullName.value.trim(), email: email.value.trim().toLowerCase(), phone: phone.value.trim() }
    emit('confirm', {
      fullName: next.fullName === props.member.fullName ? undefined : next.fullName,
      email: next.email === props.member.email ? undefined : next.email,
      phone: next.phone === (props.member.phone ?? '') ? undefined : next.phone,
      reason: reason.value.trim(),
    })
  }
</script>

<style lang="scss" scoped>
.d-es__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-es__banner { margin-top: 12px; }
</style>
