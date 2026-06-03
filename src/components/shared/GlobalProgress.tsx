'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

interface ProgressContextType {
  startProgress: (message?: string) => void
  updateProgress: (value: number, message?: string) => void
  completeProgress: (message?: string) => void
  cancelProgress: () => void
  isProgressing: boolean
}

const ProgressContext = createContext<ProgressContextType | null>(null)

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider')
  }
  return context
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
  }, [])

  const hideBar = useCallback(() => {
    setIsVisible(false)
    setProgress(0)
    setMessage('')
  }, [])

  const startProgress = useCallback((msg?: string) => {
    clearAllTimers()
    setProgress(0)
    setMessage(msg || '')
    setIsVisible(true)

    // Auto-increment progress slowly
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 300)

    // Safety timeout: auto-hide after 8 seconds if stuck
    safetyTimeoutRef.current = setTimeout(() => {
      hideBar()
    }, 8000)
  }, [clearAllTimers, hideBar])

  const updateProgress = useCallback((value: number, msg?: string) => {
    setProgress(Math.min(95, value))
    if (msg) setMessage(msg)
  }, [])

  const completeProgress = useCallback((msg?: string) => {
    clearAllTimers()
    setProgress(100)
    if (msg) setMessage(msg)

    // Hide after animation completes
    setTimeout(() => {
      hideBar()
    }, 500)
  }, [clearAllTimers, hideBar])

  const cancelProgress = useCallback(() => {
    clearAllTimers()
    hideBar()
  }, [clearAllTimers, hideBar])

  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  return (
    <ProgressContext.Provider value={{ startProgress, updateProgress, completeProgress, cancelProgress, isProgressing: isVisible }}>
      {children}
      {/* Global Progress Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[600] transition-all duration-300 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {/* Progress bar track */}
        <div className="h-1 w-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div
            className="h-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? 'var(--status-pass-text)' : 'var(--accent)',
              boxShadow: progress >= 100 ? '0 0 10px var(--status-pass-text)' : 'none',
            }}
          />
        </div>
        {/* Message */}
        {message && (
          <div
            className="flex items-center justify-center py-2 px-4 text-xs font-medium cursor-pointer"
            onClick={cancelProgress}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: progress >= 100 ? 'var(--status-pass-text)' : 'var(--text-secondary)',
              borderTop: '1px solid var(--border)',
            }}
          >
            {progress >= 100 && (
              <svg className="mr-2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--status-pass-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {message}
          </div>
        )}
      </div>
    </ProgressContext.Provider>
  )
}

// Hook for common progress operations
export function useProgressActions() {
  const { startProgress, updateProgress, completeProgress } = useProgress()

  const withProgress = useCallback(async <T,>(
    action: () => Promise<T>,
    options?: {
      startMessage?: string
      completeMessage?: string
      duration?: number
    }
  ): Promise<T> => {
    startProgress(options?.startMessage || 'Processing...')
    try {
      const result = await action()
      completeProgress(options?.completeMessage || 'Done!')
      return result
    } catch (error) {
      completeProgress('Failed!')
      throw error
    }
  }, [startProgress, completeProgress])

  return { withProgress, startProgress, updateProgress, completeProgress }
}
