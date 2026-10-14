<template>
  <Panel :subtitle="documents.length === 1 ? '1 attempt' : `${documents.length} attempts`" title="Identity documents">
    <EmptyState
      v-if="documents.length === 0"
      description="This customer has not sent an identity document."
      title="No documents"
    />

    <DataTable v-else>
      <template #head>
        <th>Attempt</th>
        <th>Document</th>
        <th>Sent</th>
        <th>Outcome</th>
        <th>Reviewed by</th>
        <th aria-label="Action" class="r" />
      </template>

      <tr v-for="doc in documents" :key="doc.id">
        <td>{{ doc.attemptNumber }}</td>

        <td>
          {{ IDENTITY_TYPE_LABELS[doc.type] }}
          <div v-if="doc.reviewReasons.length > 0" class="who2">{{ doc.reviewReasons.map(reasonLabel).join(', ') }}</div>
        </td>

        <td>{{ formatDateTime(doc.submittedAt) }}</td>

        <td>
          <StatusTag :label="IDENTITY_STATUS_META[doc.status].label" :variant="IDENTITY_STATUS_META[doc.status].variant" />
        </td>

        <td>
          {{ doc.reviewedBy?.name ?? (doc.reviewedAt ? 'Unknown' : '—') }}
          <div v-if="doc.reviewedAt" class="who2">{{ formatDateTime(doc.reviewedAt) }}</div>
        </td>

        <td class="r">
          <DBtn :aria-label="`View the ${IDENTITY_TYPE_LABELS[doc.type]} sent ${formatDateTime(doc.submittedAt)}`" @click="open = doc">
            View
          </DBtn>
        </td>
      </tr>
    </DataTable>

    <p class="who2 d-docs__note">Opening a document is logged with your name.</p>
  </Panel>

  <DModal
    :max-width="760"
    :model-value="open !== null"
    :title="open ? `${IDENTITY_TYPE_LABELS[open.type]} · attempt ${open.attemptNumber} · ${IDENTITY_STATUS_META[open.status].label}` : ''"
    @update:model-value="value => { if (!value) open = null }"
  >
    <div v-if="open" class="d-docs__images" :class="{ 'd-docs__images--two': open.hasBack }">
      <DocumentPreview
        :available="true"
        :document-id="open.id"
        side="front"
        :two-sided="open.hasBack"
        :type="open.type"
      />

      <DocumentPreview
        v-if="open.hasBack"
        :available="true"
        :document-id="open.id"
        side="back"
        two-sided
        :type="open.type"
      />
    </div>

    <p v-if="open?.reviewNote" class="d-docs__review-note">{{ open.reviewNote }}</p>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CustomerFileDocument } from '@/types/customer'
  import { ref } from 'vue'
  import DocumentPreview from '@/components/identity/DocumentPreview.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { IDENTITY_STATUS_META, IDENTITY_TYPE_LABELS, reasonLabel } from '@/types/identity'

  defineProps<{ documents: CustomerFileDocument[] }>()

  // The images load only when a document is opened: each view is an audited read.
  const open = ref<CustomerFileDocument | null>(null)
</script>

<style lang="scss" scoped>
.d-docs__note { margin-top: 12px; }
.d-docs__images { display: grid; gap: 12px; }
.d-docs__images--two { grid-template-columns: 1fr 1fr; }
.d-docs__review-note { margin-top: 12px; font-size: 13px; }
@media (max-width: 900px) {
  .d-docs__images--two { grid-template-columns: 1fr; }
}
</style>
