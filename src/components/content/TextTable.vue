<template>
  <DataTable>
    <template #head>
      <th>Where</th>
      <th>English</th>
      <th>Arabic</th>
      <th>Status</th>
      <th class="r" />
    </template>

    <tr v-for="t in rows" :key="t.key" :class="{ 'd-tt__row--gone': t.retired }">
      <td class="d-tt__where">
        {{ t.area }}
        <div class="who2">{{ t.description }}</div>
        <div class="who2 mono">{{ t.key }}</div>
      </td>

      <td class="d-tt__text">
        {{ shown(t).en }}
        <div v-if="t.draft && !t.draft.isDefaultMarker" class="who2">Live: {{ live(t).en }}</div>
      </td>

      <td class="d-tt__text d-tt__ar" dir="rtl">
        {{ shown(t).ar }}
        <div v-if="t.draft && !t.draft.isDefaultMarker" class="who2">{{ live(t).ar }}</div>
      </td>

      <td class="d-tt__status">
        <StatusTag v-if="t.retired" label="Not used by the current app" variant="off" />
        <StatusTag v-else-if="t.readOnly" label="Locked" variant="off" />
        <StatusTag v-if="t.draft" :label="t.draft.isDefaultMarker ? 'Draft: back to default' : 'Draft'" variant="wait" />
        <StatusTag v-else-if="t.isOverridden" label="Changed" variant="info" />
        <StatusTag v-if="t.defaultChangedSinceOverride" label="Default changed" variant="warn" />

        <div v-if="t.published && !t.draft" class="who2">
          v{{ t.published.version }}, {{ formatDateTime(t.published.publishedAt) }}{{ t.published.publishedBy ? ` by ${t.published.publishedBy.fullName}` : '' }}
        </div>

        <div v-else-if="t.draft?.editedBy" class="who2">By {{ t.draft.editedBy.fullName }}, {{ formatDateTime(t.draft.editedAt) }}</div>
      </td>

      <td class="r d-tt__actions">
        <DBtn @click="emit('history', t)">History</DBtn>
        <DBtn v-if="t.readOnly || t.retired" disabled>Locked</DBtn>
        <DBtn v-else kind="primary" @click="emit('edit', t)">Edit</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { AppText, TextValue } from '@/types/content'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'

  defineProps<{ rows: AppText[] }>()
  const emit = defineEmits<{ (e: 'edit' | 'history', text: AppText): void }>()

  // What customers see now: the live override, else the code's own text.
  function live (t: AppText): TextValue {
    return t.published ? { en: t.published.en, ar: t.published.ar } : t.default
  }

  // The words in the row: a draft of words if there is one, else what is live.
  function shown (t: AppText): TextValue {
    if (t.draft && !t.draft.isDefaultMarker) return { en: t.draft.en, ar: t.draft.ar }
    if (t.draft?.isDefaultMarker) return t.default
    return live(t)
  }
</script>

<style lang="scss" scoped>
.d-tt__where { min-width: 150px; }
.d-tt__text { max-width: 320px; overflow-wrap: anywhere; }
.d-tt__ar { text-align: right; }
.d-tt__status { white-space: nowrap; }
.d-tt__status > * + * { margin-left: 4px; }
.d-tt__actions { white-space: nowrap; }
.d-tt__actions > * + * { margin-left: 6px; }
.d-tt__row--gone { opacity: .6; }
</style>
