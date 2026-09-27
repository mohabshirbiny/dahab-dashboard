import type {
  ApiAdjustment,
  ApiAdjustmentChange,
  ApiCurrentPrices,
  ApiEnvelope,
  ApiGoldPrice,
  ApiKaratPrice,
  ApiManualPrice,
  ApiPaginated,
  ApiPricePreview,
  ApiSetting,
  ApiSettingChange,
  ApiStaffRef,
} from '@/types/api'
import type {
  Adjustment,
  AdjustmentChange,
  CurrentPrices,
  GoldPrice,
  KaratPrice,
  ManualPrice,
  PriceInput,
  PricePreview,
  Setting,
  SettingChange,
  StaffRef,
} from '@/types/pricing'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

function toStaff (s: ApiStaffRef | null): StaffRef | null {
  return s ? { id: s.id, fullName: s.full_name } : null
}

function toKaratPrice (k: ApiKaratPrice): KaratPrice {
  return {
    code: k.code,
    purity: k.purity,
    isEnabled: k.is_enabled,
    marketBid: k.market_bid,
    marketAsk: k.market_ask,
    sellersGet: k.sellers_get,
    buyersPay: k.buyers_pay,
    difference: k.difference,
    adjustments: k.adjustments,
    inverted: k.inverted,
  }
}

function toGoldPrice (p: ApiGoldPrice): GoldPrice {
  return {
    id: p.id,
    source: p.source,
    bid24k: p.bid_24k,
    ask24k: p.ask_24k,
    effectiveAt: p.effective_at,
    enteredBy: toStaff(p.entered_by),
    confirmedBy: toStaff(p.confirmed_by),
    reason: p.reason,
  }
}

function toManualPrice (m: ApiManualPrice): ManualPrice {
  return {
    id: m.id,
    bid24k: m.bid_24k,
    ask24k: m.ask_24k,
    deviationPct: m.deviation_pct,
    requiresConfirmation: m.requires_confirmation,
    status: m.status,
    reason: m.reason,
    enteredBy: toStaff(m.entered_by)!,
    confirmedBy: toStaff(m.confirmed_by),
    confirmedAt: m.confirmed_at,
    expiresAt: m.expires_at,
    createdAt: m.created_at,
  }
}

function toSetting (s: ApiSetting): Setting {
  return {
    key: s.key,
    group: s.group,
    type: s.type,
    value: s.value,
    unit: s.unit,
    description: s.description,
    min: s.min,
    max: s.max,
    integer: s.integer,
    updatedBy: toStaff(s.updated_by),
    updatedAt: s.updated_at,
  }
}

function priceBody (input: PriceInput) {
  return 'changePct' in input ? { change_pct: input.changePct } : { bid_24k: input.bid24k, ask_24k: input.ask24k }
}

function adjustmentBody (a: Adjustment): ApiAdjustment {
  return { kind: a.kind, value: a.value }
}

export interface ManualPriceResult {
  manual: ManualPrice
  // true when the Backend answered 202: recorded, waiting for a confirmation.
  pending: boolean
}

