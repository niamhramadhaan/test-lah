'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success'
}

let toastCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { id, title, description, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

export function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto w-72 p-3 rounded-lg border shadow-lg animate-slide-in"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: t.variant === 'success' ? 'var(--status-pass-text)' : 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'toastSlideIn 300ms ease-out',
          }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: t.variant === 'success' ? 'var(--status-pass-bg)' : 'var(--bg-secondary)',
              }}
            >
              {t.variant === 'success' ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="var(--status-pass-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4" stroke="var(--text-tertiary)" strokeWidth="1.2" fill="none" />
                  <path d="M6 4v3M6 8.5v0" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
              {t.description && (
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.description}</div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[10px] flex-shrink-0 opacity-50 hover:opacity-100"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
