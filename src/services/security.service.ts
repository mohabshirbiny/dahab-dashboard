import type {
  ApiAccountFreeze,
  ApiDeviceApproval,
  ApiDeviceApprovalPage,
  ApiEnvelope,
  ApiFounderDevices,
  ApiFreezePage,
  ApiStaffRef,
} from '@/types/api'
import type {
  AccountFreeze,
  DeviceApproval,
  DeviceApprovalPage,
  DeviceApprovalState,
  FounderDevices,
  FreezePage,
  StaffRefLite,
} from '@/types/security'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Founder-account security (Backend spec 021): held device requests, known devices, freeze and
// the dual unfreeze. Founders only, except the freezes and unfreeze, which holders of
// founder.unfreeze_second also reach. The Backend decides every rule; this only maps shapes.

function toRef (ref: ApiStaffRef): StaffRefLite {
  return { id: ref.id, name: ref.full_name }
}

function toApproval (a: ApiDeviceApproval): DeviceApproval {
  return {
    id: a.id,
    founder: toRef(a.founder),
    status: a.status,
    platform: a.platform,
    userAgent: a.user_agent,
    ipAddress: a.ip_address,
    deviceRef: a.device_ref,
    requestedAt: a.requested_at,
    expiresAt: a.expires_at,
    decidedBy: a.decided_by ? toRef(a.decided_by) : null,
    decidedAt: a.decided_at,
    decisionNote: a.decision_note,
    collectedAt: a.collected_at,
    canDecide: a.can_decide,
  }
}

function toFreeze (f: ApiAccountFreeze): AccountFreeze {
  return {
    id: f.id,
    frozenStaff: toRef(f.frozen_staff),
    frozenBy: toRef(f.frozen_by),
    frozenAt: f.frozen_at,
    reason: f.reason,
    stage: f.stage,
    confirmations: f.confirmations.map(c => ({ slot: c.slot, kind: c.kind, by: c.by ? toRef(c.by) : null, at: c.at })),
    unfrozenAt: f.unfrozen_at,
    canConfirm: f.can_confirm,
    mySlot: f.my_slot,
    sessionsEnded: f.sessions_ended,
    pendingApprovalsEnded: f.pending_approvals_ended,
  }
}

export const securityService = {
  // GET /dashboard/founder/device-approvals?status=&page=
  async listApprovals (status: DeviceApprovalState | 'all', page = 1, perPage = 20): Promise<DeviceApprovalPage> {
    const { data } = await http.get<ApiDeviceApprovalPage>(endpoints.founderDeviceApprovals, {
      params: { status, page, per_page: perPage },
    })
    return {
      rows: data.data.map(a => toApproval(a)),
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
      total: data.meta.total,
      pendingForMe: data.meta.pending_for_me,
    }
  },

  // POST /dashboard/founder/device-approvals/{id}/approve   (Idempotency-Key)
  async approve (id: string, note: string | null, idempotencyKey: string): Promise<DeviceApproval> {
    const { data } = await http.post<ApiEnvelope<ApiDeviceApproval>>(endpoints.founderDeviceApprove(id), { note }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toApproval(data.data)
  },

  // POST /dashboard/founder/device-approvals/{id}/refuse   (Idempotency-Key)
  async refuse (id: string, note: string | null, idempotencyKey: string): Promise<DeviceApproval> {
    const { data } = await http.post<ApiEnvelope<ApiDeviceApproval>>(endpoints.founderDeviceRefuse(id), { note }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toApproval(data.data)
  },

  // GET /dashboard/founder/devices
  async devices (): Promise<FounderDevices[]> {
    const { data } = await http.get<ApiEnvelope<ApiFounderDevices[]>>(endpoints.founderDevices)
    return data.data.map(f => ({
      founder: toRef(f.founder),
      devices: f.devices.map(d => ({ deviceRef: d.device_ref, firstSeenAt: d.first_seen_at, lastSeenAt: d.last_seen_at })),
    }))
  },

  // POST /dashboard/founder/freeze   (Idempotency-Key). Reason required.
  async freeze (staffId: string, reason: string, idempotencyKey: string): Promise<AccountFreeze> {
    const { data } = await http.post<ApiEnvelope<ApiAccountFreeze>>(endpoints.founderFreeze, { staff_id: staffId, reason }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toFreeze(data.data)
  },

  // GET /dashboard/founder/freezes?state=open|all
  async listFreezes (state: 'open' | 'all', page = 1, perPage = 20): Promise<FreezePage> {
    const { data } = await http.get<ApiFreezePage>(endpoints.founderFreezes, { params: { state, page, per_page: perPage } })
    return {
      rows: data.data.map(f => toFreeze(f)),
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
      total: data.meta.total,
    }
  },

  // POST /dashboard/founder/unfreeze   (Idempotency-Key). One confirmation; the server picks the slot.
  async confirmUnfreeze (freezeId: string, note: string | null, idempotencyKey: string): Promise<AccountFreeze> {
    const { data } = await http.post<ApiEnvelope<ApiAccountFreeze>>(endpoints.founderUnfreeze, { freeze_id: freezeId, note }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toFreeze(data.data)
  },
}
