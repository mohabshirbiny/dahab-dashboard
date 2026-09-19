<template>
  <aside class="d-nav" :class="{ 'd-nav--open': mobileOpen }">
    <div class="d-nav__brand">
      <svg viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg" aria-label="Dahab">
        <text
          x="6" y="60"
          font-family="Didot, 'Playfair Display', 'Instrument Serif', serif"
          font-size="60"
          font-weight="600"
          fill="currentColor"
          letter-spacing="-1"
        >Dahab</text>
        <circle cx="198" cy="56" r="6" fill="#D4AF37" />
      </svg>
      <span class="d-nav__env">LIVE</span>
    </div>

    <nav class="d-nav__body">
      <template v-for="group in navGroups" :key="group.label">
        <div class="d-nav__section">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.key"
          class="d-nav__link"
          :to="item.to"
          active-class="is-active"
          @click="onLinkClick"
        >
          <span class="d-nav__link-title">{{ item.title }}</span>
          <span v-if="item.badge" class="d-nav__badge">{{ item.badge }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="d-nav__who">
      <b>{{ auth.user?.name ?? 'Ahmed Ezz El-Din' }}</b>
      <span>{{ auth.user?.role ?? 'Chief Executive Officer' }}</span>
      <div class="d-nav__switch" @click="onSwitch">Switch role</div>
    </div>
  </aside>
</template>

<script lang="ts" setup>
  import { RouterLink } from 'vue-router'
  import { navGroups } from '@/mock/nav'
  import { useAuthStore } from '@/stores/auth'
  import { useToast } from '@/composables/useToast'

  defineProps<{ mobileOpen: boolean }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const auth = useAuthStore()
  const { ok } = useToast()

  function onLinkClick () {
    emit('close')
  }
  function onSwitch () {
    ok('Switching roles is for testing. In production you sign in as yourself.')
  }
</script>

<style lang="scss" scoped>
.d-nav {
  width: 216px;
  background: var(--nav);
  color: var(--nav-txt);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.d-nav__brand {
  padding: 20px 18px 16px;
  border-bottom: 1px solid var(--nav-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.d-nav__brand svg { height: 20px; width: 70px; color: #fff; }
.d-nav__env {
  font-size: 9px;
  letter-spacing: .6px;
  color: #6E6B60;
  border: 1px solid var(--nav-line);
  padding: 2px 6px;
  border-radius: 4px;
}
.d-nav__body { padding-bottom: 8px; }
.d-nav__section {
  padding: 14px 0 4px 18px;
  font-size: 10px;
  letter-spacing: .5px;
  color: #5E5B51;
  text-transform: none;
}
.d-nav__link {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 18px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--nav-txt);
  border-left: 2px solid transparent;
  text-decoration: none;
}
.d-nav__link-title { flex: 1; }
.d-nav__link:hover {
  background: var(--nav-2);
  color: #E8E6DE;
}
.d-nav__link.is-active {
  background: var(--nav-2);
  color: #fff;
  border-left-color: var(--gold);
  font-weight: 500;
}
.d-nav__badge {
  font-size: 11px;
  background: #3A3729;
  color: #D8D5C9;
  padding: 1px 6px;
  border-radius: 9px;
  min-width: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.d-nav__link.is-active .d-nav__badge {
  background: var(--gold);
  color: #fff;
}
.d-nav__who {
  margin-top: auto;
  padding: 14px 18px;
  border-top: 1px solid var(--nav-line);
  font-size: 11px;
  color: var(--nav-txt);
}
.d-nav__who b {
  display: block;
  color: #E8E6DE;
  font-weight: 500;
  font-size: 12px;
  margin-bottom: 2px;
}
.d-nav__switch {
  margin-top: 8px;
  color: #6E6B60;
  cursor: pointer;
}
.d-nav__switch:hover { color: #E8E6DE; }

@media (max-width: 900px) {
  .d-nav {
    width: 100%;
    height: auto;
    position: static;
    max-height: 0;
    overflow: hidden;
    transition: max-height .25s ease;
  }
  .d-nav--open {
    max-height: 1400px;
    overflow-y: auto;
  }
  .d-nav__brand { padding: 14px 16px; }
  .d-nav__section { padding: 10px 0 3px 16px; }
  .d-nav__link { padding: 9px 16px; }
  .d-nav__who { padding: 12px 16px; }
}
</style>
