<template>
  <DModal
    :max-width="620"
    :model-value="modelValue"
    :persistent="loading"
    :title="role ? `Edit ${role.displayName}` : 'Create a role'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <form id="role-editor-form" novalidate @submit.prevent="onSubmit">
      <FormField
        v-if="!role"
        v-slot="{ controlId, describedBy, invalid }"
        :error="nameError"
        hint="Lowercase letters, numbers and _. It cannot change later."
        label="Machine name"
      >
        <DInput
          :id="controlId"
          v-model="name"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="50"
          placeholder="customer_support"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="displayNameError" label="Name shown to staff">
        <DInput
          :id="controlId"
          v-model="displayName"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="ROLE_DISPLAY_NAME_MAX"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldErrors.description" label="What this role is for (optional)">
        <DTextarea
          :id="controlId"
          v-model="description"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="ROLE_DESCRIPTION_MAX"
          :rows="2"
        />
      </FormField>

      <label class="d-re__check">
        <input v-model="requiresMfa" :disabled="loading" type="checkbox">
        Staff holding this role must use an authenticator app when they sign in
      </label>

      <fieldset class="d-re__perms" :disabled="loading">
        <legend class="d-re__legend">Permissions</legend>

        <div v-for="group in groups" :key="group.name" class="d-re__group">
          <div class="d-re__group-name">{{ group.name }}</div>

          <label
            v-for="p in group.items"
            :key="p.code"
            class="d-re__perm"
            :class="{ 'd-re__perm--locked': !myPermissions.includes(p.code) }"
            :title="myPermissions.includes(p.code) ? p.code : 'You can\'t grant or remove a permission you don\'t hold.'"
          >
            <input v-model="permissions" :disabled="!myPermissions.includes(p.code)" type="checkbox" :value="p.code">
            {{ p.label }}
          </label>
        </div>
      </fieldset>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" :label="reasonRequired ? 'Why (recorded in the audit log)' : 'Why (optional, recorded in the audit log)'">
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

    <NoteBanner v-if="submitError" class="d-re__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn
        :disabled="role !== null && !changed"
        form="role-editor-form"
        kind="primary"
        :loading="loading"
        type="submit"
      >
        {{ role ? 'Save changes' : 'Create role' }}
      </DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CreateRoleInput, PermissionEntry, Role, UpdateRoleInput } from '@/types/access'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import {
    REASON_MAX,
    REASON_MIN,
    ROLE_DESCRIPTION_MAX,
    ROLE_DISPLAY_NAME_MAX,
    ROLE_NAME_PATTERN,
    sameMembers,
  } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    // null = create a new role.
    role: Role | null
    catalogue: readonly PermissionEntry[]
    // The signed-in manager's own permissions: only those can be added or removed.
    myPermissions: readonly string[]
    loading?: boolean
    submitError?: string
    // Backend validation messages by field (`name`, `display_name`, `description`).
    fieldErrors?: Partial<Record<'name' | 'display_name' | 'description', string>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'create', payload: CreateRoleInput): void
    (e: 'update', payload: UpdateRoleInput): void
  }>()

  const name = ref('')
  const displayName = ref('')
  const description = ref('')
  const requiresMfa = ref(false)
  const permissions = ref<string[]>([])
  const reason = ref('')
  const submitted = ref(false)

  const fieldErrors = computed(() => ({
    name: props.fieldErrors?.name,
    displayName: props.fieldErrors?.display_name,
    description: props.fieldErrors?.description,
  }))

  const groups = computed(() => {
    const byGroup = new Map<string, PermissionEntry[]>()
    for (const p of props.catalogue) {
      byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p])
    }
    return [...byGroup.entries()].map(([groupName, items]) => ({ name: groupName, items }))
  })

  const permissionsChanged = computed(() => {
    if (!props.role) {
      return false
    }
    return !sameMembers(permissions.value, props.role.permissions)
  })
  const mfaChanged = computed(() => props.role !== null && requiresMfa.value !== props.role.requiresMfa)
  const labelsChanged = computed(() => props.role !== null && (
    displayName.value.trim() !== props.role.displayName
    || (description.value.trim() || null) !== props.role.description
  ))
  const changed = computed(() => permissionsChanged.value || mfaChanged.value || labelsChanged.value)

  // The Backend requires a reason when the permissions or the MFA flag change.
  const reasonRequired = computed(() => permissionsChanged.value || mfaChanged.value)

  const nameError = computed(() => {
    if (fieldErrors.value.name) return fieldErrors.value.name
    if (submitted.value && !ROLE_NAME_PATTERN.test(name.value)) return '3–50 characters: start with a letter, then lowercase letters, numbers or _.'
    return undefined
  })
  const displayNameError = computed(() => {
    if (fieldErrors.value.displayName) return fieldErrors.value.displayName
    if (submitted.value && displayName.value.trim() === '') return 'Give the role a name.'
    return undefined
  })
  const reasonError = computed(() => {
    const length = reason.value.trim().length
    if (submitted.value && reasonRequired.value && length < REASON_MIN) return `Write at least ${REASON_MIN} characters.`
    if (submitted.value && length > 0 && length < REASON_MIN) return `Write at least ${REASON_MIN} characters, or leave it empty.`
    return undefined
  })

  // Every opening starts from the role being edited, or blank for a new one.
  watch(() => props.modelValue, open => {
    if (!open) return
    name.value = ''
    displayName.value = props.role?.displayName ?? ''
    description.value = props.role?.description ?? ''
    requiresMfa.value = props.role?.requiresMfa ?? false
    permissions.value = [...(props.role?.permissions ?? [])]
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if ((!props.role && nameError.value) || displayNameError.value || reasonError.value) return

    const trimmedReason = reason.value.trim() || undefined
    if (!props.role) {
      emit('create', {
        name: name.value,
        displayName: displayName.value.trim(),
        description: description.value.trim() || null,
        requiresMfa: requiresMfa.value,
        permissions: [...permissions.value],
        reason: trimmedReason,
      })
      return
    }

    const payload: UpdateRoleInput = { reason: trimmedReason }
    if (labelsChanged.value) {
      payload.displayName = displayName.value.trim()
      payload.description = description.value.trim() || null
    }
    if (mfaChanged.value) payload.requiresMfa = requiresMfa.value
    if (permissionsChanged.value) payload.permissions = [...permissions.value]
    emit('update', payload)
  }
</script>

<style lang="scss" scoped>
.d-re__check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-re__check input, .d-re__perm input { accent-color: var(--gold); }
.d-re__perms { margin: 0 0 14px; padding: 0; border: 0; min-width: 0; }
.d-re__legend { padding: 0; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--ink); }
.d-re__group { margin-bottom: 10px; }
.d-re__group-name {
  font-size: 10.5px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 4px;
}
.d-re__perm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-re__perm--locked { color: var(--ink-3); cursor: not-allowed; }
.d-re__banner { margin-top: 12px; }
</style>
