<template>
  <div class="d-app">
    <button
      class="d-navtoggle"
      type="button"
      @click="mobileOpen = !mobileOpen"
    >
      <span>Menu</span>
      <span>{{ mobileOpen ? 'Hide' : 'Show' }}</span>
    </button>

    <AppSidebar :mobile-open="mobileOpen" @close="onCloseNav" />

    <div class="d-main">
      <AppTopbar :title="currentTitle" />
      <div class="d-wrap">
        <router-view />
      </div>
    </div>

    <Toast />
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import AppSidebar from '@/components/app/AppSidebar.vue'
  import AppTopbar from '@/components/app/AppTopbar.vue'
  import Toast from '@/components/ui/Toast.vue'
  import { navGroups } from '@/mock/nav'

  const route = useRoute()
  const mobileOpen = ref(false)

  const flatNav = computed(() => navGroups.flatMap(g => g.items))

  const currentTitle = computed(() => {
    const match = flatNav.value.find(item => route.path.startsWith(item.to))
    return match?.title ?? 'Overview'
  })

  function onCloseNav () {
    if (window.innerWidth <= 900) mobileOpen.value = false
  }
</script>

<style lang="scss" scoped>
.d-app {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.d-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.d-wrap {
  padding: 22px 24px 60px;
  max-width: 1400px;
  width: 100%;
}
.d-navtoggle {
  display: none;
  align-items: center;
  gap: 8px;
  background: var(--nav);
  color: #E8E6DE;
  padding: 12px 16px;
  font: 500 13px 'Inter', sans-serif;
  cursor: pointer;
  border: 0;
  width: 100%;
  justify-content: space-between;
}
@media (max-width: 900px) {
  .d-app { flex-direction: column; }
  .d-navtoggle { display: flex; }
  .d-wrap { padding: 16px 14px 50px; }
}
</style>
