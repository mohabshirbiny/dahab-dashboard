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
            <DBtn @click="selected = c.code">Uses</DBtn>

            <DBtn
              :disabled="!canManage || update.isPending.value"
              :kind="c.is_active ? 'danger' : 'success'"
              @click="onToggle(c)"
            >{{ c.is_active ? 'Turn off' : 'Turn on' }}</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>

    <NoteBanner class="d-pr__note">Turning a code off stops it instantly. Anything already in progress carries on as normal.</NoteBanner>

    <PromoCodeDetails v-if="viewed" :code="viewed" @close="viewing = null" />

    <NewCodePanel v-if="adding" :loading="create.isPending.value" :submit-error="createError" @submit="onCreate" />

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
  import { useCreatePromoCode, usePromoCodes, usePromoUses, useUpdatePromoCode } from '@/composables/useMarketMakers'
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
