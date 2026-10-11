import type {
  CreateRoleInput,
  CreateStaffInput,
  PermissionEntry,
  Role,
  StaffListResult,
  StaffMember,
  StaffStatusFilter,
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

export function toStaffMember (s: ApiStaffMember): StaffMember {
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
    // An older Backend does not send it: treat the member as having a password.
    passwordSet: s.password_set ?? true,
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

  // GET /dashboard/staff?role=&status=&per_page=&page=   (staff.view) — ordered by name.
  // `status` (Backend spec 020): active or disabled; 'all' sends nothing.
  async listStaff (params: { page: number, pageSize: number, role?: string, status?: StaffStatusFilter }): Promise<StaffListResult> {
    const { data } = await http.get<ApiPaginated<ApiStaffMember>>(endpoints.staff, {
      params: {
        page: params.page,
        per_page: params.pageSize,
        role: params.role || undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
      },
    })
    return {
      items: data.data.map(s => toStaffMember(s)),
      total: data.meta.total,
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
    }
  },

  // POST /dashboard/staff   (staff.manage, Idempotency-Key). No password is sent: the Backend mails an
  // invitation link and the member chooses one. `idempotencyKey` is reused when the same form is retried.
  async createStaff (input: CreateStaffInput, idempotencyKey: string): Promise<StaffMember> {
    const { data } = await http.post<ApiEnvelope<ApiStaffMember>>(endpoints.staff, {
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || undefined,
      roles: input.roles,
      branch_id: input.branchId,
      reason: input.reason,
    }, { headers: { 'Idempotency-Key': idempotencyKey } })
    return toStaffMember(data.data)
  },

  // POST /dashboard/staff/{staff}/disable   (staff.manage, Idempotency-Key) — reason required.
  async disableStaff (id: string, reason: string, idempotencyKey: string): Promise<StaffMember> {
    const { data } = await http.post<ApiEnvelope<ApiStaffMember>>(endpoints.staffDisable(id), { reason }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toStaffMember(data.data)
  },

  // POST /dashboard/staff/{staff}/enable   (staff.manage, Idempotency-Key) — the old password is deleted
  // and a new link is mailed.
  async enableStaff (id: string, reason: string, idempotencyKey: string): Promise<StaffMember> {
    const { data } = await http.post<ApiEnvelope<ApiStaffMember>>(endpoints.staffEnable(id), { reason }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toStaffMember(data.data)
  },

  // PUT /dashboard/staff/{staff}/roles   (roles.manage) — replaces the whole set; reason required.
  async setStaffRoles (id: string, roles: string[], reason: string): Promise<StaffMember> {
    const { data } = await http.put<ApiEnvelope<ApiStaffMember>>(endpoints.staffRoles(id), { roles, reason })
    return toStaffMember(data.data)
  },
}
