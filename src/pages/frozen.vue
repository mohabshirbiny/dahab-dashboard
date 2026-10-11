<template>
  <AuthShell subtitle="This account is frozen by the other founder. It works again only after both confirmations." title="Account frozen">
    <NoteBanner v-if="done" class="d-frz__banner" role="status" variant="ok">
      <span><b>Your confirmation is recorded.</b> The other founder confirms last; then sign in again.</span>
    </NoteBanner>

    <NoteBanner v-else-if="banner" class="d-frz__banner" role="alert" :variant="banner.variant">
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <template v-if="!done">
      <p class="d-frz__lead">
        If this is your account, give your confirmation to unfreeze it: your password and your authenticator code, from a device you
        have signed in from before. This does not sign you in.
      </p>

      <form novalidate @submit.prevent="onSubmit">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.email" label="Email">
          <DInput
            :id="controlId"
            v-model="email"
            autocomplete="username"
            :describedby="describedBy"
            :disabled="submitting"
            inputmode="email"
            :invalid="invalid"
            size="lg"
            type="email"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.password" label="Password">
          <DInput
            :id="controlId"
            v-model="password"
            autocomplete="current-password"
            :describedby="describedBy"
            :disabled="submitting"
            :invalid="invalid"
            size="lg"
            type="password"
          />
        </FormField>

        <FormField v-if="!useRecovery" v-slot="{ controlId, describedBy, invalid }" :error="errors.code" label="Authenticator code">
          <DInput
            :id="controlId"
            v-model="code"
            autocomplete="one-time-code"
            :describedby="describedBy"
            :disabled="submitting"
            inputmode="numeric"
            :invalid="invalid"
            placeholder="000000"
            size="lg"
          />
        </FormField>

        <FormField v-else v-slot="{ controlId, describedBy, invalid }" :error="errors.code" label="Recovery code">
          <DInput
            :id="controlId"
            v-model="recoveryCode"
            autocomplete="off"
            :describedby="describedBy"
            :disabled="submitting"
            :invalid="invalid"
            placeholder="abcde-fghij"
            size="lg"
          />
        </FormField>

        <p class="d-frz__switch">
          <button type="button" @click="useRecovery = !useRecovery">
            {{ useRecovery ? 'Use the authenticator code instead' : 'Use a recovery code instead' }}
          </button>
        </p>

        <DBtn
          block
          kind="primary"
          :loading="submitting"
          size="lg"
          type="submit"
        >
          {{ submitting ? 'Recording…' : 'Confirm my unfreeze' }}
        </DBtn>
      </form>
    </template>

    <button class="d-frz__back" type="button" @click="backToLogin">Back to sign in</button>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { backendCodeOf, errorCodeOf } from '@/services/errors'
  import { staffAuthService } from '@/services/staff-auth.service'
  import { useAuthStore } from '@/stores/auth'

  // Backend spec 021 Story 2 (C1): the frozen founder gives the first of the two unfreeze
  // confirmations without a session. The reason for the freeze is never shown here (R9: the
  // person reading may be the attacker). The other founder confirms last, from Security.
  const auth = useAuthStore()
  const router = useRouter()

  const email = ref(auth.frozenEmail ?? '')
  const password = ref('')
  const code = ref('')
  const recoveryCode = ref('')
  const useRecovery = ref(false)
  const submitting = ref(false)
  const submitted = ref(false)
  const done = ref(false)
  const failure = ref<string | null>(null)

  watch(code, value => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    if (digits !== value) code.value = digits
  })

  const errors = computed(() => {
    const result: { email?: string, password?: string, code?: string } = {}
    if (!submitted.value) return result
    if (!email.value.trim()) result.email = 'Enter your email.'
    if (!password.value) result.password = 'Enter your password.'
    if (useRecovery.value ? !recoveryCode.value.trim() : code.value.length !== 6) {
      result.code = useRecovery.value ? 'Enter a recovery code.' : 'Enter the 6-digit code.'
    }
    return result
  })

  const banner = computed(() => {
    switch (failure.value) {
      case null: {
        return null
      }
      case 'invalid_credentials': {
        return { variant: 'bad' as const, title: 'That did not work.', text: 'The email or password is not correct.' }
      }
      case 'mfa_invalid': {
        return { variant: 'bad' as const, title: 'The code is not correct.', text: 'Wait for a new code and try again.' }
      }
      case 'not_frozen': {
        return { variant: 'ok' as const, title: 'This account is not frozen.', text: 'Sign in as usual.' }
      }
      case 'device_not_known':
      case 'device_id_required': {
        return { variant: 'wait' as const, title: 'Use a device you have signed in from before.', text: 'This browser is new for your account.' }
      }
      case 'unfreeze_already_confirmed': {
        return { variant: 'ok' as const, title: 'The first confirmation is already given.', text: 'The other founder confirms last.' }
      }
      case 'too_many_requests': {
        return { variant: 'wait' as const, title: 'Too many attempts.', text: 'Wait a few minutes and try again.' }
      }
      case 'network': {
        return { variant: 'bad' as const, title: 'Cannot reach the server.', text: 'Check your connection and try again.' }
      }
      default: {
        return { variant: 'bad' as const, title: 'Something went wrong.', text: 'Try again in a moment.' }
      }
    }
  })

  async function onSubmit () {
    if (submitting.value) return
    submitted.value = true
    failure.value = null
    if (Object.keys(errors.value).length > 0) return

    submitting.value = true
    try {
      await staffAuthService.confirmUnfreezeAsFrozen({
        email: email.value.trim(),
        password: password.value,
        ...(useRecovery.value ? { recoveryCode: recoveryCode.value.trim() } : { code: code.value }),
      })
      done.value = true
    } catch (error) {
      failure.value = backendCodeOf(error) ?? errorCodeOf(error)
    } finally {
      password.value = ''
      code.value = ''
      recoveryCode.value = ''
      submitted.value = false
      submitting.value = false
    }
  }

  async function backToLogin () {
    auth.markFrozen(null)
    await router.replace({ name: 'login' })
  }
</script>

<style lang="scss" scoped>
.d-frz__banner { margin-bottom: 16px; }
.d-frz__lead { margin: 0 0 14px; font-size: 12.5px; line-height: 1.6; color: var(--ink-2); }
.d-frz__switch { margin: -4px 0 14px; font-size: 12px; text-align: right; }
.d-frz__switch button {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: var(--ink-3);
  cursor: pointer;
}
.d-frz__switch button:hover { color: var(--ink); }
.d-frz__back {
  display: block;
  margin: 14px auto 0;
  border: 0;
  background: transparent;
  font: 500 12px Inter, system-ui, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-frz__back:hover { text-decoration: underline; }
.d-frz__back:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
</style>
