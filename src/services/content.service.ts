import type { ApiEnvelope } from '@/types/api'
import type {
  AppText,
  ContentExport,
  ContentStaffRef,
  CreateFaqInput,
  PublishKeyError,
  PublishResult,
  RevertTarget,
  SaveDraftInput,
  SettingPlaceholder,
  TextDraft,
  TextKind,
  TextListQuery,
  TextPage,
  TextPublished,
  TextVersion,
} from '@/types/content'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 019 contracts/app-content-api.md and the generated OpenAPI.
interface ApiStaffRef { id: string, full_name: string }

interface ApiPublished {
  version: number
  en: string
  ar: string
  published_at: string | null
  published_by: ApiStaffRef | null
  bundle_version: number | null
  is_hidden?: boolean
}

interface ApiDraft {
  version: number
  draft_version: number
  en: string
  ar: string
  is_default_marker: boolean
  is_hidden: boolean
  edited_at: string | null
  edited_by: ApiStaffRef | null
}

interface ApiAppText {
  key: string
  kind: TextKind
  area: string
  description: string
  default: { en: string, ar: string }
  published: ApiPublished | null
  draft: ApiDraft | null
  is_overridden: boolean
  default_changed_since_override: boolean
  placeholders: string[]
  required_placeholders: string[]
  max_length: number
  read_only: boolean
  retired: boolean
  position: number | null
  pending_position?: number | null
}

interface ApiVersion {
  version: number
  state: TextVersion['state']
  is_default_marker: boolean
  en: string | null
  ar: string | null
  edited_at: string | null
  edited_by: ApiStaffRef | null
  published_at: string | null
  published_by: ApiStaffRef | null
  bundle_version: number | null
}

const staff = (s: ApiStaffRef | null): ContentStaffRef | null => (s ? { id: s.id, fullName: s.full_name } : null)

function toPublished (p: ApiPublished): TextPublished {
  return { version: p.version, en: p.en, ar: p.ar, isHidden: p.is_hidden ?? false, publishedAt: p.published_at, publishedBy: staff(p.published_by), bundleVersion: p.bundle_version }
}

function toDraft (d: ApiDraft): TextDraft {
  return {
    version: d.version,
    draftVersion: d.draft_version,
    en: d.en,
    ar: d.ar,
    isDefaultMarker: d.is_default_marker,
    isHidden: d.is_hidden,
    editedAt: d.edited_at,
    editedBy: staff(d.edited_by),
  }
}

function toText (t: ApiAppText): AppText {
  return {
    key: t.key,
    kind: t.kind,
    area: t.area,
    description: t.description,
    default: t.default,
    published: t.published ? toPublished(t.published) : null,
    draft: t.draft ? toDraft(t.draft) : null,
    isOverridden: t.is_overridden,
    defaultChangedSinceOverride: t.default_changed_since_override,
    placeholders: t.placeholders,
    requiredPlaceholders: t.required_placeholders,
    maxLength: t.max_length,
    readOnly: t.read_only,
    retired: t.retired,
    position: t.position,
    pendingPosition: t.pending_position ?? null,
  }
}

function toVersion (v: ApiVersion): TextVersion {
  return {
    version: v.version,
    state: v.state,
    isDefaultMarker: v.is_default_marker,
    en: v.en,
    ar: v.ar,
    editedAt: v.edited_at,
    editedBy: staff(v.edited_by),
    publishedAt: v.published_at,
    publishedBy: staff(v.published_by),
    bundleVersion: v.bundle_version,
  }
}

