<template>
  <AuthShell :subtitle="subtitle" title="Set up your authenticator app">
    <NoteBanner v-if="banner" class="d-enroll__banner" role="alert" :variant="banner.variant">
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <ol class="d-enroll__steps">
      <li>
        <h2 class="d-enroll__h">Add Dahab to your authenticator app</h2>
        <p class="d-enroll__p">Choose "enter a setup key" in the app and paste this key. Keep it time-based.</p>
        <div class="d-enroll__key" data-testid="setup-key">{{ setupKey }}</div>
        <a class="d-enroll__link" :href="otpauthUrl">Open in an authenticator app on this device</a>
      </li>

      <li>
        <h2 class="d-enroll__h">Keep your recovery codes</h2>
        <p class="d-enroll__p">Each code works once if you lose access to the app. Store them somewhere safe.</p>

        <ul class="d-enroll__codes" data-testid="recovery-codes">
          <li v-for="recovery in recoveryCodes" :key="recovery">{{ recovery }}</li>
        </ul>
      </li>

      <li>
        <h2 class="d-enroll__h">Enter the code from the app</h2>

        <form novalidate @submit.prevent="onSubmit">
          <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError" label="Verification code">
            <DInput
              :id="controlId"
              ref="codeEl"
              v-model="code"
              autocomplete="one-time-code"
              class="d-enroll__code"
              :describedby="describedBy"
              :disabled="submitting || isExpired"
              inputmode="numeric"
              :invalid="invalid"
              placeholder="000000"
              size="lg"
            />
          </FormField>

          <p v-if="!isExpired" class="d-enroll__timer">Setup expires in <b>{{ countdown.label }}</b></p>

          <DBtn
            block
            class="d-enroll__submit"
            :disabled="isExpired"
            kind="primary"
            :loading="submitting"
            size="lg"
            type="submit"
          >
            {{ submitting ? 'Verifying…' : 'Verify and sign in' }}
          </DBtn>
        </form>
      </li>
    </ol>

    <button class="d-enroll__back" type="button" @click="backToLogin">Back to sign in</button>
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

  // The guard only lets this screen open while an enrollment is pending.
  const enrollment = computed(() => (auth.pendingMfa?.kind === 'enroll' ? auth.pendingMfa : null))
  const otpauthUrl = computed(() => enrollment.value?.otpauthUrl ?? '')
  const recoveryCodes = computed(() => enrollment.value?.recoveryCodes ?? [])

  // The shared secret from the `otpauth://` link, in groups of four to be read aloud or typed.
  const setupKey = computed(() => {
    try {
      const secret = new URL(otpauthUrl.value).searchParams.get('secret') ?? ''
      return secret.replace(/(.{4})/g, '$1 ').trim()
    } catch {
      return ''
    }
  })

  const countdown = useCountdown(() => enrollment.value?.expiresAt)
  const isExpired = computed(() => Boolean(enrollment.value) && countdown.expired.value)

  watch(code, value => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (digits !== value) code.value = digits
    if (digits) emptyError.value = false
  })

  const subtitle = computed(() =>
    `Your role requires two-step verification. Set it up once for ${enrollment.value?.email ?? 'your account'}.`,
  )

  const fieldError = computed(() => {
    if (failure.value === 'mfa_invalid') return 'That code is not correct. Check it and try again.'
    if (emptyError.value) return `Enter the ${CODE_LENGTH}-digit code.`
    return undefined
  })

  const banner = computed(() => {
    if (isExpired.value) {
      return { variant: 'wait' as const, title: 'This setup has expired.', text: 'Go back to sign in to start again.' }
    }
    switch (failure.value) {
      case null:
      case 'mfa_invalid': {
        return null
      }
      case 'too_many_requests': {
        return { variant: 'wait' as const, title: 'Too many attempts.', text: 'Wait a few minutes, or go back to sign in to start again.' }
      }
      case 'network': {
        return { variant: 'bad' as const, title: 'Cannot reach the server.', text: 'Check your connection and try again.' }
      }
      default: {
        return { variant: 'bad' as const, title: 'Setup is unavailable.', text: 'We could not check your code. Try again in a moment.' }
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
      await auth.enrollMfa(code.value)
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
.d-enroll__banner { margin-bottom: 16px; }
.d-enroll__steps { list-style: none; margin: 0; padding: 0; counter-reset: step; }
.d-enroll__steps > li { counter-increment: step; position: relative; padding-left: 30px; margin-bottom: 18px; }
.d-enroll__steps > li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font: 500 11px/20px Inter, system-ui, sans-serif;
  text-align: center;
}
.d-enroll__h { margin: 0 0 4px; font: 500 13px Inter, system-ui, sans-serif; color: var(--ink); }
.d-enroll__p { margin: 0 0 8px; font-size: 11.5px; line-height: 1.55; color: var(--ink-2); }
.d-enroll__key,
.d-enroll__codes li {
  font-family: var(--font-mono, 'Roboto Mono', monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.d-enroll__key {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-input);
  background: var(--bg);
  font-size: 14px;
  letter-spacing: 1.5px;
  word-break: break-all;
  user-select: all;
}
.d-enroll__link { display: inline-block; margin-top: 8px; font-size: 11.5px; color: var(--gold); }
.d-enroll__codes {
  list-style: none;
  margin: 0;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-input);
  background: var(--bg);
  font-size: 12px;
}
.d-enroll__code.d-input :deep(.d-input__el) {
  font-family: var(--font-mono, 'Roboto Mono', monospace);
  font-size: 22px;
  letter-spacing: 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.d-enroll__timer { margin: -4px 0 14px; font-size: 11.5px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.d-enroll__submit { margin-top: 2px; }
.d-enroll__back {
  display: block;
  margin: 14px auto 0;
  border: 0;
  background: transparent;
  font: 500 12px Inter, system-ui, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-enroll__back:hover { text-decoration: underline; }
.d-enroll__back:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
</style>
