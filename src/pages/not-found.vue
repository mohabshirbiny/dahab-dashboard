<template>
  <StatusPage
    code="404"
    description="The page may have moved, or the address may be mistyped."
    title="We could not find that page"
  >
    <template #actions>
      <DBtn kind="primary" @click="router.replace({ name: 'overview' })">Go to overview</DBtn>
    </template>
  </StatusPage>
</template>

<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusPage from '@/components/ui/StatusPage.vue'

  const router = useRouter()
</script>
