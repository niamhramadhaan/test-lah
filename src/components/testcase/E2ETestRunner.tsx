'use client'

import { useState, useCallback, useRef } from 'react'
import { TestCase, Status } from '@/types'
import { E2ETestResult } from '@/lib/e2e-agent'

interface E2ETestRunnerProps {
  testCases: TestCase[]
  projectId: string
  onUpdateTestCase: (tcId: string, patch: Partial<TestCase>) => void
  onClose: () => void
}

interface LogEntry {
  time: Date
  type: 'info' | 'ai' | 'success' | 'error' | 'warning'
  message: string
}

export function E2ETestRunner({ 
  testCases, 
  projectId, 
  onUpdateTestCase, 
  onClose 
}: E2ETestRunnerProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000')
  const [browser, setBrowser] = useState<'chromium' | 'firefox' | 'webkit' | 'edge'>('chromium')
  const [headless, setHeadless] = useState(true)
  const [timeout, setTimeout] = useState(30000)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<E2ETestResult[]>([])
  const [currentTest, setCurrentTest] = useState<{ index: number; title: string } | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const [selectedTests, setSelectedTests] = useState<Set<string>>(
    new Set(testCases.map(tc => tc.id))
  )

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { time: new Date(), type, message }])
    // Auto-scroll to bottom
    window.setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

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
      addLog('error', 'Please configure LLM in Integrations page first')
      return
    }
    const fullConfig = JSON.parse(configStr)
    
    const activeProvider = fullConfig.activeProvider
    if (!activeProvider || !fullConfig.providers?.[activeProvider]) {
      addLog('error', 'Please select an active provider in Integrations page')
      return
    }
    
    const providerConfig = fullConfig.providers[activeProvider]
    if (!providerConfig.apiKey || !providerConfig.connected) {
      addLog('error', 'Please connect your LLM provider in Integrations page')
      return
    }
    
    const llmConfig = {
      provider: activeProvider,
      model: providerConfig.defaultModel,
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    }

    setIsRunning(true)
    setResults([])
    setLogs([])
    addLog('info', `Starting E2E test run with ${testsToRun.length} test(s)...`)
    addLog('info', `Target: ${baseUrl}`)
    addLog('info', `Browser: ${browser} | Headless: ${headless}`)

    try {
      const response = await fetch('/api/e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: testsToRun,
          baseUrl,
          browser,
          headless,
          timeout,
          llmConfig,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        addLog('error', error.error || 'Failed to run tests')
        setIsRunning(false)
        return
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'status':
                    addLog('info', data.message)
                    break
                  case 'testStart':
                    setCurrentTest({ index: data.index, title: data.title })
                    addLog('info', `\n━━━ Test ${data.index}/${data.total}: ${data.code} - ${data.title} ━━━`)
                    break
                  case 'step':
                    addLog('info', `  → ${data.message}`)
                    break
                  case 'aiThinking':
                    addLog('ai', `  🤖 ${data.message}`)
                    break
                  case 'aiAction':
                    addLog('ai', `  🎯 ${data.message}`)
                    break
                  case 'stepResult':
                    if (data.status === 'pass') {
                      addLog('success', `  ✓ ${data.message}`)
                    } else {
                      addLog('error', `  ✗ ${data.message}`)
                    }
                    break
                  case 'aiAnalysis':
                    addLog('ai', `  📊 AI Analysis:\n${data.message}`)
                    break
                  case 'error':
                    addLog('error', `  ⚠ ${data.message}`)
                    break
                  case 'testComplete':
                    const statusIcon = data.status === 'pass' ? '✓' : '✗'
                    const statusColor = data.status === 'pass' ? 'success' : 'error'
                    addLog(statusColor, `\n  ${statusIcon} Test ${data.index} completed: ${data.status.toUpperCase()} (${data.duration}ms)`)
                    
                    // Update test case status
                    const statusMap: Record<string, Status> = {
                      pass: 'pass',
                      fail: 'fail',
                      skip: 'skip',
                      error: 'fail',
                    }
                    onUpdateTestCase(data.testCaseId, {
                      status: statusMap[data.result.status] || 'untested',
                      notes: data.result.aiAnalysis 
                        ? `AI Analysis:\n${data.result.aiAnalysis}\n\nError: ${data.result.error || 'None'}`
                        : data.result.error 
                          ? `Error: ${data.result.error}` 
                          : '',
                    })
                    
                    setResults(prev => [...prev, data.result])
                    break
                  case 'complete':
                    addLog('success', '\n═══════════════════════════════════════')
                    const passCount = data.results.filter((r: E2ETestResult) => r.status === 'pass').length
                    const failCount = data.results.filter((r: E2ETestResult) => r.status === 'fail' || r.status === 'error').length
                    addLog('success', `Test run complete: ${passCount} passed, ${failCount} failed`)
                    break
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`)
    }

    setIsRunning(false)
    setCurrentTest(null)
  }, [testCases, selectedTests, baseUrl, browser, headless, timeout, addLog, onUpdateTestCase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓'
      case 'fail': return '✗'
      case 'error': return '⚠'
      default: return '○'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-4xl max-h-[85vh] rounded-lg shadow-xl flex flex-col"
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
              AI-powered end-to-end testing with real-time progress
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
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Config & Tests */}
          <div className="w-80 border-r overflow-auto p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
            {/* Configuration */}
            <div 
              className="p-3 rounded-lg space-y-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Configuration
              </h3>
              
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  disabled={isRunning}
                  className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="http://localhost:3000"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Browser
                  </label>
                  <select
                    value={browser}
                    onChange={e => setBrowser(e.target.value as any)}
                    disabled={isRunning}
                    className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                    <option value="edge">Edge</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={timeout}
                    onChange={e => setTimeout(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
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
                  disabled={isRunning}
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
                  disabled={isRunning}
                  className="text-xs underline disabled:opacity-50"
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
                  const result = results.find(r => r.testCaseId === tc.id)
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
                        disabled={isRunning}
                        className="accent-[var(--accent)]"
                      />
                      <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {tc.code}: {tc.title}
                      </span>
                      {result && (
                        <span style={{ color: result.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>
                          {getStatusIcon(result.status)}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Logs */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Execution Log
                </h3>
                {isRunning && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {currentTest ? `Running: ${currentTest.title}` : 'Processing...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-3 font-mono text-xs" style={{ backgroundColor: 'var(--bg-primary)' }}>
              {logs.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  Click "Run Tests" to start
                </div>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className="py-0.5"
                    style={{ 
                      color: log.type === 'error' ? 'var(--status-fail-text)' 
                        : log.type === 'success' ? 'var(--status-pass-text)'
                        : log.type === 'ai' ? '#8b5cf6'
                        : log.type === 'warning' ? 'var(--status-skip-text)'
                        : 'var(--text-secondary)'
                    }}
                  >
                    {log.message.split('\n').map((line, j) => (
                      <div key={j}>{line || '\u00A0'}</div>
                    ))}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Summary */}
            {results.length > 0 && (
              <div 
                className="p-3 border-t"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex gap-4 text-sm">
                  <span style={{ color: 'var(--status-pass-text)' }}>
                    ✓ Pass: {results.filter(r => r.status === 'pass').length}
                  </span>
                  <span style={{ color: 'var(--status-fail-text)' }}>
                    ✗ Fail: {results.filter(r => r.status === 'fail').length}
                  </span>
                  <span style={{ color: 'var(--status-fail-text)' }}>
                    ⚠ Error: {results.filter(r => r.status === 'error').length}
                  </span>
                  <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                    Total: {results.reduce((sum, r) => sum + r.duration, 0)}ms
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {isRunning && currentTest && (
              <span>Running test {currentTest.index} of {selectedTests.size}...</span>
            )}
            {!isRunning && results.length > 0 && (
              <span>Completed {results.length} tests</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 text-sm rounded disabled:opacity-50"
              style={{ 
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)'
              }}
            >
              Close
            </button>
            
            <button
              onClick={runTests}
              disabled={isRunning || selectedTests.size === 0}
              className="px-4 py-2 text-sm rounded disabled:opacity-50 flex items-center gap-2"
              style={{ 
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
            >
              {isRunning ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                'Run Tests'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
