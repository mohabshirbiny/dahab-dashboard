import type {
  CreateRoleInput,
  PermissionEntry,
  Role,
  StaffListResult,
  StaffMember,
  UpdateRoleInput,
} from '@/types/access'
import type { ApiEnvelope, ApiPaginated, ApiPermission, ApiRole, ApiStaffMember } from '@/types/api'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

function toPermission (p: ApiPermission): PermissionEntry {
  return { code: p.code, label: p.label, group: p.group, branchScoped: p.branch_scoped }
}

function toRole (r: ApiRole): Role {
  return {
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    requiresMfa: r.requires_mfa,
    permissions: r.permissions,
    staffCount: r.staff_count,
  }
}

function toStaffMember (s: ApiStaffMember): StaffMember {
  return {
    id: s.id,
    fullName: s.full_name,
    email: s.email,
    phone: s.phone,
    isActive: s.is_active,
    isFounder: s.is_founder,
    branchId: s.branch_id,
    roles: s.roles.map(role => ({ name: role.name, displayName: role.display_name })),
    permissions: s.permissions,
  }
}

// Staff roles and permissions (Backend spec 002). Every write is re-checked by the
// Backend: no self-escalation (`escalation_denied`), a written reason where required
// (`reason_required`), and the other refusals listed in docs/features.
export const accessService = {
  // GET /dashboard/permissions   (roles.manage)
  async listPermissions (): Promise<PermissionEntry[]> {
    const { data } = await http.get<ApiEnvelope<ApiPermission[]>>(endpoints.permissions)
    return data.data.map(p => toPermission(p))
  },

  // GET /dashboard/roles   (roles.manage) — ordered by display name, at most 200.
  async listRoles (): Promise<Role[]> {
    const { data } = await http.get<ApiEnvelope<ApiRole[]>>(endpoints.roles)
    return data.data.map(r => toRole(r))
  },

  // POST /dashboard/roles   (roles.manage)
  async createRole (input: CreateRoleInput): Promise<Role> {
    const { data } = await http.post<ApiEnvelope<ApiRole>>(endpoints.roles, {
      name: input.name,
      display_name: input.displayName,
      description: input.description,
      requires_mfa: input.requiresMfa,
      permissions: input.permissions,
      reason: input.reason || undefined,
    })
    return toRole(data.data)
  },

  // PATCH /dashboard/roles/{role}   (roles.manage) — only the changed fields are sent.
  async updateRole (name: string, input: UpdateRoleInput): Promise<Role> {
    const body: Record<string, unknown> = {}
    if (input.displayName !== undefined) {
      body.display_name = input.displayName
    }
    if (input.description !== undefined) {
      body.description = input.description
    }
    if (input.requiresMfa !== undefined) {
      body.requires_mfa = input.requiresMfa
    }
    if (input.permissions !== undefined) {
      body.permissions = input.permissions
    }
    if (input.reason) {
      body.reason = input.reason
    }
    const { data } = await http.patch<ApiEnvelope<ApiRole>>(endpoints.role(name), body)
    return toRole(data.data)
  },

  // DELETE /dashboard/roles/{role}   (roles.manage) — reason required; 409 role_in_use while held.
  async deleteRole (name: string, reason: string): Promise<void> {
    await http.delete(endpoints.role(name), { data: { reason } })
  },

  // GET /dashboard/staff?role=&per_page=&page=   (staff.view) — ordered by name.
  async listStaff (params: { page: number, pageSize: number, role?: string }): Promise<StaffListResult> {
    const { data } = await http.get<ApiPaginated<ApiStaffMember>>(endpoints.staff, {
      params: { page: params.page, per_page: params.pageSize, role: params.role || undefined },
    })
    return {
      items: data.data.map(s => toStaffMember(s)),
      total: data.meta.total,
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
    }
  },

  // PUT /dashboard/staff/{staff}/roles   (roles.manage) — replaces the whole set; reason required.
  async setStaffRoles (id: string, roles: string[], reason: string): Promise<StaffMember> {
    const { data } = await http.put<ApiEnvelope<ApiStaffMember>>(endpoints.staffRoles(id), { roles, reason })
    return toStaffMember(data.data)
  },
}
