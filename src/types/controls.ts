// Switches (Backend spec 019 US7): category controls and what customers can see.

export type ControlLevel = 'stop_new_listings' | 'pause_category' | 'stop_everything'
export type ControlCategory = 'gold' | 'diamond' | 'gold_with_diamond'
export type VisibilityKey = 'rapaport_reference' | 'payout_averages' | 'listing_stats' | 'sharing'

export interface ControlMessage { en: string, ar: string }
export interface ControlStaffRef { id: string, fullName: string }

export interface ActiveControl {
  level: ControlLevel
  message: ControlMessage
  reason: string
  setBy: ControlStaffRef | null
  setAt: string
}

export interface CategoryState {
  category: ControlCategory
  state: ControlLevel | 'open'
  controls: ActiveControl[]
  // What a pause would touch and what it leaves alone.
  liveCount: number
  noRequestCount: number
  priceLockedCount: number
}

export interface StopEverything {
  active: boolean
  setBy: ControlStaffRef | null
  setAt: string | null
  reason: string | null
  message: ControlMessage
}

export interface Switches {
  stopEverything: StopEverything
  categories: CategoryState[]
  visibility: Record<VisibilityKey, boolean>
}

export interface SetControlInput {
  level: ControlLevel
  category: ControlCategory | null
  reason: string
  messageEn: string
  messageAr: string
}

export const CATEGORY_LABEL: Record<ControlCategory, string> = {
  gold: 'Gold',
  diamond: 'Diamond',
  gold_with_diamond: 'Gold with diamond',
}

export const LEVEL_LABEL: Record<ControlLevel, string> = {
  stop_new_listings: 'New listings stopped',
  pause_category: 'Paused',
  stop_everything: 'Everything stopped',
}

export const VISIBILITY_ITEMS: ReadonlyArray<{ key: VisibilityKey, label: string, hint: string }> = [
  { key: 'rapaport_reference', label: 'Rapaport reference price', hint: 'The suggestion shown beside a diamond price.' },
  { key: 'payout_averages', label: 'Payout averages', hint: 'How long money usually takes and how many sales complete. Turn on once there is enough data.' },
  { key: 'listing_stats', label: 'Views and requests on a listing', hint: 'The counts a buyer sees on a piece.' },
  { key: 'sharing', label: 'Sharing a piece', hint: 'The Share button on a piece.' },
]
