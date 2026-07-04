'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/queryClient'
import { ProgressProvider } from '@/components/shared/GlobalProgress'

export function Providers({ children }: { children: React.ReactNode }) {
  // Do not use useState to create this — see src/lib/queryClient.ts for why.
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ProgressProvider>
        {children}
      </ProgressProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
