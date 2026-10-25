<template>
  <div class="d-page">
    <PageLead>
      Where pieces are inspected and handed over. Working hours matter: every deadline in the system is counted in
      working hours at the branch the seller chose.
    </PageLead>

    <Panel title="Branches">
      <template v-if="canManage" #actions>
        <DBtn @click="openEditor(null)">Add a branch</DBtn>
      </template>

      <LoadingState v-if="branches.isPending.value" label="Loading branches…" />

      <ErrorState
        v-else-if="branches.isError.value"
        :message="referenceErrorMessage(branches.error.value)"
        :retryable="errorCodeOf(branches.error.value) !== 'forbidden'"
        title="Could not load branches"
        @retry="branches.refetch()"
      />

      <EmptyState v-else-if="!branches.data.value || branches.data.value.length === 0" title="No branches yet" />

      <!-- The design's "In progress" and "Average time to a result" columns wait for
           orders on the Backend (spec 004 scope): they are left out, not faked. -->
      <DataTable v-else>
        <template #head>
          <th>Branch</th>
          <th>Where</th>
          <th>Open</th>
          <th>Closed</th>
          <th v-if="canManage" aria-label="Action" class="r" />
        </template>

        <tr v-for="branch in branches.data.value" :key="branch.id">
          <td>
            <div class="d-branches__name">
              {{ branch.nameEn }}
              <StatusTag v-if="!branch.isEnabled" label="Disabled" variant="off" />
            </div>

            <div class="who2" dir="rtl">{{ branch.nameAr }}</div>
          </td>

          <td>
            {{ branch.addressEn }}
            <div v-if="branch.phone" class="who2 mono" dir="ltr">{{ branch.phone }}</div>
            <div v-if="branch.timezone !== DEFAULT_TIMEZONE" class="who2">{{ branch.timezone }}</div>
          </td>

          <td>
            <template v-if="branch.hours.length > 0">
              <div v-for="line in openSummary(branch.hours)" :key="line">{{ line }}</div>
            </template>

            <span v-else class="d-branches__none">Never open</span>
          </td>

          <td>
            {{ closedDays(branch.hours) }}
            <div class="who2">Plus public holidays</div>
          </td>

          <td v-if="canManage" class="r">
            <DBtn :aria-label="`Edit ${branch.nameEn}`" @click="openEditor(branch)">Edit</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>

    <div class="d-split">
      <Panel subtitle="Deadlines skip these days" title="Public holidays and closures">
        <LoadingState v-if="closures.isPending.value" label="Loading holidays…" />

        <ErrorState
          v-else-if="closures.isError.value"
          :message="referenceErrorMessage(closures.error.value)"
          :retryable="errorCodeOf(closures.error.value) !== 'forbidden'"
          title="Could not load holidays"
          @retry="closures.refetch()"
        />

        <EmptyState v-else-if="upcoming.length === 0" title="No upcoming holidays" />

        <DataTable v-else>
          <template #head>
            <th>Date</th>
            <th>What</th>
            <th>Branches</th>
            <th v-if="canManage" aria-label="Action" class="r" />
          </template>

          <tr v-for="closure in upcoming" :key="closure.id">
            <td class="mono">{{ formatDay(closure.closureDate) }}</td>

            <td>
              {{ closure.reasonEn ?? '—' }}
              <div v-if="closure.reasonAr" class="who2" dir="rtl">{{ closure.reasonAr }}</div>
            </td>

            <td>{{ branchLabel(closure.branchId) }}</td>

            <td v-if="canManage" class="r">
              <DBtn
                :aria-label="`Remove the closure on ${formatDay(closure.closureDate)}`"
                :disabled="closure.closureDate <= today"
                kind="danger"
                :title="closure.closureDate <= today ? 'Today\'s and past closures stay: deadlines were counted with them.' : undefined"
                @click="askDelete(closure)"
              >
                Remove
              </DBtn>
            </td>
          </tr>
        </DataTable>

        <template v-if="canManage" #footer>
          <DBtn class="d-branches__add" @click="openClosure">Add a holiday</DBtn>
        </template>
      </Panel>

      <Panel title="Why this matters">
        <template #body>
          <NoteBanner>
            A seller who accepts at 4pm on Thursday has 12 working hours to reach the branch. With Friday and Saturday
            closed and the branch open 10:00 to 18:00, that is 2 hours on Thursday, 8 on Sunday and 2 on Monday: the
            deadline is Monday at noon, not Friday morning. Get the hours wrong here and the app will chase people on
            days the branch is shut.
          </NoteBanner>
        </template>
      </Panel>
    </div>

    <BranchEditorModal
      v-model="editorOpen"
      :branch="editing"
      :field-errors="editorFieldErrors"
      :loading="saveBranch.isPending.value"
      :submit-error="editorError"
      @confirm="save"
    />

    <AddClosureModal
      v-model="closureOpen"
      :branches="enabledBranches"
      :field-errors="closureFieldErrors"
      :loading="createClosure.isPending.value"
      :submit-error="closureError"
      @confirm="addClosure"
    />

    <ConfirmDialog
      v-model="deleteOpen"
      confirm-kind="danger"
      confirm-label="Remove"
      :error="deleteError"
      :loading="deleteClosure.isPending.value"
      :message="deleting ? `Deadlines will count ${formatDay(deleting.closureDate)} as a working day again.` : undefined"
      title="Remove this holiday?"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { Branch, BranchClosure, BranchInput, CreateClosureInput } from '@/types/reference'
  import { computed, ref } from 'vue'
  import AddClosureModal from '@/components/reference/AddClosureModal.vue'
  import BranchEditorModal from '@/components/reference/BranchEditorModal.vue'
  import { referenceErrorMessage } from '@/components/reference/referenceErrors'
  import { fieldError } from '@/components/staff/accessErrors'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { usePermissions } from '@/composables/usePermissions'
  import {
    useBranchesQuery,
    useClosuresQuery,
    useCreateClosure,
    useDeleteClosure,
    useSaveBranch,
  } from '@/composables/useReference'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf, isServiceError } from '@/services/errors'
  import { closedDays, DEFAULT_TIMEZONE, openSummary } from '@/types/reference'
  import { PERMISSIONS } from '@/types/staff'

  const { can } = usePermissions()
  const { ok } = useToast()

  // Viewing needs reference.view (route guard); every change needs branches.manage.
  const canManage = computed(() => can(PERMISSIONS.branchesManage))

  const branches = useBranchesQuery()
  const closures = useClosuresQuery()

  const enabledBranches = computed(() => (branches.data.value ?? []).filter(b => b.isEnabled))

  // "Today" in the platform timezone: the Backend refuses past dates the same way.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIMEZONE }).format(new Date())

  // Past closures stay in the Backend (deadlines were counted with them); the list shows what is coming.
  const upcoming = computed(() => (closures.data.value ?? []).filter(c => c.closureDate >= today))

  function formatDay (date: string): string {
    const [year, month, day] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year!, month! - 1, day!)))
  }

  function branchLabel (branchId: number | null): string {
    if (branchId === null) return 'All'
    return branches.data.value?.find(b => b.id === branchId)?.nameEn ?? `Branch ${branchId}`
  }

  // Branch editor
  const saveBranch = useSaveBranch()
  const editorOpen = ref(false)
  const editing = ref<Branch | null>(null)
  const editorError = ref<string>()
  const editorFieldErrors = ref<Readonly<Record<string, string[]>>>({})

  function openEditor (branch: Branch | null) {
    editing.value = branch
    editorError.value = undefined
    editorFieldErrors.value = {}
    editorOpen.value = true
  }

  function save (payload: BranchInput) {
    editorError.value = undefined
    editorFieldErrors.value = {}
    const isNew = editing.value === null
    // Spec 004 edge case: disabling the last open branch is allowed, but sellers are left with no choice.
    const lastOpen = !isNew && editing.value!.isEnabled && !payload.isEnabled && enabledBranches.value.length === 1
    saveBranch.mutate({ id: editing.value?.id ?? null, ...payload }, {
      onSuccess: branch => {
        editorOpen.value = false
        if (lastOpen) {
          ok(`${branch.nameEn} disabled. No branch is open for inspections now until you enable one.`)
          return
        }
        ok(isNew ? `${branch.nameEn} added.` : `${branch.nameEn} saved.`)
      },
      onError: error => {
        editorFieldErrors.value = isServiceError(error) ? error.fields : {}
        editorError.value = referenceErrorMessage(error)
      },
    })
  }

  // Holidays and closures
  const createClosure = useCreateClosure()
  const closureOpen = ref(false)
  const closureError = ref<string>()
  const closureFieldErrors = ref<Partial<Record<'closure_date' | 'branch_id' | 'reason_en' | 'reason_ar', string>>>({})

  function openClosure () {
    closureError.value = undefined
    closureFieldErrors.value = {}
    closureOpen.value = true
  }

  function addClosure (payload: CreateClosureInput) {
    closureError.value = undefined
    closureFieldErrors.value = {}
    createClosure.mutate(payload, {
      onSuccess: closure => {
        closureOpen.value = false
        ok(`${formatDay(closure.closureDate)} added. Deadlines skip it now.`)
      },
      onError: error => {
        closureFieldErrors.value = {
          closure_date: fieldError(error, 'closure_date'),
          branch_id: fieldError(error, 'branch_id'),
          reason_en: fieldError(error, 'reason_en'),
          reason_ar: fieldError(error, 'reason_ar'),
        }
        closureError.value = referenceErrorMessage(error)
      },
    })
  }

  const deleteClosure = useDeleteClosure()
  const deleteOpen = ref(false)
  const deleting = ref<BranchClosure | null>(null)
  const deleteError = ref<string>()

  function askDelete (closure: BranchClosure) {
    deleting.value = closure
    deleteError.value = undefined
    deleteOpen.value = true
  }

  function confirmDelete () {
    if (!deleting.value) return
    const label = formatDay(deleting.value.closureDate)
    deleteError.value = undefined
    deleteClosure.mutate(deleting.value.id, {
      onSuccess: () => {
        deleteOpen.value = false
        ok(`${label} removed.`)
      },
      onError: error => {
        deleteError.value = referenceErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-branches__name { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.d-branches__none { color: var(--ink-3); }
.d-branches__add { margin-top: 12px; }
.d-split {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
  align-items: start;
}
.d-split > * { min-width: 0; }
@media (max-width: 1100px) {
  .d-split { grid-template-columns: 1fr; gap: 14px; }
}
</style>
