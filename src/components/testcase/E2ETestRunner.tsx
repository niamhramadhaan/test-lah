'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { TestCase, Status, E2ERunConfig, E2ERun, E2ETestResult as E2ETestResultType } from '@/types'
import { useDashboard } from '@/context/DashboardContext'

interface E2ETestRunnerProps {
  testCases: TestCase[]
  projectId: string
  onClose: () => void
}

interface LogEntry {
  time: Date
  type: 'info' | 'ai' | 'success' | 'error' | 'warning' | 'healing'
  message: string
}

interface ScreenshotEntry {
  image: string
  label: string
  timestamp: Date
}

type TabId = 'runner' | 'scripts' | 'history'

export function E2ETestRunner({ 
  testCases, 
  projectId, 
  onClose 
}: E2ETestRunnerProps) {
  const { e2e, testCases: tcHook } = useDashboard()
  
  // Config state from saved project data
  const [baseUrl, setBaseUrl] = useState(e2e.config.baseUrl)
  const [browser, setBrowser] = useState<E2ERunConfig['browser']>(e2e.config.browser)
  const [headless, setHeadless] = useState(e2e.config.headless)
  const [timeout, setTimeout] = useState(e2e.config.timeout)
  
  // UI state
  const [activeTab, setActiveTab] = useState<TabId>('runner')
  const [isRunning, setIsRunning] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<E2ETestResultType[]>([])
  const [currentTest, setCurrentTest] = useState<{ index: number; title: string } | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([])
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null)
  const [healingReport, setHealingReport] = useState<string>('')
  const [showHealingReport, setShowHealingReport] = useState(false)
  
  // Script state
  const [generatedScripts, setGeneratedScripts] = useState<Record<string, string>>({})
  const [editingScript, setEditingScript] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [selectedScriptTest, setSelectedScriptTest] = useState<string | null>(null)
  
  // History state
  const [selectedRun, setSelectedRun] = useState<E2ERun | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [selectedTests, setSelectedTests] = useState<Set<string>>(
    new Set(testCases.map(tc => tc.id))
  )

  // Load saved scripts on mount
  useEffect(() => {
    const scripts: Record<string, string> = {}
    for (const tc of testCases) {
      const saved = e2e.getScript(tc.id)
      if (saved) scripts[tc.id] = saved.script
    }
    setGeneratedScripts(scripts)
  }, [testCases, e2e])

  // Auto-save config changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      e2e.saveConfig({ baseUrl, browser, headless, timeout })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [baseUrl, browser, headless, timeout, e2e])

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { time: new Date(), type, message }])
    window.setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
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

  const getLLMConfig = useCallback(() => {
    const configStr = localStorage.getItem('qa-llm-config')
    if (!configStr) return null
    const fullConfig = JSON.parse(configStr)
    const activeProvider = fullConfig.activeProvider
    if (!activeProvider || !fullConfig.providers?.[activeProvider]) return null
    const providerConfig = fullConfig.providers[activeProvider]
    if (!providerConfig.apiKey || !providerConfig.connected) return null
    return {
      provider: activeProvider,
      model: providerConfig.defaultModel,
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    }
  }, [])

  const generateScripts = useCallback(async () => {
    const llmConfig = getLLMConfig()
    if (!llmConfig) {
      addLog('error', 'Please configure LLM in Integrations page first')
      return
    }

    setIsGenerating(true)
    addLog('info', 'Generating test scripts...')

    try {
      const response = await fetch('/api/e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: testCases.filter(tc => selectedTests.has(tc.id)),
          baseUrl,
          llmConfig,
          generateOnly: true,
        }),
      })

      if (!response.ok) {
        addLog('error', 'Failed to generate scripts')
        return
      }

      const data = await response.json()
      setGeneratedScripts(prev => ({ ...prev, ...data.scripts }))
      
      // Save scripts to project
      for (const [tcId, script] of Object.entries(data.scripts)) {
        const tc = testCases.find(t => t.id === tcId)
        if (tc) {
          e2e.saveScript(tcId, tc.title, tc.code, script as string)
        }
      }
      
      addLog('success', `Generated ${Object.keys(data.scripts).length} test script(s)`)
      setActiveTab('scripts')
    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGenerating(false)
    }
  }, [testCases, selectedTests, baseUrl, getLLMConfig, addLog, e2e])

  const runTests = useCallback(async () => {
    const testsToRun = testCases.filter(tc => selectedTests.has(tc.id))
    if (testsToRun.length === 0) return

    const llmConfig = getLLMConfig()
    if (!llmConfig) {
      addLog('error', 'Please configure LLM in Integrations page first')
      return
    }

    setIsRunning(true)
    setResults([])
    setLogs([])
    setScreenshots([])
    setCurrentScreenshot(null)
    setHealingReport('')
    setShowHealingReport(false)
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
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
        signal: abortController.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        addLog('error', error.error || 'Failed to run tests')
        setIsRunning(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const allResults: E2ETestResultType[] = []

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
                    if (data.script) {
                      setGeneratedScripts(prev => ({ ...prev, [data.testCaseId]: data.script }))
                    }
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
                  case 'screenshot':
                    setCurrentScreenshot(data.image)
                    setScreenshots(prev => [...prev, {
                      image: data.image,
                      label: data.label,
                      timestamp: new Date()
                    }])
                    break
                  case 'stepResult':
                    if (data.status === 'pass') {
                      addLog('success', `  ✓ ${data.message}`)
                    } else {
                      addLog('error', `  ✗ ${data.message}`)
                    }
                    break
                  case 'healing':
                    addLog('healing', `  🔧 ${data.message}`)
                    break
                  case 'healingAction':
                    addLog('healing', `  💊 ${data.message}`)
                    break
                  case 'healed':
                    addLog('success', `  ✨ ${data.message}`)
                    break
                  case 'aiAnalysis':
                    addLog('ai', `  📊 AI Analysis:\n${data.message}`)
                    break
                  case 'error':
                    addLog('error', `  ⚠ ${data.message}`)
                    break
                  case 'healingReport':
                    setHealingReport(data.report)
                    if (data.report && !data.report.includes('All tests passed')) {
                      setShowHealingReport(true)
                    }
                    break
                  case 'testComplete':
                    const statusIcon = data.status === 'pass' ? '✓' : '✗'
                    const statusColor = data.status === 'pass' ? 'success' : 'error'
                    addLog(statusColor, `\n  ${statusIcon} Test ${data.index} completed: ${data.status.toUpperCase()} (${data.duration}ms)`)
                    
                    if (data.script) {
                      setGeneratedScripts(prev => ({ ...prev, [data.testCaseId]: data.script }))
                      e2e.saveScript(data.testCaseId, data.result?.testCaseTitle || '', '', data.script)
                    }
                    
                    allResults.push(data.result)
                    setResults([...allResults])
                    break
                  case 'complete':
                    addLog('success', '\n═══════════════════════════════════════')
                    const passCount = data.results.filter((r: any) => r.status === 'pass').length
                    const failCount = data.results.filter((r: any) => r.status === 'fail' || r.status === 'error').length
                    addLog('success', `Test run complete: ${passCount} passed, ${failCount} failed`)
                    
                    // Save run to history
                    e2e.saveRun({
                      projectId,
                      config: { baseUrl, browser, headless, timeout },
                      results: data.results,
                      totalPassed: passCount,
                      totalFailed: failCount,
                      totalDuration: data.results.reduce((sum: number, r: any) => sum + r.duration, 0),
                      healingReport: healingReport || undefined,
                    })
                    break
                  case 'aborted':
                    addLog('warning', '\n━━━ Test run stopped by user ━━━')
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
      if (error instanceof Error && error.name === 'AbortError') {
        addLog('warning', '\n━━━ Test run stopped by user ━━━')
      } else {
        addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    setIsRunning(false)
    setCurrentTest(null)
    abortControllerRef.current = null
  }, [testCases, selectedTests, baseUrl, browser, headless, timeout, addLog, getLLMConfig, projectId, e2e, healingReport])

  const stopTests = useCallback(() => {
    if (abortControllerRef.current) {
      addLog('warning', 'Stopping test run...')
      abortControllerRef.current.abort()
    }
  }, [addLog])

  const saveEditedScript = useCallback(() => {
    if (!editingScript || !editContent) return
    const tc = testCases.find(t => t.id === editingScript)
    if (tc) {
      e2e.saveScript(tc.id, tc.title, tc.code, editContent)
      setGeneratedScripts(prev => ({ ...prev, [tc.id]: editContent }))
      addLog('success', `Script saved for ${tc.code}`)
    }
    setEditingScript(null)
    setEditContent('')
  }, [editingScript, editContent, testCases, e2e, addLog])

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'var(--status-fail-text)'
      case 'success': return 'var(--status-pass-text)'
      case 'ai': return '#8b5cf6'
      case 'healing': return '#f59e0b'
      case 'warning': return 'var(--status-skip-text)'
      default: return 'var(--text-secondary)'
    }
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'runner', label: 'Runner', icon: '▶' },
    { id: 'scripts', label: 'Scripts', icon: '{ }' },
    { id: 'history', label: 'History', icon: '📋' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-6xl max-h-[92vh] rounded-lg shadow-xl flex flex-col"
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
              AI-powered testing with script generation & live preview
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                  style={{ 
                    backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Runner Tab */}
        {activeTab === 'runner' && (
          <div className="flex-1 overflow-hidden flex">
            {/* Left Panel - Config & Tests */}
            <div className="w-72 border-r overflow-auto p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
              {/* Configuration */}
              <div 
                className="p-3 rounded-lg space-y-3"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Configuration
                </h3>
                
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>Target URL</label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    disabled={isRunning}
                    className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="http://localhost:3000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>Browser</label>
                    <select
                      value={browser}
                      onChange={e => setBrowser(e.target.value as any)}
                      disabled={isRunning}
                      className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="chromium">Chromium</option>
                      <option value="firefox">Firefox</option>
                      <option value="webkit">WebKit</option>
                      <option value="edge">Edge</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>Timeout (ms)</label>
                    <input
                      type="number"
                      value={timeout}
                      onChange={e => setTimeout(Number(e.target.value))}
                      disabled={isRunning}
                      className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
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
                
                <div className="max-h-[200px] overflow-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
                  {testCases.map(tc => {
                    const result = results.find(r => r.testCaseId === tc.id)
                    return (
                      <label
                        key={tc.id}
                        className="flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0 hover:opacity-80 cursor-pointer"
                        style={{ borderColor: 'var(--border)', backgroundColor: selectedTests.has(tc.id) ? 'var(--bg-secondary)' : 'transparent' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTests.has(tc.id)}
                          onChange={() => toggleTest(tc.id)}
                          disabled={isRunning}
                          className="accent-[var(--accent)]"
                        />
                        <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{tc.code}</span>
                        {result && (
                          <span style={{ color: result.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>
                            {result.status === 'pass' ? '✓' : '✗'}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <button
                  onClick={generateScripts}
                  disabled={isRunning || isGenerating || selectedTests.size === 0}
                  className="w-full px-3 py-2 text-xs rounded flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {isGenerating ? '⏳ Generating...' : '{ } Generate Scripts'}
                </button>
                
                {healingReport && (
                  <button
                    onClick={() => setShowHealingReport(true)}
                    className="w-full px-3 py-2 text-xs rounded flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--status-skip-bg)', border: '1px solid var(--status-skip-border)', color: 'var(--status-skip-text)' }}
                  >
                    🔧 View Healing Report
                  </button>
                )}
              </div>
            </div>

            {/* Center - Logs & Preview */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex overflow-hidden">
                {/* Logs */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Execution Log</h3>
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
                        <div key={i} className="py-0.5" style={{ color: getLogColor(log.type) }}>
                          {log.message.split('\n').map((line, j) => (
                            <div key={j}>{line || '\u00A0'}</div>
                          ))}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Browser Preview */}
                <div className="w-[380px] border-l flex flex-col" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      🖥️ Browser Preview
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto p-2" style={{ backgroundColor: '#1a1a1a' }}>
                    {currentScreenshot ? (
                      <img 
                        src={`data:image/jpeg;base64,${currentScreenshot}`}
                        alt="Browser preview"
                        className="w-full rounded border"
                        style={{ border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs" style={{ color: '#666' }}>
                        {isRunning ? 'Waiting for screenshot...' : 'Browser preview will appear here during test execution'}
                      </div>
                    )}
                  </div>
                  {/* Screenshot timeline */}
                  {screenshots.length > 0 && (
                    <div className="p-2 border-t overflow-x-auto flex gap-1" style={{ borderColor: 'var(--border)' }}>
                      {screenshots.slice(-8).map((ss, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentScreenshot(ss.image)}
                          className="flex-shrink-0 w-12 h-8 rounded overflow-hidden border"
                          style={{ border: currentScreenshot === ss.image ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                          title={ss.label}
                        >
                          <img src={`data:image/jpeg;base64,${ss.image}`} alt={ss.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {results.length > 0 && (
                <div className="p-3 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex gap-4 text-sm">
                    <span style={{ color: 'var(--status-pass-text)' }}>✓ Pass: {results.filter(r => r.status === 'pass').length}</span>
                    <span style={{ color: 'var(--status-fail-text)' }}>✗ Fail: {results.filter(r => r.status === 'fail').length}</span>
                    <span style={{ color: 'var(--status-fail-text)' }}>⚠ Error: {results.filter(r => r.status === 'error').length}</span>
                    <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                      Total: {Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <div className="flex-1 overflow-hidden flex">
            {/* Script List */}
            <div className="w-64 border-r overflow-auto" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Test Scripts
                </h3>
                <div className="space-y-1">
                  {testCases.map(tc => {
                    const hasScript = !!generatedScripts[tc.id]
                    const isSelected = selectedScriptTest === tc.id
                    return (
                      <button
                        key={tc.id}
                        onClick={() => {
                          setSelectedScriptTest(tc.id)
                          setEditingScript(null)
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded flex items-center gap-2"
                        style={{ 
                          backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                          color: 'var(--text-primary)',
                          border: isSelected ? '1px solid var(--border)' : '1px solid transparent'
                        }}
                      >
                        <span className={hasScript ? 'text-green-500' : 'text-gray-400'}>{hasScript ? '✓' : '○'}</span>
                        <span className="truncate">{tc.code} - {tc.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Script Editor */}
            <div className="flex-1 flex flex-col">
              {selectedScriptTest ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {testCases.find(tc => tc.id === selectedScriptTest)?.code} - Script
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {editingScript ? 'Editing mode' : 'Click Edit to modify the script'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editingScript ? (
                        <>
                          <button
                            onClick={() => { setEditingScript(null); setEditContent('') }}
                            className="px-3 py-1.5 text-xs rounded"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditedScript}
                            className="px-3 py-1.5 text-xs rounded"
                            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingScript(selectedScriptTest)
                            setEditContent(generatedScripts[selectedScriptTest] || '')
                          }}
                          className="px-3 py-1.5 text-xs rounded"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: '#1e1e2e' }}>
                    {editingScript ? (
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full h-full min-h-[400px] font-mono text-sm p-4 rounded resize-none"
                        style={{ 
                          backgroundColor: '#1e1e2e', 
                          color: '#cdd6f4',
                          border: 'none',
                          outline: 'none'
                        }}
                        spellCheck={false}
                      />
                    ) : generatedScripts[selectedScriptTest] ? (
                      <pre className="font-mono text-sm whitespace-pre-wrap" style={{ color: '#cdd6f4' }}>
                        {generatedScripts[selectedScriptTest]}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-sm" style={{ color: '#666' }}>
                          No script generated yet
                        </p>
                        <button
                          onClick={generateScripts}
                          disabled={isGenerating}
                          className="px-4 py-2 text-sm rounded disabled:opacity-50"
                          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                        >
                          {isGenerating ? 'Generating...' : 'Generate Script'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <p className="text-4xl mb-3">{ }</p>
                    <p className="text-sm">Select a test case to view its script</p>
                    <p className="text-xs mt-1">Scripts are auto-generated during test runs</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-hidden flex">
            {/* Run List */}
            <div className="w-80 border-r overflow-auto" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Run History ({e2e.runs.length})
                  </h3>
                  {e2e.runs.length > 0 && (
                    <button
                      onClick={e2e.clearRuns}
                      className="text-xs underline"
                      style={{ color: 'var(--status-fail-text)' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {e2e.runs.length === 0 ? (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    No test runs yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {e2e.runs.map(run => (
                      <div
                        key={run.id}
                        className="p-3 rounded-lg group relative"
                        style={{ 
                          backgroundColor: selectedRun?.id === run.id ? 'var(--bg-secondary)' : 'transparent',
                          border: selectedRun?.id === run.id ? '1px solid var(--border)' : '1px solid transparent'
                        }}
                      >
                        <button
                          onClick={() => setSelectedRun(run)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {new Date(run.timestamp).toLocaleString()}
                            </span>
                            <span className="text-xs" style={{ color: run.totalFailed > 0 ? 'var(--status-fail-text)' : 'var(--status-pass-text)' }}>
                              {run.totalPassed}✓ {run.totalFailed}✗
                            </span>
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            {run.config.baseUrl} • {run.config.browser} • {Math.round(run.totalDuration / 1000)}s
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e2e.deleteRun(run.id)
                            if (selectedRun?.id === run.id) setSelectedRun(null)
                          }}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--status-fail-text)' }}
                          title="Delete run"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Run Details */}
            <div className="flex-1 overflow-auto">
              {selectedRun ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Run Details
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(selectedRun.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span style={{ color: 'var(--status-pass-text)' }}>✓ {selectedRun.totalPassed} passed</span>
                      <span style={{ color: 'var(--status-fail-text)' }}>✗ {selectedRun.totalFailed} failed</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedRun.results.map((result, i) => (
                      <div 
                        key={result.testCaseId}
                        className="p-3 rounded-lg"
                        style={{ 
                          backgroundColor: 'var(--bg-secondary)',
                          border: `1px solid ${result.status === 'pass' ? 'var(--status-pass-border)' : 'var(--status-fail-border)'}`
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {result.testCaseCode || `Test ${i + 1}`} - {result.testCaseTitle}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ 
                            backgroundColor: result.status === 'pass' ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                            color: result.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)'
                          }}>
                            {result.status.toUpperCase()}
                          </span>
                        </div>
                        
                        {result.error && (
                          <p className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
                            {result.error}
                          </p>
                        )}

                        <div className="mt-2 space-y-1">
                          {result.steps.map((step, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs">
                              <span style={{ color: step.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>
                                {step.status === 'pass' ? '✓' : '✗'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{step.step}</span>
                            </div>
                          ))}
                        </div>

                        {result.aiAnalysis && (
                          <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                            <strong>AI Analysis:</strong> {result.aiAnalysis}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedRun.healingReport && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--status-skip-bg)', border: '1px solid var(--status-skip-border)' }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--status-skip-text)' }}>Healing Report</h4>
                      <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {selectedRun.healingReport}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">Select a run to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            {!isRunning && results.length === 0 && activeTab === 'runner' && (
              <span>Config is saved automatically per project</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 text-sm rounded disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Close
            </button>
            
            {activeTab === 'runner' && (
              isRunning ? (
                <button
                  onClick={stopTests}
                  className="px-4 py-2 text-sm rounded flex items-center gap-2"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  ■ Stop
                </button>
              ) : (
                <button
                  onClick={runTests}
                  disabled={selectedTests.size === 0}
                  className="px-4 py-2 text-sm rounded disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  ▶ Run Tests
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Healing Report Modal */}
      {showHealingReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>🔧 Healing Report</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>AI-generated recommendations to fix failing tests</p>
              </div>
              <button onClick={() => setShowHealingReport(false)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{healingReport}</pre>
            </div>
            <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowHealingReport(false)} className="px-4 py-2 text-sm rounded" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
