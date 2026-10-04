<template>
  <Panel :subtitle="dispute.state === 'resolved' ? 'Resolved' : 'Order frozen'" :title="dispute.ref">
    <template #actions>
      <StatusTag :label="disputeStateMeta(dispute.state).label" :variant="disputeStateMeta(dispute.state).variant" />
    </template>

    <template #body>
      <div v-if="canResolve || dispute.can.passOn" class="d-ddp__actions">
        <DBtn v-if="canResolve" kind="primary" @click="modal = 'resolve'">Send the reply and close</DBtn>
        <DBtn v-if="dispute.can.passOn" @click="modal = 'pass'">Pass it to someone else</DBtn>
      </div>

      <KeyValueRow label="Raised by">
        {{ dispute.raisedAs === 'buyer' ? 'Buyer' : 'Seller' }}
        <RouterLink v-if="canOpenCustomer" :to="{ name: 'customer-file', params: { id: dispute.raisedBy.customerId } }">{{ dispute.raisedBy.displayRef }}</RouterLink>
        <template v-else>{{ dispute.raisedBy.displayRef ?? '—' }}</template>
      </KeyValueRow>

      <KeyValueRow label="Reason chosen" :value="dispute.reasonLabel" />
      <KeyValueRow label="Opened" :value="formatDateTime(dispute.openedAt)" />
      <KeyValueRow label="Frozen from" :value="orderStateMeta(dispute.order.frozenFrom).label" />
      <KeyValueRow label="Order value" :value="`${formatMoney(dispute.order.value)} EGP`" />
      <KeyValueRow label="Deposit held" :value="`${formatMoney(dispute.order.held)} EGP`" />
      <KeyValueRow v-if="dispute.assignedTo" label="With" :value="dispute.assignedTo.name ?? '—'" />

      <div class="d-ddp__label">What they wrote</div>
      <div class="d-ddp__text">{{ dispute.detail }}</div>

      <template v-if="dispute.photos.length > 0">
        <div class="d-ddp__label">Photos ({{ dispute.photos.length }})</div>

        <div class="d-ddp__photos">
          <template v-for="p in dispute.photos" :key="p.id">
            <DisputePhoto v-if="shown.has(p.id)" :dispute-id="dispute.id" :photo-id="p.id" :position="p.position" />
            <DBtn v-else @click="show(p.id)">Open photo {{ p.position }}</DBtn>
          </template>
        </div>

        <p class="who2">Each photo you open is logged against your name.</p>
      </template>

      <template v-if="dispute.state === 'resolved'">
        <div class="d-ddp__label">Resolved</div>
        <KeyValueRow label="Outcome" :value="dispute.outcome ? OUTCOME_LABELS[dispute.outcome] : '—'" />
        <KeyValueRow label="By" :value="dispute.resolvedBy?.name ?? '—'" />
        <KeyValueRow v-if="dispute.resolvedAt" label="When" :value="formatDateTime(dispute.resolvedAt)" />
        <div class="d-ddp__text">{{ dispute.reply }}</div>
      </template>

      <template v-if="dispute.compensations.length > 0">
        <div class="d-ddp__label">Compensation paid</div>

        <KeyValueRow
          v-for="(c, i) in dispute.compensations"
          :key="i"
          :label="`${c.party === 'buyer' ? 'Buyer' : 'Seller'} · ${reasonLabel(c.reason)}`"
          :value="`${formatMoney(c.amount)} EGP · ${c.paidBy.name ?? '—'}`"
        />
      </template>

      <div class="d-ddp__label">History</div>

      <div v-for="(h, i) in dispute.history" :key="i" class="d-ddp__event">
        <div>
          <strong>{{ historyLabel(h.kind) }}</strong>
          <span class="who2">· {{ h.by.type === 'staff' ? h.by.name ?? 'Staff' : (h.by.role === 'buyer' ? 'the buyer' : 'the seller') }} · {{ formatDateTime(h.at) }}</span>
        </div>

        <div v-if="h.assignedTo" class="who2">To {{ h.assignedTo.name ?? '—' }}</div>
        <div v-if="h.note" class="d-ddp__text">{{ h.note }}</div>
      </div>
    </template>
  </Panel>

  <OrderDetailPanel class="d-ddp__order" :order="dispute.order" />

  <ResolveModal :dispute="dispute" :open="modal === 'resolve'" @close="modal = null" />
  <PassOnModal :dispute="dispute" :open="modal === 'pass'" @close="modal = null" />
</template>

<script lang="ts" setup>
  import type { DisputeDetail } from '@/types/dispute'
  import { computed, reactive, ref, watch } from 'vue'
  import { RouterLink } from 'vue-router'
  import OrderDetailPanel from '@/components/orders/OrderDetailPanel.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { COMPENSATION_REASONS, disputeStateMeta, OUTCOME_LABELS } from '@/types/dispute'
  import { orderStateMeta } from '@/types/order'
  import { PERMISSIONS } from '@/types/staff'
  import DisputePhoto from './DisputePhoto.vue'
  import PassOnModal from './PassOnModal.vue'
  import ResolveModal from './ResolveModal.vue'

  // One dispute (Backend spec 014 FR-008): the customer's words and photos, its history
  // with staff notes, the resolution, and the order below it with its money and timeline.
  // Photos open one at a time, on request: each view is audited.
  const props = defineProps<{ dispute: DisputeDetail }>()

  const { can } = usePermissions()
  const canOpenCustomer = computed(() => can(PERMISSIONS.customerView))
  const canResolve = computed(() => props.dispute.can.resolveResume || props.dispute.can.resolveAgainstSale)

  const modal = ref<'resolve' | 'pass' | null>(null)
  const shown = reactive(new Set<string>())

  watch(() => props.dispute.id, () => {
    shown.clear()
    modal.value = null
  })

  function show (photoId: string) {
    shown.add(photoId)
  }

  function reasonLabel (reason: string): string {
    return COMPENSATION_REASONS.find(r => r.value === reason)?.label ?? reason.replaceAll('_', ' ')
  }

  function historyLabel (kind: string): string {
    switch (kind) {
      case 'opened': { return 'Reported' }
      case 'passed_on': { return 'Passed on' }
      case 'resolved': { return 'Resolved' }
    }
    return kind.replaceAll('_', ' ')
  }
</script>

<style lang="scss" scoped>
.d-ddp__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.d-ddp__label { margin: 16px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-ddp__text {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.d-ddp__photos { display: grid; gap: 8px; }
.d-ddp__event { padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; }
.d-ddp__event:last-child { border-bottom: 0; }
.d-ddp__order { margin-top: 14px; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
