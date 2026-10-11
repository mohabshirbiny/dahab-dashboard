<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    title="Add a staff member"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-as__lead">
      They get an email with a link to choose their own password. You never see or set it. The link works once and expires in 48 hours.
    </p>

    <form id="add-staff-form" novalidate @submit.prevent="onSubmit">
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
          placeholder="name@dahab.eg"
          type="email"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.phone" hint="Optional. International format, for example +201000000009." label="Phone">
        <DInput
          :id="controlId"
          v-model="phone"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
        />
      </FormField>

      <fieldset class="d-as__roles" :disabled="loading">
        <legend class="d-as__legend">Roles</legend>

        <label
          v-for="role in roles"
          :key="role.name"
          class="d-as__role"
          :class="{ 'd-as__role--locked': !canTouch(role) }"
          :title="canTouch(role) ? undefined : 'This role allows things you can\'t grant yourself.'"
        >
          <input v-model="picked" :disabled="!canTouch(role)" type="checkbox" :value="role.name">

          <span>
            {{ role.displayName }}
            <span v-if="role.description" class="who2">{{ role.description }}</span>
          </span>
        </label>

        <p v-if="errors.roles" class="d-as__error" role="alert">{{ errors.roles }}</p>
      </fieldset>

      <FormField v-if="branches" v-slot="{ controlId }" hint="Branch-scoped permissions apply at this branch only." label="Branch">
        <DSelect :id="controlId" v-model="branch" :disabled="loading" :options="branchOptions" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.reason" label="Why (recorded in the audit log)">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          placeholder="For example: new hire on the Cairo branch."
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-as__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="add-staff-form" kind="primary" :loading="loading" type="submit">Add and send the link</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CreateStaffInput, Role } from '@/types/access'
  import type { Branch } from '@/types/reference'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    roles: readonly Role[]
    // The signed-in manager's own permissions: the Backend refuses to grant a role that allows
    // anything they don't hold, so those boxes are locked here.
    myPermissions: readonly string[]
    // Every branch, or null when this manager cannot see them.
    branches?: readonly Branch[] | null
    loading?: boolean
    submitError?: string
    // Backend validation messages by form field (for example `email` already used).
    fieldErrors?: Partial<Record<'full_name' | 'email' | 'phone' | 'roles' | 'branch_id', string>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: CreateStaffInput): void
  }>()

  const NO_BRANCH = 'none'
  const fullName = ref('')
  const email = ref('')
  const phone = ref('')
  const picked = ref<string[]>([])
  const branch = ref(NO_BRANCH)
  const reason = ref('')
  const submitted = ref(false)

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

  const errors = computed(() => {
    const result: Partial<Record<'fullName' | 'email' | 'phone' | 'roles' | 'reason', string>> = {}
    if (submitted.value) {
      if (fullName.value.trim().length < 2) result.fullName = 'Enter their full name.'
      if (!EMAIL_PATTERN.test(email.value.trim())) result.email = 'Enter a valid email, for example name@dahab.eg.'
      if (phone.value.trim() && !PHONE_PATTERN.test(phone.value.trim())) result.phone = 'Use the international format, for example +201000000009.'
      if (picked.value.length === 0) result.roles = 'Choose at least one role.'
      if (reason.value.trim().length < REASON_MIN) result.reason = `Write at least ${REASON_MIN} characters.`
    }
    // What the Backend said wins until the form is edited again.
    return {
      ...result,
      fullName: props.fieldErrors?.full_name ?? result.fullName,
      email: props.fieldErrors?.email ?? result.email,
      phone: props.fieldErrors?.phone ?? result.phone,
      roles: props.fieldErrors?.roles ?? result.roles,
    }
  })

  const branchOptions = computed(() => [
    { value: NO_BRANCH, label: 'No branch' },
    ...(props.branches ?? []).filter(b => b.isEnabled).map(b => ({ value: String(b.id), label: b.nameEn })),
  ])

  function canTouch (role: Role): boolean {
    return role.permissions.every(code => props.myPermissions.includes(code))
  }

  watch(() => props.modelValue, open => {
    if (!open) return
    fullName.value = ''
    email.value = ''
    phone.value = ''
    picked.value = []
    branch.value = NO_BRANCH
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (errors.value.fullName || errors.value.email || errors.value.phone || errors.value.roles || errors.value.reason) return
    emit('confirm', {
      fullName: fullName.value.trim(),
      email: email.value.trim().toLowerCase(),
      phone: phone.value.trim() || null,
      roles: [...picked.value],
      branchId: branch.value === NO_BRANCH ? null : Number(branch.value),
      reason: reason.value.trim(),
    })
  }
</script>

<style lang="scss" scoped>
.d-as__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-as__roles { margin: 0 0 14px; padding: 0; border: 0; min-width: 0; }
.d-as__legend { padding: 0; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--ink); }
.d-as__role {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 0;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-as__role input { margin-top: 3px; accent-color: var(--gold); }
.d-as__role--locked { color: var(--ink-3); cursor: not-allowed; }
.d-as__error { margin: 6px 0 0; font-size: 11.5px; color: var(--bad, #b3261e); }
.d-as__banner { margin-top: 12px; }
</style>
