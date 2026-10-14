import type { ApiEnvelope } from '@/types/api'
import type {
  CustomerWallet,
  StatementPage,
  StatementQuery,
  StatementRow,
  StatementSummary,
  WalletOverview,
} from '@/types/wallet'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 008 contracts/wallet-api.md.
interface ApiWalletOverview {
  available: string
  held: string
  held_on_orders?: string
  pending_withdrawals?: string
  total_owed: string
  bank: string
  headroom: string
  system_total: string
}

interface ApiCustomerWallet {
  available: string
  held: string
  held_on_orders?: string
  pending_withdrawals?: string
  total: string
}

interface ApiStatementSummary {
  view: StatementSummary['view']
  from: string
  to: string
  opening: string
  in: string
  out: string
  closing: string
  available?: string
  held?: string
  total?: string
  customer?: { id: string, display_ref: string, full_name: string | null }
  vat_payable?: string
  // view = dahab (Backend testing fixes): the two Dahab accounts apart.
  commission_in?: string
  commission_out?: string
  spread_in?: string
  spread_out?: string
}

interface ApiStatementRow {
  id?: string
  created_at?: string
  kind?: string
  label?: string
  reference?: string | null
  memo?: string | null
  by_hand?: boolean
  actor?: { type: 'customer' | 'staff' | 'system', name: string | null }
  held_after?: string
  wallet?: { customer_id: string, display_ref: string } | null
  moved_to_held?: string
  // view = dahab: signed; commission + spread = in − out.
  commission?: string
  spread?: string
  period?: string
  count?: number
  before: string
  in: string
  out: string
  after: string
}

interface ApiStatementPage {
  data: { summary: ApiStatementSummary, rows: ApiStatementRow[] }
  meta: { per_page: number, next_cursor: string | null }
}

function params (query: StatementQuery) {
  return {
    view: query.view,
    customer_id: query.view === 'customer' ? query.customerId ?? undefined : undefined,
    from: query.from,
    to: query.to,
    grain: query.grain,
  }
}

function toSummary (s: ApiStatementSummary): StatementSummary {
  return {
    view: s.view,
    from: s.from,
    to: s.to,
    opening: s.opening,
    in: s.in,
    out: s.out,
    closing: s.closing,
    available: s.available,
    held: s.held,
    total: s.total,
    customer: s.customer ? { id: s.customer.id, displayRef: s.customer.display_ref, fullName: s.customer.full_name } : undefined,
    vatPayable: s.vat_payable,
    commissionIn: s.commission_in,
    commissionOut: s.commission_out,
    spreadIn: s.spread_in,
    spreadOut: s.spread_out,
  }
}

function toRow (r: ApiStatementRow): StatementRow {
  if (r.period !== undefined) {
    return { kind: 'period', period: r.period, count: r.count ?? 0, before: r.before, in: r.in, out: r.out, after: r.after, commission: r.commission ?? null, spread: r.spread ?? null }
  }
  return {
    kind: 'movement',
    id: r.id ?? '',
    createdAt: r.created_at ?? '',
    eventKind: r.kind ?? '',
    label: r.label ?? '',
    reference: r.reference ?? null,
    memo: r.memo ?? null,
    byHand: r.by_hand ?? false,
    actor: r.actor ?? { type: 'system', name: null },
    before: r.before,
    in: r.in,
    out: r.out,
    after: r.after,
    heldAfter: r.held_after ?? null,
    wallet: r.wallet ? { customerId: r.wallet.customer_id, displayRef: r.wallet.display_ref } : null,
    movedToHeld: r.moved_to_held ?? null,
    commission: r.commission ?? null,
    spread: r.spread ?? null,
  }
}

// Wallets (Backend spec 008). Every call needs wallet.view; nothing here moves money.
export const walletService = {
  // GET /dashboard/wallets/overview
  async overview (): Promise<WalletOverview> {
    const { data } = await http.get<ApiEnvelope<ApiWalletOverview>>(endpoints.walletOverview)
    return {
      available: data.data.available,
      held: data.data.held,
      heldOnOrders: data.data.held_on_orders ?? data.data.held,
      pendingWithdrawals: data.data.pending_withdrawals ?? '0.0000',
      totalOwed: data.data.total_owed,
      bank: data.data.bank,
      headroom: data.data.headroom,
      systemTotal: data.data.system_total,
    }
  },

  // GET /dashboard/customers/{id}/wallet — the customer file panel.
  async customerWallet (id: string): Promise<CustomerWallet> {
    const { data } = await http.get<ApiEnvelope<ApiCustomerWallet>>(endpoints.customerWallet(id))
    return {
      available: data.data.available,
      held: data.data.held,
      heldOnOrders: data.data.held_on_orders ?? data.data.held,
      pendingWithdrawals: data.data.pending_withdrawals ?? '0.0000',
      total: data.data.total,
    }
  },

  // GET /dashboard/wallet-statement — oldest first, keyset pages. The Backend
  // audits the first page of a one-customer statement.
  async statement (query: StatementQuery, cursor: string | null, perPage = 50): Promise<StatementPage> {
    const { data } = await http.get<ApiStatementPage>(endpoints.walletStatement, {
      params: { ...params(query), cursor: cursor ?? undefined, per_page: perPage },
    })
    return { summary: toSummary(data.data.summary), rows: data.data.rows.map(r => toRow(r)), nextCursor: data.meta.next_cursor }
  },

  // GET /dashboard/wallet-statement/export — a CSV file; the Backend records each export.
  async exportCsv (query: StatementQuery): Promise<{ blob: Blob, filename: string, truncated: boolean }> {
    const response = await http.get<Blob>(endpoints.walletStatementExport, { params: params(query), responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'wallet-statement.csv'
    return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
  },
}
