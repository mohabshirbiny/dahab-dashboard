<template>
  <AuthShell subtitle="We will email you a link to set a new password." title="Reset your password">
    <NoteBanner
      v-if="sent"
      class="d-forgot__banner"
      role="status"
      variant="ok"
    >
      <span><b>Check your email.</b> If that address belongs to an active staff account, a link was sent. It works once and expires in 30 minutes.</span>
    </NoteBanner>

    <NoteBanner
      v-else-if="failure"
      class="d-forgot__banner"
      role="alert"
      :variant="failure === 'too_many_requests' ? 'wait' : 'bad'"
    >
      <span>
        <b>{{ failure === 'too_many_requests' ? 'Too many requests.' : 'We could not send the link.' }}</b>
        {{ failure === 'too_many_requests' ? 'Wait a while before you ask again.' : 'Check your connection and try again.' }}
      </span>
    </NoteBanner>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="error" label="Email">
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
        />
      </FormField>

      <DBtn
        block
        class="d-forgot__submit"
        kind="primary"
        :loading="submitting"
        size="lg"
        type="submit"
      >
        {{ submitting ? 'Sending…' : (sent ? 'Send the link again' : 'Send the link') }}
      </DBtn>
    </form>

    <template #footer>
      <RouterLink :to="{ name: 'login' }">Back to sign in</RouterLink>
    </template>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { errorCodeOf, type ServiceErrorCode } from '@/services/errors'
  import { staffAuthService } from '@/services/staff-auth.service'

  const email = ref('')
  const submitting = ref(false)
  const sent = ref(false)
  const submitted = ref(false)
  const failure = ref<ServiceErrorCode | null>(null)
  const emailEl = ref<InstanceType<typeof DInput> | null>(null)

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

  const error = computed(() => {
    if (!submitted.value) return undefined
    if (!email.value.trim()) return 'Enter your email.'
    if (!EMAIL_PATTERN.test(email.value.trim())) return 'Enter a valid email, for example name@dahab.eg.'
    return undefined
  })

  async function onSubmit () {
    if (submitting.value) return
    submitted.value = true
    failure.value = null
    if (error.value) return emailEl.value?.focus()

    submitting.value = true
    try {
      await staffAuthService.requestPasswordReset(email.value.trim())
      sent.value = true
    } catch (error_) {
      sent.value = false
      failure.value = errorCodeOf(error_)
    } finally {
      submitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
.d-forgot__banner { margin-bottom: 16px; }
.d-forgot__submit { margin-top: 6px; }
</style>
