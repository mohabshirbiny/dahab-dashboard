// Wallet top-up (Backend spec 009, contracts/topup-api.md). A manual transfer: the
// customer files a notice, staff credit what actually arrived. Money is a 4-place
// decimal string from the Backend; the UI formats it and never computes with it.
import type { StatusVariant } from './status'
import type { Money } from './wallet'

export type TopUpMethod = 'bank_transfer' | 'instapay' | 'vodafone_cash'
export type TopUpStatus = 'pending' | 'on_hold' | 'credited' | 'rejected' | 'cancelled'
export type TopUpOrigin = 'notice' | 'by_hand'
export type TopUpRejectReason = 'money_not_received' | 'duplicate_notice' | 'sender_not_accepted' | 'other'
export type TopUpAction = 'match' | 'hold' | 'unhold' | 'reject'

export const TOPUP_METHOD_LABELS: Record<TopUpMethod, string> = {
  bank_transfer: 'Bank transfer',
  instapay: 'InstaPay',
  vodafone_cash: 'Vodafone Cash',
}

export const TOPUP_STATUS_META: Record<TopUpStatus, { label: string, variant: StatusVariant }> = {
  pending: { label: 'Waiting', variant: 'wait' },
  on_hold: { label: 'On hold', variant: 'warn' },
  credited: { label: 'Credited', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'bad' },
  cancelled: { label: 'Cancelled by customer', variant: 'off' },
}

// The customer hears the reason (never the note), in their own words.
export const TOPUP_REJECT_REASON_LABELS: Record<TopUpRejectReason, string> = {
  money_not_received: 'The money did not arrive',
  duplicate_notice: 'Already reported in another notice',
  sender_not_accepted: 'We cannot accept this sender',
  other: 'Something else',
}

export interface TopUpStaffRef {
  id: string
  fullName: string
}

export interface TopUpAccountRef {
  id: number
  method: TopUpMethod
  label: string
  // The notice account's display-only provider fee (e.g. "1.000"); receiving accounts leave it out.
  providerFeePercent?: string | null
}

export interface TopUp {
  id: string
  number: string
  origin: TopUpOrigin
  method: TopUpMethod
  reference: string
  status: TopUpStatus
  claimedAmount: Money | null
  // Display-only estimate: the claim minus the provider fee the account showed when the
  // notice was filed (noticeFeePercent). Null with no fee or once closed. Staff credit
  // what really arrived.
  expectedAmount: Money | null
  // The fee snapshot taken when the notice was filed; a later fee change never moves it.
  noticeFeePercent: string | null
  creditedAmount: Money | null
  hasReceipt: boolean
  submittedAt: string
  customer: { id: string, displayRef: string, fullName: string | null, phone: string | null, status: string }
  noticeAccount: TopUpAccountRef | null
  receivingAccount: TopUpAccountRef | null
  holdNote: string | null
  heldBy: TopUpStaffRef | null
  heldAt: string | null
  rejectReason: TopUpRejectReason | null
  rejectNote: string | null
  rejectedBy: TopUpStaffRef | null
  rejectedAt: string | null
  cancelledAt: string | null
  creditNote: string | null
  // The provider's transaction reference; the Backend requires it for a suspended customer.
  arrivalReference: string | null
  creditedBy: TopUpStaffRef | null
  creditedAt: string | null
  ledgerTxnId: string | null
  allowedActions: TopUpAction[]
}

export interface TopUpListQuery {
  statuses: TopUpStatus[]
  from: string
  to: string
  q: string
}

export interface TopUpPage {
  rows: TopUp[]
  nextCursor: string | null
  totals: { count: number, claimed: Money }
}

export interface MatchTopUpInput {
  amount: string
  receivingAccountId: number
  note: string | null
  arrivalReference: string | null
}

export interface CreditByHandInput {
  customerId: string
  amount: string
  receivingAccountId: number
  note: string
  arrivalReference: string | null
}

export interface ReceivingAccount {
  id: number
  method: TopUpMethod
  label: string
  bankName: string | null
  accountHolder: string | null
  accountNumber: string | null
  iban: string | null
  instapayAddress: string | null
  walletNumber: string | null
  // Display only: never checked against amounts.
  dailyLimit: Money | null
  providerFeePercent: string | null
  customerNote: string | null
  sortOrder: number
  isActive: boolean
  updatedAt: string
  updatedBy: TopUpStaffRef | null
}

export interface ReceivingAccountInput {
  label: string
  bankName: string | null
  accountHolder: string | null
  accountNumber: string | null
  iban: string | null
  instapayAddress: string | null
  walletNumber: string | null
  dailyLimit: string | null
  providerFeePercent: string | null
  customerNote: string | null
  sortOrder: number
  isActive: boolean
}
