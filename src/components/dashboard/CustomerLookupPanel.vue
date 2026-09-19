<template>
  <Panel title="Look up a customer">
    <div class="d-panel__body">
      <div class="d-lookup__field">
        <input
          v-model="query"
          class="d-lookup__input"
          placeholder="Number, phone or name"
          @keydown.enter="onOpen"
        >
      </div>
      <DBtn kind="primary" block @click="onOpen">Open the file</DBtn>
      <div class="who2 d-lookup__hint">
        Everything on one person: wallet, orders, listings, documents and history.
      </div>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import Panel from '@/components/ui/Panel.vue'
  import DBtn from '@/components/ui/DBtn.vue'

  const router = useRouter()
  const query = ref('4417')

  function onOpen () {
    router.push('/dashboard/customer')
  }
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
.d-lookup__field { margin-bottom: 10px; }
.d-lookup__input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-input);
  font: 400 12.5px 'Inter', sans-serif;
  background: var(--panel);
  color: var(--ink);
  outline: none;
}
.d-lookup__input:focus { border-color: var(--gold); }
.d-lookup__hint {
  margin-top: 9px;
  font-size: 11px;
  color: var(--ink-3);
}
</style>
