<template>
  <div class="d-page">
    <PageLead>
      Staff sign in with their own credentials. Shared logins are not permitted, because the log stops meaning anything.
    </PageLead>

    <!-- The Roles tab is a UI extension beyond the design reference (approved 2026-09-26,
         docs/features/dynamic-staff-authorization.md): the reference has no role-management screen. -->
    <FilterChips v-if="canManage" :model-value="tab" :options="tabOptions" @update:model-value="setTab" />

    <!-- Staff ------------------------------------------------------------ -->
    <Panel v-if="tab === 'staff'" title="Accounts">
      <template #actions>
        <FilterChips :model-value="status" :options="statusOptions" @update:model-value="setStatus" />
        <DBtn v-if="canManageStaff" kind="primary" @click="openAdd">Add staff member</DBtn>
      </template>

      <LoadingState v-if="staff.isPending.value" label="Loading staff…" />

      <ErrorState
        v-else-if="staff.isError.value"
        :message="accessErrorMessage(staff.error.value)"
        :retryable="errorCodeOf(staff.error.value) !== 'forbidden'"
        title="Could not load staff"
        @retry="staff.refetch()"
      />

      <EmptyState v-else-if="!staff.data.value || staff.data.value.items.length === 0" title="No staff yet" />

      <template v-else>
        <div :class="{ 'd-staffpage__stale': staff.isPlaceholderData.value }">
          <StaffTable
            :can-manage="canManage"
            :can-manage-staff="canManageStaff"
            :catalogue="catalogue.data.value"
            :current-user-id="auth.user?.id ?? null"
            :rows="staff.data.value.items"
            @disable="openStatus($event, 'disable')"
            @enable="openStatus($event, 'enable')"
            @permissions="openRoles"
          />
        </div>

        <Pagination
          :page="staff.data.value.page"
          :page-size="staff.data.value.pageSize"
          :total="staff.data.value.total"
          @update:page="page = $event"
        />
      </template>
    </Panel>

    <!-- Roles (role managers only) --------------------------------------- -->
    <Panel v-else subtitle="What each role allows. Changes apply on each holder's next action." title="Roles">
      <template #actions>
        <DBtn kind="primary" @click="openEditor(null)">Create a role</DBtn>
      </template>

      <LoadingState v-if="roles.isPending.value" label="Loading roles…" />

      <ErrorState
        v-else-if="roles.isError.value"
        :message="accessErrorMessage(roles.error.value)"
        :retryable="errorCodeOf(roles.error.value) !== 'forbidden'"
        title="Could not load roles"
        @retry="roles.refetch()"
      />

      <EmptyState v-else-if="!roles.data.value || roles.data.value.length === 0" title="No roles yet" />

      <RolesTable
        v-else
        :held-roles="heldRoles"
        :rows="roles.data.value"
        @delete="openDelete"
        @edit="openEditor"
      />
    </Panel>

    <StaffRolesModal
      v-model="rolesOpen"
      :branches="canSeeBranches ? (branches.data.value ?? null) : null"
      :loading="setRoles.isPending.value || setBranch.isPending.value"
      :member="editingMember"
      :my-permissions="myPermissions"
      :roles="roles.data.value ?? []"
      :submit-error="rolesError"
      @confirm="saveRoles"
    />

    <AddStaffModal
      v-model="addOpen"
      :branches="canSeeBranches ? (branches.data.value ?? null) : null"
      :field-errors="addFieldErrors"
      :loading="createStaff.isPending.value"
      :my-permissions="myPermissions"
      :roles="roles.data.value ?? []"
      :submit-error="addError"
      @confirm="saveNewStaff"
    />

    <StaffStatusModal
      v-model="statusOpen"
      :action="statusAction"
      :loading="disableStaff.isPending.value || enableStaff.isPending.value"
      :member="statusMember"
      :submit-error="statusError"
      @confirm="confirmStatus"
    />

    <RoleEditorModal
      v-model="editorOpen"
      :catalogue="catalogue.data.value ?? []"
      :field-errors="editorFieldErrors"
      :loading="createRole.isPending.value || updateRole.isPending.value"
      :my-permissions="myPermissions"
      :role="editingRole"
      :submit-error="editorError"
      @create="saveNewRole"
      @update="saveRole"
    />

    <RoleDeleteModal
      v-model="deleteOpen"
      :loading="deleteRole.isPending.value"
      :role="deletingRole"
      :submit-error="deleteError"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { CreateRoleInput, CreateStaffInput, Role, StaffMember, StaffStatusFilter, UpdateRoleInput } from '@/types/access'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { accessErrorMessage, fieldError } from '@/components/staff/accessErrors'
  import AddStaffModal from '@/components/staff/AddStaffModal.vue'
  import RoleDeleteModal from '@/components/staff/RoleDeleteModal.vue'
  import RoleEditorModal from '@/components/staff/RoleEditorModal.vue'
  import RolesTable from '@/components/staff/RolesTable.vue'
  import StaffRolesModal from '@/components/staff/StaffRolesModal.vue'
  import StaffStatusModal from '@/components/staff/StaffStatusModal.vue'
  import StaffTable from '@/components/staff/StaffTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Pagination from '@/components/ui/Pagination.vue'
  import Panel from '@/components/ui/Panel.vue'
  import {
    useCreateRole,
    useCreateStaff,
    useDeleteRole,
    useDisableStaff,
    useEnableStaff,
    usePermissionCatalogueQuery,
    useRolesQuery,
    useSetStaffRoles,
    useStaffQuery,
    useUpdateRole,
  } from '@/composables/useAccessControl'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { usePermissions } from '@/composables/usePermissions'
  import { useBranchesQuery, useSetStaffBranch } from '@/composables/useReference'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'
  import { sameMembers } from '@/types/access'
  import { PERMISSIONS } from '@/types/staff'

  type Tab = 'staff' | 'roles'

  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const { can, permissions: myPermissions } = usePermissions()
  const { ok } = useToast()

  // Viewing needs staff.view (route guard); every change needs roles.manage.
  const canManage = computed(() => can(PERMISSIONS.rolesManage))
  const heldRoles = computed(() => auth.user?.roles.map(r => r.name) ?? [])
  // Create, disable and enable need staff.manage (the CEO's, Backend spec 020).
  const canManageStaff = computed(() => can(PERMISSIONS.staffManage))

  const tab = computed<Tab>(() => (canManage.value && route.query.tab === 'roles' ? 'roles' : 'staff'))
  const tabOptions: Array<{ value: Tab, label: string }> = [
    { value: 'staff', label: 'Staff' },
    { value: 'roles', label: 'Roles' },
  ]
  function setTab (value: Tab) {
    router.replace({ query: { ...route.query, tab: value === 'staff' ? undefined : value } })
  }

  const page = ref(1)
  const status = computed<StaffStatusFilter>(() => {
    const value = route.query.status
    return value === 'active' || value === 'disabled' ? value : 'all'
  })
  const statusOptions: Array<{ value: StaffStatusFilter, label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
  ]
  function setStatus (value: StaffStatusFilter) {
    page.value = 1
    router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
  }
  const staff = useStaffQuery(page, status)
  // The role list feeds the add dialog too, so it is loaded for either permission.
  const roles = useRolesQuery(computed(() => canManage.value || canManageStaff.value))
  const catalogue = usePermissionCatalogueQuery(canManage)

  // The branch picker needs the branch list (reference.view, Backend spec 004).
  const canSeeBranches = computed(() => (canManage.value || canManageStaff.value) && can(PERMISSIONS.referenceView))
  const branches = useBranchesQuery(canSeeBranches)

  // Staff → roles dialog
  const setRoles = useSetStaffRoles()
  const setBranch = useSetStaffBranch()
  const rolesOpen = ref(false)
  const editingMember = ref<StaffMember | null>(null)
  const rolesError = ref<string>()

  function openRoles (member: StaffMember) {
    editingMember.value = member
    rolesError.value = undefined
    setRoles.reset()
    setBranch.reset()
    rolesOpen.value = true
  }

  // Roles and branch are two Backend calls, each audited with the same reason; only
  // what changed is sent. If the second call fails, the first has already applied.
  async function saveRoles (payload: { roles: string[], branchId?: number | null, reason: string }) {
    const member = editingMember.value
    if (!member) return
    rolesError.value = undefined
    const rolesChanged = !sameMembers(payload.roles, member.roles.map(r => r.name))
    try {
      if (rolesChanged) {
        await setRoles.mutateAsync({ id: member.id, roles: payload.roles, reason: payload.reason })
      }
      if (payload.branchId !== undefined) {
        await setBranch.mutateAsync({ id: member.id, branchId: payload.branchId, reason: payload.reason })
      }
      rolesOpen.value = false
      ok(`Permissions saved for ${member.fullName}.`)
    } catch (error) {
      rolesError.value = accessErrorMessage(error)
    }
  }

  // Add a staff member (Backend spec 020). One Idempotency-Key per submission; a retry of the same
  // form reuses it, a changed form gets a new one.
  const createStaff = useCreateStaff()
  const addKey = useIdempotencyKey()
  const addOpen = ref(false)
  const addError = ref<string>()
  const addFieldErrors = ref<Partial<Record<'full_name' | 'email' | 'phone' | 'roles' | 'branch_id', string>>>({})

  function openAdd () {
    addError.value = undefined
    addFieldErrors.value = {}
    addKey.reset()
    createStaff.reset()
    addOpen.value = true
  }

  function saveNewStaff (input: CreateStaffInput) {
    addError.value = undefined
    addFieldErrors.value = {}
    createStaff.mutate({ staff: input, key: addKey.keyFor(input) }, {
      onSuccess: member => {
        addOpen.value = false
        addKey.reset()
        ok(`${member.fullName} was added. An email with the set-password link is on its way.`)
      },
      onError: error => {
        addFieldErrors.value = {
          full_name: fieldError(error, 'full_name'),
          email: fieldError(error, 'email'),
          phone: fieldError(error, 'phone'),
          roles: fieldError(error, 'roles'),
          branch_id: fieldError(error, 'branch_id'),
        }
        addError.value = accessErrorMessage(error)
      },
    })
  }

  // Disable or enable (reason required, Idempotency-Key).
  const disableStaff = useDisableStaff()
  const enableStaff = useEnableStaff()
  const statusKey = useIdempotencyKey()
  const statusOpen = ref(false)
  const statusMember = ref<StaffMember | null>(null)
  const statusAction = ref<'disable' | 'enable'>('disable')
  const statusError = ref<string>()

  function openStatus (member: StaffMember, action: 'disable' | 'enable') {
    statusMember.value = member
    statusAction.value = action
    statusError.value = undefined
    statusKey.reset()
    disableStaff.reset()
    enableStaff.reset()
    statusOpen.value = true
  }

  function confirmStatus (reason: string) {
    const member = statusMember.value
    if (!member) return
    statusError.value = undefined
    const input = { id: member.id, reason, key: statusKey.keyFor({ id: member.id, reason, action: statusAction.value }) }
    const done = (text: string) => {
      statusOpen.value = false
      statusKey.reset()
      ok(text)
    }
    const failed = (error: unknown) => {
      statusError.value = accessErrorMessage(error)
    }
    if (statusAction.value === 'disable') {
      disableStaff.mutate(input, { onSuccess: () => done(`${member.fullName} was disabled and signed out everywhere.`), onError: failed })
    } else {
      enableStaff.mutate(input, { onSuccess: () => done(`${member.fullName} was enabled. A new set-password link is on its way.`), onError: failed })
    }
  }

  // Roles → editor
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const editorOpen = ref(false)
  const editingRole = ref<Role | null>(null)
  const editorError = ref<string>()
  const editorFieldErrors = ref<Partial<Record<'name' | 'display_name' | 'description', string>>>({})

  function openEditor (role: Role | null) {
    editingRole.value = role
    editorError.value = undefined
    editorFieldErrors.value = {}
    editorOpen.value = true
  }

  function onEditorError (error: unknown) {
    editorFieldErrors.value = {
      name: fieldError(error, 'name'),
      display_name: fieldError(error, 'display_name'),
      description: fieldError(error, 'description'),
    }
    editorError.value = accessErrorMessage(error)
  }

  function saveNewRole (payload: CreateRoleInput) {
    editorError.value = undefined
    createRole.mutate(payload, {
      onSuccess: role => {
        editorOpen.value = false
        ok(`Role "${role.displayName}" created.`)
      },
      onError: onEditorError,
    })
  }

  function saveRole (payload: UpdateRoleInput) {
    if (!editingRole.value) return
    editorError.value = undefined
    updateRole.mutate({ name: editingRole.value.name, ...payload }, {
      onSuccess: role => {
        editorOpen.value = false
        ok(`Role "${role.displayName}" saved.`)
      },
      onError: onEditorError,
    })
  }

  // Roles → delete
  const deleteRole = useDeleteRole()
  const deleteOpen = ref(false)
  const deletingRole = ref<Role | null>(null)
  const deleteError = ref<string>()

  function openDelete (role: Role) {
    deletingRole.value = role
    deleteError.value = undefined
    deleteOpen.value = true
  }

  function confirmDelete (reason: string) {
    if (!deletingRole.value) return
    const label = deletingRole.value.displayName
    deleteError.value = undefined
    deleteRole.mutate({ name: deletingRole.value.name, reason }, {
      onSuccess: () => {
        deleteOpen.value = false
        ok(`Role "${label}" deleted.`)
      },
      onError: error => {
        deleteError.value = accessErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-staffpage__stale { opacity: .55; transition: opacity .15s ease; }
</style>
