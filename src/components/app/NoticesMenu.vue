<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom end" offset="6">
    <template #activator="{ props: activator }">
      <button
        v-bind="activator"
        :aria-label="unread > 0 ? `Notices, ${unread} unread` : 'Notices'"
        class="d-bell"
        type="button"
      >
        <svg aria-hidden="true" class="d-bell__icon" viewBox="0 0 24 24">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" fill="currentColor" />
        </svg>

        <span v-if="unread > 0" class="d-bell__badge">{{ unread > 99 ? '99+' : unread }}</span>
      </button>
    </template>

    <section aria-label="Notices" class="d-notices">
      <header class="d-notices__head">
        <b>Notices</b>

        <button
          class="d-notices__all"
          :disabled="unread === 0 || markAll.isPending.value"
          type="button"
          @click="markAll.mutate()"
        >
          Mark all read
        </button>
      </header>

      <div v-if="notices.isPending.value" class="d-notices__state">Loading…</div>

      <div v-else-if="notices.isError.value" class="d-notices__state">
        Could not load the notices.
        <button class="d-notices__retry" type="button" @click="notices.refetch()">Try again</button>
      </div>

      <div v-else-if="rows.length === 0" class="d-notices__state">Nothing yet. Security notices for founders appear here.</div>

      <ul v-else class="d-notices__list">
        <li v-for="notice in rows" :key="notice.id">
          <button
            class="d-notice"
            :class="[`is-${notice.severity}`, { 'is-unread': !notice.readAt }]"
            type="button"
            @click="openNotice(notice)"
          >
            <span aria-hidden="true" class="d-notice__dot" />

            <span class="d-notice__text">
              <b>{{ notice.title }}</b>
              <span>{{ notice.body }}</span>
              <time :datetime="notice.createdAt">{{ formatRelativeTime(notice.createdAt) }}</time>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </v-menu>
</template>

<script lang="ts" setup>
  import type { StaffNotice } from '@/types/notices'
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { formatRelativeTime } from '@/composables/useFormatters'
  import { useMarkAllNoticesRead, useMarkNoticeRead, useNoticesQuery } from '@/composables/useNotices'

  // Dashboard notices, the bell (Backend spec 021). A click marks the notice read and opens its link.
  const router = useRouter()
  const open = ref(false)

  const notices = useNoticesQuery()
  const markRead = useMarkNoticeRead()
  const markAll = useMarkAllNoticesRead()

  const rows = computed(() => notices.data.value?.rows ?? [])
  const unread = computed(() => notices.data.value?.unreadCount ?? 0)

  async function openNotice (notice: StaffNotice) {
    if (!notice.readAt) {
      markRead.mutate(notice.id)
    }
    open.value = false
    // Only Dashboard paths are followed, never full URLs.
    if (notice.link && notice.link.startsWith('/') && !notice.link.startsWith('//')) {
      await router.push(notice.link)
    }
  }
</script>

<style lang="scss" scoped>
.d-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--panel);
  color: var(--ink-2);
  cursor: pointer;
}
.d-bell:hover { background: var(--bg); color: var(--ink); }
.d-bell:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.d-bell__icon { width: 16px; height: 16px; }
.d-bell__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--bad, #b3261e);
  color: #fff;
  font: 600 10px/17px Inter, sans-serif;
  text-align: center;
}
.d-notices {
  width: min(360px, calc(100vw - 32px));
  max-height: min(480px, 70vh);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel, 10px);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  overflow: hidden;
}
.d-notices__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.d-notices__all, .d-notices__retry {
  border: 0;
  background: transparent;
  font: 500 12px Inter, sans-serif;
  color: var(--gold);
  cursor: pointer;
}
.d-notices__all:disabled { color: var(--ink-3); cursor: default; }
.d-notices__state { padding: 22px 14px; font-size: 12.5px; color: var(--ink-3); text-align: center; }
.d-notices__list { margin: 0; padding: 0; list-style: none; overflow-y: auto; }
.d-notice {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left;
  font: inherit;
  color: var(--ink);
  cursor: pointer;
}
.d-notice:hover { background: var(--row-hover, var(--bg)); }
.d-notice__dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: transparent; flex-shrink: 0; }
.d-notice.is-unread .d-notice__dot { background: var(--gold); }
.d-notice.is-unread.is-warning .d-notice__dot { background: var(--warn, #b26a00); }
.d-notice.is-unread.is-critical .d-notice__dot { background: var(--bad, #b3261e); }
.d-notice__text { display: grid; gap: 2px; min-width: 0; font-size: 12px; line-height: 1.5; }
.d-notice__text b { font-size: 12.5px; }
.d-notice__text span { color: var(--ink-2); overflow-wrap: anywhere; }
.d-notice__text time { font-size: 11px; color: var(--ink-3); }
.d-notice.is-critical .d-notice__text b { color: var(--bad, #b3261e); }
</style>
