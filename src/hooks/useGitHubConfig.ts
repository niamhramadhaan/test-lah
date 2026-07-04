'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'qa-github-config'

export type GitHubAuthMethod = 'device' | 'pat'

export interface GitHubConfig {
  authMethod: GitHubAuthMethod | null
  token: string
  connected: boolean
  login: string | null
  connectedAt: string | null
}

function buildDefaultConfig(): GitHubConfig {
  return { authMethod: null, token: '', connected: false, login: null, connectedAt: null }
}

function readConfig(): GitHubConfig {
  if (typeof window === 'undefined') return buildDefaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultConfig()
    const parsed = JSON.parse(raw)
    return { ...buildDefaultConfig(), ...parsed }
  } catch {
    return buildDefaultConfig()
  }
}

function writeConfig(config: GitHubConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function useGitHubConfig() {
  const [config, setConfig] = useState<GitHubConfig>(buildDefaultConfig)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setConfig(readConfig())
    setLoaded(true)
  }, [])

  const updateConfig = useCallback((patch: Partial<GitHubConfig>) => {
    const next = { ...readConfig(), ...patch }
    writeConfig(next)
    setConfig(next)
  }, [])

  const disconnect = useCallback(() => {
    const next = buildDefaultConfig()
    writeConfig(next)
    setConfig(next)
  }, [])

  return {
    config,
    loaded,
    isConnected: loaded && config.connected && !!config.token,
    updateConfig,
    disconnect,
  }
}
