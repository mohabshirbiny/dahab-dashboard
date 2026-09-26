<template>
  <AuthShell subtitle="Sign in with your own staff account." title="Sign in to Dahab admin">
    <NoteBanner
      v-if="banner"
      class="d-login__banner"
      role="alert"
      :variant="banner.variant"
    >
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.email" label="Email">
        <DInput
          :id="controlId"
          ref="emailEl"
          v-model="email"
          autocomplete="username"
          :describedby="describedBy"
          :disabled="submitting"
          inputmode="email"
          :invalid="invalid"
          placeholder="name@dahab.eg"
          size="lg"
          type="email"
          @blur="touched.email = true"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.password" label="Password">
        <DInput
          :id="controlId"
          ref="passwordEl"
          v-model="password"
          autocomplete="current-password"
          :describedby="describedBy"
          :disabled="submitting"
          :invalid="invalid"
          size="lg"
          :type="showPassword ? 'text' : 'password'"
          @blur="touched.password = true"
        >
          <template #append>
            <button
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              class="d-login__toggle"
              type="button"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </template>
        </DInput>
      </FormField>

      <DBtn
        block
        class="d-login__submit"
        kind="primary"
        :loading="submitting"
        size="lg"
        type="submit"
      >
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </DBtn>
    </form>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { mfaRouteName, safeRedirect } from '@/router/guards'
  import { errorCodeOf, type ServiceErrorCode } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const submitting = ref(false)
  const failure = ref<ServiceErrorCode | null>(null)
  const submitted = ref(false)
  const touched = reactive({ email: false, password: false })

  const emailEl = ref<InstanceType<typeof DInput> | null>(null)
  const passwordEl = ref<InstanceType<typeof DInput> | null>(null)

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

  const errors = computed(() => {
    const result: { email?: string, password?: string } = {}
    if (submitted.value || touched.email) {
      if (!email.value.trim()) result.email = 'Enter your email.'
      else if (!EMAIL_PATTERN.test(email.value.trim())) result.email = 'Enter a valid email, for example name@dahab.eg.'
    }
    if ((submitted.value || touched.password) && !password.value) {
      result.password = 'Enter your password.'
    }
    return result
  })

  const banner = computed(() => {
    switch (failure.value) {
      case null: {
        return null
      }
      case 'invalid_credentials': {
        return { variant: 'bad' as const, title: 'Sign in failed.', text: 'The email or password is not correct. Check them and try again.' }
      }
      case 'account_disabled': {
        return { variant: 'wait' as const, title: 'This account is disabled or frozen.', text: 'You cannot sign in until a founder restores access.' }
      }
      case 'too_many_requests': {
        return { variant: 'wait' as const, title: 'Too many attempts.', text: 'Wait a few minutes before you try to sign in again.' }
      }
      case 'network': {
        return { variant: 'bad' as const, title: 'Cannot reach the server.', text: 'Check your connection and try again.' }
      }
      default: {
        return { variant: 'bad' as const, title: 'Something went wrong.', text: 'We could not sign you in. Try again in a moment.' }
      }
    }
  })

  async function onSubmit () {
    if (submitting.value) return
    submitted.value = true
    failure.value = null
    if (errors.value.email) return emailEl.value?.focus()
    if (errors.value.password) return passwordEl.value?.focus()

    submitting.value = true
    try {
      const outcome = await auth.login({ email: email.value.trim(), password: password.value })
      const redirect = safeRedirect(route.query.redirect)
      // A second step means the Backend wants a code, or first-time authenticator setup.
      await router.replace(outcome === 'authenticated'
        ? redirect
        : {
          name: mfaRouteName(outcome === 'mfa_required' ? 'verify' : 'enroll'),
          query: redirect === '/dashboard/overview' ? {} : { redirect },
        })
    } catch (error) {
      failure.value = errorCodeOf(error)
      if (failure.value === 'invalid_credentials') {
        password.value = ''
        submitted.value = false
        touched.password = false
        passwordEl.value?.focus()
      }
    } finally {
      submitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
.d-login__banner { margin-bottom: 16px; }
.d-login__submit { margin-top: 6px; }
.d-login__toggle {
  border: 0;
  background: transparent;
  padding: 0 12px;
  align-self: stretch;
  font: 500 11.5px Inter, system-ui, sans-serif;
  color: var(--ink-3);
  cursor: pointer;
}
.d-login__toggle:hover { color: var(--ink); }
.d-login__toggle:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; border-radius: var(--r-input); }
</style>
