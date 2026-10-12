<template>
  <Panel :subtitle="title" :title="order.orderRef">
    <template #actions>
      <StatusTag :label="orderStateMeta(order.state).label" :variant="orderStateMeta(order.state).variant" />
    </template>

    <template #body>
      <NoteBanner v-if="order.frozen" class="d-odp__frozen" variant="wait">
        Frozen by a dispute. No money moves and no deadline runs until it is resolved.
        <RouterLink v-if="openDispute && order.can.handleDispute" :to="{ name: 'disputes', query: { id: openDispute.id } }">Open {{ openDispute.ref }}</RouterLink>
      </NoteBanner>

      <div v-if="hasActions" class="d-odp__actions">
        <DBtn v-if="order.can.receive" kind="primary" @click="receiving = true">Mark received</DBtn>
        <DBtn v-if="order.can.inspect" kind="primary" @click="openInspection(null)">Enter result</DBtn>
        <DBtn v-if="order.can.correct && latest" @click="openInspection(latest)">Correct the result</DBtn>
        <DBtn v-if="order.can.proposePrice" kind="primary" @click="modal = 'price'">Propose a price</DBtn>
        <DBtn v-if="order.can.handover" kind="primary" @click="handoverTo = 'buyer'">Hand to the buyer</DBtn>
        <DBtn v-if="order.can.returnHandover" @click="handoverTo = 'seller'">Hand back to the seller</DBtn>
        <DBtn v-if="order.can.changeBranch" @click="modal = 'branch'">Change branch</DBtn>
        <DBtn v-if="order.can.extend" @click="modal = 'extend'">Extend a deadline</DBtn>
        <DBtn v-if="order.can.answerExtension && order.extensionRequest" @click="modal = 'answer'">Answer the request for more time</DBtn>
        <DBtn v-if="order.can.cancel" kind="danger" @click="modal = 'cancel'">Cancel acceptance</DBtn>
      </div>

      <div class="d-odp__label">Sale</div>

      <KeyValueRow label="Seller">
        <RouterLink v-if="canOpenCustomer" :to="{ name: 'customer-file', params: { id: order.seller.customerId } }">{{ order.seller.displayRef }}</RouterLink>
        <template v-else>{{ order.seller.displayRef ?? '—' }}</template>
      </KeyValueRow>

      <KeyValueRow label="Buyer">
        <RouterLink v-if="canOpenCustomer" :to="{ name: 'customer-file', params: { id: order.buyer.customerId } }">{{ order.buyer.displayRef }}</RouterLink>
        <template v-else>{{ order.buyer.displayRef ?? '—' }}</template>
      </KeyValueRow>

      <KeyValueRow label="Branch" :value="order.branch.nameEn ?? '—'" />
      <KeyValueRow label="Accepted" :value="formatDateTime(order.acceptedAt)" />
      <KeyValueRow label="Price locked" :value="`${formatMoney(order.lockedTotalPrice)} EGP`" />
      <KeyValueRow label="Deposit" :value="`${formatMoney(order.depositAmount)} EGP`" />
      <KeyValueRow label="Held now" :value="`${formatMoney(order.held)} EGP`" />
      <KeyValueRow v-if="order.proposedPrice" label="Price proposed" :value="`${formatMoney(order.proposedPrice)} EGP`" />

      <KeyValueRow v-if="order.deadline" :label="`Deadline · ${DEADLINE_LABELS[order.deadline.kind] ?? order.deadline.kind}`">
        <span :class="{ 'd-odp__late': order.deadline.overdue }">{{ formatDateTime(order.deadline.at) }}<template v-if="order.deadline.overdue"> · passed</template></span>
      </KeyValueRow>

      <div v-if="order.cancelReason" class="d-odp__text">{{ order.cancelReason }}</div>

      <template v-if="order.extensionRequest">
        <div class="d-odp__label">The seller asks for more time</div>
        <KeyValueRow label="Reason" :value="order.extensionRequest.reasonLabel" />
        <KeyValueRow label="Asked" :value="formatDateTime(order.extensionRequest.requestedAt)" />

        <KeyValueRow label="State">
          <StatusTag :label="EXTENSION_STATE_META[order.extensionRequest.state].label" :variant="EXTENSION_STATE_META[order.extensionRequest.state].variant" />
        </KeyValueRow>

        <div class="d-odp__text">{{ order.extensionRequest.detail }}</div>
      </template>

      <template v-if="order.disputes.length > 0">
        <div class="d-odp__label">Disputes</div>

        <KeyValueRow v-for="d in order.disputes" :key="d.id" :label="`${d.ref} · ${d.raisedAs === 'buyer' ? 'buyer' : 'seller'}`">
          <RouterLink v-if="order.can.handleDispute" :to="{ name: 'disputes', query: { id: d.id } }">{{ disputeStateMeta(d.state).label }}</RouterLink>
          <template v-else>{{ disputeStateMeta(d.state).label }}</template>
          <template v-if="d.outcome"> · {{ OUTCOME_LABELS[d.outcome as DisputeOutcome] ?? d.outcome }}</template>
        </KeyValueRow>
      </template>

      <FreeRelistPanel :free-relist="order.freeRelist" :relisted-from="order.relistedFromOrder" />
      <OrderRatingsPanel v-if="order.ratings !== null" :ratings="order.ratings" />

      <template v-if="order.settlement">
        <div class="d-odp__label">Settlement</div>
        <KeyValueRow v-if="order.settlement.finalWeightG" label="Final weight" :value="`${formatWeight(order.settlement.finalWeightG)} g`" />
        <KeyValueRow label="Buyer pays" :value="`${formatMoney(order.settlement.finalBuyerTotal)} EGP`" />
        <KeyValueRow label="Balance after the deposit" :value="`${formatMoney(order.settlement.balanceAmount)} EGP`" />
        <KeyValueRow label="Seller gross" :value="`${formatMoney(order.settlement.finalSellerGross)} EGP`" />
        <KeyValueRow label="Commission" :value="`${formatMoney(order.settlement.commissionAmount)} EGP`" />
        <KeyValueRow label="VAT" :value="`${formatMoney(order.settlement.vatAmount)} EGP`" />
        <KeyValueRow label="Spread" :value="`${formatMoney(order.settlement.spreadAmount)} EGP`" />
        <KeyValueRow big label="Seller receives" :value="`${formatMoney(order.settlement.sellerProceeds)} EGP`" />
      </template>

      <template v-if="order.commissionWaiver">
        <div class="d-odp__label">Commission</div>
        <KeyValueRow label="An ordinary sale would pay" :value="`${formatMoney(order.commissionWaiver.ordinaryEgp)} EGP`" />
        <KeyValueRow label="Charged" :value="`${formatMoney(order.commissionWaiver.chargedEgp)} EGP`" />
        <KeyValueRow label="Given up" :value="`${formatMoney(order.commissionWaiver.givenUpEgp)} EGP`" />
        <KeyValueRow label="Because of" :value="waiverWords(order.commissionWaiver)" />
        <KeyValueRow v-if="order.commissionWaiver.floorApplied" label="Minimum commission" :value="`${formatMoney(order.commissionWaiver.floorEgp)} EGP held`" />
        <KeyValueRow v-if="order.commissionWaiver.spreadGivenUpEgp && Number(order.commissionWaiver.spreadGivenUpEgp) > 0" label="Spread given to the dealer" :value="`${formatMoney(order.commissionWaiver.spreadGivenUpEgp)} EGP`" />
      </template>

      <template v-if="order.advance">
        <div class="d-odp__label">First-sale advance</div>
        <KeyValueRow label="Paid ahead" :value="`${formatMoney(order.advance.amountEgp)} EGP`" />
        <KeyValueRow label="How" :value="order.advance.basis === 'promo_code' ? `Code ${order.advance.promoCode ?? ''}` : 'Enabled by staff'" />
        <KeyValueRow label="State" :value="ADVANCE_STATE[order.advance.status]" />
        <KeyValueRow v-if="order.advance.recoveredEgp" label="Recovered" :value="`${formatMoney(order.advance.recoveredEgp)} EGP`" />
        <KeyValueRow v-if="order.advance.shortfallAbsorbedEgp && Number(order.advance.shortfallAbsorbedEgp) > 0" label="Absorbed by Dahab" :value="`${formatMoney(order.advance.shortfallAbsorbedEgp)} EGP`" />
      </template>

      <template v-if="order.inspections.length > 0">
        <div class="d-odp__label">Inspection results</div>

        <div v-for="r in order.inspections" :key="r.id" class="d-odp__result" :class="{ 'd-odp__result--old': r.superseded }">
          <div class="d-odp__result-head">
            <StatusTag :label="outcomeMeta(r.outcome).label" :variant="outcomeMeta(r.outcome).variant" />
            <span class="who2">{{ formatDateTime(r.inspectedAt) }}<template v-if="r.supersedesId"> · correction</template><template v-if="r.superseded"> · replaced</template></span>
          </div>

          <div class="d-odp__result-body">
            <span v-if="r.statedKarat !== null || r.measuredKarat !== null">Karat {{ r.measuredKarat ?? '—' }}K (stated {{ r.statedKarat ?? '—' }}K)</span>
            <span v-if="r.measuredWeightG">Weight {{ formatWeight(r.measuredWeightG) }} g (stated {{ formatWeight(r.statedWeightG) }} g<template v-if="r.weightDiffPct">, {{ formatPct(r.weightDiffPct) }}</template>)</span>
            <span v-if="r.measuredStoneGrade">Stone {{ r.measuredStoneGrade }}</span>
            <span v-if="r.certificateNumber">Certificate {{ r.certificateNumber }}</span>
          </div>

          <div v-if="r.inspectorNote" class="d-odp__text">{{ r.inspectorNote }}</div>
        </div>
      </template>

      <template v-if="order.collection">
        <div class="d-odp__label">Collection</div>
        <KeyValueRow label="Collected" :value="order.collection.collectedAt ? formatDateTime(order.collection.collectedAt) : 'Not yet'" />
        <KeyValueRow v-if="order.collection.failedAttempts > 0" label="Wrong codes" :value="order.collection.failedAttempts" />
        <KeyValueRow v-if="order.collection.lockedUntil && !isPast(order.collection.lockedUntil)" label="Locked until" :value="formatDateTime(order.collection.lockedUntil)" />

        <template v-if="order.collection.proxy">
          <KeyValueRow label="Someone else collects" :value="order.collection.proxy.name ?? '—'" />
          <KeyValueRow v-if="order.collection.proxy.phone" label="Their phone" :value="order.collection.proxy.phone" />
          <KeyValueRow v-if="order.collection.proxy.namedAt" label="Named" :value="formatDateTime(order.collection.proxy.namedAt)" />
          <KeyValueRow v-if="order.collection.collectedAt" label="Collected by" :value="order.collection.proxy.collectedByProxy ? 'The named person' : 'The buyer'" />

          <template v-if="order.can.viewProxyId && order.collection.proxy.hasIdPhoto">
            <ProxyIdPhoto v-if="showProxyId" class="d-odp__id" :order-id="order.id" />
            <DBtn v-else class="d-odp__id" @click="showProxyId = true">Open their ID photo</DBtn>
          </template>
        </template>
      </template>

      <template v-if="order.sellerReturn">
        <div class="d-odp__label">Piece held for its seller</div>
        <KeyValueRow label="Seller collects by" :value="formatDateTime(order.sellerReturn.returnDeadline)" />
        <KeyValueRow v-if="order.sellerReturn.collectedAt" label="Collected" :value="formatDateTime(order.sellerReturn.collectedAt)" />
        <KeyValueRow v-if="order.sellerReturn.relistedAt" label="Put back on the market" :value="formatDateTime(order.sellerReturn.relistedAt)" />
        <KeyValueRow v-if="order.sellerReturn.lockedUntil && !isPast(order.sellerReturn.lockedUntil)" label="Locked until" :value="formatDateTime(order.sellerReturn.lockedUntil)" />
      </template>

      <template v-if="order.ledger.length > 0">
        <div class="d-odp__label">Money moved</div>

        <DataTable>
          <template #head>
            <th>When</th>
            <th>Entry</th>
            <th>Lines</th>
          </template>

          <tr v-for="e in order.ledger" :key="e.id">
            <td class="mono">{{ formatDateTime(e.createdAt) }}</td>
            <td>{{ e.eventKind.replaceAll('_', ' ') }}</td>

            <td>
              <div v-for="(l, i) in e.lines" :key="i" class="mono">{{ l.party }} · {{ l.account.replaceAll('_', ' ') }} {{ formatMoney(l.amount) }}</div>
            </td>
          </tr>
        </DataTable>
      </template>

      <div class="d-odp__label">History</div>
      <OrderTimeline :events="order.timeline" />
    </template>
  </Panel>

  <ConfirmDialog
    v-model="receiving"
    confirm-label="Mark received"
    :error="receiveError"
    :loading="receive.isPending.value"
    :message="`The piece for ${order.orderRef} is at ${order.branch.nameEn ?? 'the branch'}. The reach-branch deadline stops and the piece goes to inspection.`"
    title="Piece received"
    @confirm="onReceive"
  />

  <InspectionResultModal :open="inspection !== null" :target="inspection" @close="inspection = null" />
  <ProposePriceModal :open="modal === 'price'" :order="order" @close="modal = null" />
  <ChangeBranchModal :open="modal === 'branch'" :order="order" @close="modal = null" />
  <ExtendDeadlineModal :open="modal === 'extend'" :order="order" @close="modal = null" />
  <AnswerExtensionModal :open="modal === 'answer'" :request="order.extensionRequest" @close="modal = null" />

  <HandoverModal
    :can-view-id="order.can.viewProxyId"
    :open="handoverTo !== null"
    :order-id="order.id"
    :order-ref="order.orderRef"
    :proxy="order.collection?.proxy ?? null"
    :to="handoverTo ?? 'buyer'"
    @close="handoverTo = null"
  />

  <CancelAcceptanceModal
    :listing-id="order.piece.listingId"
    :open="modal === 'cancel'"
    :order="order"
    :title="title"
    @close="modal = null"
  />
