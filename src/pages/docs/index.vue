<template>
  <div class="d-page">
    <PageLead>Terms, privacy and the declarations people tick. Every version is kept forever, because a customer agreed to the version that was live on the day they signed.</PageLead>

    <LoadingState v-if="documents.isPending.value" class="d-docs__block" label="Loading the documents…" />

    <Panel v-else-if="documents.isError.value" class="d-docs__block">
      <ErrorState :message="contentErrorMessage(documents.error.value)" title="Could not load the documents" @retry="documents.refetch()" />
    </Panel>

    <Panel v-else class="d-docs__block" subtitle="Whole versions only; nothing is edited in place" title="Documents">
      <NoteBanner v-if="!canPublish" class="d-docs__note" variant="info">
        Publishing a new version is the CEO's alone. You can read every document and its history here.
      </NoteBanner>

      <DataTable>
        <template #head>
          <th>Document</th>
          <th>Live version</th>
          <th>Since</th>
          <th class="r">Agreed by</th>
          <th class="r" />
        </template>

        <tr v-for="d in rows" :key="d.code">
          <td>
            {{ d.label }}
            <div class="who2">{{ d.kind === 'declaration' ? 'Ticked in a form' : 'Listed in the app' }}</div>
          </td>

          <td class="mono">
            <template v-if="d.published">v{{ d.version }}<StatusTag v-if="d.isMaterial" class="d-docs__tag" label="Material" variant="warn" /></template>
            <span v-else class="who2">Not published yet</span>
          </td>

          <td>
            <template v-if="d.published">
              {{ formatDate(d.publishedAt) }}
              <div v-if="d.publishedBy?.fullName" class="who2">{{ d.publishedBy.fullName }}</div>
            </template>
            <template v-else>—</template>
          </td>

          <td class="r mono">{{ d.published ? formatNumber(d.acceptedLiveCount) : '—' }}</td>

          <td class="r d-docs__actions">
            <DBtn @click="openHistory(d)">History</DBtn>
            <DBtn v-if="canPublish" kind="primary" @click="openPublish(d)">New version</DBtn>
          </td>
        </tr>
      </DataTable>

      <template #footer>
        <NoteBanner class="d-docs__note" variant="info">
          What is recorded on every tick: the document, the version, when, and the device and address it came from.
        </NoteBanner>
      </template>
    </Panel>

    <LegalHistoryDrawer v-model="historyOpen" :document="selected" />

    <LegalVersionDialog
      v-if="canPublish"
      v-model="publishOpen"
      :document="selected"
      :field-errors="fieldErrors"
      :loading="publish.isPending.value"
      :submit-error="submitError"
      @publish="onPublish"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { LegalDocument } from '@/types/legal'
  import { computed, ref } from 'vue'
  import { contentErrorMessage } from '@/components/content/contentErrors'
  import LegalHistoryDrawer from '@/components/legal/LegalHistoryDrawer.vue'
  import LegalVersionDialog from '@/components/legal/LegalVersionDialog.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatNumber } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useLegalDocumentsQuery, usePublishLegalVersion } from '@/composables/useLegal'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { isServiceError } from '@/services/errors'
  import { PERMISSIONS } from '@/types/staff'

  // Terms and versions (Backend spec 019 US3): the documents with their live version and how
  // many customers accepted it, every version's history, and — for the CEO — a new version.
  const { can } = usePermissions()
  const toast = useToast()
  const canPublish = computed(() => can(PERMISSIONS.legalPublish))

  const documents = useLegalDocumentsQuery()
  const rows = computed(() => documents.data.value ?? [])

  const selected = ref<LegalDocument | null>(null)
  const historyOpen = ref(false)
  const publishOpen = ref(false)

  const publish = usePublishLegalVersion()
  const publishKey = useIdempotencyKey()
  const failure = ref<unknown>(null)
  const fieldErrors = computed(() => (isServiceError(failure.value) ? failure.value.fields : {}))
  const submitError = computed(() => {
    const e = failure.value
    if (!e || (isServiceError(e) && e.code === 'validation' && Object.keys(e.fields).length > 0)) return ''
    return contentErrorMessage(e)
  })

  function openHistory (d: LegalDocument) {
    selected.value = d
    historyOpen.value = true
  }

  function openPublish (d: LegalDocument) {
    selected.value = d
    failure.value = null
    publishOpen.value = true
  }

  function onPublish (payload: { bodyEn: string, bodyAr: string, isMaterial: boolean }) {
    const d = selected.value
    if (!d) return
    const values = { code: d.code, ...payload }
    failure.value = null
    publish.mutate({ values, idempotencyKey: publishKey.keyFor(values) }, {
      onSuccess: result => {
        publishKey.reset()
        publishOpen.value = false
        toast.ok(`Version ${result.version} of ${d.label} is published.`)
      },
      onError: error => {
        failure.value = error
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-docs__block { margin-top: 16px; }
.d-docs__note { margin: 12px 16px; }
.d-docs__tag { margin-left: 6px; }
.d-docs__actions { white-space: nowrap; }
.d-docs__actions > * + * { margin-left: 6px; }
</style>
