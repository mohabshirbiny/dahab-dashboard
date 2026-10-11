<template>
  <div class="d-page">
    <PageLead>The words customers read. Every change needs both languages, and legal text is locked because changing it changes what you have committed to. Nothing reaches customers until you publish.</PageLead>

    <FilterChips v-model="kind" :options="KIND_OPTIONS" />

    <FilterChips v-if="kind === 'app'" v-model="area" :options="areaOptions" />

    <Panel v-if="kind === 'app' && area === LEGAL" class="d-ct__block" subtitle="Locked here" title="Legal text">
      <EmptyState description="Terms, privacy and the declarations people tick are published as whole new versions, never edited in place, from Terms and versions." title="Legal text is not edited here">
        <RouterLink class="d-ct__legal-link" to="/dashboard/docs">Open Terms and versions</RouterLink>
      </EmptyState>
    </Panel>

    <Panel v-else class="d-ct__block" :subtitle="subtitle" title="Text">
      <PublishBar
        :can-publish="canEdit"
        :count="drafts.length"
        :exporting="exporting.isPending.value"
        :more="draftsHaveMore"
        :publishing="publish.isPending.value"
        @export="exportList"
        @publish="openPublish"
      />

      <template #filters>
        <div class="d-ct__filters">
          <DInput v-model="search" aria-label="Search the texts" class="d-ct__search" placeholder="Search a text or where it appears" />
          <DSelect v-model="state" aria-label="State" :options="STATE_OPTIONS" />
        </div>
      </template>

      <NoteBanner v-if="exportError" class="d-ct__note" role="alert" variant="bad">{{ exportError }}</NoteBanner>

      <LoadingState v-if="list.isPending.value" label="Loading the texts…" />
      <ErrorState v-else-if="list.isError.value" :message="contentErrorMessage(list.error.value)" title="Could not load the texts" @retry="list.refetch()" />

      <EmptyState v-else-if="rows.length === 0 && kind === 'faq'" description="Nothing here yet. Add the first question; customers see it after you publish." title="No Help questions">
        <DBtn v-if="canEdit" kind="primary" @click="openCreateFaq">Add a question</DBtn>
      </EmptyState>

      <EmptyState v-else-if="rows.length === 0" :description="emptyHint" title="No texts here" />

      <template v-else>
        <NoteBanner v-if="faqActionError" class="d-ct__note" role="alert" variant="bad">{{ faqActionError }}</NoteBanner>

        <div v-if="kind === 'faq' && canEdit" class="d-ct__faq-add">
          <DBtn kind="primary" @click="openCreateFaq">Add a question</DBtn>
        </div>

        <FaqList
          v-if="kind === 'faq'"
          :busy="move.isPending.value || save.isPending.value"
          :can-edit="canEdit"
          :entries="faqEntries"
          @edit="openEditor"
          @history="openHistory"
          @move="onMoveFaq"
          @toggle="onToggleHidden"
        />

        <TextTable v-else :rows="rows" @edit="openEditor" @history="openHistory" />

        <div v-if="list.hasNextPage.value" class="d-ct__more">
          <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
        </div>
      </template>
    </Panel>

    <FaqCreateDialog
      v-model="createOpen"
      :busy="create.isPending.value"
      :field-errors="createFieldErrors"
      :submit-error="createError"
      @save="onCreateFaq"
    />

    <TextEditDialog
      v-model="editorOpen"
      :busy="saving"
      :field-errors="editorFieldErrors"
      :settings="settings.data.value ?? []"
      :submit-error="editorError"
      :text="editing"
      @discard="onDiscard"
      @revert="onRevert"
      @save="onSave"
    />

    <TextHistoryDrawer
      v-model="historyOpen"
      :can-edit="canEdit"
      :error="historyError"
      :restoring="revert.isPending.value"
      :text="historyFor"
      @restore="onRestore"
    />

    <DModal v-model="publishOpen" :max-width="640" :persistent="publish.isPending.value" title="Publish changes">
      <p class="d-ct__publish-lead">These {{ drafts.length }}{{ draftsHaveMore ? '+' : '' }} changes go live for every customer together, in both languages.</p>

      <ul class="d-ct__publish-list">
        <li v-for="d in drafts" :key="d.key">
          <span class="mono">{{ d.key }}</span>
          <span v-if="d.draft?.isDefaultMarker" class="who2">back to the app's own wording</span>
          <span v-else class="who2">{{ d.draft?.en }}</span>
          <span v-if="blocked[d.key]" class="d-ct__blocked">{{ blocked[d.key] }}</span>
        </li>
      </ul>

      <NoteBanner v-if="publishError" class="d-ct__note" role="alert" variant="bad">{{ publishError }}</NoteBanner>

      <template #actions>
        <DBtn :disabled="publish.isPending.value" @click="publishOpen = false">Cancel</DBtn>
        <DBtn kind="primary" :loading="publish.isPending.value" @click="onPublish">Publish changes</DBtn>
      </template>
    </DModal>
  </div>
