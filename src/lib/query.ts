import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7, // a week — the point is a cold offline open still shows data
      retry: 1,
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