// Pricing (Backend spec 005). The Backend does every calculation; previews are
// computed there too, so this UI never repeats the price maths.
export const pricingService = {
  // GET /dashboard/gold-prices/current   (pricing.view)
  async current (): Promise<CurrentPrices> {
    const { data } = await http.get<ApiEnvelope<ApiCurrentPrices>>(endpoints.goldPricesCurrent)
    const d = data.data
    return {
      price: d.price ? toGoldPrice(d.price) : null,
      feed: { state: d.feed.state, lastSuccessAt: d.feed.last_success_at, lastFailureAt: d.feed.last_failure_at },
      pending: d.pending ? toManualPrice(d.pending) : null,
      karats: d.karats.map(k => toKaratPrice(k)),
    }
  },

  // GET /dashboard/gold-prices   (pricing.view) — newest first.
  async history (perPage = 10): Promise<GoldPrice[]> {
    const { data } = await http.get<ApiPaginated<ApiGoldPrice>>(endpoints.goldPrices, { params: { per_page: perPage } })
    return data.data.map(p => toGoldPrice(p))
  },

  // POST /dashboard/gold-prices/preview   (pricing.view) — writes nothing.
  async preview (input: PriceInput | null, adjustments?: Record<number, { buy?: Adjustment, sell?: Adjustment }>): Promise<PricePreview> {
    const body: Record<string, unknown> = input ? priceBody(input) : {}
    if (adjustments) {
      body.adjustments = Object.fromEntries(Object.entries(adjustments).map(([code, sides]) => [code, {
        ...(sides.buy ? { buy: adjustmentBody(sides.buy) } : {}),
        ...(sides.sell ? { sell: adjustmentBody(sides.sell) } : {}),
      }]))
    }
    const { data } = await http.post<ApiEnvelope<ApiPricePreview>>(endpoints.goldPricesPreview, body)
    const d = data.data
    return { bid24k: d.bid_24k, ask24k: d.ask_24k, deviationPct: d.deviation_pct, karats: d.karats.map(k => toKaratPrice(k)) }
  },

  // POST /dashboard/gold-prices/manual   (gold_price.enter) — 201 effective, 202 pending.
  async enterManual (input: PriceInput, reason: string): Promise<ManualPriceResult> {
    const response = await http.post<ApiEnvelope<ApiManualPrice>>(endpoints.manualPrice, { ...priceBody(input), reason })
    return { manual: toManualPrice(response.data.data), pending: response.status === 202 }
  },

  // POST /dashboard/gold-prices/manual/{id}/confirm   (gold_price.confirm)
  async confirmManual (id: number): Promise<ManualPrice> {
    const { data } = await http.post<ApiEnvelope<ApiManualPrice>>(endpoints.manualPriceConfirm(id))
    return toManualPrice(data.data)
  },

  // PUT /dashboard/karats/{code}/adjustments   (pricing.rates.manage)
  async updateAdjustments (code: number, buy: Adjustment, sell: Adjustment, reason: string): Promise<void> {
    await http.put(endpoints.karatAdjustments(code), { buy: adjustmentBody(buy), sell: adjustmentBody(sell), reason })
  },

  // GET /dashboard/price-adjustments/history   (pricing.view)
  async adjustmentHistory (perPage = 10): Promise<AdjustmentChange[]> {
    const { data } = await http.get<ApiPaginated<ApiAdjustmentChange>>(endpoints.adjustmentHistory, { params: { per_page: perPage } })
    return data.data.map(h => ({
      id: h.id,
      karatCode: h.karat_code,
      side: h.side,
      old: h.old,
      new: h.new,
      changedBy: toStaff(h.changed_by)!,
      reason: h.reason,
      changedAt: h.changed_at,
    }))
  },

  // GET /dashboard/settings   (pricing.view)
  async settings (): Promise<Setting[]> {
    const { data } = await http.get<ApiEnvelope<ApiSetting[]>>(endpoints.settings)
    return data.data.map(s => toSetting(s))
  },

  // PATCH /dashboard/settings/{key}   (pricing.rates.manage or settings.manage, by group)
  async updateSetting (key: string, value: string | boolean, reason: string): Promise<Setting> {
    const { data } = await http.patch<ApiEnvelope<ApiSetting>>(endpoints.setting(key), { value, reason })
    return toSetting(data.data)
  },

  // GET /dashboard/settings/history   (pricing.view)
  async settingHistory (perPage = 10, key?: string): Promise<SettingChange[]> {
    const { data } = await http.get<ApiPaginated<ApiSettingChange>>(endpoints.settingsHistory, { params: { per_page: perPage, key } })
    return data.data.map(h => ({
      id: h.id,
      key: h.key,
      oldValue: h.old_value,
      newValue: h.new_value,
      changedBy: toStaff(h.changed_by)!,
      reason: h.reason,
      changedAt: h.changed_at,
    }))
  },
}
