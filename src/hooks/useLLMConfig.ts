'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'qa-llm-config'

export type LLMProviderId = 'gemini' | 'openai' | 'deepseek'

export interface LLMProvider {
  apiKey: string
  defaultModel: string
  secondaryModel: string
  models: string[]
  connected: boolean
}

export interface LLMConfig {
  activeProvider: LLMProviderId | null
  providers: Record<LLMProviderId, LLMProvider>
}

const EMPTY_PROVIDER: LLMProvider = {
  apiKey: '',
  defaultModel: '',
  secondaryModel: '',
  models: [],
  connected: false,
}

const DEFAULT_CONFIG: LLMConfig = {
  activeProvider: null,
  providers: {
    gemini: { ...EMPTY_PROVIDER },
    openai: { ...EMPTY_PROVIDER },
    deepseek: { ...EMPTY_PROVIDER },
  },
}

function readConfig(): LLMConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    // Backward compat: old format { provider: 'gemini', apiKey: string }
    if (parsed.provider && parsed.apiKey && !parsed.providers) {
      return {
        ...DEFAULT_CONFIG,
        activeProvider: null,
        providers: {
          ...DEFAULT_CONFIG.providers,
          gemini: { ...EMPTY_PROVIDER, apiKey: parsed.apiKey, connected: true },
        },
      }
    }
    // Merge with defaults to handle missing fields
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      providers: {
        gemini: { ...EMPTY_PROVIDER, ...parsed.providers?.gemini },
        openai: { ...EMPTY_PROVIDER, ...parsed.providers?.openai },
        deepseek: { ...EMPTY_PROVIDER, ...parsed.providers?.deepseek },
      },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

function writeConfig(config: LLMConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function useLLMConfig() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setConfig(readConfig())
    setLoaded(true)
  }, [])

  const updateProvider = useCallback((providerId: LLMProviderId, patch: Partial<LLMProvider>) => {
    const current = readConfig()
    const next: LLMConfig = {
      ...current,
      providers: {
        ...current.providers,
        [providerId]: { ...current.providers[providerId], ...patch },
      },
    }
    writeConfig(next)
    setConfig(next)
  }, [])

  const setActiveProvider = useCallback((providerId: LLMProviderId) => {
    const current = readConfig()
    const next: LLMConfig = { ...current, activeProvider: providerId }
    writeConfig(next)
    setConfig(next)
  }, [])

  const activeProvider = config.activeProvider ? config.providers[config.activeProvider] : null
  const isConnected = loaded && !!activeProvider && activeProvider.apiKey.length > 0 && activeProvider.connected

  return {
    config,
    loaded,
    isConnected,
    activeProvider,
    activeProviderId: config.activeProvider,
    updateProvider,
    setActiveProvider,
  }
}
