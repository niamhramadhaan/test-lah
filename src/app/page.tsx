'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { seedMockProject } from '@/lib/mockData'

export default function Home() {
  const router = useRouter()
  const { isLoggedIn, loaded } = useAuth()

  useEffect(() => {
    seedMockProject()
  }, [])

  useEffect(() => {
    if (!loaded) return
    router.replace(isLoggedIn ? '/projects' : '/login')
  }, [loaded, isLoggedIn, router])

  return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
    </div>
  )
}
