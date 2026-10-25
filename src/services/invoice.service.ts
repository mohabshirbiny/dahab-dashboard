import type { ExportResult } from '@/types/finance'
import type {
  CreditNote,
  CreditNotePage,
  InvoiceCustomer,
  InvoiceDetail,
  InvoiceFigures,
  InvoiceLines,
  InvoicePage,
  InvoiceQuery,
  InvoiceSummary,
  IssueCreditNoteInput,
} from '@/types/invoice'
import type { AxiosResponse } from 'axios'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { isServiceError, ServiceError } from './errors'

// Backend shapes (snake_case), Backend spec 016 contracts/invoices-api.md.
interface ApiCustomer { id: string, display_ref: string | null, name: string | null }

interface ApiInvoice {
  id: string
  number: string
  party: 'seller' | 'buyer'
  order_id: string
  order_ref: string
  issued_at: string
  net: string
  vat: string
  gross: string
  credited: string
  remaining: string
  status: InvoiceSummary['status']
  document_ready: boolean
  customer: ApiCustomer
  vat_rate?: string
  lines?: Record<string, string | number | boolean | null>
  issuer?: Record<string, string> | null
  party_details?: { full_name: string | null, display_ref: string } | null
  creditable?: boolean
  credit_notes?: ApiCreditNote[]
}

interface ApiCreditNote {
  id: string
  number: string
  invoice_id: string
  invoice_number: string
  reason: string
  net: string
  vat: string
  gross: string
  issued_at: string
  document_ready: boolean
  issued_by?: { id: string, name: string | null }
  customer?: ApiCustomer
}

interface ApiFigures {
  issued_count: number
  net_invoiced: string
  vat_collected: string
  credit_notes_count: number
  credit_notes_amount: string
}

const toCustomer = (c: ApiCustomer): InvoiceCustomer => ({ id: c.id, displayRef: c.display_ref, name: c.name })

function toSummary (i: ApiInvoice): InvoiceSummary {
  return {
    id: i.id,
    number: i.number,
    party: i.party,
    orderId: i.order_id,
    orderRef: i.order_ref,
    issuedAt: i.issued_at,
    net: i.net,
    vat: i.vat,
    gross: i.gross,
    credited: i.credited,
    remaining: i.remaining,
    status: i.status,
    documentReady: i.document_ready,
    customer: toCustomer(i.customer),
  }
}

function toCreditNote (n: ApiCreditNote): CreditNote {
  return {
    id: n.id,
    number: n.number,
    invoiceId: n.invoice_id,
    invoiceNumber: n.invoice_number,
    reason: n.reason,
    net: n.net,
    vat: n.vat,
    gross: n.gross,
    issuedAt: n.issued_at,
    documentReady: n.document_ready,
    issuedBy: n.issued_by ?? null,
    customer: n.customer ? toCustomer(n.customer) : null,
  }
}

const str = (v: string | number | boolean | null | undefined) => (v === null || v === undefined ? null : String(v))

function waivedOf (v: unknown): InvoiceLines['commissionWaived'] {
  if (v === null || typeof v !== 'object') {
    return null
  }
  const w = v as { kind?: unknown, code?: unknown, amount?: unknown }
  return { kind: String(w.kind ?? ''), code: w.code ? String(w.code) : null, amount: String(w.amount ?? '0') }
}

function toDetail (i: ApiInvoice): InvoiceDetail {
  const l = i.lines ?? {}
  return {
    ...toSummary(i),
    vatRate: i.vat_rate ?? '0',
    lines: {
      category: String(l.category ?? ''),
      karat: typeof l.karat === 'number' ? l.karat : null,
      karatLabel: str(l.karat_label),
      pieceTypeEn: str(l.piece_type_en),
      pieceTypeAr: str(l.piece_type_ar),
      weightG: str(l.weight_g),
      unitRate: str(l.unit_rate),
      goldValue: str(l.gold_value),
      makingTotal: str(l.making_total),
      askingPrice: str(l.asking_price),
      subtotal: String(l.subtotal ?? '0'),
      commissionPct: str(l.commission_pct),
      commissionMinimum: str(l.commission_minimum),
      paidToWallet: str(l.paid_to_wallet),
      certificateFee: str(l.certificate_fee),
      commissionVatInclusive: l.commission_vat_inclusive === true,
      sellerUnitRate: str(l.seller_unit_rate),
      goldValueAtSellerRate: str(l.gold_value_at_seller_rate),
      priceDifference: str(l.price_difference),
      commissionOrdinaryTotal: str(l.commission_ordinary_total),
      commissionWaived: waivedOf(l.commission_waived),
      priceBeforeDiscount: str(l.price_before_discount),
      promoDiscount: str(l.promo_discount),
      promoCode: str(l.promo_code),
      totalPaid: str(l.total_paid),
    },
    issuer: i.issuer ?? null,
    partyDetails: i.party_details ? { fullName: i.party_details.full_name, displayRef: i.party_details.display_ref } : null,
    creditable: i.creditable ?? false,
    creditNotes: (i.credit_notes ?? []).map(n => toCreditNote(n)),
  }
}

