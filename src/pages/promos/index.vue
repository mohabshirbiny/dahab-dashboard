<template>
  <div class="d-page">
    <PageLead>Codes are checked on the server, never in the app. A code tied to an account works only for that account, whatever device it is typed on.</PageLead>

    <NoteBanner v-if="actionError" class="d-pr__note" role="alert" variant="bad">{{ actionError }}</NoteBanner>

    <Panel title="Codes">
      <template #actions>
        <DBtn :disabled="!canManage" kind="primary" @click="adding = !adding">Add a code</DBtn>
      </template>

      <LoadingState v-if="codes.isPending.value" label="Loading the codes…" />
      <ErrorState v-else-if="codes.isError.value" :message="accessErrorMessage(codes.error.value)" title="Could not load the codes" @retry="codes.refetch()" />
      <EmptyState v-else-if="(codes.data.value ?? []).length === 0" description="No code yet. Add one to begin." title="No codes" />

      <DataTable v-else>
        <template #head>
          <th>Code</th>
          <th>What it does</th>
          <th>Tied to</th>
          <th>Conditions</th>
          <th>Used this month</th>
          <th>Status</th>
          <th class="r" />
        </template>

        <tr v-for="c in codes.data.value" :key="c.code">
          <td class="mono d-pr__code">{{ c.code }}</td>

          <td>
            {{ commissionWords(c) }}
            <div v-for="n in whatItDoesNotes(c)" :key="n" class="who2">{{ n }}</div>
          </td>

          <td>
            <template v-if="c.tied_to.audience === 'account'">
              {{ c.tied_to.customer.full_name }}
              <div v-if="c.tied_to.customer.phone_masked" class="who2">{{ c.tied_to.customer.phone_masked }}</div>
            </template>

            <template v-else>Everyone</template>
            <div v-if="c.first_sale_only" class="who2">First sale only</div>
          </td>

          <td>
            <template v-if="conditionLines(c).main">{{ conditionLines(c).main }}</template>
            <template v-else>—</template>
            <div v-for="n in conditionLines(c).notes" :key="n" class="who2">{{ n }}</div>
          </td>

          <td>
            <div class="mono">{{ usedThisMonth(c) }}</div>
            <div v-if="capPercent(c) !== null" class="d-pr__bar"><i :style="{ width: `${capPercent(c)}%` }" /></div>
          </td>

          <td><StatusTag :label="c.is_active ? 'On' : 'Off'" :variant="c.is_active ? 'ok' : 'off'" /></td>

          <td class="r">
            <DBtn @click="viewing = c.code">View</DBtn>
            <DBtn :disabled="!canManage" @click="startEdit(c)">Edit</DBtn>
            <DBtn @click="selected = c.code">Uses</DBtn>

            <DBtn
              :disabled="!canManage || update.isPending.value"
              :kind="c.is_active ? 'danger' : 'success'"
              @click="onToggle(c)"
            >{{ c.is_active ? 'Turn off' : 'Turn on' }}</DBtn>

            <!-- A used code stays for its history; only a code nobody has used can go. -->
            <DBtn
              :disabled="!canManage || c.in_use"
              kind="danger"
              :title="c.in_use ? 'Used codes cannot be deleted. Turn it off instead.' : undefined"
              @click="askDelete(c)"
            >Delete</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>

    <NoteBanner class="d-pr__note">Turning a code off stops it instantly. Anything already in progress carries on as normal.</NoteBanner>

    <PromoCodeDetails v-if="viewed" :code="viewed" @close="viewing = null" />

    <NewCodePanel v-if="adding" :loading="create.isPending.value" :submit-error="createError" @submit="onCreate" />

    <NewCodePanel
      v-if="editingRow"
      :key="editingRow.code"
      :editing="editingRow"
      :loading="replace.isPending.value || update.isPending.value"
      :submit-error="editError"
      @cancel="editing = null"
      @submit="onSave"
    />

    <ConfirmDialog
      v-model="deleteOpen"
      confirm-kind="danger"
      confirm-label="Delete"
      :error="deleteError"
      :loading="remove.isPending.value"
      :message="deleting ? `Nobody has used ${deleting} yet. It will be removed for good; the deletion is logged against your name.` : undefined"
      :title="`Delete code ${deleting ?? ''}?`"
      @confirm="confirmDelete"
    />

    <Panel v-if="selected" class="d-pr__block" subtitle="Every attempt, allowed or blocked" :title="`Code use log: ${selected}`">
      <LoadingState v-if="uses.isPending.value" label="Loading…" />
      <EmptyState v-else-if="(uses.data.value ?? []).length === 0" description="Nobody has used this code yet." title="Empty log" />

      <DataTable v-else>
        <template #head>
          <th>When</th>
          <th>Account</th>
          <th class="r">Value</th>
          <th>Result</th>
          <th class="r">Commission given up</th>
        </template>

        <tr v-for="(u, i) in uses.data.value" :key="i">
          <td>{{ formatDateTime(u.used_at) }}</td>
          <td>{{ u.customer.full_name }} <span class="who2">{{ u.customer.display_ref }}</span></td>
          <td class="r mono">{{ u.value_egp === null ? '—' : formatMoney(u.value_egp) }}</td>

          <td>
            <StatusTag :label="u.allowed ? 'Allowed' : `Blocked: ${u.block_reason ?? ''}`" :variant="u.allowed ? 'ok' : 'warn'" />
            <div v-if="u.credit_status" class="who2">Credit {{ u.credit_status }}</div>
          </td>

          <td class="r mono">{{ u.reduction_egp === null ? '—' : formatMoney(u.reduction_egp) }}</td>
        </tr>
      </DataTable>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import type { NewCodeInput, PromoCodeRow } from '@/composables/useMarketMakers'
  import { computed, ref } from 'vue'
  import NewCodePanel from '@/components/promo/NewCodePanel.vue'
  import PromoCodeDetails from '@/components/promo/PromoCodeDetails.vue'
  import { capPercent, commissionWords, conditionLines, promoCreateError, usedThisMonth, whatItDoesNotes } from '@/components/promo/promoFormat'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
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
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useCreatePromoCode, useDeletePromoCode, usePromoCodes, usePromoUses, useReplacePromoCode, useUpdatePromoCode } from '@/composables/useMarketMakers'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'

  // Promo codes, as designed (Backend spec 019 FR-060, spec 023 Story 5). promo.manage opens the page
  // and every action on it.
  const { can } = usePermissions()
  const toast = useToast()
  const canManage = can('promo.manage')
  const codes = usePromoCodes()
  const selected = ref<string | null>(null)
  const uses = usePromoUses(selected)
  // The code whose terms are open in the View panel.
  const viewing = ref<string | null>(null)
  const viewed = computed(() => (codes.data.value ?? []).find(c => c.code === viewing.value) ?? null)

  const create = useCreatePromoCode()
  const update = useUpdatePromoCode()
  const key = useIdempotencyKey()
  const adding = ref(false)
  const actionError = ref('')
  const createError = ref('')

  function onCreate (body: NewCodeInput) {
    createError.value = ''
    create.mutate({ body, idempotencyKey: key.keyFor(body) }, {
      onSuccess: () => {
        key.reset()
        adding.value = false
        toast.ok('Code created and logged against your name.')
      },
      onError: error => {
        createError.value = promoCreateError(error, accessErrorMessage(error))
      },
    })
  }

  // Edit: every term of a code nobody has used; a used one only its cap and end date.
  const replace = useReplacePromoCode()
  const editing = ref<string | null>(null)
  const editingRow = computed(() => (codes.data.value ?? []).find(c => c.code === editing.value) ?? null)
  const editError = ref('')

  function startEdit (c: PromoCodeRow) {
    adding.value = false
    editError.value = ''
    editing.value = c.code
  }

  function onSave (body: NewCodeInput) {
    const row = editingRow.value
    if (!row) return
    editError.value = ''
    const done = {
      onSuccess: () => {
        key.reset()
        editing.value = null
        toast.ok('Code saved and logged against your name.')
      },
      onError: (error: unknown) => {
        editError.value = promoCreateError(error, accessErrorMessage(error))
      },
    }
    if (row.in_use) {
      const changes = { monthlyCap: body.monthly_cap_egp ?? null, endsOn: body.ends_on ?? null }
      update.mutate({ code: row.code, ...changes, idempotencyKey: key.keyFor([row.code, changes]) }, done)
      return
    }
    const { code: _code, ...terms } = body
    replace.mutate({ code: row.code, body: terms, idempotencyKey: key.keyFor([row.code, terms]) }, done)
  }

  // Delete: only a code nobody has used.
  const remove = useDeletePromoCode()
  const deleting = ref<string | null>(null)
  const deleteOpen = ref(false)
  const deleteError = ref('')

  function askDelete (c: PromoCodeRow) {
    deleting.value = c.code
    deleteError.value = ''
    deleteOpen.value = true
  }

  function confirmDelete () {
    const code = deleting.value
    if (!code) return
    remove.mutate({ code, idempotencyKey: key.keyFor(['delete', code]) }, {
      onSuccess: () => {
        key.reset()
        deleteOpen.value = false
        if (viewing.value === code) viewing.value = null
        if (editing.value === code) editing.value = null
        if (selected.value === code) selected.value = null
        toast.ok('Code deleted and logged against your name.')
      },
      onError: error => {
        deleteError.value = promoCreateError(error, accessErrorMessage(error))
      },
    })
  }

  function onToggle (c: PromoCodeRow) {
    actionError.value = ''
    update.mutate({ code: c.code, active: !c.is_active, idempotencyKey: key.keyFor([c.code, !c.is_active]) }, {
      onSuccess: () => {
        key.reset()
        toast.ok(c.is_active ? 'Turned off and logged.' : 'Turned on and logged.')
      },
      onError: error => {
        actionError.value = accessErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-pr__block { margin-top: 16px; }
.d-pr__note { margin: 12px 0; }
.d-pr__code { font-weight: 600; }
.d-pr__bar { height: 4px; background: var(--line); border-radius: 2px; margin-top: 5px; overflow: hidden; }
.d-pr__bar i { display: block; height: 100%; background: var(--gold); }
</style>
