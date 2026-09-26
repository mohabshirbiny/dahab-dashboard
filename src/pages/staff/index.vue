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
            :catalogue="catalogue.data.value"
            :current-user-id="auth.user?.id ?? null"
            :rows="staff.data.value.items"
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
      :loading="setRoles.isPending.value"
      :member="editingMember"
      :my-permissions="myPermissions"
      :roles="roles.data.value ?? []"
      :submit-error="rolesError"
      @confirm="saveRoles"
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
  import type { CreateRoleInput, Role, StaffMember, UpdateRoleInput } from '@/types/access'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { accessErrorMessage, fieldError } from '@/components/staff/accessErrors'
  import RoleDeleteModal from '@/components/staff/RoleDeleteModal.vue'
  import RoleEditorModal from '@/components/staff/RoleEditorModal.vue'
  import RolesTable from '@/components/staff/RolesTable.vue'
  import StaffRolesModal from '@/components/staff/StaffRolesModal.vue'
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
    useDeleteRole,
    usePermissionCatalogueQuery,
    useRolesQuery,
    useSetStaffRoles,
    useStaffQuery,
    useUpdateRole,
  } from '@/composables/useAccessControl'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'
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

  const tab = computed<Tab>(() => (canManage.value && route.query.tab === 'roles' ? 'roles' : 'staff'))
  const tabOptions: Array<{ value: Tab, label: string }> = [
    { value: 'staff', label: 'Staff' },
    { value: 'roles', label: 'Roles' },
  ]
  function setTab (value: Tab) {
    router.replace({ query: { ...route.query, tab: value === 'staff' ? undefined : value } })
  }

  const page = ref(1)
  const staff = useStaffQuery(page)
  const roles = useRolesQuery(canManage)
  const catalogue = usePermissionCatalogueQuery(canManage)

  // Staff → roles dialog
  const setRoles = useSetStaffRoles()
  const rolesOpen = ref(false)
  const editingMember = ref<StaffMember | null>(null)
  const rolesError = ref<string>()

  function openRoles (member: StaffMember) {
    editingMember.value = member
    rolesError.value = undefined
    setRoles.reset()
    rolesOpen.value = true
  }

  function saveRoles (payload: { roles: string[], reason: string }) {
    if (!editingMember.value) return
    rolesError.value = undefined
    const name = editingMember.value.fullName
    setRoles.mutate({ id: editingMember.value.id, ...payload }, {
      onSuccess: () => {
        rolesOpen.value = false
        ok(`Roles saved for ${name}.`)
      },
      onError: error => {
        rolesError.value = accessErrorMessage(error)
      },
    })
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
