import { QueryClient, environmentManager } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

// Server: always make a new query client per request. Browser: reuse a
// single instance so React discarding a suspended initial render doesn't
// orphan an in-progress query cache.
export function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
