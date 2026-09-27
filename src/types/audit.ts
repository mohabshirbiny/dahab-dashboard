// Audit log (Backend spec 006). Labels, categories and summaries come from the
// Backend; this UI only shows them.

export type AuditActor
  = | { type: 'staff', id: string, name: string }
    | { type: 'customer', id: string, ref: string }
    | { type: 'system' }

export interface AuditEntry {
  id: number
  at: string
  actor: AuditActor
  action: string
  label: string
  category: string
  subject: string | null
  beforeSummary: string | null
  afterSummary: string | null
  reason: string | null
  ip: string | null
  outcome: string | null
  entity: { type: string, id: string | null }
}

export interface AuditEntryDetail extends AuditEntry {
  before: unknown
  after: unknown
  deviceFingerprint: string | null
}

export interface AuditPage {
  entries: AuditEntry[]
  total: number
  nextCursor: string | null
  from: string
  to: string
}

export interface AuditCategory {
  value: string
  label: string
  inEverything: boolean
}

// What the viewer asked for. `category` null = Everything (all but sign-ins).
export interface AuditFilters {
  from: string
  to: string
  category: string | null
  actor: string | null
}

export function actorLabel (actor: AuditActor): string {
  switch (actor.type) {
    case 'system': {
      return 'System'
    }
    case 'customer': {
      return `Customer ${actor.ref}`
    }
    default: {
      return actor.name
    }
  }
}

// "2026-09-28" in Cairo time, `days` days back from today (today included).
export function cairoDate (daysBack = 0): string {
  const d = new Date(Date.now() - daysBack * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d)
}
