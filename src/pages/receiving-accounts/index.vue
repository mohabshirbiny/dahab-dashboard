<template>
  <div class="d-page">
    <PageLead>Dahab's bank, InstaPay and Vodafone Cash accounts that customers send money to. Customers see only the accounts shown here; an account is hidden, never deleted, so past transfers still say where the money arrived.</PageLead>

    <LoadingState v-if="accounts.isPending.value" class="d-ra__block" label="Loading receiving accounts…" />

    <Panel v-else-if="accounts.isError.value" class="d-ra__block">
      <ErrorState :message="accessErrorMessage(accounts.error.value)" :retryable="errorCodeOf(accounts.error.value) !== 'forbidden'" title="Could not load the accounts" @retry="accounts.refetch()" />
    </Panel>

    <Panel v-else class="d-ra__block" :subtitle="`${rows.filter(a => a.isActive).length} shown to customers`" title="Receiving accounts">
      <template #actions>
        <DBtn v-if="canManage" kind="primary" @click="openEditor(null)">Add account</DBtn>
      </template>

      <EmptyState v-if="rows.length === 0" description="Customers cannot add money until at least one account is shown." title="No receiving accounts yet" />

      <AccountTable
        v-else
        :can-manage="canManage"
        :rows="rows"
        :toggling-id="togglingId"
        @edit="openEditor"
        @toggle="toggle"
      />

      <template #footer>
        <NoteBanner class="d-ra__note" variant="info">The daily limit and the provider fee are shown to customers for information only. Dahab never checks amounts against them and credits what actually arrives.</NoteBanner>
        <NoteBanner v-if="toggleError" class="d-ra__note" role="alert" variant="bad">{{ toggleError }}</NoteBanner>
      </template>
    </Panel>

    <AccountForm
      v-if="canManage"
      v-model="editorOpen"
      :account="editing"
      :field-errors="editorFieldErrors"
      :loading="save.isPending.value"
      :submit-error="editorError"
      @save="onSave"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { ReceivingAccount, ReceivingAccountInput, TopUpMethod } from '@/types/topup'
  import { computed, ref } from 'vue'
  import AccountForm from '@/components/receiving-accounts/AccountForm.vue'
  import AccountTable from '@/components/receiving-accounts/AccountTable.vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { usePermissions } from '@/composables/usePermissions'
  import { useReceivingAccountsQuery, useSaveReceivingAccount, useSetReceivingAccountActive } from '@/composables/useReceivingAccounts'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf, isServiceError } from '@/services/errors'
  import { PERMISSIONS } from '@/types/staff'

  // Receiving accounts (Backend spec 009 US4). Reading needs topup.match or
  // topup.accounts.manage; changing needs topup.accounts.manage. Not in the design:
  // a settings-like page under Controls, as the product owner asked.
  const { can } = usePermissions()
  const toast = useToast()
  const canManage = computed(() => can(PERMISSIONS.topupAccountsManage))

  const accounts = useReceivingAccountsQuery(true)
  const rows = computed(() => accounts.data.value ?? [])

  const editorOpen = ref(false)
  const editing = ref<ReceivingAccount | null>(null)
  const save = useSaveReceivingAccount()
  const editorFieldErrors = computed(() => (isServiceError(save.error.value) ? save.error.value.fields : {}))
  const editorError = computed(() => {
    const e = save.error.value
    if (!e || (isServiceError(e) && e.code === 'validation' && Object.keys(e.fields).length > 0)) return ''
    return accessErrorMessage(e)
  })

  function openEditor (account: ReceivingAccount | null) {
    editing.value = account
    save.reset()
    editorOpen.value = true
  }

  function onSave (payload: { method: TopUpMethod, values: ReceivingAccountInput }) {
    save.mutate({ id: editing.value?.id ?? null, ...payload }, {
      onSuccess: () => {
        editorOpen.value = false
        toast.ok(editing.value ? 'Saved. Customers see the new details now.' : 'Added. Logged with your name.')
      },
    })
  }

  const setActive = useSetReceivingAccountActive()
  const togglingId = ref<number | null>(null)
  const toggleError = computed(() => (setActive.error.value ? accessErrorMessage(setActive.error.value) : ''))

  function toggle (account: ReceivingAccount) {
    togglingId.value = account.id
    setActive.mutate({ id: account.id, isActive: !account.isActive }, {
      onSuccess: () => toast.ok(account.isActive ? 'Hidden from customers.' : 'Shown to customers.'),
      onSettled: () => {
        togglingId.value = null
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-ra__block { margin-top: 16px; }
.d-ra__note { margin-top: 12px; }
</style>
