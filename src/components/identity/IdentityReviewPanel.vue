<template>
  <Panel :subtitle="`Attempt ${target.attemptNumber}`" title="Decision">
    <template #body>
      <NoteBanner v-if="target.status === 'verified'" variant="ok">
        <span>
          Verified<template v-if="target.reviewedAt"> on {{ formatDateTime(target.reviewedAt) }}</template>.
          The customer is active and can buy and sell.
        </span>
      </NoteBanner>

      <NoteBanner v-else-if="target.status === 'rejected'" variant="bad">
        <span>
          Rejected<template v-if="target.reviewedAt"> on {{ formatDateTime(target.reviewedAt) }}</template>.
        </span>
      </NoteBanner>

      <NoteBanner v-else-if="target.status === 'superseded'" variant="wait">
        <span>The customer has sent a newer upload. This earlier attempt is kept for the record and cannot be decided on.</span>
      </NoteBanner>

      <template v-else-if="target.status === 'needs_resubmission'">
        <NoteBanner variant="info">
          <span>
            Asked again<template v-if="target.reviewedAt"> on {{ formatDateTime(target.reviewedAt) }}, {{ formatWaiting(target.reviewedAt) }}</template>
            for a new upload. It comes back to Waiting when they send one. You can still decide on this document now.
          </span>
        </NoteBanner>

        <div v-if="canReview" class="d-review__actions">
          <DBtn class="d-review__verify" kind="success" @click="open('verify')">Verify</DBtn>
          <DBtn kind="danger" @click="open('reject')">Reject</DBtn>
        </div>
      </template>

      <template v-else>
        <NoteBanner variant="info">
          <span>
            Check the name matches exactly, the card is not expired, and all four corners are readable.
            Do not verify a blurred hallmark or a cropped card.
          </span>
        </NoteBanner>

        <div v-if="canReview" class="d-review__actions">
          <DBtn class="d-review__verify" kind="success" @click="open('verify')">Verify</DBtn>
          <DBtn @click="open('request_resubmission')">Ask again</DBtn>
          <DBtn kind="danger" @click="open('reject')">Reject</DBtn>
        </div>

        <NoteBanner v-else class="d-review__readonly" variant="wait">
          <span>You can view this document but not decide on it. Deciding needs the review permission.</span>
        </NoteBanner>
      </template>

      <div v-if="target.status !== 'pending' && (target.reviewReasons.length > 0 || target.reviewNote)" class="d-review__why">
        <template v-if="target.reviewReasons.length > 0">
          <div class="d-review__why-title">What was wrong</div>

          <ul class="d-review__reasons">
            <li v-for="reason in target.reviewReasons" :key="reason">{{ reasonLabel(reason) }}</li>
          </ul>
        </template>

        <p v-if="target.reviewNote" class="d-review__note">{{ target.reviewNote }}</p>
      </div>

      <NoteBanner v-if="notice" class="d-review__notice" role="alert" variant="wait">{{ notice }}</NoteBanner>
    </template>
  </Panel>

  <ConfirmDialog
    v-model="verifyOpen"
    confirm-kind="success"
    confirm-label="Verify"
    :error="verifyError"
    :loading="review.isPending.value"
    title="Verify this customer"
    @confirm="onVerify"
  >
    Verify the {{ typeLabel }} of customer {{ target.customerRef }}? They become active and can buy and sell.
    This is recorded against your name.

    <FormField
      v-if="target.type === 'egyptian_id'"
      v-slot="{ controlId, invalid }"
      class="d-review__idno"
      :error="idNumberError"
      hint="14 digits, from the card. Only a one-way fingerprint is kept, to hold a once-per-ID code to one person. It is never shown again."
      label="ID number"
    >
      <DInput
        :id="controlId"
        v-model="idNumber"
        inputmode="numeric"
        :invalid="invalid"
        :maxlength="14"
      />
    </FormField>
  </ConfirmDialog>

  <ReviewReasonsModal
    v-if="reasonsMode"
    v-model="reasonsOpen"
    :loading="review.isPending.value"
    :mode="reasonsMode"
    :submit-error="reasonsError"
    @confirm="onReasons"
  />
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import ReviewReasonsModal from '@/components/identity/ReviewReasonsModal.vue'
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime, formatWaiting } from '@/composables/useFormatters'
  import { useReviewIdentityDocument } from '@/composables/useIdentityDocuments'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf, isServiceError, type ServiceErrorCode } from '@/services/errors'
  import {
    IDENTITY_TYPE_LABELS,
    type IdentityReviewAction,
    type IdentityReviewInput,
    type IdentityReviewReason,
    type IdentityReviewTarget,
    reasonLabel,
  } from '@/types/identity'
  import { PERMISSIONS } from '@/types/staff'

  const props = defineProps<{ target: IdentityReviewTarget }>()

  const { can } = usePermissions()
  const { ok } = useToast()
  const review = useReviewIdentityDocument()

  const verifyOpen = ref(false)
  const reasonsOpen = ref(false)
  // Which of the two reason dialogs is showing. Kept after closing, so it can fade out.
  const reasonsMode = ref<'request_resubmission' | 'reject' | null>(null)
  const verifyError = ref('')
  const idNumber = ref('')
  const idNumberError = ref('')
  const reasonsError = ref('')
  // Shown on the page itself when a dialog cannot stay open, for example after a conflict.
  const notice = ref('')

  const canReview = computed(() => can(PERMISSIONS.identityReview))
  const typeLabel = computed(() => IDENTITY_TYPE_LABELS[props.target.type])

  const FAILURE_TEXT: Partial<Record<ServiceErrorCode, string>> = {
    conflict: 'Someone else already decided on this document. The page now shows the latest decision.',
    forbidden: 'Your account does not have permission to review documents.',
    not_found: 'This document no longer exists.',
    network: 'The server could not be reached. Nothing was changed. Try again.',
    validation: 'Pick at least one reason.',
    too_many_requests: 'Too many requests. Wait a moment and try again.',
  }

  function describe (error: unknown): { text: string, keepOpen: boolean } {
    const code = errorCodeOf(error)
    // The Backend's own validation message says what to fix, for example a note that is too long.
    const fieldMessage = isServiceError(error) && code === 'validation'
      ? (error.fields.reasons ?? error.fields.note)?.[0]
      : undefined
    return {
      text: fieldMessage ?? FAILURE_TEXT[code] ?? 'Something went wrong. Nothing was changed. Try again.',
      // These cannot be fixed by trying again, so the dialog gives way to the page.
      keepOpen: code !== 'conflict' && code !== 'forbidden' && code !== 'not_found',
    }
  }

  function open (action: IdentityReviewAction) {
    notice.value = ''
    if (action === 'verify') {
      verifyError.value = ''
      verifyOpen.value = true
      return
    }
    reasonsError.value = ''
    reasonsMode.value = action
    reasonsOpen.value = true
  }

  const DONE_TEXT: Record<IdentityReviewAction, string> = {
    verify: 'Verified. They can now buy and sell.',
    request_resubmission: 'Sent by notification and text message.',
    reject: 'Rejected and the person was told why.',
  }

  async function submit (input: IdentityReviewInput, close: () => void, setError: (text: string) => void) {
    try {
      await review.mutateAsync({ id: props.target.id, ...input })
      close()
      ok(DONE_TEXT[input.action])
    } catch (error) {
      const { text, keepOpen } = describe(error)
      if (keepOpen) {
        setError(text)
      } else {
        close()
        notice.value = text
      }
    }
  }

  function onVerify () {
    verifyError.value = ''
    idNumberError.value = ''
    // An Egyptian ID is verified with its number (the Dashboard asks for it; the Backend does not force it).
    if (props.target.type === 'egyptian_id' && !/^\d{14}$/.test(idNumber.value.trim())) {
      idNumberError.value = 'Enter the 14 digits of the national ID number.'
      return
    }
    return submit(
      { action: 'verify', reasons: [], note: '', idNumber: props.target.type === 'egyptian_id' ? idNumber.value.trim() : undefined },
      () => {
        verifyOpen.value = false
      },
      text => {
        verifyError.value = text
      },
    )
  }

  function onReasons (payload: { reasons: IdentityReviewReason[], note: string }) {
    if (!reasonsMode.value) return
    reasonsError.value = ''
    return submit(
      { action: reasonsMode.value, ...payload },
      () => {
        reasonsOpen.value = false
      },
      text => {
        reasonsError.value = text
      },
    )
  }
</script>

<style lang="scss" scoped>
.d-review__actions { display: flex; gap: 6px; margin-top: 14px; flex-wrap: wrap; }
.d-review__verify { flex: 1; justify-content: center; }
.d-review__readonly,
.d-review__notice { margin-top: 12px; }
.d-review__idno { margin-top: 14px; }
.d-review__why { margin-top: 14px; }
.d-review__why-title { font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
.d-review__reasons { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--ink-2); }
.d-review__note { margin: 8px 0 0; font-size: 12.5px; color: var(--ink-2); white-space: pre-wrap; }
</style>
