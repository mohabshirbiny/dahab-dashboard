<template>
  <DModal
    :max-width="440"
    :model-value="open"
    :persistent="busy"
    :title="to === 'buyer' ? 'Hand the piece to the buyer' : 'Hand the piece back to the seller'"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-hom__lead">
        {{ orderRef }}. Ask the {{ to }} for the 6-digit code in their app and type it here.
        <template v-if="to === 'buyer'">The sale completes and the seller is paid.</template>
        <template v-else>The piece leaves the market; no money moves.</template>
      </p>

      <template v-if="to === 'buyer' && !byProxy">
        <template v-if="canViewBuyerId && buyerId">
          <HandoverIdPhotos
            v-if="showBuyerId"
            class="d-hom__id"
            :has-back="buyerId.hasBack"
            :kind="buyerId.docKind"
            :order-id="orderId"
            who="buyer"
          />

          <DBtn v-else class="d-hom__id" @click="showBuyerId = true">Open the buyer's ID</DBtn>
          <p class="who2">Check the ID matches the person at the counter before you hand over.</p>
        </template>

        <p v-else-if="canViewBuyerId" class="who2">The buyer has no verified ID on file to show.</p>
      </template>

      <template v-if="to === 'buyer' && proxy">
        <div class="d-hom__label">Who is collecting</div>

        <label class="d-hom__check">
          <input
            v-model="collector"
            :disabled="busy"
            name="collector"
            type="radio"
            value="buyer"
          >

          <span>The buyer</span>
        </label>

        <label class="d-hom__check">
          <input
            v-model="collector"
            :disabled="busy"
            name="collector"
            type="radio"
            value="proxy"
          >

          <span>{{ proxy.name ?? 'The person the buyer named' }}<template v-if="proxy.phone"> · {{ proxy.phone }}</template></span>
        </label>

        <template v-if="collector === 'proxy'">
          <HandoverIdPhotos
            v-if="canViewId && showId"
            class="d-hom__id"
            :has-back="proxy.hasBack"
            :kind="proxy.idKind"
            :order-id="orderId"
            who="proxy"
          />

          <DBtn v-else-if="canViewId" class="d-hom__id" @click="showId = true">Open their ID photo</DBtn>

          <label class="d-hom__check">
            <input v-model="idChecked" :disabled="busy" type="checkbox">
            <span>I checked their ID in person and it matches the name above</span>
          </label>

          <p v-if="idError" class="d-hom__field-error" role="alert">{{ idError }}</p>
        </template>
      </template>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="codeError" label="Collection code">
        <DInput
          :id="controlId"
          v-model="code"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="6"
          placeholder="000000"
          size="lg"
        />
      </FormField>

      <p class="who2">Five wrong codes lock the handover for 15 minutes. Logged against your name.</p>

      <NoteBanner v-if="submitError" class="d-hom__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Hand over</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { HandoverBuyerId, OrderProxy } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import HandoverIdPhotos from './HandoverIdPhotos.vue'
  import { orderErrorMessage } from './orderErrors'

  // Hand a piece over against its 6-digit code (Backend spec 012 FR-016 / FR-019,
  // order.handover, at the order's branch). Staff never see the code itself.
  // Spec 014: when the buyer named someone else, staff say who is collecting and, for that
  // person, confirm they checked the ID (the Backend refuses without it: proxy_details_missing).
  // When the buyer collects in person, their own verified ID is offered to check (handover ID check).
  const props = defineProps<{
    open: boolean
    orderId: string
    orderRef: string
    to: 'buyer' | 'seller'
    proxy?: OrderProxy | null
    canViewId?: boolean
    buyerId?: HandoverBuyerId | null
    canViewBuyerId?: boolean
  }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const code = ref('')
  const collector = ref<'buyer' | 'proxy'>('buyer')
  const idChecked = ref(false)
  const showId = ref(false)
  const showBuyerId = ref(false)
  const submitted = ref(false)

  const byProxy = computed(() => props.to === 'buyer' && Boolean(props.proxy) && collector.value === 'proxy')
  const idError = computed(() => (submitted.value && byProxy.value && !idChecked.value ? 'Check their ID before handing over.' : undefined))

  const codeError = computed(() => (submitted.value && !/^\d{6}$/.test(code.value.trim()) ? 'The code is 6 digits.' : undefined))
  // A wrong code answers with the tries left; that is the message here, not a field error.
  const submitError = computed(() => (mutation.error.value ? orderErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.orderId], () => {
    code.value = ''
    collector.value = 'buyer'
    idChecked.value = false
    showId.value = false
    showBuyerId.value = false
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) {
      emit('close')
    }
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (codeError.value !== undefined || idError.value !== undefined) return

    const payload = { orderId: props.orderId, action: { kind: 'handover' as const, to: props.to, code: code.value.trim(), byProxy: byProxy.value } }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(props.to === 'buyer' ? (byProxy.value ? 'Handed to the named person. The sale is complete.' : 'Handed over. The sale is complete.') : 'Handed back to the seller.')
      emit('close')
    } catch {
      // Shown in the form. A different code is a different request, so it gets a new key.
    }
  }
</script>

<style lang="scss" scoped>
.d-hom__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-hom__error { margin-top: 10px; }
.d-hom__label { margin: 4px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-hom__check { display: flex; gap: 8px; align-items: center; margin: 6px 0; font-size: 13px; }
.d-hom__id { margin: 8px 0; }
.d-hom__field-error { margin: 2px 0 8px; font-size: 12px; color: var(--bad); }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