</template>

<script lang="ts" setup>
  import type { AppText, CreateFaqInput, FaqEntry, RevertTarget, TextKind, TextListQuery, TextStateFilter } from '@/types/content'
  import { computed, ref } from 'vue'
  import { contentErrorMessage } from '@/components/content/contentErrors'
  import FaqCreateDialog from '@/components/content/FaqCreateDialog.vue'
  import FaqList from '@/components/content/FaqList.vue'
  import PublishBar from '@/components/content/PublishBar.vue'
  import TextEditDialog from '@/components/content/TextEditDialog.vue'
  import TextHistoryDrawer from '@/components/content/TextHistoryDrawer.vue'
  import TextTable from '@/components/content/TextTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import {
    useCreateFaqEntry,
    useDiscardTextDraft,
    useDraftsQuery,
    useExportTexts,
    useMoveFaqEntry,
    usePlaceholdersQuery,
    usePublishTexts,
    useRevertText,
    useSaveTextDraft,
    useTextsQuery,
  } from '@/composables/useContent'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { publishKeyErrors } from '@/services/content.service'
  import { isServiceError } from '@/services/errors'
  import { CONTENT_AREAS } from '@/types/content'
  import { PERMISSIONS } from '@/types/staff'

  // App text (Backend spec 019 US1): the registry of the customer app's texts, one shared draft per
  // text, Publish changes as one bundle, the app's own wording as the default and the fallback.
  // content.edit opens the page and every action on it.
  const LEGAL = 'legal'

  const STATE_OPTIONS: ReadonlyArray<{ value: TextStateFilter, label: string }> = [
    { value: '', label: 'Every state' },
    { value: 'draft', label: 'With a draft' },
    { value: 'published', label: 'Changed from the app\'s own' },
    { value: 'default', label: 'The app\'s own wording' },
  ]

  const { can } = usePermissions()
  const toast = useToast()
  const canEdit = computed(() => can(PERMISSIONS.contentEdit))

  // One kind at a time: the app's own texts, the customer messages (SMS, email, inbox), the Help entries.
  const KIND_OPTIONS: ReadonlyArray<{ value: TextKind, label: string }> = [
    { value: 'app', label: 'App text' },
    { value: 'notification', label: 'Notifications' },
    { value: 'faq', label: 'Help' },
  ]
  const kind = ref<TextKind>('app')
  const area = ref('')
  const search = ref('')
  const state = ref<TextStateFilter>('')

  const areaOptions = [...CONTENT_AREAS, { value: LEGAL, label: 'Legal, locked' }]
  const query = computed<TextListQuery>(() => ({
    kind: kind.value,
    area: kind.value === 'app' && area.value !== LEGAL ? area.value : '',
    q: search.value,
    state: state.value,
  }))

  const list = useTextsQuery(query)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const subtitle = computed(() => `${rows.value.length} text${rows.value.length === 1 ? '' : 's'}${list.hasNextPage.value ? ' shown, more below' : ''}`)
  const emptyHint = 'Texts appear here once the app\'s keys are registered (php artisan app-texts:sync). Try another area or clear the search.'

  const draftsQuery = useDraftsQuery()
  const drafts = computed<AppText[]>(() => draftsQuery.data.value?.rows ?? [])
  const draftsHaveMore = computed(() => draftsQuery.data.value?.nextCursor != null)

  const settings = usePlaceholdersQuery()

  // ---- edit ----
  const editorOpen = ref(false)
  const editing = ref<AppText | null>(null)
  const save = useSaveTextDraft()
  const discard = useDiscardTextDraft()
  const revert = useRevertText()
  const saveKey = useIdempotencyKey()
  const discardKey = useIdempotencyKey()
  const revertKey = useIdempotencyKey()
  const saving = computed(() => save.isPending.value || discard.isPending.value || revert.isPending.value)

  const failure = ref<unknown>(null)
  const editorFieldErrors = computed(() => (isServiceError(failure.value) ? failure.value.fields : {}))
  const editorError = computed(() => {
    const e = failure.value
    if (!e || (isServiceError(e) && e.code === 'validation' && Object.keys(e.fields).length > 0)) return ''
    return contentErrorMessage(e)
  })

  function openEditor (text: AppText) {
    editing.value = text
    failure.value = null
    editorOpen.value = true
  }

  function onSave (payload: { en: string, ar: string }) {
    const text = editing.value
    if (!text) return
    // Saving the words of a Help answer keeps its hidden flag as it is.
    const hidden = text.kind === 'faq' ? (text.draft && !text.draft.isDefaultMarker ? text.draft.isHidden : (text.published?.isHidden ?? false)) : undefined
    const values = { key: text.key, en: payload.en, ar: payload.ar, draftVersion: text.draft?.draftVersion ?? null, isHidden: hidden }
    failure.value = null
    save.mutate({ values, idempotencyKey: saveKey.keyFor(values) }, {
      onSuccess: () => {
        saveKey.reset()
        editorOpen.value = false
        toast.ok('Saved as a draft. Customers see it after you publish.')
      },
      onError: error => {
        failure.value = error
      },
    })
  }

  function onDiscard () {
    const text = editing.value
    if (!text) return
    failure.value = null
    discard.mutate({ key: text.key, idempotencyKey: discardKey.keyFor(text.key) }, {
      onSuccess: () => {
        discardKey.reset()
        editorOpen.value = false
        toast.ok('Draft discarded.')
      },
      onError: error => {
        failure.value = error
      },
    })
  }

  function onRevert () {
    const text = editing.value
    if (!text) return
    failure.value = null
    revert.mutate({ key: text.key, to: 'default', idempotencyKey: revertKey.keyFor([text.key, 'default']) }, {
      onSuccess: () => {
        revertKey.reset()
        editorOpen.value = false
        toast.ok('Saved as a draft. After you publish, the app uses its own wording again.')
      },
      onError: error => {
        failure.value = error
      },
    })
  }

  // ---- Help entries (US5) ----
  // A Help entry is two texts, help.faq.<slug>.question and .answer, shown together in the order
  // customers will see after the next publish.
  const faqEntries = computed<FaqEntry[]>(() => {
    const bySlug = new Map<string, FaqEntry>()
    for (const t of rows.value) {
      const m = /^help\.faq\.([a-z0-9_]+)\.(question|answer)$/.exec(t.key)
      if (!m) continue
      const entry = bySlug.get(m[1]) ?? { slug: m[1], position: null, pendingPosition: null, question: null, answer: null }
      entry[m[2] as 'question' | 'answer'] = t
      entry.position = t.position
      entry.pendingPosition = t.pendingPosition
      bySlug.set(m[1], entry)
    }
    const order = (e: FaqEntry) => e.pendingPosition ?? e.position ?? Number.MAX_SAFE_INTEGER
    // A fresh array, so sorting in place changes nothing else (the lib target has no toSorted).
    // eslint-disable-next-line unicorn/no-array-sort
    return [...bySlug.values()].sort((a, b) => order(a) - order(b) || a.slug.localeCompare(b.slug))
  })

  const create = useCreateFaqEntry()
  const createKey = useIdempotencyKey()
  const createOpen = ref(false)
  const createFailure = ref<unknown>(null)
  const createFieldErrors = computed(() => (isServiceError(createFailure.value) ? createFailure.value.fields : {}))
  const createError = computed(() => {
    const e = createFailure.value
    if (!e || (isServiceError(e) && e.code === 'validation' && Object.keys(e.fields).length > 0)) return ''
    return contentErrorMessage(e)
  })

  function openCreateFaq () {
    createFailure.value = null
    createOpen.value = true
  }

  function onCreateFaq (values: CreateFaqInput) {
    createFailure.value = null
    create.mutate({ values, idempotencyKey: createKey.keyFor(values) }, {
      onSuccess: () => {
        createKey.reset()
        createOpen.value = false
        toast.ok('Saved as a draft. Customers see it after you publish.')
      },
      onError: error => {
        createFailure.value = error
      },
    })
  }

  const faqActionError = ref('')
  const move = useMoveFaqEntry()
  const moveKey = useIdempotencyKey()

  function onMoveFaq (slug: string, position: number) {
    faqActionError.value = ''
    move.mutate({ slug, position, idempotencyKey: moveKey.keyFor([slug, position]) }, {
      onSuccess: () => {
        moveKey.reset()
        toast.ok('New order saved as a draft. Customers see it after you publish.')
      },
      onError: error => {
        faqActionError.value = contentErrorMessage(error)
      },
    })
  }

  // Hide or show an entry: the same words, a draft of the answer with the other flag.
  function onToggleHidden (entry: FaqEntry) {
    const a = entry.answer
    if (!a) return
    const wordsNow = a.draft && !a.draft.isDefaultMarker ? a.draft : a.published
    const hiddenNow = a.draft && !a.draft.isDefaultMarker ? a.draft.isHidden : (a.published?.isHidden ?? false)
    if (!wordsNow) return
    faqActionError.value = ''
    const values = { key: a.key, en: wordsNow.en, ar: wordsNow.ar, draftVersion: a.draft?.draftVersion ?? null, isHidden: !hiddenNow }
    save.mutate({ values, idempotencyKey: saveKey.keyFor(values) }, {
      onSuccess: () => {
        saveKey.reset()
        toast.ok(hiddenNow ? 'Saved as a draft. The question is shown after you publish.' : 'Saved as a draft. The question is hidden after you publish.')
      },
      onError: error => {
        faqActionError.value = contentErrorMessage(error)
      },
    })
  }

  // ---- history and restore ----
  const historyOpen = ref(false)
  const historyFor = ref<AppText | null>(null)
  const historyFailure = ref<unknown>(null)
  const historyError = computed(() => (historyFailure.value ? contentErrorMessage(historyFailure.value) : ''))

  function openHistory (text: AppText) {
    historyFor.value = text
    historyFailure.value = null
    historyOpen.value = true
  }

  function onRestore (version: number) {
    const text = historyFor.value
    if (!text) return
    const to: RevertTarget = version
    historyFailure.value = null
    revert.mutate({ key: text.key, to, idempotencyKey: revertKey.keyFor([text.key, version]) }, {
      onSuccess: () => {
        revertKey.reset()
        historyOpen.value = false
        toast.ok(`Version ${version} is saved as a draft. Publish to put it live.`)
      },
      onError: error => {
        historyFailure.value = error
      },
    })
  }

  // ---- publish ----
  const publish = usePublishTexts()
  const publishKey = useIdempotencyKey()
  const publishOpen = ref(false)
  const publishFailure = ref<unknown>(null)
  const publishError = computed(() => (publishFailure.value ? contentErrorMessage(publishFailure.value) : ''))
  const blocked = computed<Record<string, string>>(() => {
    const e = publishFailure.value
    if (!isServiceError(e)) return {}
    return Object.fromEntries(publishKeyErrors(e.details).map(k => [k.key, k.message]))
  })

  function openPublish () {
    publishFailure.value = null
    publishOpen.value = true
  }

  function onPublish () {
    publishFailure.value = null
    publish.mutate(publishKey.keyFor(drafts.value.map(d => `${d.key}:${d.draft?.draftVersion}`)), {
      onSuccess: result => {
        publishKey.reset()
        publishOpen.value = false
        toast.ok(`Published ${result.keys.length} change${result.keys.length === 1 ? '' : 's'}. Customers see them when the app next checks.`)
      },
      onError: error => {
        publishFailure.value = error
      },
    })
  }

  // ---- export ----
  const exporting = useExportTexts()
  const exportError = ref('')

  function exportList () {
    exportError.value = ''
    exporting.mutate(query.value, {
      onError: error => {
        exportError.value = contentErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-ct__block { margin-top: 16px; }
.d-ct__legal-link { display: inline-block; margin-top: 10px; }
.d-ct__filters { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 16px; }
.d-ct__search { flex: 1 1 240px; }
.d-ct__note { margin: 12px 16px; }
.d-ct__faq-add { display: flex; justify-content: flex-end; padding: 10px 16px; }
.d-ct__more { display: flex; justify-content: center; padding: 12px; }
.d-ct__publish-lead { margin: 0 0 10px; color: var(--ink-2); }
.d-ct__publish-list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow: auto; }
.d-ct__publish-list li { padding: 7px 0; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.d-ct__blocked { color: var(--bad); font-size: 12px; }
</style>
