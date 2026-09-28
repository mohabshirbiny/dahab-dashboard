import type { ApiAuditCategory, ApiAuditEntry, ApiAuditPage, ApiEnvelope } from '@/types/api'
import type { AuditCategory, AuditEntry, AuditEntryDetail, AuditFilters, AuditPage } from '@/types/audit'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Also used by the Customer file's History (Backend spec 007), which returns the same entries.
export function toEntry (e: ApiAuditEntry): AuditEntry {
  return {
    id: e.id,
    at: e.at,
    actor: e.actor,
    action: e.action,
    label: e.label,
    category: e.category,
    subject: e.subject,
    beforeSummary: e.before_summary,
    afterSummary: e.after_summary,
    reason: e.reason,
    ip: e.ip,
    outcome: e.outcome,
    entity: e.entity,
  }
}

function params (filters: AuditFilters) {
  return {
    from: filters.from,
    to: filters.to,
    category: filters.category ?? undefined,
    actor: filters.actor ?? undefined,
  }
}

// Audit log (Backend spec 006). Without audit.view_all the Backend returns only
// the caller's own actions; this UI never filters visibility itself.
export const auditService = {
  // GET /dashboard/audit-log   (audit.view_all | audit.view_own) — newest first, keyset pages.
  async list (filters: AuditFilters, cursor: string | null, perPage = 50): Promise<AuditPage> {
    const { data } = await http.get<ApiAuditPage>(endpoints.auditLog, {
      params: { ...params(filters), cursor: cursor ?? undefined, per_page: perPage },
    })
    return {
      entries: data.data.map(e => toEntry(e)),
      total: data.meta.total,
      nextCursor: data.meta.next_cursor,
      from: data.meta.from,
      to: data.meta.to,
    }
  },

  // GET /dashboard/audit-log/{id} — 404 when not visible to the caller.
  async entry (id: number): Promise<AuditEntryDetail> {
    const { data } = await http.get<ApiEnvelope<ApiAuditEntry>>(endpoints.auditEntry(id))
    return {
      ...toEntry(data.data),
      before: data.data.before ?? null,
      after: data.data.after ?? null,
      deviceFingerprint: data.data.device_fingerprint ?? null,
    }
  },

  // GET /dashboard/audit-log/categories
  async categories (): Promise<AuditCategory[]> {
    const { data } = await http.get<ApiEnvelope<ApiAuditCategory[]>>(endpoints.auditCategories)
    return data.data.map(c => ({ value: c.value, label: c.label, inEverything: c.in_everything }))
  },

  // GET /dashboard/audit-log/export — a CSV file; the Backend records each export.
  async exportCsv (filters: AuditFilters): Promise<{ blob: Blob, filename: string, truncated: boolean }> {
    const response = await http.get<Blob>(endpoints.auditExport, { params: params(filters), responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'audit-log.csv'
    return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
  },
}
