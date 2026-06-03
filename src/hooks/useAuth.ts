'use client'

import { useState, useCallback, useEffect } from 'react'

const AUTH_KEY = 'qa-auth'

interface AuthState {
  name: string
  isLoggedIn: boolean
}

function readAuth(): AuthState {
  if (typeof window === 'undefined') return { name: '', isLoggedIn: false }
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (!raw) return { name: '', isLoggedIn: false }
    return JSON.parse(raw) as AuthState
  } catch {
    return { name: '', isLoggedIn: false }
  }
}

function writeAuth(state: AuthState) {
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(state))
  } catch {}
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ name: '', isLoggedIn: false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setAuth(readAuth())
    setLoaded(true)
  }, [])

  const login = useCallback((name: string) => {
    const state = { name, isLoggedIn: true }
    writeAuth(state)
    setAuth(state)
  }, [])

  const logout = useCallback(() => {
    const state = { name: '', isLoggedIn: false }
    writeAuth(state)
    setAuth(state)
  }, [])

  return { ...auth, loaded, login, logout }
}
