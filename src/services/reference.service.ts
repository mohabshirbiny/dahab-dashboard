import type { StaffMember } from '@/types/access'
import type { ApiBranch, ApiBranchClosure, ApiEnvelope, ApiKarat, ApiStaffMember } from '@/types/api'
import type {
  Branch,
  BranchClosure,
  BranchHour,
  BranchInput,
  CreateClosureInput,
  CreateKaratInput,
  Karat,
} from '@/types/reference'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { toStaffMember } from './access.service'

function toKarat (k: ApiKarat): Karat {
  return { code: k.code, purity: k.purity, isEnabled: k.is_enabled, sortOrder: k.sort_order }
}

function toBranch (b: ApiBranch): Branch {
  return {
    id: b.id,
    nameEn: b.name_en,
    nameAr: b.name_ar,
    addressEn: b.address_en,
    addressAr: b.address_ar,
    phone: b.contact_phone ?? null,
    mapUrl: b.map_url ?? null,
    timezone: b.timezone,
    isEnabled: b.is_enabled,
    hours: b.hours.map(h => ({ dow: h.dow, opensAt: h.opens_at, closesAt: h.closes_at })),
  }
}

function toClosure (c: ApiBranchClosure): BranchClosure {
  return {
    id: c.id,
    branchId: c.branch_id,
    closureDate: c.closure_date,
    reasonEn: c.reason_en,
    reasonAr: c.reason_ar,
  }
}

function hoursBody (hours: readonly BranchHour[]) {
  return hours.map(h => ({ dow: h.dow, opens_at: h.opensAt, closes_at: h.closesAt }))
}

function branchBody (input: BranchInput) {
  return {
    name_en: input.nameEn,
    name_ar: input.nameAr,
    address_en: input.addressEn,
    address_ar: input.addressAr,
    contact_phone: input.phone,
    map_url: input.mapUrl,
    timezone: input.timezone,
    is_enabled: input.isEnabled,
    hours: hoursBody(input.hours),
  }
}

// Reference data (Backend spec 004). Viewing needs reference.view; each change has
// its own permission, re-checked by the Backend, and is audited there.
export const referenceService = {
  // GET /dashboard/karats   (reference.view) — display order.
  async listKarats (): Promise<Karat[]> {
    const { data } = await http.get<ApiEnvelope<ApiKarat[]>>(endpoints.karats)
    return data.data.map(k => toKarat(k))
  },

  // POST /dashboard/karats   (karats.create) — the new karat starts off.
  async createKarat (input: CreateKaratInput): Promise<Karat> {
    const { data } = await http.post<ApiEnvelope<ApiKarat>>(endpoints.karats, { code: input.code, purity: input.purity })
    return toKarat(data.data)
  },

  // POST /dashboard/karats/{code}/toggle   (karats.toggle)
  async toggleKarat (code: number, enabled: boolean): Promise<Karat> {
    const { data } = await http.post<ApiEnvelope<ApiKarat>>(endpoints.karatToggle(code), { enabled })
    return toKarat(data.data)
  },

  // GET /dashboard/branches   (reference.view) — enabled and disabled, with their week.
  async listBranches (): Promise<Branch[]> {
    const { data } = await http.get<ApiEnvelope<ApiBranch[]>>(endpoints.branches)
    return data.data.map(b => toBranch(b))
  },

  // POST /dashboard/branches   (branches.manage)
  async createBranch (input: BranchInput): Promise<Branch> {
    const { data } = await http.post<ApiEnvelope<ApiBranch>>(endpoints.branches, branchBody(input))
    return toBranch(data.data)
  },

  // PATCH /dashboard/branches/{branch}   (branches.manage) — the whole week is replaced.
  async updateBranch (id: number, input: BranchInput): Promise<Branch> {
    const { data } = await http.patch<ApiEnvelope<ApiBranch>>(endpoints.branch(id), branchBody(input))
    return toBranch(data.data)
  },

  // GET /dashboard/branch-closures   (reference.view) — date ascending.
  async listClosures (): Promise<BranchClosure[]> {
    const { data } = await http.get<ApiEnvelope<ApiBranchClosure[]>>(endpoints.branchClosures)
    return data.data.map(c => toClosure(c))
  },

  // POST /dashboard/branch-closures   (branches.manage) — 409 closure_exists for a duplicate.
  async createClosure (input: CreateClosureInput): Promise<BranchClosure> {
    const { data } = await http.post<ApiEnvelope<ApiBranchClosure>>(endpoints.branchClosures, {
      branch_id: input.branchId,
      closure_date: input.closureDate,
      reason_en: input.reasonEn,
      reason_ar: input.reasonAr,
    })
    return toClosure(data.data)
  },

  // DELETE /dashboard/branch-closures/{closure}   (branches.manage) — future only (409 closure_in_past).
  async deleteClosure (id: number): Promise<void> {
    await http.delete(endpoints.branchClosure(id))
  },

  // PUT /dashboard/staff/{staff}/branch   (roles.manage) — reason required; not on yourself.
  async setStaffBranch (id: string, branchId: number | null, reason: string): Promise<StaffMember> {
    const { data } = await http.put<ApiEnvelope<ApiStaffMember>>(endpoints.staffBranch(id), { branch_id: branchId, reason })
    return toStaffMember(data.data)
  },
}
