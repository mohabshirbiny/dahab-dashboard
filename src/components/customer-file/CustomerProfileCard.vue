<template>
  <Panel :subtitle="`Customer ${customer.displayRef}`" :title="customer.fullName ?? `Customer ${customer.displayRef}`">
    <template #body>
      <NoteBanner v-if="customer.suspension" class="d-profile__suspended" variant="bad">
        <div>
          <strong>Suspended.</strong> {{ suspendedReasonLabel(customer.suspension.reason) }}.
          <div v-if="customer.suspension.note" class="d-profile__note">{{ customer.suspension.note }}</div>

          <div class="who2">
            {{ customer.suspension.suspendedBy?.name ?? 'Unknown staff member' }} · {{ formatDateTime(customer.suspension.suspendedAt) }}
          </div>

          <div class="who2">Reinstating returns them to {{ CUSTOMER_STATUS_META[customer.suspension.statusBefore].label.toLowerCase() }}.</div>
        </div>
      </NoteBanner>

      <KeyValueRow label="Phone" :value="customer.phone" />
      <KeyValueRow label="Email" :value="customer.email ?? '—'" />
      <KeyValueRow label="Where" :value="governorateLabel(customer.governorate) || '—'" />
      <KeyValueRow label="Joined" :value="formatDateTime(customer.joinedAt)" />
      <KeyValueRow label="Language" :value="customer.preferredLang === 'ar' ? 'Arabic' : 'English'" />

      <KeyValueRow label="Identity">
        <StatusTag :label="CUSTOMER_STATUS_META[customer.status].label" :variant="CUSTOMER_STATUS_META[customer.status].variant" />
      </KeyValueRow>

      <div v-if="$slots.actions" class="d-profile__actions">
        <slot name="actions" />
      </div>

      <!-- An expanded action (Suspend / Reinstate), below the buttons as in the design. -->
      <slot />

    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { CustomerFile } from '@/types/customer'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { CUSTOMER_STATUS_META, governorateLabel, suspendedReasonLabel } from '@/types/customer'

  defineProps<{ customer: CustomerFile }>()
</script>

<style lang="scss" scoped>
.d-profile__suspended { margin-bottom: 14px; }
.d-profile__note { margin: 4px 0; }
.d-profile__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
</style>
