import type { ApiEnvelope } from '@/types/api'
import type {
  ActiveControl,
  CategoryState,
  ControlCategory,
  ControlLevel,
  ControlMessage,
  ControlStaffRef,
  SetControlInput,
  Switches,
  VisibilityKey,
} from '@/types/controls'
import { http } from '@/api/axios'

interface ApiRef { id: string, full_name: string }
interface ApiControl { level: ControlLevel, message: ControlMessage, reason: string, set_by: ApiRef | null, set_at: string }
interface ApiCategory {
  category: ControlCategory
  state: ControlLevel | 'open'
  controls: ApiControl[]
  live_count: number
  no_request_count: number
  price_locked_count: number
}
interface ApiSwitches {
  stop_everything: { active: boolean, set_by: ApiRef | null, set_at: string | null, reason: string | null, message: ControlMessage }
  categories: ApiCategory[]
  visibility: Switches['visibility']
}

const ref = (r: ApiRef | null): ControlStaffRef | null => (r ? { id: r.id, fullName: r.full_name } : null)
const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

function toControl (c: ApiControl): ActiveControl {
  return { level: c.level, message: c.message, reason: c.reason, setBy: ref(c.set_by), setAt: c.set_at }
}

function toCategory (c: ApiCategory): CategoryState {
  return {
    category: c.category,
    state: c.state,
    controls: c.controls.map(x => toControl(x)),
    liveCount: c.live_count,
    noRequestCount: c.no_request_count,
    priceLockedCount: c.price_locked_count,
  }
}

function toSwitches (s: ApiSwitches): Switches {
  return {
    stopEverything: {
      active: s.stop_everything.active,
      setBy: ref(s.stop_everything.set_by),
      setAt: s.stop_everything.set_at,
      reason: s.stop_everything.reason,
      message: s.stop_everything.message,
    },
    categories: s.categories.map(c => toCategory(c)),
    visibility: s.visibility,
  }
}

export const controlsService = {
  // GET /dashboard/category-controls
  async list (): Promise<Switches> {
    const { data } = await http.get<ApiEnvelope<ApiSwitches>>('/dashboard/category-controls')
    return toSwitches(data.data)
  },

  // POST /dashboard/category-controls
  async set (input: SetControlInput, idempotencyKey: string): Promise<Switches> {
    const { data } = await http.post<ApiEnvelope<ApiSwitches>>('/dashboard/category-controls', {
      level: input.level,
      category: input.category ?? undefined,
      reason: input.reason,
      message_en: input.messageEn === '' ? undefined : input.messageEn,
      message_ar: input.messageAr === '' ? undefined : input.messageAr,
    }, keyHeader(idempotencyKey))
    return toSwitches(data.data)
  },

  // POST /dashboard/category-controls/clear
  async clear (level: ControlLevel, category: ControlCategory | null, idempotencyKey: string): Promise<Switches> {
    const { data } = await http.post<ApiEnvelope<ApiSwitches>>('/dashboard/category-controls/clear', {
      level,
      category: category ?? undefined,
    }, keyHeader(idempotencyKey))
    return toSwitches(data.data)
  },

  // PATCH /dashboard/visibility/{key}
  async setVisibility (key: VisibilityKey, shown: boolean, idempotencyKey: string): Promise<void> {
    await http.patch(`/dashboard/visibility/${key}`, { shown }, keyHeader(idempotencyKey))
  },

  // GET /reference/controls (public): the banner reads only this.
  async stopped (): Promise<{ active: boolean, message: ControlMessage }> {
    const { data } = await http.get<ApiEnvelope<{ stop_everything: { active: boolean, message: ControlMessage } }>>('/reference/controls')
    return data.data.stop_everything
  },
}
