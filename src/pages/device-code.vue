<template>
  <AuthShell :subtitle="subtitle" title="Confirm this device">
    <NoteBanner v-if="banner" class="d-dc__banner" role="alert" :variant="banner.variant">
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError" label="Code from the SMS">
        <DInput
          :id="controlId"
          ref="codeEl"
          v-model="code"
          autocomplete="one-time-code"
          class="d-dc__code"
          :describedby="describedBy"
          :disabled="submitting || isExpired"
          inputmode="numeric"
          :invalid="invalid"
          placeholder="000000"
          size="lg"
        />
      </FormField>

      <p v-if="!isExpired" class="d-dc__timer">Code expires in <b>{{ countdown.label }}</b></p>

      <DBtn
        block
        class="d-dc__submit"
        :disabled="isExpired"
        kind="primary"
        :loading="submitting"
        size="lg"
        type="submit"
      >
        {{ submitting ? 'Checking…' : 'Confirm and sign in' }}
      </DBtn>
    </form>

    <button class="d-dc__link" :disabled="resending || !resend.expired.value" type="button" @click="onResend">
      {{ resend.expired.value ? (resending ? 'Sending…' : 'Send a new code') : `Send a new code in ${resend.label.value}` }}
    </button>

    <button class="d-dc__link" type="button" @click="backToLogin">Back to sign in</button>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useCountdown } from '@/composables/useCountdown'
  import { useToast } from '@/composables/useToast'
  import { safeRedirect } from '@/router/guards'
  import { errorCodeOf, type ServiceErrorCode } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'

  // A sign-in from a device not yet known for this staff member: the Backend sent a code by
  // SMS to the staff phone (setting auth.staff_new_device_sms). The right code makes the
  // device known and starts the session; five wrong codes end it.
  const CODE_LENGTH = 6

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const { ok } = useToast()

  const code = ref('')
  const submitting = ref(false)
  const resending = ref(false)
  const failure = ref<ServiceErrorCode | null>(null)
  const emptyError = ref(false)
  const codeEl = ref<InstanceType<typeof DInput> | null>(null)

  const countdown = useCountdown(() => auth.pendingDeviceCode?.expiresAt)
  const resend = useCountdown(() => auth.pendingDeviceCode?.resendAvailableAt)
  // The server has the last word, so an expiry it reports also counts.
  const isExpired = computed(() =>
    Boolean(auth.pendingDeviceCode) && (failure.value === 'mfa_expired' || countdown.expired.value),
  )

  // Digits only, so pasted spaces or dashes do not count against the length.
  watch(code, value => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (digits !== value) code.value = digits
    if (digits) emptyError.value = false
  })

  const subtitle = computed(() => {
    const hint = auth.pendingDeviceCode?.phoneHint ?? ''
    return `This is the first sign-in from this device. We sent a ${CODE_LENGTH}-digit code by SMS to your phone ending ${hint.replace(/\D/g, '')}.`
  })

  const fieldError = computed(() => {
    if (failure.value === 'mfa_invalid') return 'That code is not correct, or it can no longer be used. Check it, or send a new one.'
    if (emptyError.value) return `Enter the ${CODE_LENGTH}-digit code.`
    return undefined
  })

  const banner = computed(() => {
    if (isExpired.value) {
      return { variant: 'wait' as const, title: 'This code has expired.', text: 'Send a new code, or go back to sign in.' }
    }
    switch (failure.value) {
      case null:
      case 'mfa_invalid': {
        return null
      }
      case 'too_many_requests': {
        return { variant: 'wait' as const, title: 'Too many attempts.', text: 'Wait a few minutes, then send a new code.' }
      }
      case 'network': {
        return { variant: 'bad' as const, title: 'Cannot reach the server.', text: 'Check your connection and try again.' }
      }
      default: {
        return { variant: 'bad' as const, title: 'Confirmation is unavailable.', text: 'We could not check your code. Try again in a moment.' }
      }
    }
  })

  async function onSubmit () {
    if (submitting.value || isExpired.value) return
    failure.value = null
    if (code.value.length !== CODE_LENGTH) {
      emptyError.value = true
      return codeEl.value?.focus()
    }

    submitting.value = true
    try {
      await auth.verifyDeviceCode(code.value)
      await router.replace(safeRedirect(route.query.redirect))
    } catch (error) {
      failure.value = errorCodeOf(error)
      if (failure.value === 'mfa_invalid') {
        code.value = ''
        // Waiting for the input to be enabled again before it can take focus.
        setTimeout(() => codeEl.value?.focus())
      }
    } finally {
      submitting.value = false
    }
  }

  async function onResend () {
    if (resending.value) return
    resending.value = true
    try {
      await auth.resendDeviceCode()
      failure.value = null
      code.value = ''
      ok('A new code is on its way.')
      setTimeout(() => codeEl.value?.focus())
    } catch (error) {
      failure.value = errorCodeOf(error)
    } finally {
      resending.value = false
    }
  }

  async function backToLogin () {
    auth.cancelDeviceCode()
    await router.replace({ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} })
  }

  onMounted(() => codeEl.value?.focus())
</script>

<style lang="scss" scoped>
.d-dc__banner { margin-bottom: 16px; }
.d-dc__code.d-input :deep(.d-input__el) {
  font-family: var(--font-mono, 'Roboto Mono', monospace);
  font-size: 22px;
  letter-spacing: 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.d-dc__timer { margin: -4px 0 14px; font-size: 11.5px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.d-dc__submit { margin-top: 2px; }
.d-dc__link {
  display: block;
  margin: 14px auto 0;
  border: 0;
  background: transparent;
  font: 500 12px Inter, system-ui, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-dc__link:disabled { color: var(--ink-3); cursor: default; }
.d-dc__link:not(:disabled):hover { text-decoration: underline; }
.d-dc__link:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
</style>
