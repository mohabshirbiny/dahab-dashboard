<template>
  <AuthShell :subtitle="subtitle" title="Waiting for the other founder to approve this device">
    <NoteBanner v-if="banner" class="d-dap__banner" role="alert" :variant="banner.variant">
      <span><b>{{ banner.title }}</b> {{ banner.text }}</span>
    </NoteBanner>

    <template v-if="!ended">
      <div class="d-dap__wait" role="status">
        <span aria-hidden="true" class="d-dap__dot" />
        <span>Checking every {{ intervalLabel }}. This request ends in <b>{{ countdown.label }}</b>.</span>
      </div>

      <p class="d-dap__text">
        Your password and code were right, but this browser is new for your account. Nothing opens until the other founder approves it
        from their own Security page. Call them if you are waiting.
      </p>
    </template>

    <section aria-labelledby="dap-device" class="d-dap__device">
      <h2 id="dap-device" class="d-dap__label">This device's id</h2>

      <div class="d-dap__id">
        <code>{{ id }}</code>
        <DBtn size="md" @click="copyId">{{ copied ? 'Copied' : 'Copy' }}</DBtn>
      </div>

      <p class="d-dap__hint">
        Only for the first device of a founder, or when nobody can approve: whoever runs the server can trust it with
        <code>php artisan founder:trust-device {{ auth.pendingApproval?.email ?? 'email' }} &lt;this id&gt;</code>.
        Clearing this browser's data makes it a new device.
      </p>
    </section>

    <DBtn
      v-if="ended"
      block
      class="d-dap__again"
      kind="primary"
      size="lg"
      @click="backToLogin"
    >Sign in again</DBtn>

    <button v-else class="d-dap__back" type="button" @click="backToLogin">Cancel and go back to sign in</button>
  </AuthShell>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { deviceId } from '@/api/device'
  import AuthShell from '@/components/auth/AuthShell.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useCountdown } from '@/composables/useCountdown'
  import { safeRedirect } from '@/router/guards'
  import { useAuthStore } from '@/stores/auth'

  // Backend spec 021 Story 1: a founder's sign-in from a new device is held until the other
  // founder approves it. This screen polls; the first poll after approval starts the session.
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const id = deviceId()
  const copied = ref(false)

  const countdown = useCountdown(() => auth.pendingApproval?.expiresAt)
  const intervalLabel = computed(() => `${auth.pendingApproval?.pollIntervalSeconds ?? 5} seconds`)

  // Expired on the clock counts as ended, even before the next poll says so.
  const ended = computed(() => auth.approvalEnd !== null || (Boolean(auth.pendingApproval) && countdown.expired.value))

  const subtitle = computed(() => `Signing in as ${auth.pendingApproval?.email ?? 'a founder'}.`)

  const banner = computed(() => {
    switch (auth.approvalEnd) {
      case 'refused': {
        return { variant: 'bad' as const, title: 'The other founder refused this sign-in.', text: 'If this was you, call them.' }
      }
      case 'frozen': {
        return { variant: 'bad' as const, title: 'This account is frozen by the other founder.', text: 'It works again only after both confirmations.' }
      }
      case 'ended': {
        return { variant: 'wait' as const, title: 'This request has ended.', text: 'Sign in again to send a new one.' }
      }
    }
    if (ended.value) {
      return { variant: 'wait' as const, title: 'This request has ended.', text: 'Sign in again to send a new one.' }
    }
    return null
  })

  watch(() => auth.isAuthenticated, async signedIn => {
    if (signedIn) {
      await router.replace(safeRedirect(route.query.redirect))
    }
  })

  watch(ended, value => {
    if (value) auth.stopApprovalPolling()
  })

  async function copyId () {
    try {
      await navigator.clipboard.writeText(id)
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    } catch {
      copied.value = false
    }
  }

  async function backToLogin () {
    const frozen = auth.approvalEnd === 'frozen'
    auth.cancelApproval()
    await router.replace(frozen ? { name: 'frozen' } : { name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} })
  }

  onMounted(() => auth.startApprovalPolling())
  onBeforeUnmount(() => auth.stopApprovalPolling())
</script>

<style lang="scss" scoped>
.d-dap__banner { margin-bottom: 16px; }
.d-dap__wait {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.d-dap__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  animation: d-dap-pulse 1.4s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes d-dap-pulse { 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { .d-dap__dot { animation: none; } }
.d-dap__text { margin: 14px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ink-2); }
.d-dap__device { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); }
.d-dap__label { margin: 0 0 6px; font-size: 11.5px; font-weight: 500; color: var(--ink-3); }
.d-dap__id { display: flex; align-items: center; gap: 10px; }
.d-dap__id code {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono, 'Roboto Mono', monospace);
  font-size: 12px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--bg);
}
.d-dap__hint { margin: 8px 0 0; font-size: 11.5px; line-height: 1.6; color: var(--ink-3); }
.d-dap__hint code { font-size: 11px; overflow-wrap: anywhere; }
.d-dap__again { margin-top: 18px; }
.d-dap__back {
  display: block;
  margin: 18px auto 0;
  border: 0;
  background: transparent;
  font: 500 12px Inter, system-ui, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-dap__back:hover { text-decoration: underline; }
.d-dap__back:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
</style>
