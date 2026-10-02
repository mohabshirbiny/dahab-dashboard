<template>
  <DModal
    :max-width="520"
    :model-value="open"
    :persistent="busy"
    title="Change the branch"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-cbm__lead">
        {{ order.orderRef }} goes to {{ order.branch.nameEn ?? '—' }} now. Only the branches the seller
        offered for this piece can be picked. The reach-branch deadline keeps running unless you move it.
      </p>

      <LoadingState v-if="options.loading" label="Loading branches…" />

      <NoteBanner v-else-if="options.list.length === 0" variant="wait">
        No branch list is available to you. You need the listing or reference permissions to see the branches.
      </NoteBanner>

      <template v-else>
        <FormField v-slot="{ controlId }" :error="branchError" label="New branch">
          <DSelect :id="controlId" v-model="branch" :disabled="busy" :options="options.list" />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="extendError" hint="Optional. Leave empty to keep the current deadline." label="New reach-branch deadline">
          <DInput
            :id="controlId"
            v-model="extendTo"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            type="datetime-local"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonFieldError" label="Reason">
          <DTextarea
            :id="controlId"
            v-model="reason"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="REASON_MAX"
            :rows="3"
          />
        </FormField>

        <p class="who2">Both sides are told the new branch. Logged against your name.</p>
      </template>

      <NoteBanner v-if="submitError" class="d-cbm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :disabled="options.list.length === 0" kind="primary" :loading="busy" @click="onSubmit">Change branch</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { OrderDetail } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useListingQuery } from '@/composables/useListings'
  import { useOrderAction } from '@/composables/useOrders'
  import { usePermissions } from '@/composables/usePermissions'
  import { useBranchesQuery } from '@/composables/useReference'
  import { useToast } from '@/composables/useToast'
  import { PERMISSIONS } from '@/types/staff'
  import { orderFormError, REASON_MAX, reasonError } from './orderErrors'
  import { fromLocalInput } from './orderFormat'

  // Move an order to another of the seller's branches while the piece has not arrived
  // (Backend spec 012 FR-008, order.change_branch). The branch options come from the
  // listing (listing permissions); without them, every branch (reference.view) and the
  // Backend refuses one the seller did not offer.
  const props = defineProps<{ open: boolean, order: OrderDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const { can, canAny } = usePermissions()
  const readsListing = computed(() => canAny([PERMISSIONS.listingReview, PERMISSIONS.listingRequestChanges, PERMISSIONS.listingTakedown]))
  const listing = useListingQuery(() => (props.open && readsListing.value ? props.order.piece.listingId : null))
  const branches = useBranchesQuery(() => props.open && !readsListing.value && can(PERMISSIONS.referenceView))

  const options = computed(() => {
    const here = props.order.branch.id
    if (readsListing.value) {
      return {
        loading: listing.isPending.value,
        list: (listing.data.value?.branchOptions ?? []).filter(b => b.isEnabled && b.id !== here).map(b => ({ value: String(b.id), label: b.nameEn })),
      }
    }
    return {
      loading: branches.isPending.value && branches.fetchStatus.value !== 'idle',
      list: (branches.data.value ?? []).filter(b => b.isEnabled && b.id !== here).map(b => ({ value: String(b.id), label: b.nameEn })),
    }
  })

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const branch = ref('')
  const extendTo = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const branchError = computed(() => (submitted.value && branch.value === '' ? 'Pick a branch.' : fieldError(mutation.error.value, 'branch_id')))
  const extendError = computed(() => {
    if (extendTo.value !== '' && fromLocalInput(extendTo.value) === null) return 'Enter a valid date and time.'
    return fieldError(mutation.error.value, 'extend_to')
  })
  const reasonFieldError = computed(() => (submitted.value ? reasonError(reason.value) : undefined) ?? fieldError(mutation.error.value, 'reason'))
  const submitError = computed(() => orderFormError(mutation.error.value))

  watch(() => [props.open, props.order.id], () => {
    branch.value = ''
    extendTo.value = ''
    reason.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  watch(() => options.value.list, list => {
    if (branch.value === '' && list.length > 0) branch.value = list[0]!.value
  }, { immediate: true })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (branchError.value !== undefined || extendError.value !== undefined || reasonError(reason.value) !== undefined) return

    const payload = {
      orderId: props.order.id,
      action: { kind: 'change-branch' as const, branchId: Number(branch.value), reason: reason.value.trim(), extendTo: fromLocalInput(extendTo.value) },
    }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Branch changed. Both sides are told.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-cbm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-cbm__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
