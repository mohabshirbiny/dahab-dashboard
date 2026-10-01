<template>
  <div class="d-page">
    <PageLead>
      What Dahab charges, and the deadlines and limits the platform runs on. Changing any of these affects every new listing
      immediately, and is logged with the old and new values.
    </PageLead>

    <LoadingState v-if="settings.isPending.value" label="Loading settings…" />

    <ErrorState
      v-else-if="settings.isError.value"
      :message="pricingErrorMessage(settings.error.value)"
      :retryable="errorCodeOf(settings.error.value) !== 'forbidden'"
      title="Could not load settings"
      @retry="settings.refetch()"
    />

    <template v-else-if="settings.data.value">
      <Panel v-for="panel in panels" :key="panel.title" :subtitle="panel.subtitle" :title="panel.title">
        <template #body>
          <NoteBanner v-if="panel.note" class="d-rt__note">{{ panel.note }}</NoteBanner>

          <div v-for="row in rowsOf(panel)" :key="row.setting.key" class="d-rt__row">
            <div class="d-rt__label">
              <label :for="`setting-${row.setting.key}`">{{ row.label }}</label>
              <div class="who2">{{ row.hint ?? row.setting.description }}</div>

              <div v-if="row.setting.updatedBy" class="who2">
                Last changed {{ formatDate(row.setting.updatedAt) }} by {{ row.setting.updatedBy.fullName }}
              </div>
            </div>

            <div class="d-rt__control">
              <label v-if="row.setting.type === 'bool'" class="d-rt__check">
                <input
                  :id="`setting-${row.setting.key}`"
                  :checked="draftBool(row.setting)"
                  :disabled="!canEdit(row.setting)"
                  type="checkbox"
                  @change="draft[row.setting.key] = ($event.target as HTMLInputElement).checked"
                >
                {{ draftBool(row.setting) ? 'Yes' : 'No' }}
              </label>

              <template v-else>
                <DInput
                  :id="`setting-${row.setting.key}`"
                  :disabled="!canEdit(row.setting)"
                  inputmode="numeric"
                  :invalid="Boolean(fieldError(row.setting))"
                  :maxlength="14"
                  :model-value="draftText(row.setting)"
                  @update:model-value="draft[row.setting.key] = $event"
                />

                <span class="d-rt__unit">{{ unitLabel(row.setting.unit) }}</span>
              </template>

              <div v-if="fieldError(row.setting)" class="d-rt__error" role="alert">{{ fieldError(row.setting) }}</div>
            </div>
          </div>

          <div v-if="rowsOf(panel).some(r => canEdit(r.setting))" class="d-rt__actions">
            <DBtn :disabled="changesIn(panel).length === 0 || hasErrors(panel)" kind="primary" @click="openSave(panel)">
              Save {{ changesIn(panel).length > 0 ? `(${changesIn(panel).length})` : '' }}
            </DBtn>

            <DBtn v-if="changesIn(panel).length > 0" @click="discard(panel)">Discard</DBtn>
          </div>
        </template>
      </Panel>

      <Panel title="Recent changes">
        <EmptyState v-if="(history.data.value ?? []).length === 0" title="No changes yet" />

        <DataTable v-else>
          <template #head>
            <th>When</th>
            <th>What</th>
            <th>By</th>
          </template>

          <tr v-for="change in history.data.value" :key="change.id">
            <td class="mono">{{ formatDateTime(change.changedAt) }}</td>

            <td>
              {{ labelOf(change.key) }}: {{ show(change.oldValue) }} → {{ show(change.newValue) }}
              <div class="who2">{{ change.reason }}</div>
            </td>

            <td>{{ change.changedBy.fullName }}</td>
          </tr>
        </DataTable>
      </Panel>
    </template>

    <ReasonModal
      v-model="saveOpen"
      confirm-label="Save changes"
      :lead="savingPanel ? `${changesIn(savingPanel).length} change(s). Each is logged with the old and new value.` : undefined"
      :loading="update.isPending.value"
      placeholder="For example: autumn review of the commission rates."
      :submit-error="saveError"
      title="Why are you changing this?"
      @confirm="save"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { Setting } from '@/types/pricing'
  import { reactive, ref } from 'vue'
  import { pricingErrorMessage } from '@/components/pricing/pricingErrors'
  import ReasonModal from '@/components/pricing/ReasonModal.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDate, formatDateTime } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { useSettingHistoryQuery, useSettingsQuery, useUpdateSettings } from '@/composables/usePricing'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { DECIMAL_PATTERN, trimDecimal } from '@/types/pricing'
  import { PERMISSIONS } from '@/types/staff'

  interface Field { key: string, label: string, hint?: string }
  interface PanelDef { title: string, subtitle?: string, note?: string, fields: Field[] }

  // Labels and grouping follow the design's "Commission rates" screen; the third
  // panel lists the remaining settings (a UI extension: the design has no place for them).
  const panels: PanelDef[] = [
    {
      title: 'Commission',
      note: 'Commission is taken from the making charge or the value the seller adds. It is never taken from the value of their gold.',
      fields: [
        { key: 'commission.gold_pct', label: 'On gold', hint: 'Percent of the making charge the seller recovers' },
        { key: 'commission.stone_pct', label: 'On diamonds and stones', hint: 'Percent of the value added above gold' },
        { key: 'commission.minimum_egp', label: 'Minimum per sale', hint: 'EGP. Never broken, even by a promo code' },
        { key: 'vat.pct', label: 'VAT', hint: 'Percent, on commission only' },
      ],
    },
    {
      title: 'Deadlines and deposits',
      fields: [
        { key: 'deposit.buyer_pct', label: 'Buyer deposit', hint: 'Percent of the price, held' },
        { key: 'deadline.seller_reply_hours', label: 'Seller reply window', hint: 'Hours to accept or decline' },
        { key: 'buyrequest.price_tolerance_pct', label: 'Price may move before a request is refused', hint: 'Percent. Within it the buyer locks the fresh price' },
        { key: 'deadline.reach_branch_working_hours', label: 'Time to reach IGI', hint: 'Working hours after accepting' },
        { key: 'deadline.collect_weeks', label: 'Weeks the piece waits at the branch', hint: 'After paying, they collect whenever they like within this' },
        { key: 'deadline.free_relist_working_hours', label: 'Free relist window', hint: 'Working hours after collection, 0% commission' },
        { key: 'deposit.seller_forfeit_share_pct', label: 'Seller keeps of the deposit', hint: 'Percent, if the buyer never pays' },
        { key: 'inspection.weight_tolerance_pct', label: 'Difference adjusted automatically up to', hint: 'Percent either way. Larger needs both sides to approve' },
        { key: 'marketmaker.min_list_age_days', label: 'Listed this long before a market maker can buy', hint: 'Days' },
        { key: 'payout.first_sale_cap_egp', label: 'First gold sale paid in full up to', hint: 'EGP, paid when Dahab receives the piece — before the buyer pays. Never applies to diamonds' },
        { key: 'deadline.seller_return_weeks', label: 'Weeks a returned piece waits for the seller', hint: 'After a buyer never pays' },
        { key: 'withdrawal.account_change_pause_hours', label: 'Withdrawals pause after a payout-account change', hint: 'Hours. A person re-checks the name against the ID' },
        { key: 'flag.pattern_txn_threshold', label: 'Count someone as a pattern from', hint: 'Transactions. Below this nothing is flagged' },
        { key: 'deadline.buyer_pay_days', label: 'Days to pay after inspection', hint: 'The collection code only appears once the balance is paid' },
      ],
    },
    {
      title: 'Other rules',
      subtitle: 'Not on the design; listed so every setting has a place',
      fields: [
        { key: 'suspension.cancellations_threshold', label: 'Seller cancellations before listing is suspended' },
        { key: 'compensation.cap_per_payment_egp', label: 'Compensation cap per payment' },
        { key: 'compensation.cap_per_day_egp', label: 'Compensation cap per day' },
        { key: 'manualprice.confirm_deviation_pct', label: 'Manual price needs a confirmation above' },
        { key: 'manualprice.confirmer_must_differ', label: 'Someone else must confirm a manual price' },
        { key: 'manualprice.pending_expiry_hours', label: 'A manual price waits for confirmation for' },
        { key: 'pricefeed.stale_after_minutes', label: 'The price feed counts as down after' },
      ],
    },
  ]

  const { can } = usePermissions()
  const { ok } = useToast()

  const settings = useSettingsQuery()
  const history = useSettingHistoryQuery()
  const update = useUpdateSettings()

  // Edited values by key; absent = unchanged.
  const draft = reactive<Record<string, string | boolean>>({})

  function settingOf (key: string): Setting | undefined {
    return settings.data.value?.find(s => s.key === key)
  }

  function rowsOf (panel: PanelDef): Array<Field & { setting: Setting }> {
    return panel.fields.flatMap(f => {
      const setting = settingOf(f.key)
      return setting ? [{ ...f, setting }] : []
    })
  }

  function canEdit (s: Setting): boolean {
    return can(s.group === 'rates' ? PERMISSIONS.pricingRatesManage : PERMISSIONS.settingsManage)
  }

  function draftText (s: Setting): string {
    const v = draft[s.key]
    return typeof v === 'string' ? v : trimDecimal(String(s.value))
  }

  function draftBool (s: Setting): boolean {
    const v = draft[s.key]
    return typeof v === 'boolean' ? v : s.value === true
  }

  // Mirrors the Backend's range rules only to help while typing.
  function fieldError (s: Setting): string | undefined {
    const v = draft[s.key]
    if (typeof v !== 'string') return undefined
    const text = v.trim()
    if (!DECIMAL_PATTERN.test(text)) return 'A number with at most 4 decimals.'
    if (s.integer && text.includes('.')) return 'A whole number.'
    if (s.min !== null && Number(text) < Number(s.min)) return `At least ${s.min}.`
    if (s.max !== null && Number(text) > Number(s.max)) return `At most ${s.max}.`
    return undefined
  }

  function changesIn (panel: PanelDef): Array<{ key: string, value: string | boolean }> {
    return rowsOf(panel).flatMap(({ setting }) => {
      const v = draft[setting.key]
      if (v === undefined) return []
      const changed = typeof v === 'boolean' ? v !== setting.value : Number(v) !== Number(setting.value)
      return changed ? [{ key: setting.key, value: typeof v === 'boolean' ? v : v.trim() }] : []
    })
  }

  function hasErrors (panel: PanelDef): boolean {
    return rowsOf(panel).some(r => fieldError(r.setting))
  }

  function discard (panel: PanelDef) {
    for (const f of panel.fields) delete draft[f.key]
  }

  function unitLabel (unit: string): string {
    return ({ percent: '%', egp: 'EGP', hours: 'hours', working_hours: 'working hours', days: 'days', weeks: 'weeks', minutes: 'minutes', count: '' } as Record<string, string>)[unit] ?? unit
  }

  function labelOf (key: string): string {
    return panels.flatMap(p => p.fields).find(f => f.key === key)?.label ?? key
  }

  function show (value: string | boolean | null): string {
    if (value === null) return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return trimDecimal(value)
  }

  // Save
  const saveOpen = ref(false)
  const savingPanel = ref<PanelDef | null>(null)
  const saveError = ref<string>()

  function openSave (panel: PanelDef) {
    savingPanel.value = panel
    saveError.value = undefined
    saveOpen.value = true
  }

  function save (reason: string) {
    if (!savingPanel.value) return
    const panel = savingPanel.value
    const changes = changesIn(panel)
    saveError.value = undefined
    update.mutate({ changes, reason }, {
      onSuccess: () => {
        saveOpen.value = false
        discard(panel)
        ok(`${changes.length} setting(s) saved and logged.`)
      },
      onError: error => {
        // Changes saved before the failure stay saved; the list is refreshed.
        saveError.value = pricingErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-rt__note { margin-bottom: 12px; }
.d-rt__row {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 12px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.d-rt__row:last-of-type { border-bottom: 0; }
.d-rt__label label { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.d-rt__control { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.d-rt__control :deep(input[type='text']), .d-rt__control :deep(.d-input) { flex: 1; min-width: 0; }
.d-rt__unit { font-size: 12px; color: var(--ink-3); }
.d-rt__check { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.d-rt__check input { accent-color: var(--gold); }
.d-rt__error { flex-basis: 100%; font-size: 11.5px; color: var(--bad); }
.d-rt__actions { display: flex; gap: 8px; margin-top: 14px; }
@media (max-width: 640px) {
  .d-rt__row { grid-template-columns: 1fr; }
}
</style>
