// Tax invoices and credit notes (Backend spec 016, contracts/invoices-api.md).
// Invoices are issued automatically at pay-balance; nothing is filed with the Tax Authority,
// so the only status is the one derived from credit notes.

export type InvoiceParty = 'seller' | 'buyer'

export type InvoiceStatus = 'issued' | 'partly_credited' | 'credited'

export const INVOICE_STATUSES: ReadonlyArray<{ value: InvoiceStatus, label: string }> = [
  { value: 'issued', label: 'Issued' },
  { value: 'partly_credited', label: 'Partly credited' },
  { value: 'credited', label: 'Credited' },
]

export interface InvoiceCustomer {
  id: string
  displayRef: string | null
  name: string | null
}

export interface InvoiceSummary {
  id: string
  number: string
  party: InvoiceParty
  orderId: string
  orderRef: string
  issuedAt: string
  net: string
  vat: string
  gross: string
  credited: string
  remaining: string
  status: InvoiceStatus
  documentReady: boolean
  customer: InvoiceCustomer
}

// The settlement lines copied onto the invoice at issue (never recomputed).
export interface InvoiceLines {
  category: string
  karat: number | null
  karatLabel: string | null
  pieceTypeEn: string | null
  pieceTypeAr: string | null
  weightG: string | null
  unitRate: string | null
  goldValue: string | null
  makingTotal: string | null
  askingPrice: string | null
  subtotal: string
  commissionPct: string | null
  commissionMinimum: string | null
  paidToWallet: string | null
}

export interface CreditNote {
  id: string
  number: string
  invoiceId: string
  invoiceNumber: string
  reason: string
  net: string
  vat: string
  gross: string
  issuedAt: string
  documentReady: boolean
  issuedBy: { id: string, name: string | null } | null
  customer: InvoiceCustomer | null
}

export interface InvoiceDetail extends InvoiceSummary {
  vatRate: string
  lines: InvoiceLines
  issuer: Record<string, string> | null
  partyDetails: { fullName: string | null, displayRef: string } | null
  creditable: boolean
  creditNotes: CreditNote[]
}

export interface InvoiceFigures {
  issuedCount: number
  netInvoiced: string
  vatCollected: string
  creditNotesCount: number
  creditNotesAmount: string
}

export interface InvoiceQuery {
  from: string
  to: string
  party: InvoiceParty | ''
  status: InvoiceStatus | ''
  q: string
}

export interface InvoicePage {
  rows: InvoiceSummary[]
  nextCursor: string | null
  figures: { month: InvoiceFigures, period: InvoiceFigures }
}

export interface CreditNotePage {
  rows: CreditNote[]
  nextCursor: string | null
}

export interface IssueCreditNoteInput {
  amount: string
  reason: string
}
