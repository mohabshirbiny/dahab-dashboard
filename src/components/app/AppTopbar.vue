<template>
  <header class="d-top">
    <h1 class="d-top__title">{{ title }}</h1>
    <div class="d-top__search">
      <input
        v-model="query"
        placeholder="Search an order, a wallet, a person"
        @keydown.enter="onSearch"
      >
    </div>
    <button class="d-tbtn" @click="onExport">Export</button>
  </header>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useToast } from '@/composables/useToast'

  defineProps<{ title: string }>()
  const { exportToExcel, ok } = useToast()

  const query = ref('')

  function onSearch () {
    if (!query.value.trim()) return
    ok(`Searching for "${query.value.trim()}".`)
  }
  function onExport () {
    exportToExcel('everything on this page')
  }
</script>

<style lang="scss" scoped>
.d-top {
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.d-top__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.d-top__search {
  margin-left: auto;
  position: relative;
}
.d-top__search input {
  width: 260px;
  padding: 7px 11px;
  border: 1px solid var(--line);
  border-radius: 7px;
  font: 400 12.5px 'Inter', sans-serif;
  background: var(--bg);
  color: var(--ink);
  outline: none;
}
.d-top__search input:focus {
  border-color: var(--gold);
}
.d-tbtn {
  padding: 7px 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 7px;
  font: 500 12px 'Inter', sans-serif;
  cursor: pointer;
  color: var(--ink);
}
.d-tbtn:hover { background: var(--bg); }

@media (max-width: 900px) {
  .d-top { padding: 0 16px; height: 52px; }
  .d-top__title { font-size: 15px; }
  .d-top__search { display: none; }
}
</style>