function toFigures (f: ApiFigures): InvoiceFigures {
  return {
    issuedCount: f.issued_count,
    netInvoiced: f.net_invoiced,
    vatCollected: f.vat_collected,
    creditNotesCount: f.credit_notes_count,
    creditNotesAmount: f.credit_notes_amount,
  }
}

const blank = (v: string | null | undefined) => (v === null || v === undefined || v.trim() === '' ? undefined : v.trim())
const params = (q: InvoiceQuery) => ({ from: blank(q.from), to: blank(q.to), party: blank(q.party), status: blank(q.status), q: blank(q.q) })

function toExport (response: AxiosResponse<Blob>, fallback: string): ExportResult {
  const disposition = String(response.headers['content-disposition'] ?? '')
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallback
  return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
}

// A PDF is asked for as a blob, so a refusal arrives without its JSON body: a 409 here can
// only be the Backend's document_not_ready (the PDF is made after the money commits).
async function pdf (url: string, fallback: string): Promise<{ blob: Blob, filename: string }> {
  try {
    const response = await http.get<Blob>(url, { responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    return { blob: response.data, filename: /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallback }
  } catch (error) {
    if (isServiceError(error) && error.status === 409) {
      throw new ServiceError('conflict', 'This document is being prepared.', 409, {}, 'document_not_ready')
    }
    throw error
  }
}

// Tax invoices and credit notes (Backend spec 016). Reads need invoice.view; issuing a credit
// note needs invoice.correct and sends the caller's Idempotency-Key.
export const invoiceService = {
  // GET /dashboard/invoices
  async list (query: InvoiceQuery, cursor: string | null, perPage = 25): Promise<InvoicePage> {
    const { data } = await http.get<{ data: ApiInvoice[], meta: { next_cursor: string | null, figures: { month: ApiFigures, period: ApiFigures } } }>(
      endpoints.invoices, { params: { ...params(query), cursor: cursor ?? undefined, per_page: perPage } })
    return {
      rows: data.data.map(i => toSummary(i)),
      nextCursor: data.meta.next_cursor,
      figures: { month: toFigures(data.meta.figures.month), period: toFigures(data.meta.figures.period) },
    }
  },

  // GET /dashboard/invoices/export (audited)
  async exportCsv (query: InvoiceQuery): Promise<ExportResult> {
    return toExport(await http.get<Blob>(endpoints.invoicesExport, { params: params(query), responseType: 'blob' }), 'invoices.csv')
  },

  // GET /dashboard/invoices/{id}
  async show (id: string): Promise<InvoiceDetail> {
    const { data } = await http.get<{ data: ApiInvoice }>(endpoints.invoice(id))
    return toDetail(data.data)
  },

  // GET /dashboard/invoices/{id}/pdf (audited)
  async invoicePdf (id: string, number: string) {
    return pdf(endpoints.invoicePdf(id), `${number}.pdf`)
  },

  // GET /dashboard/credit-notes
  async creditNotes (from: string, to: string, q: string, cursor: string | null, perPage = 25): Promise<CreditNotePage> {
    const { data } = await http.get<{ data: ApiCreditNote[], meta: { next_cursor: string | null } }>(endpoints.creditNotes,
      { params: { from: blank(from), to: blank(to), q: blank(q), cursor: cursor ?? undefined, per_page: perPage } })
    return { rows: data.data.map(n => toCreditNote(n)), nextCursor: data.meta.next_cursor }
  },

  // GET /dashboard/credit-notes/{id}/pdf (audited)
  async creditNotePdf (id: string, number: string) {
    return pdf(endpoints.creditNotePdf(id), `${number}.pdf`)
  },

  // POST /dashboard/invoices/{id}/credit-notes   (invoice.correct)
  async issueCreditNote (invoiceId: string, input: IssueCreditNoteInput, idempotencyKey: string): Promise<CreditNote> {
    const { data } = await http.post<{ data: ApiCreditNote }>(endpoints.invoiceCreditNotes(invoiceId),
      { amount: input.amount, reason: input.reason }, { headers: { 'Idempotency-Key': idempotencyKey } })
    return toCreditNote(data.data)
  },
}
