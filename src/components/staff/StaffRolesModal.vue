<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="member ? `Permissions for ${member.fullName}` : 'Permissions'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-sr__lead">
      Their permissions become everything their roles allow. The change applies on their next action.
    </p>

    <form id="staff-roles-form" novalidate @submit.prevent="onSubmit">
      <fieldset class="d-sr__roles" :disabled="loading">
        <legend class="d-sr__legend">Roles</legend>

        <label
          v-for="role in roles"
          :key="role.name"
          class="d-sr__role"
          :class="{ 'd-sr__role--locked': !canTouch(role) }"
          :title="canTouch(role) ? undefined : 'This role allows things you can\'t grant yourself.'"
        >
          <input v-model="picked" :disabled="!canTouch(role)" type="checkbox" :value="role.name">

          <span>
            {{ role.displayName }}
            <span v-if="role.description" class="who2">{{ role.description }}</span>
          </span>
        </label>
      </fieldset>

      <!-- Branch (Backend spec 004): limits branch-scoped permissions to that branch.
           Shown only when the branch list is available (reference.view). -->
      <FormField v-if="branches" v-slot="{ controlId }" hint="Branch-scoped permissions apply at this branch only." label="Branch">
        <DSelect :id="controlId" v-model="branch" :disabled="loading" :options="branchOptions" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Why (recorded in the audit log)">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          placeholder="For example: covering the verification queue this month."
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-sr__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn
        :disabled="!changed"
        form="staff-roles-form"
        kind="primary"
        :loading="loading"
        type="submit"
      >Save</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Role, StaffMember } from '@/types/access'
  import type { Branch } from '@/types/reference'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN, sameMembers } from '@/types/access'

  const props = defineProps<{
    modelValue: boolean
    member: StaffMember | null
    roles: readonly Role[]
    // The signed-in manager's own permissions: the Backend refuses to add or remove a
    // role that allows anything they don't hold, so those boxes are locked here.
    myPermissions: readonly string[]
    // Every branch (enabled or not), or null when this manager cannot see them.
    branches?: readonly Branch[] | null
    loading?: boolean
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    // `branchId` is sent only when a branch list was shown; undefined = not changed.
    (e: 'confirm', payload: { roles: string[], branchId?: number | null, reason: string }): void
  }>()

  const NO_BRANCH = 'none'
  const picked = ref<string[]>([])
  const branch = ref<string>(NO_BRANCH)
  const reason = ref('')
  const submitted = ref(false)

  const current = computed(() => props.member?.roles.map(r => r.name) ?? [])
  const currentBranch = computed(() => (props.member?.branchId == null ? NO_BRANCH : String(props.member.branchId)))
  const branchChanged = computed(() => Boolean(props.branches) && branch.value !== currentBranch.value)
  const rolesChanged = computed(() => !sameMembers(picked.value, current.value))
  const changed = computed(() => rolesChanged.value || branchChanged.value)

  // Enabled branches, plus the person's current one if it has since been disabled.
  const branchOptions = computed(() => [
    { value: NO_BRANCH, label: 'No branch' },
    ...(props.branches ?? [])
      .filter(b => b.isEnabled || String(b.id) === currentBranch.value)
      .map(b => ({ value: String(b.id), label: b.isEnabled ? b.nameEn : `${b.nameEn} (disabled)` })),
  ])

  const reasonError = computed(() =>
    submitted.value && reason.value.trim().length < REASON_MIN ? `Write at least ${REASON_MIN} characters.` : undefined,
  )

  function canTouch (role: Role): boolean {
    return role.permissions.every(code => props.myPermissions.includes(code))
  }

  // Every opening starts from the person's current roles.
  watch(() => props.modelValue, open => {
    if (!open) return
    picked.value = [...current.value]
    branch.value = currentBranch.value
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading || !changed.value) return
    submitted.value = true
    if (reasonError.value) return
    emit('confirm', {
      roles: [...picked.value],
      branchId: branchChanged.value ? (branch.value === NO_BRANCH ? null : Number(branch.value)) : undefined,
      reason: reason.value.trim(),
    })
  }
</script>

<style lang="scss" scoped>
.d-sr__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-sr__roles { margin: 0 0 14px; padding: 0; border: 0; min-width: 0; }
.d-sr__legend { padding: 0; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--ink); }
.d-sr__role {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 0;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.d-sr__role input { margin-top: 3px; accent-color: var(--gold); }
.d-sr__role--locked { color: var(--ink-3); cursor: not-allowed; }
.d-sr__banner { margin-top: 12px; }
</style>
