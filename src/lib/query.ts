import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // a week — the point is a cold offline open still shows data
      retry: 1,
      // Every mutation here writes to the cache optimistically and syncs in
      // the background rather than through React Query's own mutation
      // lifecycle — so an automatic refetch (tab refocus, reconnecting,
      // remounting a page) can win a race against a write that hasn't
      // reached Supabase yet and silently overwrite it with stale data. That
      // showed up as classes in Schedule losing their name or disappearing
      // while being entered quickly. The cache is meant to be the source of
      // truth between reloads (see the hook files' own comments); a full
      // reload still fetches fresh, this just stops mid-session refetches
      // from stomping on writes still in flight.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
})

// A tiny idb-keyval-backed persister. Not using the official IndexedDB
// persister package to keep the dependency list small; this covers exactly
// what Orbit needs (one blob, get/set/remove).
const persister = {
  persistClient: async (client: unknown) => {
    await set('orbit-query-cache', client)
  },
  restoreClient: async () => {
    return get('orbit-query-cache')
  },
  removeClient: async () => {
    await del('orbit-query-cache')
  },
}

export function setupPersistence() {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
}
