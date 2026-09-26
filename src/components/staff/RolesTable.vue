<template>
  <DataTable>
    <template #head>
      <th>Role</th>
      <th>Can do</th>
      <th>Staff</th>
      <th aria-label="Actions" class="r" />
    </template>

    <tr v-for="role in rows" :key="role.name">
      <td>
        <div class="d-roles__name">
          {{ role.displayName }}
          <StatusTag v-if="role.requiresMfa" label="MFA" variant="info" />
          <StatusTag v-if="heldRoles.includes(role.name)" label="Yours" variant="off" />
        </div>

        <div class="who2">{{ role.description ?? role.name }}</div>
      </td>

      <td :title="role.permissions.join(', ')">
        {{ role.permissions.length === 0 ? 'Nothing yet' : role.permissions.length === 1 ? '1 permission' : `${role.permissions.length} permissions` }}
      </td>

      <td>{{ role.staffCount }}</td>

      <td class="r">
        <div class="d-roles__actions">
          <DBtn
            :aria-label="`Edit ${role.displayName}`"
            :disabled="heldRoles.includes(role.name)"
            :title="heldRoles.includes(role.name) ? 'Another role manager has to edit a role you hold.' : undefined"
            @click="emit('edit', role)"
          >
            Edit
          </DBtn>

          <DBtn
            :aria-label="`Delete ${role.displayName}`"
            :disabled="heldRoles.includes(role.name) || role.staffCount > 0"
            kind="danger"
            :title="deleteBlockedReason(role)"
            @click="emit('delete', role)"
          >
            Delete
          </DBtn>
        </div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Role } from '@/types/access'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'

  const props = defineProps<{
    rows: readonly Role[]
    // Roles the signed-in manager holds: the Backend refuses to edit or delete them.
    heldRoles: readonly string[]
  }>()

  const emit = defineEmits<{
    (e: 'edit' | 'delete', role: Role): void
  }>()

  function deleteBlockedReason (role: Role): string | undefined {
    if (props.heldRoles.includes(role.name)) return 'Another role manager has to delete a role you hold.'
    if (role.staffCount > 0) return 'Give the staff who hold this role other roles first.'
    return undefined
  }
</script>

<style lang="scss" scoped>
.d-roles__name {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--ink);
  font-weight: 500;
}
.d-roles__actions { display: inline-flex; gap: 6px; justify-content: flex-end; }
</style>
