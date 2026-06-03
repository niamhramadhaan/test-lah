'use client'

import { useState, useEffect, useCallback } from 'react'
import { FlowNode } from '@/types'
import { generateTestCases, GeneratedTestCase } from '@/lib/llm'
import { useLLMConfig } from '@/hooks/useLLMConfig'

interface GenerateTestModalProps {
  open: boolean
  onClose: () => void
  node: FlowNode
  onGenerate: (cases: GeneratedTestCase[]) => void
}

const SUGGESTIONS = [
  'User can log in with valid credentials',
  'Invalid input shows validation error',
  'Form submits successfully and redirects',
  'Edge case: empty required fields',
]

const CAT_FACTS = [
  'While you wait... have this cute cat!',
  'Hang tight! Here\'s a furry friend.',
  'Generating... enjoy this kitty!',
  'Almost there! Cat says hi.',
  'Test cases incoming... meow!',
]

export function GenerateTestModal({ open, onClose, node, onGenerate }: GenerateTestModalProps) {
  const { isConnected, activeProvider, activeProviderId } = useLLMConfig()
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState<'en' | 'id'>('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [catUrl, setCatUrl] = useState('')
  const [catFact, setCatFact] = useState(CAT_FACTS[0])
  const [catIndex, setCatIndex] = useState(0)

  const refreshCat = useCallback(async () => {
    try {
      const res = await fetch('https://api.thecatapi.com/v1/images/search?size=med')
      const data = await res.json()
      if (data?.[0]?.url) {
        setCatUrl(data[0].url)
      }
    } catch {
      setCatUrl('')
    }
    setCatFact(CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)])
  }, [])

  useEffect(() => {
    if (open) {
      setTitle(node.label)
      setPrompt('')
      setError(null)
      setLoading(false)
      setCatUrl('')
      setCatIndex(0)
    }
  }, [open, node.label])

  useEffect(() => {
    if (!loading) return
    refreshCat()
    const interval = setInterval(() => {
      setCatIndex(prev => prev + 1)
      refreshCat()
    }, 2000)
    return () => clearInterval(interval)
  }, [loading, refreshCat])

  const handleGenerate = async () => {
    if (!isConnected) {
      setError('Please configure an AI provider in Integrations first.')
      return
    }
    if (!prompt.trim()) {
      setError('Please describe the feature or paste a ticket description.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cases = await generateTestCases(title, prompt, activeProvider.apiKey, activeProviderId, activeProvider.defaultModel, language)
      onGenerate(cases)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="flex rounded-xl overflow-hidden"
        style={{
          maxWidth: loading ? '720px' : '512px',
          width: '100%',
          margin: '0 16px',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          transition: 'max-width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Main form */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '512px' }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8D6E63, #A1887F)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Generate Test Cases
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Describe the feature and let AI generate test cases for &ldquo;{node.label}&rdquo;
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Title + Language row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Test Case Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none border transition-colors focus:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  placeholder="Feature name..."
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Language
                </label>
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setLanguage('en')}
                    className="px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: language === 'en' ? 'var(--accent)' : 'transparent',
                      color: language === 'en' ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('id')}
                    className="px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: language === 'id' ? 'var(--accent)' : 'transparent',
                      color: language === 'id' ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    ID
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description / DoD / Ticket
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none border resize-none transition-colors focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                placeholder={language === 'id' ? 'Jelaskan fitur, kriteria penerimaan, atau tempel tiket...' : 'Describe the feature, acceptance criteria, or paste a ticket...'}
              />
              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setPrompt(prev => prev ? `${prev}\n${s}` : s)}
                    className="px-2 py-0.5 text-[10px] rounded-full border transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
                {error}
              </div>
            )}

            {/* API Key hint */}
            {!isConnected && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-skip-bg)', color: 'var(--status-skip-text)' }}>
                No AI provider configured. Go to Integrations to set up.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !isConnected}
              className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #8D6E63, #A1887F)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(141,110,99,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30 70" />
                  </svg>
                  Generating...
                </span>
              ) : 'Generate Test Cases'}
            </button>
          </div>
        </div>

        {/* Cat loading panel — slides in from the right */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: loading ? '280px' : '0px',
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="w-[280px] h-full flex flex-col items-center justify-center p-5 border-l"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              opacity: loading ? 1 : 0,
              transition: 'opacity 300ms ease-out 100ms',
            }}
          >
            {/* Cat image */}
            <div
              className="w-full rounded-xl overflow-hidden mb-4 border"
              style={{
                borderColor: 'var(--border)',
                height: 180,
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {catUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={catIndex}
                  src={catUrl}
                  alt="Cute cat"
                  width={280}
                  height={180}
                  className="w-full h-full object-cover"
                  style={{ animation: 'fadeIn 800ms ease-out' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>

            {/* Fun text */}
            <p
              className="text-xs text-center mb-3"
              style={{ color: 'var(--text-secondary)', animation: 'fadeIn 800ms ease-out' }}
            >
              {catFact}
            </p>

            {/* Refresh button */}
            <button
              onClick={refreshCat}
              className="px-3 py-1.5 text-[10px] rounded-full border transition-colors hover:bg-[var(--bg-card)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            >
              New cat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
