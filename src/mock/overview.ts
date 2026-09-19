import type { OverviewData } from '@/types/overview'

export const overviewMock: OverviewData = {
  hero: {
    label: 'Bank balance minus customer wallets',
    value: '+ 184,320 EGP',
    valueColor: '#7FD0A8',
    hint: 'Bank 3,142,880  ·  wallets 2,958,560. A negative figure here means customer money is short.',
  },
  stats: [
    {
      label: 'Held on open orders',
      value: '612,400',
      hint: 'Across 23 orders',
    },
    {
      label: 'Paid out ahead of buyers',
      value: '184,900',
      valueColor: 'var(--wait)',
      hint: '6 first gold sales, cap 100,000 each',
    },
    {
      label: 'Dahab earned this month',
      value: '78,240',
      hint: 'Commission 61,900 · spread 16,340',
    },
  ],
  transactions: [
    { status: 'Waiting for the seller', statusVariant: 'wait', count: 6, value: 342180, heldNow: 68436, action: { label: 'Open', kind: 'link', target: '/dashboard/orders' } },
    { status: 'On the way to IGI', statusVariant: 'info', count: 4, value: 198900, heldNow: 39780, action: { label: 'Open', kind: 'link', target: '/dashboard/orders' } },
    { status: 'At IGI, being inspected', statusVariant: 'info', count: 3, value: 156700, heldNow: 31340, action: { label: 'Open', kind: 'link', target: '/dashboard/inspections' } },
    { status: 'Waiting for the balance', statusVariant: 'wait', count: 7, value: 489220, heldNow: 97844, action: { label: 'Open', kind: 'link', target: '/dashboard/orders' } },
    { status: 'Ready to collect', statusVariant: 'wait', count: 3, value: 187400, heldNow: 375000, action: { label: 'Open', kind: 'link', target: '/dashboard/orders' } },
    { status: 'Completed', statusVariant: 'ok', count: 41, value: 2214600, heldNow: null, action: { label: 'Export', kind: 'export', target: 'completed transactions' } },
    { status: 'Cancelled', statusVariant: 'bad', count: 5, value: 271300, heldNow: null, action: { label: 'Review', kind: 'link', target: '/dashboard/disputes' } },
  ],
  needsDecision: [
    { id: 'nd-1', what: 'Gold bangle, 21K · listing review', whoSub: 'Seller 8842', waitingLabel: '2 days', waitingVariant: 'bad', onWho: 'Operations', ctaLabel: 'Review', ctaTarget: '/dashboard/listings' },
    { id: 'nd-2', what: 'Withdrawal 42,000 EGP', whoSub: 'Seller 4417 · CIB ••4417', waitingLabel: '19 hours', waitingVariant: 'wait', onWho: 'Finance', ctaLabel: 'Review', ctaTarget: '/dashboard/withdrawals' },
    { id: 'nd-3', what: 'Dispute: weight after inspection', whoSub: 'Order DH-2026-004402', waitingLabel: '14 hours', waitingVariant: 'wait', onWho: 'Operations', ctaLabel: 'Open', ctaTarget: '/dashboard/disputes' },
    { id: 'nd-4', what: 'ID verification, 9 waiting', whoSub: 'Oldest submitted yesterday', waitingLabel: '9 hours', waitingVariant: 'info', onWho: 'Verification', ctaLabel: 'Open', ctaTarget: '/dashboard/users' },
    { id: 'nd-5', what: 'Rapaport matrix is 9 days old', whoSub: 'Uploaded 24 Aug', waitingLabel: 'Weekly', waitingVariant: 'wait', onWho: 'Finance', ctaLabel: 'Upload', ctaTarget: '/dashboard/pricing' },
  ],
  wallets: {
    available: 2346160,
    heldOnOpenOrders: 612400,
    totalOwed: 2958560,
  },
  goldPrice: {
    sellersGet21k: 6951,
    buyersPay21k: 6975,
    differencePerGram: 24,
    feedStatus: { label: 'Healthy', variant: 'ok' },
    lastUpdated: '2 minutes ago',
  },
  thisMonth: {
    newSellers: 128,
    piecesListed: 214,
    sold: 41,
    sellThroughPct: 19,
    moneyReachesSellersIn: '4.2 days',
  },
}
