'use client'

import { useState, useCallback } from 'react'
import { TestCase, Status } from '@/types'
import { E2ETestResult } from '@/lib/e2e-agent'

interface E2ETestRunnerProps {
  testCases: TestCase[]
  projectId: string
  onUpdateTestCase: (tcId: string, patch: Partial<TestCase>) => void
  onClose: () => void
}

interface TestRunState {
  status: 'idle' | 'running' | 'completed' | 'error'
  currentTest: string | null
  results: E2ETestResult[]
  progress: number
}

export function E2ETestRunner({ 
  testCases, 
  projectId, 
  onUpdateTestCase, 
  onClose 
}: E2ETestRunnerProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000')
  const [headless, setHeadless] = useState(true)
  const [timeout, setTimeout] = useState(30000)
  const [state, setState] = useState<TestRunState>({
    status: 'idle',
    currentTest: null,
    results: [],
    progress: 0,
  })

  const [selectedTests, setSelectedTests] = useState<Set<string>>(
    new Set(testCases.map(tc => tc.id))
  )

  const toggleTest = useCallback((id: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedTests.size === testCases.length) {
      setSelectedTests(new Set())
    } else {
      setSelectedTests(new Set(testCases.map(tc => tc.id)))
    }
  }, [testCases, selectedTests])

  const runTests = useCallback(async () => {
    const testsToRun = testCases.filter(tc => selectedTests.has(tc.id))
    if (testsToRun.length === 0) return

    // Get LLM config from localStorage
    const configStr = localStorage.getItem('qa-llm-config')
    if (!configStr) {
      alert('Please configure LLM in Integrations page first')
      return
    }
    const llmConfig = JSON.parse(configStr)

    setState({
      status: 'running',
      currentTest: testsToRun[0].id,
      results: [],
      progress: 0,
    })

    try {
      const response = await fetch('/api/e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: testsToRun,
          baseUrl,
          headless,
          timeout,
          llmConfig,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to run tests')
      }

      const { results } = await response.json()

      // Update test case statuses based on results
      for (const result of results) {
        const statusMap: Record<string, Status> = {
          pass: 'pass',
          fail: 'fail',
          skip: 'skip',
          error: 'fail',
        }

        onUpdateTestCase(result.testCaseId, {
          status: statusMap[result.status] || 'untested',
          notes: result.aiAnalysis 
            ? `AI Analysis:\n${result.aiAnalysis}\n\nError: ${result.error || 'None'}`
            : result.error 
              ? `Error: ${result.error}` 
              : '',
        })
      }

      setState({
        status: 'completed',
        currentTest: null,
        results,
        progress: 100,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }, [testCases, selectedTests, baseUrl, headless, timeout, onUpdateTestCase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓'
      case 'fail': return '✗'
      case 'skip': return '⊘'
      case 'error': return '⚠'
      default: return '○'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'var(--status-pass-text)'
      case 'fail': return 'var(--status-fail-text)'
      case 'skip': return 'var(--status-skip-text)'
      case 'error': return 'var(--status-fail-text)'
      default: return 'var(--text-tertiary)'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-3xl max-h-[80vh] rounded-lg shadow-xl flex flex-col"
        style={{ 
          backgroundColor: 'var(--bg-primary)', 
          border: '1px solid var(--border)' 
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              E2E Agentic Test Runner
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              AI-powered end-to-end testing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Configuration */}
          <div 
            className="p-3 rounded-lg space-y-3"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Configuration
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="http://localhost:3000"
                />
              </div>
              
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={timeout}
                  onChange={e => setTimeout(Number(e.target.value))}
                  className="w-full text-sm px-2 py-1.5 rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={headless}
                onChange={e => setHeadless(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span style={{ color: 'var(--text-secondary)' }}>Run headless</span>
            </label>
          </div>

          {/* Test Case Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Test Cases ({selectedTests.size}/{testCases.length})
              </h3>
              <button
                onClick={toggleAll}
                className="text-xs underline"
                style={{ color: 'var(--accent)' }}
              >
                {selectedTests.size === testCases.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div 
              className="max-h-[200px] overflow-auto rounded-lg"
              style={{ border: '1px solid var(--border)' }}
            >
              {testCases.map(tc => {
                const result = state.results.find(r => r.testCaseId === tc.id)
                return (
                  <label
                    key={tc.id}
                    className="flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0 hover:opacity-80 cursor-pointer"
                    style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: selectedTests.has(tc.id) ? 'var(--bg-secondary)' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTests.has(tc.id)}
                      onChange={() => toggleTest(tc.id)}
                      disabled={state.status === 'running'}
                      className="accent-[var(--accent)]"
                    />
                    <span className="flex-1" style={{ color: 'var(--text-primary)' }}>
                      {tc.code}: {tc.title}
                    </span>
                    {result && (
                      <span style={{ color: getStatusColor(result.status) }}>
                        {getStatusIcon(result.status)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Results */}
          {state.results.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Results
              </h3>
              
              <div className="space-y-2">
                {state.results.map((result, idx) => {
                  const testCase = testCases.find(tc => tc.id === result.testCaseId)
                  if (!testCase) return null
                  
                  return (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{ 
                        backgroundColor: result.status === 'pass' 
                          ? 'var(--status-pass-bg)' 
                          : 'var(--status-fail-bg)',
                        border: `1px solid ${result.status === 'pass' 
                          ? 'var(--status-pass-border)' 
                          : 'var(--status-fail-border)'}`
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="font-medium"
                          style={{ color: getStatusColor(result.status) }}
                        >
                          {getStatusIcon(result.status)}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {testCase.code}: {testCase.title}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                          {result.duration}ms
                        </span>
                      </div>
                      
                      {result.error && (
                        <div className="text-xs mb-2 p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}
                      
                      {result.aiAnalysis && (
                        <div className="text-xs p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                          <strong>AI Analysis:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">{result.aiAnalysis}</pre>
                        </div>
                      )}
                      
                      {result.steps.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                            Step Details ({result.steps.length})
                          </summary>
                          <div className="mt-1 space-y-1">
                            {result.steps.map((step, stepIdx) => (
                              <div key={stepIdx} className="text-xs flex items-start gap-2">
                                <span style={{ color: getStatusColor(step.status) }}>
                                  {getStatusIcon(step.status)}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {step.step}
                                </span>
                                {step.error && (
                                  <span style={{ color: 'var(--status-fail-text)' }}>
                                    - {step.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Summary */}
              <div 
                className="mt-3 p-3 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)' 
                }}
              >
                <div className="flex gap-4 text-sm">
                  <span style={{ color: 'var(--status-pass-text)' }}>
                    ✓ Pass: {state.results.filter(r => r.status === 'pass').length}
                  </span>
                  <span style={{ color: 'var(--status-fail-text)' }}>
                    ✗ Fail: {state.results.filter(r => r.status === 'fail').length}
                  </span>
                  <span style={{ color: 'var(--status-fail-text)' }}>
                    ⚠ Error: {state.results.filter(r => r.status === 'error').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {state.status === 'running' && (
              <span>Running test {state.progress + 1} of {selectedTests.size}...</span>
            )}
            {state.status === 'completed' && (
              <span>Completed {state.results.length} tests</span>
            )}
            {state.status === 'error' && (
              <span style={{ color: 'var(--status-fail-text)' }}>Error occurred</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded"
              style={{ 
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)'
              }}
            >
              Close
            </button>
            
            <button
              onClick={runTests}
              disabled={state.status === 'running' || selectedTests.size === 0}
              className="px-4 py-2 text-sm rounded disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
            >
              {state.status === 'running' ? 'Running...' : 'Run Tests'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
