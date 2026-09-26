import type { IdentityDocumentSide, IdentityReviewInput } from '@/types/identity'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { type MaybeRefOrGetter, onScopeDispose, ref, toValue, watch } from 'vue'
import { errorCodeOf } from '@/services/errors'
import { identityDocumentService } from '@/services/identity-document.service'
import { customerKeys } from './useCustomers'

// A decision changes the customer's status, so the lists, the tab counts and the
// sidebar badge are refreshed once the server has answered. When someone else decided
// first, what is on screen is stale, so it is refreshed too.
export function useReviewIdentityDocument () {
  const queryClient = useQueryClient()

  function refreshCustomers () {
    return queryClient.invalidateQueries({ queryKey: customerKeys.all })
  }

  return useMutation({
    mutationFn: (input: IdentityReviewInput & { id: string }) => identityDocumentService.reviewIdentityDocument(input.id, input),
    onError: error => {
      if (errorCodeOf(error) === 'conflict') {
        refreshCustomers()
      }
    },
    onSuccess: refreshCustomers,
  })
}

export type DocumentImageState = 'loading' | 'loaded' | 'deleted' | 'error'

// Loads a document image as an object URL. Deliberately not a query: the Backend
// serves it `no-store` and logs every view, so it is fetched once per opening and
// never kept in the shared cache. The object URL is released when the scope ends.
export function useIdentityDocumentImage (
  id: MaybeRefOrGetter<string | null>,
  side: MaybeRefOrGetter<IdentityDocumentSide> = 'front',
) {
  const src = ref('')
  const state = ref<DocumentImageState>('loading')
  let objectUrl: string | null = null
  let latest = 0

  function release () {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
    src.value = ''
  }

  async function load () {
    const documentId = toValue(id)
    const attempt = ++latest
    release()
    if (!documentId) {
      state.value = 'deleted'
      return
    }
    state.value = 'loading'
    try {
      const blob = await identityDocumentService.getIdentityDocumentImage(documentId, toValue(side))
      if (attempt !== latest) {
        return
      }
      objectUrl = URL.createObjectURL(blob)
      src.value = objectUrl
      state.value = 'loaded'
    } catch (error) {
      if (attempt === latest) {
        state.value = errorCodeOf(error) === 'gone' ? 'deleted' : 'error'
      }
    }
  }

  watch(() => [toValue(id), toValue(side)], load, { immediate: true })
  onScopeDispose(() => {
    latest++
    release()
  })

  return { src, state, reload: load }
}
