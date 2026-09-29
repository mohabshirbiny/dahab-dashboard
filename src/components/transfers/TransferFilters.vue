<template>
  <div class="d-tf">
    <FilterChips :model-value="scope" :options="SCOPE_OPTIONS" @update:model-value="emit('update:scope', $event)" />

    <form class="d-tf__row" role="search" @submit.prevent="emit('update:q', term.trim())">
      <FormField v-slot="{ controlId }" label="Search">
        <DInput
          :id="controlId"
          v-model="term"
          autocomplete="off"
          :maxlength="64"
          placeholder="DAHAB-004417, a phone or a name"
        />
      </FormField>

      <DBtn type="submit">Find</DBtn>

      <FormField v-slot="{ controlId }" label="From">
        <DInput :id="controlId" :model-value="from" type="date" @update:model-value="emit('update:from', String($event))" />
      </FormField>

      <FormField v-slot="{ controlId }" label="To">
        <DInput :id="controlId" :model-value="to" type="date" @update:model-value="emit('update:to', String($event))" />
      </FormField>
    </form>
  </div>
</template>

<script lang="ts" setup>
  import type { TransferScope } from './transferScopes'
  import { ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import FormField from '@/components/ui/FormField.vue'
  import { SCOPE_OPTIONS } from './transferScopes'

  const props = defineProps<{
    scope: TransferScope
    from: string
    to: string
    q: string
  }>()

  const emit = defineEmits<{
    (e: 'update:scope', value: TransferScope): void
    (e: 'update:from' | 'update:to' | 'update:q', value: string): void
  }>()

  const term = ref(props.q)
</script>

<style lang="scss" scoped>
.d-tf { display: grid; gap: 12px; }
.d-tf__row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
</style>
