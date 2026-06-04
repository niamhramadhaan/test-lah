'use client'

import { useState, useEffect } from 'react'
import { GridPattern } from '@/components/ui/grid-pattern'
import { useLLMConfig, type LLMProviderId, type LLMProvider } from '@/hooks/useLLMConfig'

interface ProviderInfo {
  id: LLMProviderId
  name: string
  description: string
  logoUrl: string
  keyUrl: string
  keyPlaceholder: string
  color: string
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI with strong reasoning capabilities.',
    logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza...',
    color: '#4285F4',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models powering ChatGPT. Industry-leading language understanding.',
    logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
    color: '#10A37F',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'High-performance open-source models with competitive reasoning.',
    logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/deepseek.svg',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
    color: '#4D6BFE',
  },
]

export default function IntegrationsPage() {
  const { activeProviderId } = useLLMConfig()
  const [expandedId, setExpandedId] = useState<LLMProviderId | null>(activeProviderId)

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
          {PROVIDERS.map(info => (
            <ProviderAccordion
              key={info.id}
              info={info}
              expanded={expandedId === info.id}
              onToggle={() => setExpandedId(prev => prev === info.id ? null : info.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProviderAccordion({ info, expanded, onToggle }: { info: ProviderInfo; expanded: boolean; onToggle: () => void }) {
  const { config, activeProviderId, updateProvider, setActiveProvider } = useLLMConfig()
  const provider = config.providers[info.id]
  const isActive = activeProviderId === info.id

  const [editingKey, setEditingKey] = useState(false)
  const [keyValue, setKeyValue] = useState(provider.apiKey)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [testedKey, setTestedKey] = useState<string | null>(null)

  useEffect(() => {
    if (expanded && !provider.connected && !editingKey) {
      setKeyValue(provider.apiKey)
    }
  }, [expanded]) // eslint-disable-line react-hooks/exhaustive-deps

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
        body: JSON.stringify({ provider: info.id, apiKey: key }),
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

    // Fetch models if we don't have them
    let models = provider.models
    if (models.length === 0) {
      try {
        const res = await fetch('/api/llm/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: info.id, apiKey: key }),
        })
        const data = await res.json()
        if (data.ok && data.models) models = data.models
      } catch {}
    }

    updateProvider(info.id, {
      apiKey: key,
      connected: true,
      models,
      defaultModel: provider.defaultModel || models[0] || '',
      secondaryModel: provider.secondaryModel || models[1] || '',
    })
    setEditingKey(false)
    setTestResult(null)
    setTestedKey(null)
  }

  const handleDisconnect = () => {
    updateProvider(info.id, {
      apiKey: '',
      connected: false,
      models: [],
      defaultModel: '',
      secondaryModel: '',
    })
    setKeyValue('')
    setEditingKey(false)
    setTestResult(null)
  }

  const handleModelChange = (field: 'defaultModel' | 'secondaryModel', value: string) => {
    updateProvider(info.id, { [field]: value })
  }

  return (
    <div
      className="rounded-xl border transition-all overflow-hidden"
      style={{
        borderColor: isActive ? info.color : expanded ? 'var(--border-hover)' : 'var(--border)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: isActive ? `0 0 0 1px ${info.color}20` : undefined,
      }}
    >
      {/* Accordion Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ backgroundColor: `${info.color}10` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={info.logoUrl}
            alt={info.name}
            width={24}
            height={24}
            className="opacity-80"
            style={{ filter: 'brightness(0.5)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{info.name}</span>
            {isActive && provider.connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${info.color}15`, color: info.color }}>
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
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{info.description}</p>
        </div>
        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Accordion Body — collapsible */}
      <div
        style={{
          maxHeight: expanded ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 250ms ease-out',
        }}
      >
        <div className="px-5 pb-5 pt-1 space-y-3">
          {/* API Key Section */}
          {editingKey || !provider.connected ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyValue}
                  onChange={e => { setKeyValue(e.target.value); setTestedKey(null); setTestResult(null) }}
                  placeholder={info.keyPlaceholder}
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
                  style={{ backgroundColor: info.color, color: '#fff' }}
                >
                  Connect
                </button>
                {editingKey && (
                  <button
                    onClick={() => { setEditingKey(false); setKeyValue(provider.apiKey); setTestedKey(null); setTestResult(null) }}
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

              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                Get your key at{' '}
                <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" style={{ color: info.color, textDecoration: 'underline' }}>
                  {info.keyUrl.replace('https://', '').split('/')[0]}
                </a>
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setKeyValue(provider.apiKey); setEditingKey(true) }}
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
                  onClick={() => setActiveProvider(info.id)}
                  className="px-3 py-2 text-xs font-medium rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: info.color, color: '#fff' }}
                >
                  Set Active
                </button>
              )}
            </div>
          )}

          {/* Model Selection */}
          {provider.connected && provider.models.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Default Model
                  </label>
                  <select
                    value={provider.defaultModel}
                    onChange={e => handleModelChange('defaultModel', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    {provider.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Fallback Model
                  </label>
                  <select
                    value={provider.secondaryModel}
                    onChange={e => handleModelChange('secondaryModel', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">None</option>
                    {provider.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              {isActive && (
                <div className="mt-2 text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
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
