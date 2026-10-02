<template>
  <ol class="d-otl">
    <li v-for="(e, i) in events" :key="`${e.event}-${e.at}-${i}`" class="d-otl__item">
      <div class="d-otl__when mono">{{ formatDateTime(e.at) }}</div>

      <div class="d-otl__what">
        {{ describe(e) }}
        <div v-if="by(e)" class="who2">{{ by(e) }}</div>
        <div v-if="text(e)" class="d-otl__note">{{ text(e) }}</div>
      </div>
    </li>
  </ol>
</template>

<script lang="ts" setup>
  import type { OrderTimelineEvent } from '@/types/order'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { DEADLINE_LABELS, orderStateMeta, outcomeMeta } from '@/types/order'

  // An order's story (Backend spec 012 OrderTimeline, staff view): every move, result,
  // decision, branch change, extension and the return of the piece, oldest first.
  defineProps<{ events: OrderTimelineEvent[] }>()

  const str = (v: unknown): string => (typeof v === 'string' ? v : '')

  function describe (e: OrderTimelineEvent): string {
    const d = e.detail
    switch (e.event) {
      case 'accepted': { return 'The seller accepted the buyer; the order was created' }
      case 'received': { return 'Piece received at the branch' }
      case 'result': {
        const label = outcomeMeta(str(d.outcome)).label
        return `${d.corrects ? 'Corrected result' : 'Inspection result'}: ${label}${d.superseded ? ' (replaced later)' : ''}`
      }
      case 'price_proposed': { return `New price proposed: ${formatMoney(str(d.price))} EGP` }
      case 'decision': {
        return d.accepted
          ? `The buyer accepted the new price (${formatMoney(str(d.new_price))} EGP)`
          : 'The buyer declined the new price'
      }
      case 'paid': { return 'The buyer paid the balance' }
      case 'collected': { return 'The buyer collected the piece' }
      case 'forfeited': { return 'The buyer did not pay in time; the deposit was forfeited' }
      case 'cancelled': { return orderStateMeta(str(d.state)).label }
      case 'branch_changed': {
        return d.extended_to ? `Branch changed; reach-branch deadline now ${formatDateTime(str(d.extended_to))}` : 'Branch changed'
      }
      case 'deadline_extended': {
        return `Deadline extended — ${DEADLINE_LABELS[str(d.which)] ?? str(d.which)}: ${formatDateTime(str(d.new_deadline))}`
      }
      case 'returned': { return `The piece is held for its seller until ${formatDateTime(str(d.return_deadline))}` }
      case 'relisted': { return 'The seller put the piece back on the market' }
      case 'return_collected': { return 'The seller collected the piece' }
      default: { return e.event.replaceAll('_', ' ') }
    }
  }

  function by (e: OrderTimelineEvent): string {
    const actor = e.detail.by as { type?: string } | undefined
    if (!actor) return ''
    if (actor.type === 'system') return 'Automatic'
    if (actor.type === 'staff') return 'Staff'
    if (actor.type === 'customer') return 'Customer'
    return ''
  }

  function text (e: OrderTimelineEvent): string {
    return str(e.detail.note) || str(e.detail.reason)
  }
</script>

<style lang="scss" scoped>
.d-otl { list-style: none; margin: 0; padding: 0; }
.d-otl__item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
}
.d-otl__item:last-child { border-bottom: 0; }
.d-otl__when { font-size: 11.5px; color: var(--ink-3); }
.d-otl__note {
  margin-top: 4px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 6px 9px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.who2 { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
.mono { font-variant-numeric: tabular-nums; }
</style>
