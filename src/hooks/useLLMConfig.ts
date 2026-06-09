'use client'

import { useState, useCallback, useEffect } from 'react'
import { PROVIDER_LIST, type ProviderDef } from '@/lib/llm/providers'

const STORAGE_KEY = 'qa-llm-config'

// All provider IDs derived from the registry
export type LLMProviderId = string

export interface LLMProvider {
  apiKey: string
  baseURL: string
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
  baseURL: '',
  defaultModel: '',
  secondaryModel: '',
  models: [],
  connected: false,
}

function buildDefaultConfig(): LLMConfig {
  const providers: Record<string, LLMProvider> = {}
  for (const def of PROVIDER_LIST) {
    providers[def.id] = {
      ...EMPTY_PROVIDER,
      baseURL: def.baseURL || '',
    }
  }
  return { activeProvider: null, providers }
}

function readConfig(): LLMConfig {
  if (typeof window === 'undefined') return buildDefaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultConfig()
    const parsed = JSON.parse(raw)

    // Backward compat: old format { provider: 'gemini', apiKey: string }
    if (parsed.provider && parsed.apiKey && !parsed.providers) {
      const defaults = buildDefaultConfig()
      return {
        ...defaults,
        activeProvider: null,
        providers: {
          ...defaults.providers,
          google: { ...EMPTY_PROVIDER, apiKey: parsed.apiKey, connected: true },
        },
      }
    }

    // Merge with defaults to handle missing fields / new providers
    const defaults = buildDefaultConfig()
    const merged: LLMConfig = {
      ...defaults,
      ...parsed,
      providers: { ...defaults.providers },
    }

    // Merge each known provider with saved data
    for (const def of PROVIDER_LIST) {
      const saved = parsed.providers?.[def.id]
      merged.providers[def.id] = {
        ...EMPTY_PROVIDER,
        baseURL: def.baseURL || '',
        ...saved,
      }
    }

    return merged
  } catch {
    return buildDefaultConfig()
  }
}

function writeConfig(config: LLMConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function useLLMConfig() {
  const [config, setConfig] = useState<LLMConfig>(buildDefaultConfig)
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
