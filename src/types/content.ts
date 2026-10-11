// App text (Backend spec 019, first release). Camel-case shapes the UI uses; the service maps the
// Backend's snake_case. The Backend decides every rule (placeholders, length, both languages).

export type TextKind = 'app' | 'faq' | 'notification'

export interface TextValue {
  en: string
  ar: string
}

export interface ContentStaffRef {
  id: string
  fullName: string
}

// What customers see now when it is an override (a published version).
export interface TextPublished extends TextValue {
  // Help answers only: live but kept out of the app.
  isHidden: boolean
  version: number
  publishedAt: string | null
  publishedBy: ContentStaffRef | null
  bundleVersion: number | null
}

// The one shared draft of a key. A default marker has no words: published, it ends the override.
export interface TextDraft extends TextValue {
  version: number
  draftVersion: number
  isDefaultMarker: boolean
  isHidden: boolean
  editedAt: string | null
  editedBy: ContentStaffRef | null
}

export interface AppText {
  key: string
  kind: TextKind
  area: string
  description: string
  // The code's own text: what the app shows when nothing is published.
  default: TextValue
  published: TextPublished | null
  draft: TextDraft | null
  isOverridden: boolean
  // The code's default moved after the live override was published: someone should look.
  defaultChangedSinceOverride: boolean
  placeholders: string[]
  requiredPlaceholders: string[]
  maxLength: number
  // A template carrying a code or a link: shown, not edited.
  readOnly: boolean
  // The current app no longer uses this key.
  retired: boolean
  position: number | null
  // The Help order waiting for Publish changes.
  pendingPosition: number | null
}

export type TextStateFilter = '' | 'draft' | 'published' | 'default'

export interface TextListQuery {
  // '' = every kind; the page works one kind at a time (App text, Notifications, Help).
  kind: '' | TextKind
  area: string
  q: string
  state: TextStateFilter
}

export interface TextPage {
  rows: AppText[]
  nextCursor: string | null
}

export interface TextVersion {
  version: number
  state: 'draft' | 'published' | 'superseded'
  isDefaultMarker: boolean
  en: string | null
  ar: string | null
  editedAt: string | null
  editedBy: ContentStaffRef | null
  publishedAt: string | null
  publishedBy: ContentStaffRef | null
  bundleVersion: number | null
}

export interface SaveDraftInput {
  key: string
  en: string
  ar: string
  // The draft_version of the copy being edited; the Backend refuses a stale one.
  draftVersion: number | null
  // Help answers: hide or show the entry; leave out to keep it as it is.
  isHidden?: boolean
}

export interface CreateFaqInput {
  slug: string
  questionEn: string
  questionAr: string
  answerEn: string
  answerAr: string
  isHidden: boolean
}

// One Help entry: its question and answer keys together (help.faq.<slug>.question / .answer).
export interface FaqEntry {
  slug: string
  position: number | null
  pendingPosition: number | null
  question: AppText | null
  answer: AppText | null
}

export type RevertTarget = 'default' | number

export interface SettingPlaceholder {
  name: string
  setting: string
  value: string | null
}

export interface PublishResult {
  bundleVersion: number
  publishedAt: string
  keys: string[]
}

// Why one key blocked a publish (content_invalid → details.keys).
export interface PublishKeyError {
  key: string
  code: string
  message: string
}

export interface ContentExport { blob: Blob, filename: string }

// The registry's areas, in the order staff expect them. A chip per area (design p-content).
export const CONTENT_AREAS: ReadonlyArray<{ value: string, label: string }> = [
  { value: '', label: 'Everything' },
  { value: 'Home', label: 'Home' },
  { value: 'Browse', label: 'Browse' },
  { value: 'Selling', label: 'Selling' },
  { value: 'Orders', label: 'Orders' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'Account', label: 'Account' },
  { value: 'Help', label: 'Help' },
  { value: 'Auth', label: 'Sign in' },
  { value: 'Shared', label: 'Shared' },
]
