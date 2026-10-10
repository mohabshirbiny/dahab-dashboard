<template>
  <Panel :subtitle="`Seller ${listing.seller.displayRef}`" :title="listingTitle(listing)">
    <template #actions>
      <StatusTag :label="listingStateMeta(listing.state).label" :variant="listingStateMeta(listing.state).variant" />
    </template>

    <div class="d-lrp">
      <NoteBanner v-if="listing.seller.status === 'suspended'" class="d-lrp__note" variant="wait">
        This seller is suspended. The piece cannot go live until they are reinstated; you can send it back or reject it.
      </NoteBanner>

      <ListingMediaGrid :listing-id="listing.id" :media="listing.media" />

      <KeyValueRow label="Seller" :value="`${listing.seller.fullName ?? '—'} · ${listing.seller.displayRef}`" />
      <KeyValueRow label="Phone" :value="listing.seller.phoneMasked" />
      <KeyValueRow label="Listing" :value="`${ordinal(listing.sellerListingNumber)} listing`" />

      <KeyValueRow v-if="listing.relistedFromOrder" label="Free relist of order">
        <RouterLink :to="{ name: 'orders', query: { id: listing.relistedFromOrder.id } }">{{ listing.relistedFromOrder.orderRef }}</RouterLink>
        · no commission
      </KeyValueRow>

      <KeyValueRow label="Sent back on this piece">
        <span :class="{ 'd-lrp__wait': listing.sentBackCount > 0 }">{{ listing.sentBackCount }} {{ listing.sentBackCount === 1 ? 'time' : 'times' }}</span>
      </KeyValueRow>

      <KeyValueRow label="Sent back across all their listings">
        <span :class="{ 'd-lrp__bad': sentBackOften }">{{ listing.sellerListingsSentBack }} of {{ listing.sellerListingsSubmitted }}</span>
      </KeyValueRow>

      <KeyValueRow v-if="listing.statedWeightG" label="Weight stated" :value="`${formatWeight(listing.statedWeightG)} g`" />
      <KeyValueRow v-if="listing.karat !== null" label="Karat stated" :value="`${listing.karat}K`" />
      <KeyValueRow v-if="listing.makingChargePerG" label="Making charge" :value="`${formatMoney(listing.makingChargePerG)} per gram`" />

      <KeyValueRow v-if="makingShare !== null" label="As % of gold value">
        <span :class="{ 'd-lrp__wait': makingIsHigh }">{{ makingShare }}%</span>
      </KeyValueRow>

      <KeyValueRow v-if="listing.askingPrice" label="Asking price" :value="`${formatMoney(listing.askingPrice)} EGP`" />

      <KeyValueRow label="Price to a buyer now">
        {{ listing.priceAvailable ? `${formatMoney(listing.currentPrice)} EGP` : 'Cannot be priced now' }}
        <span v-if="listing.priceAvailable && listing.priceIsIndicative" class="who2">· follows the gold price</span>
      </KeyValueRow>

      <KeyValueRow label="Branches named" :value="branches" />
      <KeyValueRow label="Video" :value="has('video') ? 'Uploaded' : 'None'" />
      <KeyValueRow label="Original invoice" :value="has('invoice') ? 'Uploaded' : 'None'" />
      <KeyValueRow v-if="listing.category !== 'gold'" label="Stone certificate" :value="has('stone_certificate') ? 'Uploaded' : 'None'" />
      <KeyValueRow v-if="listing.listedAt" label="Went live" :value="formatDateTime(listing.listedAt)" />

      <ListingQueuePanel v-if="listing.state === 'reserved' || listing.queue.length > 0" :queue="listing.queue" />
      <ListingOrderBox v-if="listing.order" :listing-id="listing.id" :order="listing.order" :title="listingTitle(listing)" />

      <div class="d-lrp__label">Description</div>
      <div class="d-lrp__text">{{ listing.description || 'No description.' }}</div>

      <NoteBanner v-if="makingIsHigh && listing.canApprove" class="d-lrp__note" variant="wait">
        The making charge is high for a piece this weight. It is allowed, but it usually means the piece sits unsold.
      </NoteBanner>

      <div v-if="hasActions" class="d-lrp__actions">
        <DBtn v-if="listing.canApprove" class="d-lrp__main" kind="primary" @click="decision = 'approve'">Approve and publish</DBtn>
        <DBtn v-if="listing.canRequestChanges" @click="decision = 'request-changes'">Ask for changes</DBtn>
        <DBtn v-if="listing.canReject" kind="danger" @click="decision = 'reject'">Reject</DBtn>
        <DBtn v-if="listing.canTakeDown" kind="danger" @click="decision = 'takedown'">Take down</DBtn>
      </div>

      <p v-if="hasActions" class="who2 d-lrp__logged">Whatever you choose is logged against your name.</p>

      <div class="d-lrp__label">History</div>
      <ListingHistory :history="listing.history" />
    </div>

    <ListingDecisionModal
      :decision="decision"
      :listing-id="listing.id"
      :queue-count="listing.queue.length"
      :title="listingTitle(listing)"
      @close="decision = null"
      @done="decision = null"
    />
  </Panel>
</template>

<script lang="ts" setup>
  import type { ListingDecision, ListingDetail, ListingMediaKind } from '@/types/listing'
  import { computed, ref, watch } from 'vue'
  import { RouterLink } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { listingStateMeta, listingTitle } from '@/types/listing'
  import ListingDecisionModal from './ListingDecisionModal.vue'
  import { formatWeight, makingShareOfGold } from './listingFormat'
  import ListingHistory from './ListingHistory.vue'
  import ListingMediaGrid from './ListingMediaGrid.vue'
  import ListingOrderBox from './ListingOrderBox.vue'
  import ListingQueuePanel from './ListingQueuePanel.vue'

  // The review panel of the design (Backend spec 010): the piece, its files, the seller
  // and how often their listings are sent back, then the decisions this person may take.
  // The Backend says which (can*); the buttons only follow it.
  const props = defineProps<{ listing: ListingDetail }>()

  const decision = ref<ListingDecision | null>(null)
  watch(() => props.listing.id, () => {
    decision.value = null
  })

  const hasActions = computed(() => props.listing.canApprove || props.listing.canRequestChanges || props.listing.canReject || props.listing.canTakeDown)
  const branches = computed(() => props.listing.branchOptions.map(b => b.nameEn).join(', ') || '—')
  const has = (kind: ListingMediaKind) => props.listing.media.some(m => m.kind === kind)

  const makingShare = computed(() => makingShareOfGold(props.listing.makingChargePerG, props.listing.goldRatePerGram))
  // A hint for the reviewer only, as in the design ("21%" in amber).
  const makingIsHigh = computed(() => makingShare.value !== null && makingShare.value >= 15)
  const sentBackOften = computed(() => props.listing.sellerListingsSubmitted >= 2 && props.listing.sellerListingsSentBack * 2 > props.listing.sellerListingsSubmitted)

  function ordinal (n: number): string {
    const tens = n % 100
    if (tens >= 11 && tens <= 13) return `${n}th`
    return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
  }
</script>

<style lang="scss" scoped>
.d-lrp { padding: 14px 16px 16px; }
.d-lrp__note { margin: 14px 0; }
.d-lrp__note:first-child { margin-top: 0; }
.d-lrp__label { margin: 14px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-lrp__text {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.7;
  background: var(--bg);
  padding: 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.d-lrp__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.d-lrp__main { flex: 1; }
.d-lrp__logged { margin: 10px 0 0; }
.d-lrp__wait { color: var(--wait); }
.d-lrp__bad { color: var(--bad); }
</style>