</template>

<script lang="ts" setup>
  import type { DisputeOutcome } from '@/types/dispute'
  import type { InspectionResult, InspectionTarget, OrderCommissionWaiver, OrderDetail } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { RouterLink } from 'vue-router'
  import CancelAcceptanceModal from '@/components/listings/CancelAcceptanceModal.vue'
  import { formatWeight } from '@/components/listings/listingFormat'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney, isPast } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { disputeStateMeta, OUTCOME_LABELS } from '@/types/dispute'
  import { DEADLINE_LABELS, EXTENSION_STATE_META, orderStateMeta, outcomeMeta, pieceTitle } from '@/types/order'
  import { PERMISSIONS } from '@/types/staff'
  import AnswerExtensionModal from './AnswerExtensionModal.vue'
  import ChangeBranchModal from './ChangeBranchModal.vue'
  import ExtendDeadlineModal from './ExtendDeadlineModal.vue'
  import FreeRelistPanel from './FreeRelistPanel.vue'
  import HandoverModal from './HandoverModal.vue'
  import InspectionResultModal from './InspectionResultModal.vue'
  import { orderErrorMessage } from './orderErrors'
  import { formatPct } from './orderFormat'
  import OrderRatingsPanel from './OrderRatingsPanel.vue'
  import OrderTimeline from './OrderTimeline.vue'
  import ProposePriceModal from './ProposePriceModal.vue'
  import ProxyIdPhoto from './ProxyIdPhoto.vue'

  // One order for staff (Backend spec 012 FR-022): the figures, every inspection result,
  // the money moved, its history, and the actions the Backend says apply now (`can`).
  const props = defineProps<{ order: OrderDetail }>()

  // Spec 023: what paid for the commission difference, and the state of an advance, in plain words.
  const ADVANCE_STATE = {
    outstanding: 'Waiting for the buyer to pay',
    recovered: 'Recovered at the buyer\'s payment',
    written_off: 'Written off (the buyer did not pay or the sale ended)',
  } as const

  function waiverWords (w: OrderCommissionWaiver): string {
    switch (w.kind) {
      case 'free_relist': {
        return 'A free relist (no commission)'
      }
      case 'market_maker': {
        return 'A market-maker code'
      }
      case 'credit': {
        return w.code ? `A commission credit from code ${w.code}` : 'A commission credit'
      }
      default: {
        return 'Nothing: an ordinary sale'
      }
    }
  }

  const { can } = usePermissions()
  const canOpenCustomer = computed(() => can(PERMISSIONS.customerView))
  const title = computed(() => pieceTitle(props.order.piece.category, props.order.piece.pieceType.nameEn, props.order.piece.karat))
  const latest = computed(() => props.order.inspections.find(r => r.id === props.order.latestInspectionId) ?? null)
  // handleDispute and viewProxyId open links and photos below, not buttons up here.
  const hasActions = computed(() => {
    const { handleDispute: _dispute, viewProxyId: _proxy, answerExtension, ...rest } = props.order.can
    return Object.values(rest).some(Boolean) || (answerExtension && props.order.extensionRequest !== null)
  })
  // Spec 014: the unresolved dispute that froze this order, and the proxy's ID shown on request.
  const openDispute = computed(() => props.order.disputes.find(d => d.state !== 'resolved') ?? null)
  const showProxyId = ref(false)
  watch(() => props.order.id, () => {
    showProxyId.value = false
  })

  const modal = ref<'price' | 'branch' | 'extend' | 'cancel' | 'answer' | null>(null)
  const handoverTo = ref<'buyer' | 'seller' | null>(null)
  const inspection = ref<InspectionTarget | null>(null)

  function openInspection (correcting: InspectionResult | null) {
    inspection.value = {
      orderId: props.order.id,
      orderRef: props.order.orderRef,
      category: props.order.piece.category,
      pieceName: title.value,
      statedKarat: props.order.piece.karat,
      statedWeightG: props.order.piece.weightG,
      correcting,
    }
  }

  // Receive: one confirmation, sent once.
  const receiving = ref(false)
  const receive = useOrderAction()
  const receiveKey = useIdempotencyKey()
  const toast = useToast()
  const receiveError = computed(() => (receive.error.value ? orderErrorMessage(receive.error.value) : ''))

  watch(() => [receiving.value, props.order.id], () => {
    if (!receiving.value) {
      receive.reset()
      receiveKey.reset()
    }
  })

  async function onReceive () {
    if (receive.isPending.value) return
    const payload = { orderId: props.order.id, action: { kind: 'receive' as const } }
    try {
      await receive.mutateAsync({ ...payload, idempotencyKey: receiveKey.keyFor(payload) })
      receiveKey.reset()
      toast.ok('Received. Both sides are told the piece is at inspection.')
      receiving.value = false
    } catch {
      // Shown in the dialog.
    }
  }
</script>

<style lang="scss" scoped>
.d-odp__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.d-odp__label { margin: 16px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-odp__text {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.d-odp__late { color: var(--bad); }
.d-odp__frozen { margin-bottom: 10px; }
.d-odp__id { margin: 8px 0; }
.d-odp__result { padding: 8px 0; border-bottom: 1px solid var(--line); }
.d-odp__result:last-child { border-bottom: 0; }
.d-odp__result--old { opacity: .6; }
.d-odp__result-head { display: flex; gap: 8px; align-items: center; }
.d-odp__result-body { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; font-size: 12.5px; }
.who2 { font-size: 11px; color: var(--ink-3); }
.mono { font-variant-numeric: tabular-nums; font-size: 12px; }
</style>
