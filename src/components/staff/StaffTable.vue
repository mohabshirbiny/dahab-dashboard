<template>
  <DataTable>
    <template #head>
      <th>Person</th>
      <th>Role</th>
      <th>Can do</th>
      <th v-if="canManage || canManageStaff" aria-label="Action" class="r" />
    </template>

    <tr v-for="row in rows" :key="row.id">
      <td>
        <div class="d-staff__name">
          {{ row.fullName }}
          <StatusTag v-if="row.id === currentUserId" label="You" variant="info" />
          <StatusTag v-if="row.isFounder" label="Founder" variant="ok" />
          <StatusTag v-if="!row.isActive" label="Disabled" variant="off" />
          <StatusTag v-else-if="!row.passwordSet" label="Invitation pending" variant="wait" />
        </div>

        <div class="who2">{{ row.email }}</div>
      </td>

      <td>
        <template v-if="row.roles.length > 0">{{ roleSummary(row.roles) }}</template>
        <span v-else class="d-staff__none">No role</span>
      </td>

      <td :title="row.permissions.join(', ')">
        {{ canDoSummary(row.permissions) }}
      </td>

      <td v-if="canManage || canManageStaff" class="r">
        <div class="d-staff__actions">
          <DBtn
            v-if="canManage && row.isActive"
            :aria-label="`Permissions for ${row.fullName}`"
            :disabled="row.id === currentUserId"
            :title="row.id === currentUserId ? 'Another role manager has to change your own roles.' : undefined"
            @click="emit('permissions', row)"
          >
            Permissions
          </DBtn>
          <!-- Hidden for yourself and for founders: the Backend refuses both. -->
          <DBtn
            v-if="canManageStaff && row.isActive && row.id !== currentUserId && !row.isFounder"
            :aria-label="`Disable ${row.fullName}`"
            kind="danger"
            @click="emit('disable', row)"
          >
            Disable
          </DBtn>

          <DBtn
            v-if="canManageStaff && !row.isActive && row.id !== currentUserId"
            :aria-label="`Enable ${row.fullName}`"
            @click="emit('enable', row)"
          >
            Enable
          </DBtn>
        </div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { PermissionEntry, StaffMember } from '@/types/access'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { roleSummary } from '@/types/staff'

  const props = defineProps<{
    rows: StaffMember[]
    currentUserId: string | null
    // Only role managers can change someone's roles.
    canManage: boolean
    // Create, disable and enable (staff.manage, Backend spec 020).
    canManageStaff?: boolean
    // Labels for the "Can do" column when the catalogue is available (role managers).
    catalogue?: readonly PermissionEntry[]
  }>()

  const emit = defineEmits<{ (e: 'permissions' | 'disable' | 'enable', row: StaffMember): void }>()

  // The Backend lists permission codes; show their labels when known, otherwise a count.
  function canDoSummary (codes: readonly string[]): string {
    if (codes.length === 0) return 'Nothing yet'
    const labels = props.catalogue
      ? codes.map(code => props.catalogue?.find(p => p.code === code)?.label ?? code)
      : []
    if (labels.length > 0 && labels.length <= 2) return labels.join(' · ')
    return codes.length === 1 ? '1 permission' : `${codes.length} permissions`
  }
</script>

<style lang="scss" scoped>
.d-staff__name {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--ink);
  font-weight: 500;
}
.d-staff__none { color: var(--ink-3); }
.d-staff__actions { display: inline-flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
</style>
