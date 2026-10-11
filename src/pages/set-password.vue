<template>
  <AuthShell subtitle="Choose a password of at least 10 characters." title="Set your password">
    <NoteBanner
      v-if="linkInvalid"
      class="d-setpw__banner"
      role="alert"
      variant="bad"
    >
      <span>
        <b>This link no longer works.</b> It may have been used, replaced by a newer one, or expired.
        <RouterLink :to="{ name: 'forgot-password' }">Ask for a new link</RouterLink>
      </span>
    </NoteBanner>

    <NoteBanner
      v-else-if="failure"
      class="d-setpw__banner"
      role="alert"
      :variant="failure === 'too_many_requests' ? 'wait' : 'bad'"
    >
      <span>
        <b>{{ failure === 'too_many_requests' ? 'Too many attempts.' : 'We could not set the password.' }}</b>
        {{ failure === 'too_many_requests' ? 'Wait a while and try again.' : (message || 'Check your connection and try again.') }}
      </span>
    </NoteBanner>

    <form v-if="token && !linkInvalid" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.password" label="New password">
        <DInput
          :id="controlId"
          ref="passwordEl"
          v-model="password"
          autocomplete="new-password"
          :describedby="describedBy"
          :disabled="submitting"
          :invalid="invalid"
          size="lg"
          :type="showPassword ? 'text' : 'password'"
        >
          <template #append>
            <button
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              class="d-setpw__toggle"
              type="button"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </template>
        </DInput>
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="errors.confirmation" label="Confirm the password">
        <DInput
          :id="controlId"
          ref="confirmationEl"
          v-model="confirmation"
          autocomplete="new-password"
          :describedby="describedBy"
          :disabled="submitting"
          :invalid="invalid"
          size="lg"
          :type="showPassword ? 'text' : 'password'"
        />
      </FormField>

      <DBtn
        block
        class="d-setpw__submit"
        kind="primary"
        :loading="submitting"
        size="lg"
        type="submit"
      >
        {{ submitting ? 'Saving…' : 'Set the password' }}
      </DBtn>
    </form>

    <NoteBanner
      v-else-if="!token"
      class="d-setpw__banner"
      role="alert"
      variant="bad"
    >
      <span>
        <b>The link is incomplete.</b> Open the link from your email again, or
        <RouterLink :to="{ name: 'forgot-password' }">ask for a new one</RouterLink>.
      </span>
    </NoteBanner>

    <template #footer>
      <RouterLink :to="{ name: 'login' }">Back to sign in</RouterLink>
    </template>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { backendCodeOf, errorCodeOf, isServiceError, type ServiceErrorCode } from '@/services/errors'
  import { staffAuthService } from '@/services/staff-auth.service'

  const route = useRoute()
  const router = useRouter()

  const token = computed(() => {
    const value = route.query.token
    return typeof value === 'string' ? value : ''
  })

  const password = ref('')
  const confirmation = ref('')
  const showPassword = ref(false)
  const submitting = ref(false)
  const submitted = ref(false)
  const failure = ref<ServiceErrorCode | null>(null)
  const message = ref('')
  const linkInvalid = ref(false)
  const passwordEl = ref<InstanceType<typeof DInput> | null>(null)
  const confirmationEl = ref<InstanceType<typeof DInput> | null>(null)

  const errors = computed(() => {
    const result: { password?: string, confirmation?: string } = {}
    if (!submitted.value) return result
    if (password.value.length < 10) result.password = 'Use at least 10 characters.'
    else if (password.value !== confirmation.value) result.confirmation = 'The two passwords do not match.'
    return result
  })

  async function onSubmit () {
    if (submitting.value) return
    submitted.value = true
    failure.value = null
    message.value = ''
    if (errors.value.password) return passwordEl.value?.focus()
    if (errors.value.confirmation) return confirmationEl.value?.focus()

    submitting.value = true
    try {
      await staffAuthService.confirmPasswordReset(token.value, password.value, confirmation.value)
      await router.replace({ name: 'login', query: { reset: 'done' } })
    } catch (error) {
      if (backendCodeOf(error) === 'reset_link_invalid') {
        linkInvalid.value = true
        return
      }
      failure.value = errorCodeOf(error)
      if (failure.value === 'validation' && isServiceError(error)) {
        message.value = Object.values(error.fields).flat()[0] ?? 'Choose a stronger password.'
      }
    } finally {
      submitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
.d-setpw__banner { margin-bottom: 16px; }
.d-setpw__submit { margin-top: 6px; }
.d-setpw__toggle {
  border: 0;
  background: transparent;
  padding: 0 12px;
  align-self: stretch;
  font: 500 11.5px Inter, system-ui, sans-serif;
  color: var(--ink-3);
  cursor: pointer;
}
.d-setpw__toggle:hover { color: var(--ink); }
.d-setpw__toggle:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; border-radius: var(--r-input); }
</style>
