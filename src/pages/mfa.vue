<template>
  <AuthShell :subtitle="subtitle" title="Enter your verification code">
    <NoteBanner v-if="banner" class="d-mfa__banner" role="alert" :variant="banner.variant">
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError" label="Verification code">
        <DInput
          :id="controlId"
          ref="codeEl"
          v-model="code"
          autocomplete="one-time-code"
          class="d-mfa__code"
          :describedby="describedBy"
          :disabled="submitting || isExpired"
          inputmode="numeric"
          :invalid="invalid"
          placeholder="000000"
          size="lg"
        />
      </FormField>

      <p v-if="!isExpired" class="d-mfa__timer">Code expires in <b>{{ countdown.label }}</b></p>

      <DBtn
        block
        class="d-mfa__submit"
        :disabled="isExpired"
        kind="primary"
        :loading="submitting"
        size="lg"
        type="submit"
      >
        {{ submitting ? 'Verifying…' : 'Verify' }}
      </DBtn>
    </form>

    <button class="d-mfa__back" type="button" @click="backToLogin">Back to sign in</button>
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
  import { safeRedirect } from '@/router/guards'
  import { errorCodeOf, type ServiceErrorCode } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'

  const CODE_LENGTH = 6

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const code = ref('')
  const submitting = ref(false)
  const failure = ref<ServiceErrorCode | null>(null)
  const emptyError = ref(false)
  const codeEl = ref<InstanceType<typeof DInput> | null>(null)

  const countdown = useCountdown(() => auth.pendingMfa?.expiresAt)
  // The server has the last word, so an expiry it reports also counts.
  const isExpired = computed(() =>
    Boolean(auth.pendingMfa) && (failure.value === 'mfa_expired' || countdown.expired.value),
  )

  // Digits only, so pasted spaces or dashes do not count against the length.
  watch(code, value => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (digits !== value) code.value = digits
    if (digits) emptyError.value = false
  })

  const subtitle = computed(() => {
    const email = auth.pendingMfa?.email ?? ''
    return `Open your authenticator app and enter the ${CODE_LENGTH}-digit code for ${maskEmail(email)}.`
  })

  const fieldError = computed(() => {
    if (failure.value === 'mfa_invalid') return 'That code is not correct. Check it and try again.'
    if (emptyError.value) return `Enter the ${CODE_LENGTH}-digit code.`
    return undefined
  })

  const banner = computed(() => {
    if (isExpired.value) {
      return { variant: 'wait' as const, title: 'This code has expired.', text: 'Go back to sign in to get a new one.' }
    }
    switch (failure.value) {
      case null:
      case 'mfa_invalid': {
        return null
      }
      case 'account_disabled': {
        return { variant: 'wait' as const, title: 'This account is disabled or frozen.', text: 'You cannot sign in until a founder restores access.' }
      }
      case 'too_many_requests': {
        return { variant: 'wait' as const, title: 'Too many attempts.', text: 'Wait a few minutes, or go back to sign in for a new code.' }
      }
      case 'network': {
        return { variant: 'bad' as const, title: 'Cannot reach the server.', text: 'Check your connection and try again.' }
      }
      default: {
        return { variant: 'bad' as const, title: 'Verification is unavailable.', text: 'We could not check your code. Try again in a moment.' }
      }
    }
  })

  function maskEmail (email: string): string {
    const [name = '', domain = ''] = email.split('@')
    return name ? `${name.charAt(0)}•••@${domain}` : 'your account'
  }

  async function onSubmit () {
    if (submitting.value || isExpired.value) return
    failure.value = null
    if (code.value.length !== CODE_LENGTH) {
      emptyError.value = true
      return codeEl.value?.focus()
    }

    submitting.value = true
    try {
      await auth.verifyMfa(code.value)
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

  async function backToLogin () {
    auth.cancelMfa()
    await router.replace({ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} })
  }

  onMounted(() => codeEl.value?.focus())
</script>

<style lang="scss" scoped>
.d-mfa__banner { margin-bottom: 16px; }
.d-mfa__code.d-input :deep(.d-input__el) {
  font-family: var(--font-mono, 'Roboto Mono', monospace);
  font-size: 22px;
  letter-spacing: 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.d-mfa__timer { margin: -4px 0 14px; font-size: 11.5px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.d-mfa__submit { margin-top: 2px; }
.d-mfa__back {
  display: block;
  margin: 14px auto 0;
  border: 0;
  background: transparent;
  font: 500 12px Inter, system-ui, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-mfa__back:hover { text-decoration: underline; }
.d-mfa__back:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
</style>
