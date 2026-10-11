<template>
  <DataTable>
    <template #head>
      <th class="r">#</th>
      <th>Question</th>
      <th>Answer</th>
      <th>Status</th>
      <th class="r" />
    </template>

    <tr v-for="(entry, index) in entries" :key="entry.slug">
      <td class="r d-fl__num">
        {{ shownPosition(entry, index) }}
        <div v-if="entry.pendingPosition !== null" class="who2">was {{ entry.position ?? 'new' }}</div>
      </td>

      <td class="d-fl__text">
        {{ words(entry.question)?.en ?? '—' }}
        <div class="who2 d-fl__ar" dir="rtl">{{ words(entry.question)?.ar }}</div>
        <div class="who2 mono">{{ entry.slug }}</div>
      </td>

      <td class="d-fl__text">
        {{ words(entry.answer)?.en ?? '—' }}
        <div class="who2 d-fl__ar" dir="rtl">{{ words(entry.answer)?.ar }}</div>
      </td>

      <td class="d-fl__status">
        <StatusTag v-if="isHidden(entry)" label="Hidden from customers" variant="off" />
        <StatusTag v-else-if="!isLive(entry)" label="Not published yet" variant="wait" />
        <StatusTag v-else label="Live" variant="ok" />
        <StatusTag v-if="hasDraft(entry)" label="Draft" variant="wait" />
        <StatusTag v-if="entry.pendingPosition !== null" label="New place" variant="wait" />
      </td>

      <td class="r d-fl__actions">
        <template v-if="canEdit">
          <DBtn aria-label="Move up" :disabled="busy || index === 0" @click="emit('move', entry.slug, index)">Up</DBtn>
          <DBtn aria-label="Move down" :disabled="busy || index === entries.length - 1" @click="emit('move', entry.slug, index + 2)">Down</DBtn>
          <DBtn :disabled="busy || !entry.answer" @click="emit('toggle', entry)">{{ isHidden(entry) ? 'Show' : 'Hide' }}</DBtn>
          <DBtn :disabled="!entry.question" @click="entry.question && emit('edit', entry.question)">Edit question</DBtn>
          <DBtn :disabled="!entry.answer" kind="primary" @click="entry.answer && emit('edit', entry.answer)">Edit answer</DBtn>
        </template>

        <DBtn v-if="entry.answer" @click="entry.answer && emit('history', entry.answer)">History</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { AppText, FaqEntry, TextValue } from '@/types/content'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'

  // Help entries in the order customers will see after the next publish. Every move is a draft.
  defineProps<{ entries: FaqEntry[], canEdit: boolean, busy?: boolean }>()
  const emit = defineEmits<{
    (e: 'move', slug: string, position: number): void
    (e: 'toggle', entry: FaqEntry): void
    (e: 'edit' | 'history', text: AppText): void
  }>()

  // The words in the row: a draft of words if there is one, else what is live.
  function words (t: AppText | null): TextValue | null {
    if (!t) return null
    if (t.draft && !t.draft.isDefaultMarker) return { en: t.draft.en, ar: t.draft.ar }
    return t.published ? { en: t.published.en, ar: t.published.ar } : null
  }

  const hasDraft = (e: FaqEntry) => Boolean(e.question?.draft || e.answer?.draft)
  const isLive = (e: FaqEntry) => Boolean(e.question?.published && e.answer?.published)

  // A draft of the answer's hidden flag wins over the live one.
  function isHidden (e: FaqEntry): boolean {
    const a = e.answer
    if (!a) return false
    return a.draft && !a.draft.isDefaultMarker ? a.draft.isHidden : (a.published?.isHidden ?? false)
  }

  const shownPosition = (e: FaqEntry, index: number) => e.pendingPosition ?? e.position ?? index + 1
</script>

<style lang="scss" scoped>
.d-fl__num { width: 48px; }
.d-fl__text { max-width: 320px; overflow-wrap: anywhere; }
.d-fl__ar { text-align: right; }
.d-fl__status { white-space: nowrap; }
.d-fl__status > * + * { margin-left: 4px; }
.d-fl__actions { white-space: nowrap; }
.d-fl__actions > * + * { margin-left: 4px; }
</style>
