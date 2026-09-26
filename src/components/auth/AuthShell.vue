<template>
  <div class="d-auth">
    <aside class="d-auth__brand">
      <div class="d-auth__brand-top">
        <BrandMark class="d-auth__mark" />
        <span class="d-auth__env">ADMIN</span>
      </div>

      <p class="d-auth__note">
        Staff sign in with their own credentials. Shared logins are not permitted, because the log stops meaning anything.
      </p>
    </aside>

    <main class="d-auth__main">
      <section class="d-auth__card">
        <h1 class="d-auth__title">{{ title }}</h1>
        <p v-if="subtitle" class="d-auth__sub">{{ subtitle }}</p>
        <slot />
      </section>

      <div v-if="$slots.footer" class="d-auth__footer">
        <slot name="footer" />
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
  import BrandMark from '@/components/ui/BrandMark.vue'

  defineProps<{
    title: string
    subtitle?: string
  }>()
</script>

<style lang="scss" scoped>
.d-auth {
  display: grid;
  grid-template-columns: minmax(280px, 38%) 1fr;
  min-height: 100vh;
  background: var(--bg);
}
.d-auth__brand {
  background: var(--nav);
  color: var(--nav-txt);
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;
}
.d-auth__brand-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.d-auth__mark { height: 34px; width: 120px; color: #fff; }
.d-auth__env {
  font-size: 9px;
  letter-spacing: .6px;
  color: #6E6B60;
  border: 1px solid var(--nav-line);
  padding: 2px 6px;
  border-radius: 4px;
}
.d-auth__note {
  margin: 0;
  max-width: 34ch;
  font-size: 12.5px;
  line-height: 1.7;
  color: #8A877C;
  border-top: 1px solid var(--nav-line);
  padding-top: 18px;
}
.d-auth__main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 20px;
  min-width: 0;
}
.d-auth__card {
  width: 100%;
  max-width: 400px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  padding: 26px 24px 22px;
}
.d-auth__title { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: var(--ink); }
.d-auth__sub { margin: 0 0 20px; font-size: 12.5px; line-height: 1.6; color: var(--ink-2); }
.d-auth__footer { width: 100%; max-width: 400px; }

@media (max-width: 900px) {
  .d-auth { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .d-auth__brand { padding: 16px; gap: 0; }
  .d-auth__mark { height: 26px; width: 92px; }
  .d-auth__note { display: none; }
  .d-auth__main { justify-content: flex-start; padding: 24px 14px 40px; }
  .d-auth__card { padding: 22px 18px 18px; }
}
</style>
