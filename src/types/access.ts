// Access control: staff, roles and the permission catalogue (Backend spec 002).
// Wire shapes are in `src/types/api.ts`; `access.service.ts` maps them to these.
import type { RoleRef } from './staff'

// One entry of the code-defined catalogue. The Dashboard cannot create or delete
// permissions, only assign them to roles.
export interface PermissionEntry {
  code: string
  label: string
  group: string
  branchScoped: boolean
}

export interface Role {
  name: string
  displayName: string
  description: string | null
  requiresMfa: boolean
  permissions: readonly string[]
  staffCount: number
}

export interface StaffMember {
  id: string
  fullName: string
  email: string
  phone: string | null
  isActive: boolean
  isFounder: boolean
  branchId: number | null
  roles: readonly RoleRef[]
  permissions: readonly string[]
}

export interface StaffListResult {
  items: StaffMember[]
  total: number
  page: number
  pageSize: number
}

export const STAFF_PAGE_SIZE = 25

export interface CreateRoleInput {
  name: string
  displayName: string
  description: string | null
  requiresMfa: boolean
  permissions: string[]
  reason?: string
}

// Only the fields that changed are sent. `reason` is required by the Backend when
// the permission set or the MFA flag changes.
export interface UpdateRoleInput {
  displayName?: string
  description?: string | null
  requiresMfa?: boolean
  permissions?: string[]
  reason?: string
}

// Rules the Backend enforces; mirrored here only to help while typing.
export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{2,49}$/
export const ROLE_DISPLAY_NAME_MAX = 100
export const ROLE_DESCRIPTION_MAX = 500
export const REASON_MIN = 5
export const REASON_MAX = 500

// True when both lists hold the same codes, in any order.
export function sameMembers (a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(value => b.includes(value))
}
