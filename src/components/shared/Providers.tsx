'use client'

import { ProgressProvider } from '@/components/shared/GlobalProgress'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider>
      {children}
    </ProgressProvider>
  )
}