function listParams (query: TextListQuery) {
  return {
    kind: query.kind === '' ? undefined : query.kind,
    area: query.area === '' ? undefined : query.area,
    q: query.q.trim() === '' ? undefined : query.q.trim(),
    state: query.state === '' ? undefined : query.state,
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// App text (Backend spec 019). Every write sends the caller's Idempotency-Key, so a retried
// submission is replayed rather than applied twice.
export const contentService = {
  // GET /dashboard/app-texts   (content.edit; keyset paginated by key)
  async list (query: TextListQuery, cursor: string | null, perPage = 50): Promise<TextPage> {
    const { data } = await http.get<{ data: ApiAppText[], meta: { per_page: number, next_cursor: string | null } }>(endpoints.appTexts, {
      params: { ...listParams(query), cursor: cursor ?? undefined, per_page: perPage },
    })
    return { rows: data.data.map(t => toText(t)), nextCursor: data.meta.next_cursor }
  },

  // PUT /dashboard/app-texts/{key}/draft — a draft only customers cannot see.
  async saveDraft (input: SaveDraftInput, idempotencyKey: string): Promise<TextDraft> {
    const { data } = await http.put<ApiEnvelope<ApiDraft>>(endpoints.appTextDraft(input.key), {
      text_en: input.en,
      text_ar: input.ar,
      draft_version: input.draftVersion ?? undefined,
      is_hidden: input.isHidden,
    }, keyHeader(idempotencyKey))
    return toDraft(data.data)
  },

  // DELETE /dashboard/app-texts/{key}/draft
  async discardDraft (key: string, idempotencyKey: string): Promise<void> {
    await http.delete(endpoints.appTextDraft(key), keyHeader(idempotencyKey))
  },

  // POST /dashboard/app-texts/{key}/revert — a draft: the code's default, or an earlier version.
  async revert (key: string, to: RevertTarget, idempotencyKey: string): Promise<TextDraft> {
    const { data } = await http.post<ApiEnvelope<ApiDraft>>(endpoints.appTextRevert(key), { to }, keyHeader(idempotencyKey))
    return toDraft(data.data)
  },

  // POST /dashboard/app-texts/publish — every pending draft, one bundle.
  async publish (idempotencyKey: string): Promise<PublishResult> {
    const { data } = await http.post<ApiEnvelope<{ bundle_version: number, published_at: string, keys: string[] }>>(
      endpoints.appTextsPublish,
      {},
      keyHeader(idempotencyKey),
    )
    return { bundleVersion: data.data.bundle_version, publishedAt: data.data.published_at, keys: data.data.keys }
  },

  // GET /dashboard/app-texts/{key}/history
  async history (key: string): Promise<TextVersion[]> {
    const { data } = await http.get<ApiEnvelope<ApiVersion[]>>(endpoints.appTextHistory(key))
    return data.data.map(v => toVersion(v))
  },

  // GET /dashboard/app-texts/export — a CSV file; the Backend records each export.
  async exportCsv (query: TextListQuery): Promise<ContentExport> {
    const response = await http.get<Blob>(endpoints.appTextsExport, { params: listParams(query), responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'app-texts.csv'
    return { blob: response.data, filename }
  },

  // POST /dashboard/faq — a Help entry: two keys, each with a draft.
  async createFaq (input: CreateFaqInput, idempotencyKey: string): Promise<{ slug: string, position: number }> {
    const { data } = await http.post<ApiEnvelope<{ slug: string, position: number }>>(endpoints.faq, {
      slug: input.slug,
      question_en: input.questionEn,
      question_ar: input.questionAr,
      answer_en: input.answerEn,
      answer_ar: input.answerAr,
      is_hidden: input.isHidden,
    }, keyHeader(idempotencyKey))
    return data.data
  },

  // PATCH /dashboard/faq/{slug}/position — a draft order, live with Publish changes.
  async moveFaq (slug: string, position: number, idempotencyKey: string): Promise<{ slug: string, position: number }> {
    const { data } = await http.patch<ApiEnvelope<{ slug: string, position: number }>>(endpoints.faqPosition(slug), { position }, keyHeader(idempotencyKey))
    return data.data
  },

  // GET /dashboard/content/placeholders — the numbers a text may name, with their live values.
  async placeholders (): Promise<SettingPlaceholder[]> {
    const { data } = await http.get<ApiEnvelope<SettingPlaceholder[]>>(endpoints.contentPlaceholders)
    return data.data
  },
}

// The keys a refused publish names (`content_invalid` → details.keys), for the dialog.
export function publishKeyErrors (details: Readonly<Record<string, unknown>>): PublishKeyError[] {
  const keys = details.keys
  if (typeof keys !== 'object' || keys === null) {
    return []
  }
  return Object.entries(keys as Record<string, { code?: string, message?: string }>).map(([key, value]) => ({
    key,
    code: value.code ?? 'content_invalid',
    message: value.message ?? 'Cannot be published.',
  }))
}
