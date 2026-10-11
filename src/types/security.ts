import type { ApiDeviceApprovalState, ApiFreezeStage } from './api'

// Founder-account security (Backend spec 021), as the Security page uses it.

export type DeviceApprovalState = ApiDeviceApprovalState

export interface StaffRefLite {
  id: string
  name: string
}

export interface DeviceApproval {
  id: string
  founder: StaffRefLite
  status: DeviceApprovalState
  platform: string | null
  userAgent: string | null
  ipAddress: string | null
  // The first 8 hex characters of the device's hash; never the device id.
  deviceRef: string
  requestedAt: string
  expiresAt: string
  decidedBy: StaffRefLite | null
  decidedAt: string | null
  decisionNote: string | null
  collectedAt: string | null
  canDecide: boolean
}

export interface DeviceApprovalPage {
  rows: DeviceApproval[]
  page: number
  pageSize: number
  total: number
  pendingForMe: number
}

export interface FounderDevice {
  deviceRef: string
  firstSeenAt: string
  lastSeenAt: string
}

export interface FounderDevices {
  founder: StaffRefLite
  devices: FounderDevice[]
}

export type FreezeStage = ApiFreezeStage

export interface FreezeConfirmation {
  slot: 1 | 2
  kind: 'frozen_founder' | 'second_approver' | 'founder'
  by: StaffRefLite | null
  at: string
}

export interface AccountFreeze {
  id: string
  frozenStaff: StaffRefLite
  frozenBy: StaffRefLite
  frozenAt: string
  reason: string
  stage: FreezeStage
  confirmations: FreezeConfirmation[]
  unfrozenAt: string | null
  // The server decides the slot: a founder who is not frozen gives slot 2 (last),
  // a holder of founder.unfreeze_second slot 1.
  canConfirm: boolean
  mySlot: 1 | 2 | null
  sessionsEnded?: number
  pendingApprovalsEnded?: number
}

export interface FreezePage {
  rows: AccountFreeze[]
  page: number
  pageSize: number
  total: number
}

export interface FrozenConfirmPayload {
  email: string
  password: string
  code?: string
  recoveryCode?: string
  note?: string
}
