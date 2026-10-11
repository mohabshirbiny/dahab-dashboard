<template>
  <div class="d-page">
    <PageLead>Market-maker codes. A code belongs to one dealer's account, waives Dahab's commission and gives the spread to the dealer. Other kinds of code are not built.</PageLead>

    <NoteBanner v-if="actionError" class="d-pr__note" role="alert" variant="bad">{{ actionError }}</NoteBanner>

    <Panel class="d-pr__block" subtitle="One code per dealer" title="Codes">
      <div class="d-pr__add">
        <DInput v-model="code" aria-label="Code" placeholder="CODE" />
        <DInput v-model="customerId" aria-label="Dealer account id" placeholder="Dealer account id" />
        <DInput v-model="cap" aria-label="Monthly cap in EGP" inputmode="numeric" placeholder="Monthly cap, EGP" />
        <DBtn :disabled="!canManage" kind="primary" :loading="create.isPending.value" @click="onCreate">Create code</DBtn>
      </div>

      <LoadingState v-if="codes.isPending.value" label="Loading the codes…" />
      <ErrorState v-else-if="codes.isError.value" :message="accessErrorMessage(codes.error.value)" title="Could not load the codes" @retry="codes.refetch()" />
      <EmptyState v-else-if="(codes.data.value ?? []).length === 0" description="No market-maker code yet." title="No codes" />

      <DataTable v-else>
        <template #head>
          <th>Code</th>
          <th>Dealer</th>
          <th class="r">Monthly cap</th>
          <th class="r">Uses this month</th>
          <th>State</th>
          <th class="r" />
        </template>

        <tr v-for="c in codes.data.value" :key="c.code">
          <td class="mono">{{ c.code }}</td>
          <td>{{ c.customer?.full_name }} <span class="who2">{{ c.customer?.display_ref }}</span></td>
          <td class="r">{{ c.monthly_cap_egp ?? 'No cap' }}</td>
          <td class="r">{{ c.uses_this_month }}</td>
          <td><StatusTag :label="c.is_active ? 'On' : 'Off'" :variant="c.is_active ? 'ok' : 'off'" /></td>

          <td class="r">
            <DBtn @click="selected = c.code">Uses</DBtn>
            <DBtn :disabled="!canManage || update.isPending.value" @click="onToggle(c)">{{ c.is_active ? 'Turn off' : 'Turn on' }}</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>

    <Panel v-if="selected" class="d-pr__block" :subtitle="`Every attempt, allowed or blocked`" :title="`Code use log: ${selected}`">
      <LoadingState v-if="uses.isPending.value" label="Loading…" />
      <EmptyState v-else-if="(uses.data.value ?? []).length === 0" description="Nobody has used this code yet." title="Empty log" />

      <DataTable v-else>
        <template #head>
          <th>When</th>
          <th>Account</th>
          <th>Result</th>
        </template>

        <tr v-for="(u, i) in uses.data.value" :key="i">
          <td>{{ formatDateTime(u.used_at) }}</td>
          <td>{{ u.customer.full_name }} <span class="who2">{{ u.customer.display_ref }}</span></td>
          <td><StatusTag :label="u.allowed ? 'Allowed' : `Blocked: ${u.block_reason ?? ''}`" :variant="u.allowed ? 'ok' : 'warn'" /></td>
        </tr>
      </DataTable>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import type { PromoCodeRow } from '@/composables/useMarketMakers'
  import { ref } from 'vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useCreatePromoCode, usePromoCodes, usePromoUses, useUpdatePromoCode } from '@/composables/useMarketMakers'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'

  // Market-maker codes (Backend spec 019 FR-060). promo.manage opens the page and every action on it.
  const { can } = usePermissions()
  const toast = useToast()
  const canManage = can('promo.manage')
  const codes = usePromoCodes()
  const selected = ref<string | null>(null)
  const uses = usePromoUses(selected)

  const create = useCreatePromoCode()
  const update = useUpdatePromoCode()
  const key = useIdempotencyKey()
  const code = ref('')
  const customerId = ref('')
  const cap = ref('')
  const actionError = ref('')

  function onCreate () {
    actionError.value = ''
    const input = { code: code.value.trim(), customerId: customerId.value.trim(), monthlyCap: cap.value.trim() }
    create.mutate({ ...input, idempotencyKey: key.keyFor(input) }, {
      onSuccess: () => {
        key.reset()
        code.value = ''
        customerId.value = ''
        cap.value = ''
        toast.ok('Code created.')
      },
      onError: error => {
        actionError.value = accessErrorMessage(error)
      },
    })
  }

  function onToggle (c: PromoCodeRow) {
    actionError.value = ''
    update.mutate({ code: c.code, active: !c.is_active, idempotencyKey: key.keyFor([c.code, !c.is_active]) }, {
      onSuccess: () => {
        key.reset()
        toast.ok(c.is_active ? 'Code turned off.' : 'Code turned on.')
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
.d-pr__add { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; }
</style>
