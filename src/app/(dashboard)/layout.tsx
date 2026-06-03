'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardProvider, useDashboard } from '@/context/DashboardContext'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { useAuth } from '@/hooks/useAuth'
import { DialogRenderer } from '@/components/shared/Dialog'

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoggedIn, loaded } = useAuth()

  useEffect(() => {
    if (loaded && !isLoggedIn) {
      router.replace('/login')
    }
  }, [loaded, isLoggedIn, router])

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) return null

  return <>{children}</>
}

function KeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useDashboard()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo) redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo) redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, canUndo, canRedo])

  return null
}

function DialogProvider({ children }: { children: React.ReactNode }) {
  const { dialog } = useDashboard()
  return (
    <>
      {children}
      <DialogRenderer dialog={dialog} />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <DashboardProvider>
        <DialogProvider>
          <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <KeyboardShortcuts />
            <DashboardHeader />
            <div className="flex-1 min-h-0">
              {children}
            </div>
          </div>
        </DialogProvider>
      </DashboardProvider>
    </AuthGate>
  )
}
