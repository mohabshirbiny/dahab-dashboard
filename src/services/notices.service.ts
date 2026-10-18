import type { ApiEnvelope, ApiStaffNotice, ApiStaffNoticePage } from '@/types/api'
import type { StaffNotice, StaffNoticePage } from '@/types/notices'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Dashboard notices, the bell (Backend spec 021). Any staff member; own notices only.

function toNotice (n: ApiStaffNotice): StaffNotice {
  return {
    id: n.id,
    kind: n.kind,
    severity: n.severity,
    title: n.title,
    body: n.body,
    link: n.link,
    count: n.count ?? 1,
    createdAt: n.created_at,
    readAt: n.read_at,
  }
}

export const noticesService = {
  // GET /dashboard/notices?unread=&page=
  async list (unreadOnly = false, page = 1): Promise<StaffNoticePage> {
    const { data } = await http.get<ApiStaffNoticePage>(endpoints.notices, {
      params: { page, ...(unreadOnly ? { unread: 1 } : {}) },
    })
    return {
      rows: data.data.map(n => toNotice(n)),
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
      total: data.meta.total,
      unreadCount: data.meta.unread_count,
    }
  },

  // POST /dashboard/notices/{id}/read
  async markRead (id: string): Promise<StaffNotice> {
    const { data } = await http.post<ApiEnvelope<ApiStaffNotice>>(endpoints.noticeRead(id))
    return toNotice(data.data)
  },

  // POST /dashboard/notices/read-all
  async markAllRead (): Promise<number> {
    const { data } = await http.post<ApiEnvelope<{ marked: number }>>(endpoints.noticesReadAll)
    return data.data.marked
  },
}
