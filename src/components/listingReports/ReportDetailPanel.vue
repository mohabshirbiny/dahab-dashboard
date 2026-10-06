<template>
  <Panel :subtitle="report.reasonLabel" :title="report.reference">
    <template #actions>
      <StatusTag :label="reportStateMeta(report.state).label" :variant="reportStateMeta(report.state).variant" />
    </template>

    <template #body>
      <div v-if="report.state === 'open'" class="d-rdp__actions">
        <DBtn v-if="canTakeDown" kind="danger" @click="modal = 'takedown'">Take the piece down</DBtn>
        <DBtn @click="modal = 'dismiss'">Dismiss</DBtn>
      </div>

      <KeyValueRow label="Piece">
        <RouterLink v-if="canOpenListing" :to="{ name: 'listings', query: { id: report.listing.id } }">{{ report.listing.title ?? report.listing.id }}</RouterLink>
        <template v-else>{{ report.listing.title ?? '—' }}</template>
      </KeyValueRow>

      <KeyValueRow label="Seller" :value="report.listing.sellerRef ?? '—'" />
      <KeyValueRow label="Piece now" :value="report.listing.state ? report.listing.state.replaceAll('_', ' ') : '—'" />
      <KeyValueRow label="Reported by" :value="report.reporterRef ?? '—'" />
      <KeyValueRow label="Reported" :value="formatDateTime(report.createdAt)" />

      <template v-if="report.note">
        <div class="d-rdp__label">What they wrote</div>
        <div class="d-rdp__text">{{ report.note }}</div>
      </template>

      <template v-if="report.state !== 'open'">
        <KeyValueRow label="Handled" :value="report.handledAt ? formatDateTime(report.handledAt) : '—'" />
        <KeyValueRow v-if="report.handledBy" label="By" :value="report.handledBy" />

        <template v-if="report.staffNote">
          <div class="d-rdp__label">Staff note</div>
          <div class="d-rdp__text">{{ report.staffNote }}</div>
        </template>
      </template>

      <p class="who2">The seller is never told who reported. The reporter only hears that we looked at it.</p>

      <DismissReportModal :open="modal === 'dismiss'" :report="report" @close="modal = null" />
      <TakeDownReportModal v-if="canTakeDown" :open="modal === 'takedown'" :report="report" @close="modal = null" />
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { ListingReport } from '@/types/listingReport'
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { reportStateMeta } from '@/types/listingReport'
  import { PERMISSIONS } from '@/types/staff'
  import DismissReportModal from './DismissReportModal.vue'
  import TakeDownReportModal from './TakeDownReportModal.vue'

  // One listing report (Backend spec 017 FR-053). Take-down also needs listing.takedown.
  defineProps<{ report: ListingReport }>()

  const { can, canAny } = usePermissions()
  const canTakeDown = computed(() => can(PERMISSIONS.listingTakedown))
  const canOpenListing = computed(() => canAny([PERMISSIONS.listingReview, PERMISSIONS.listingRequestChanges, PERMISSIONS.listingTakedown]))
  const modal = ref<'dismiss' | 'takedown' | null>(null)
</script>

<style lang="scss" scoped>
.d-rdp__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.d-rdp__label { font-size: 12px; font-weight: 600; margin: 14px 0 6px; }
.d-rdp__text { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
</style>
