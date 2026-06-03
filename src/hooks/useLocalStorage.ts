'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, string | null] {
  const [storedValue, setStoredValue] = useState<T>(() => readStorage(key, initialValue))
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try { setStoredValue(JSON.parse(e.newValue) as T) } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        writeStorage(key, next)
        setLastSaved(new Date().toISOString())
      }, 300)
      return next
    })
  }, [key])

  return [storedValue, setValue, lastSaved]
}
