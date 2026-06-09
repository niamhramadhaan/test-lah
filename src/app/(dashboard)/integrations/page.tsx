'use client'

import { useState, useEffect } from 'react'
import { GridPattern } from '@/components/ui/grid-pattern'
import { useLLMConfig, type LLMProvider } from '@/hooks/useLLMConfig'
import { PROVIDER_LIST, type ProviderDef } from '@/lib/llm/providers'

export default function IntegrationsPage() {
  const { activeProviderId } = useLLMConfig()
  const [expandedId, setExpandedId] = useState<string | null>(activeProviderId)

  useEffect(() => {
    if (!expandedId) setExpandedId(activeProviderId)
  }, [activeProviderId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GridPattern width={40} height={40} x={-1} y={-1} className="opacity-20" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--bg-primary) 0%, transparent 20%, transparent 80%, var(--bg-primary) 100%)' }} />
      </div>

      <div className="relative p-6 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Integrations</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Connect an AI provider to enable test case generation.
          </p>
        </div>

        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>AI Providers</h3>
        <div className="space-y-3">
          {PROVIDER_LIST.map(def => (
            <ProviderAccordion
              key={def.id}
              def={def}
              expanded={expandedId === def.id}
              onToggle={() => setExpandedId(prev => prev === def.id ? null : def.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProviderAccordion({ def, expanded, onToggle }: { def: ProviderDef; expanded: boolean; onToggle: () => void }) {
  const { config, activeProviderId, updateProvider, setActiveProvider } = useLLMConfig()
  const provider = config.providers[def.id]
  const isActive = activeProviderId === def.id

  const [editingKey, setEditingKey] = useState(false)
  const [keyValue, setKeyValue] = useState(provider?.apiKey || '')
  const [baseURLValue, setBaseURLValue] = useState(provider?.baseURL || def.baseURL || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [testedKey, setTestedKey] = useState<string | null>(null)

  useEffect(() => {
    if (expanded && provider && !provider.connected && !editingKey) {
      setKeyValue(provider.apiKey)
      setBaseURLValue(provider.baseURL || def.baseURL || '')
    }
  }, [expanded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-migrate: encrypt plaintext keys on first load
  useEffect(() => {
    if (provider?.connected && provider.apiKey && !provider.apiKey.startsWith('enc:')) {
      fetch('/api/llm/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: provider.apiKey }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.encrypted) {
            updateProvider(def.id, { apiKey: data.encrypted })
          }
        })
        .catch(() => {}) // silent fail — old key still works
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = async () => {
    const key = keyValue.trim()
    if (!key) return

    setTesting(true)
    setTestResult(null)
    setTestedKey(null)

    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: def.id, apiKey: key, baseURL: baseURLValue.trim() || undefined }),
      })
      const data = await res.json()
      setTestResult(data)

      if (data.ok) {
        setTestedKey(key)
      }
    } catch {
      setTestResult({ ok: false, error: 'Network error' })
    } finally {
      setTesting(false)
    }
  }

  const handleConnect = async () => {
    const key = testedKey || keyValue.trim()
    if (!key) return

    // If not tested yet, test first
    if (!testedKey) {
      await handleTest()
      return
    }

    // Encrypt the key before storing
    let encryptedKey = key
    try {
      const res = await fetch('/api/llm/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: key }),
      })
      const data = await res.json()
      if (data.encrypted) {
        encryptedKey = data.encrypted
      }
    } catch {
      // If encryption fails, store plaintext (server decrypt handles both)
    }

    updateProvider(def.id, {
      apiKey: encryptedKey,
      baseURL: baseURLValue.trim() || def.baseURL || '',
      connected: true,
      models: def.popularModels,
      defaultModel: provider?.defaultModel || def.defaultModel || def.popularModels[0] || '',
      secondaryModel: provider?.secondaryModel || '',
    })
    setEditingKey(false)
    setTestResult(null)
    setTestedKey(null)
  }

  const handleDisconnect = () => {
    updateProvider(def.id, {
      apiKey: '',
      connected: false,
      models: [],
      defaultModel: '',
      secondaryModel: '',
    })
    setKeyValue('')
    setBaseURLValue(def.baseURL || '')
    setEditingKey(false)
    setTestResult(null)
  }

  const handleModelChange = (field: 'defaultModel' | 'secondaryModel', value: string) => {
    updateProvider(def.id, { [field]: value })
  }

  if (!provider) return null

  const accentColor = def.color || '#6B7280'

  return (
    <div
      className="rounded-xl border transition-all overflow-hidden"
      style={{
        borderColor: isActive ? accentColor : expanded ? 'var(--border-hover)' : 'var(--border)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: isActive ? `0 0 0 1px ${accentColor}20` : undefined,
      }}
    >
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          {def.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={def.logoUrl}
              alt={def.name}
              width={24}
              height={24}
              className="opacity-80"
              style={{ filter: 'brightness(0.5)' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-xs font-bold" style={{ color: accentColor }}>API</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{def.name}</span>
            {isActive && provider.connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                Active
              </span>
            )}
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: provider.connected ? 'var(--status-pass-bg)' : 'var(--bg-secondary)',
                color: provider.connected ? 'var(--status-pass-text)' : 'var(--text-tertiary)',
              }}
            >
              {provider.connected ? 'Connected' : 'Not configured'}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{def.description}</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Accordion Body */}
      <div
        style={{
          maxHeight: expanded ? '600px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 250ms ease-out',
        }}
      >
        <div className="px-5 pb-5 pt-1 space-y-3">
          {/* API Key Section */}
          {editingKey || !provider.connected ? (
            <div className="space-y-2">
              {/* Base URL field for openai-compatible providers that require it */}
              {def.requiresBaseURL && (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={baseURLValue}
                    onChange={e => { setBaseURLValue(e.target.value); setTestedKey(null); setTestResult(null) }}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none border transition-colors focus:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyValue}
                  onChange={e => { setKeyValue(e.target.value); setTestedKey(null); setTestResult(null) }}
                  placeholder={def.keyPlaceholder}
                  className="flex-1 px-3 py-2 text-sm rounded-lg outline-none border transition-colors focus:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleTest() }}
                />
                <button
                  onClick={handleTest}
                  disabled={testing || !keyValue.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-lg border transition-all hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {testing ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="30 70" />
                      </svg>
                      Testing
                    </span>
                  ) : 'Test'}
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!testedKey && !keyValue.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  Connect
                </button>
                {editingKey && (
                  <button
                    onClick={() => { setEditingKey(false); setKeyValue(provider.apiKey); setBaseURLValue(provider.baseURL || def.baseURL || ''); setTestedKey(null); setTestResult(null) }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {testResult && (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: testResult.ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                    color: testResult.ok ? 'var(--status-pass-text)' : 'var(--status-fail-text)',
                  }}
                >
                  {testResult.ok ? 'Connection verified! Click Connect to save.' : `Failed: ${testResult.error}`}
                </div>
              )}

              {def.keyUrl && (
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  Get your key at{' '}
                  <a href={def.keyUrl} target="_blank" rel="noopener noreferrer" style={{ color: accentColor, textDecoration: 'underline' }}>
                    {def.keyUrl.replace('https://', '').split('/')[0]}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setKeyValue(provider.apiKey); setBaseURLValue(provider.baseURL || def.baseURL || ''); setEditingKey(true) }}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Update API Key
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--status-fail-bg)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
              >
                Disconnect
              </button>
              {!isActive && (
                <button
                  onClick={() => setActiveProvider(def.id)}
                  className="px-3 py-2 text-xs font-medium rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  Set Active
                </button>
              )}
            </div>
          )}

          {/* Model Selection */}
          {provider.connected && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Default Model
                  </label>
                  <ModelSelect
                    value={provider.defaultModel}
                    models={provider.models.length > 0 ? provider.models : def.popularModels}
                    onChange={v => handleModelChange('defaultModel', v)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Fallback Model
                  </label>
                  <ModelSelect
                    value={provider.secondaryModel}
                    models={provider.models.length > 0 ? provider.models : def.popularModels}
                    onChange={v => handleModelChange('secondaryModel', v)}
                    allowEmpty
                  />
                </div>
              </div>
              {isActive && (
                <div className="mt-2 text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  Using {provider.defaultModel}{provider.secondaryModel ? ` (fallback: ${provider.secondaryModel})` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModelSelect({
  value,
  models,
  onChange,
  allowEmpty,
}: {
  value: string
  models: string[]
  onChange: (v: string) => void
  allowEmpty?: boolean
}) {
  const [customMode, setCustomMode] = useState(false)
  const isPreset = models.includes(value)
  const showCustom = customMode || (!isPreset && value !== '')

  if (showCustom) {
    return (
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="model-id"
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors focus:border-[var(--accent)]"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
        {models.length > 0 && (
          <button
            onClick={() => { setCustomMode(false); onChange(models[0]) }}
            className="px-2 py-1.5 text-[10px] rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            title="Switch to preset list"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors cursor-pointer"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        {allowEmpty && <option value="">None</option>}
        {models.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <button
        onClick={() => setCustomMode(true)}
        className="px-2 py-1.5 text-[10px] rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
        title="Enter custom model ID"
      >
        ✏️
      </button>
    </div>
  )
}
