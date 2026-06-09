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
  
  // Config state
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
  const [showBrowserPreview, setShowBrowserPreview] = useState(true)
  const [browserPreviewWidth, setBrowserPreviewWidth] = useState(22) // percentage
  const [showSidebar, setShowSidebar] = useState(true)
  const isResizingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // Auto-detect screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSidebar(false)
        setShowBrowserPreview(false)
      } else {
        setShowSidebar(true)
        setShowBrowserPreview(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Resize handlers for browser preview
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX
      const containerRight = containerRect.right
      const newWidth = ((containerRight - mouseX) / containerRect.width) * 100
      setBrowserPreviewWidth(Math.min(Math.max(newWidth, 15), 50)) // 15% min, 50% max
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Load saved scripts
  useEffect(() => {
    const scripts: Record<string, string> = {}
    for (const tc of testCases) {
      const saved = e2e.getScript(tc.id)
      if (saved) scripts[tc.id] = saved.script
    }
    setGeneratedScripts(scripts)
  }, [testCases, e2e])

  // Auto-save config
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
      for (const [tcId, script] of Object.entries(data.scripts)) {
        const tc = testCases.find(t => t.id === tcId)
        if (tc) e2e.saveScript(tcId, tc.title, tc.code, script as string)
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
        body: JSON.stringify({ testCases: testsToRun, baseUrl, browser, headless, timeout, llmConfig }),
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
                  case 'status': addLog('info', data.message); break
                  case 'testStart':
                    setCurrentTest({ index: data.index, title: data.title })
                    addLog('info', `\n━━━ Test ${data.index}/${data.total}: ${data.code} - ${data.title} ━━━`)
                    if (data.script) setGeneratedScripts(prev => ({ ...prev, [data.testCaseId]: data.script }))
                    break
                  case 'step': addLog('info', `  → ${data.message}`); break
                  case 'aiThinking': addLog('ai', `  🤖 ${data.message}`); break
                  case 'aiAction': addLog('ai', `  🎯 ${data.message}`); break
                  case 'screenshot':
                    setCurrentScreenshot(data.image)
                    setScreenshots(prev => [...prev, { image: data.image, label: data.label, timestamp: new Date() }])
                    break
                  case 'stepResult':
                    addLog(data.status === 'pass' ? 'success' : 'error', `  ${data.status === 'pass' ? '✓' : '✗'} ${data.message}`)
                    break
                  case 'healing': addLog('healing', `  🔧 ${data.message}`); break
                  case 'healingAction': addLog('healing', `  💊 ${data.message}`); break
                  case 'healed': addLog('success', `  ✨ ${data.message}`); break
                  case 'aiAnalysis': addLog('ai', `  📊 AI Analysis:\n${data.message}`); break
                  case 'error': addLog('error', `  ⚠ ${data.message}`); break
                  case 'healingReport':
                    setHealingReport(data.report)
                    if (data.report && !data.report.includes('All tests passed')) setShowHealingReport(true)
                    break
                  case 'testComplete':
                    addLog(data.status === 'pass' ? 'success' : 'error', `\n  ${data.status === 'pass' ? '✓' : '✗'} Test ${data.index} completed: ${data.status.toUpperCase()} (${data.duration}ms)`)
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
                  case 'aborted': addLog('warning', '\n━━━ Test run stopped by user ━━━'); break
                }
              } catch {}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-6xl max-h-[95vh] md:max-h-[92vh] rounded-lg shadow-xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b shrink-0 sticky top-0 z-20" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              E2E Agentic Test Runner
            </h2>
            <p className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
              AI-powered testing with script generation & live preview
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {/* Mobile sidebar toggle */}
            {activeTab === 'runner' && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden p-1.5 rounded"
                style={{ 
                  backgroundColor: showSidebar ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: showSidebar ? 'white' : 'var(--text-secondary)'
                }}
                title="Toggle config panel"
              >
                ☰
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto shrink-0 sticky top-0 z-10" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 md:px-4 py-2 text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              style={{ 
                backgroundColor: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Runner Tab */}
        {activeTab === 'runner' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Panel - Config & Tests */}
            <div 
              className={`${
                showSidebar ? 'max-h-[35vh] md:max-h-none' : 'max-h-0 md:max-h-none'
              } md:flex-[0_0_28%] border-b md:border-b-0 md:border-r overflow-auto transition-all duration-200 shrink-0`}
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {/* Configuration */}
                <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Configuration</h3>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>Target URL</label>
                    <input
                      type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} disabled={isRunning}
                      className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="http://localhost:3000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>Browser</label>
                      <select value={browser} onChange={e => setBrowser(e.target.value as any)} disabled={isRunning}
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
                      <input type="number" value={timeout} onChange={e => setTimeout(Number(e.target.value))} disabled={isRunning}
                        className="w-full text-sm px-2 py-1.5 rounded disabled:opacity-50"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={headless} onChange={e => setHeadless(e.target.checked)} disabled={isRunning} className="accent-[var(--accent)]" />
                    <span style={{ color: 'var(--text-secondary)' }}>Run headless</span>
                  </label>
                </div>

                {/* Test Case Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Test Cases ({selectedTests.size}/{testCases.length})
                    </h3>
                    <button onClick={toggleAll} disabled={isRunning} className="text-xs underline disabled:opacity-50" style={{ color: 'var(--accent)' }}>
                      {selectedTests.size === testCases.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-[150px] md:max-h-[200px] overflow-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    {testCases.map(tc => {
                      const result = results.find(r => r.testCaseId === tc.id)
                      return (
                        <label key={tc.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0 hover:opacity-80 cursor-pointer"
                          style={{ borderColor: 'var(--border)', backgroundColor: selectedTests.has(tc.id) ? 'var(--bg-secondary)' : 'transparent' }}
                        >
                          <input type="checkbox" checked={selectedTests.has(tc.id)} onChange={() => toggleTest(tc.id)} disabled={isRunning} className="accent-[var(--accent)]" />
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
                  <button onClick={generateScripts} disabled={isRunning || isGenerating || selectedTests.size === 0}
                    className="w-full px-3 py-2 text-xs rounded flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {isGenerating ? '⏳ Generating...' : '{ } Generate Scripts'}
                  </button>
                  {healingReport && (
                    <button onClick={() => setShowHealingReport(true)}
                      className="w-full px-3 py-2 text-xs rounded flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--status-skip-bg)', border: '1px solid var(--status-skip-border)', color: 'var(--status-skip-text)' }}
                    >
                      🔧 View Healing Report
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                {/* Logs */}
                <div className="flex-1 flex flex-col min-h-0 max-h-[45vh] md:max-h-none">
                  <div className="p-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Execution Log</h3>
                      {isRunning && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-tertiary)' }}>
                            {currentTest ? currentTest.title : 'Processing...'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-3 font-mono text-xs" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    {logs.length === 0 ? (
                      <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Click "Run Tests" to start</div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className="py-0.5" style={{ color: getLogColor(log.type) }}>
                          {log.message.split('\n').map((line, j) => (<div key={j}>{line || '\u00A0'}</div>))}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Resize Handle */}
                <div
                  className="w-1 md:w-1.5 cursor-col-resize hover:bg-[var(--accent)] transition-colors shrink-0"
                  style={{ backgroundColor: 'var(--border)' }}
                  onMouseDown={handleResizeStart}
                />

                {/* Browser Preview - Collapsible */}
                <div 
                  className="border-t md:border-t-0 md:border-l flex flex-col transition-all duration-200"
                  style={{ 
                    borderColor: 'var(--border)',
                    maxHeight: showBrowserPreview ? '300px' : '36px',
                    minHeight: showBrowserPreview ? '200px' : '36px',
                    width: 'auto',
                    flex: showBrowserPreview ? `0 0 ${browserPreviewWidth}%` : '0 0 36px',
                    ...(typeof window !== 'undefined' && window.innerWidth >= 768 ? {
                      maxHeight: 'none',
                      minHeight: 'auto',
                      flex: showBrowserPreview ? `0 0 ${browserPreviewWidth}%` : '0 0 36px'
                    } : {})
                  }}
                >
                  <div 
                    className="p-2 md:p-3 border-b cursor-pointer flex items-center gap-2 shrink-0"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
                    onClick={() => setShowBrowserPreview(!showBrowserPreview)}
                  >
                    <span className="text-sm">🖥️</span>
                    {showBrowserPreview && (
                      <>
                        <h3 className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>Browser Preview</h3>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {screenshots.length > 0 ? `${screenshots.length} screenshots` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {showBrowserPreview && (
                    <>
                      <div className="flex-1 overflow-auto p-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        {currentScreenshot ? (
                          <img src={`data:image/jpeg;base64,${currentScreenshot}`} alt="Browser preview" className="w-full rounded" />
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[100px] text-xs" style={{ color: '#666' }}>
                            {isRunning ? 'Waiting...' : 'Preview during execution'}
                          </div>
                        )}
                      </div>
                      {screenshots.length > 0 && (
                        <div className="p-2 border-t overflow-x-auto flex gap-1 shrink-0" style={{ borderColor: 'var(--border)' }}>
                          {screenshots.slice(-6).map((ss, i) => (
                            <button key={i} onClick={() => setCurrentScreenshot(ss.image)}
                              className="flex-shrink-0 w-10 h-7 md:w-12 md:h-8 rounded overflow-hidden border"
                              style={{ border: currentScreenshot === ss.image ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                              title={ss.label}
                            >
                              <img src={`data:image/jpeg;base64,${ss.image}`} alt={ss.label} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Summary Bar - Bottom of right content */}
              {results.length > 0 && (
                <div className="p-2 md:p-3 border-t shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
                    <span style={{ color: 'var(--status-pass-text)' }}>✓ {results.filter(r => r.status === 'pass').length}</span>
                    <span style={{ color: 'var(--status-fail-text)' }}>✗ {results.filter(r => r.status === 'fail').length}</span>
                    <span style={{ color: 'var(--status-fail-text)' }}>⚠ {results.filter(r => r.status === 'error').length}</span>
                    <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                      {Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Script List */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r overflow-auto max-h-[30vh] md:max-h-none" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Test Scripts</h3>
                <div className="space-y-1">
                  {testCases.map(tc => {
                    const hasScript = !!generatedScripts[tc.id]
                    const isSelected = selectedScriptTest === tc.id
                    return (
                      <button key={tc.id} onClick={() => { setSelectedScriptTest(tc.id); setEditingScript(null) }}
                        className="w-full text-left px-3 py-2 text-xs rounded flex items-center gap-2"
                        style={{ backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', border: isSelected ? '1px solid var(--border)' : '1px solid transparent' }}
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
            <div className="flex-1 flex flex-col min-h-0 max-h-[45vh] md:max-h-none">
              {selectedScriptTest ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {testCases.find(tc => tc.id === selectedScriptTest)?.code} - Script
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {editingScript ? 'Editing' : 'Click Edit to modify'}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      {editingScript ? (
                        <>
                          <button onClick={() => { setEditingScript(null); setEditContent('') }}
                            className="px-3 py-1.5 text-xs rounded" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >Cancel</button>
                          <button onClick={saveEditedScript}
                            className="px-3 py-1.5 text-xs rounded" style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                          >Save</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditingScript(selectedScriptTest); setEditContent(generatedScripts[selectedScriptTest] || '') }}
                          className="px-3 py-1.5 text-xs rounded" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >✏️ Edit</button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: '#1e1e2e' }}>
                    {editingScript ? (
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        className="w-full h-full min-h-[300px] font-mono text-sm p-4 rounded resize-none"
                        style={{ backgroundColor: '#1e1e2e', color: '#cdd6f4', border: 'none', outline: 'none' }}
                        spellCheck={false}
                      />
                    ) : generatedScripts[selectedScriptTest] ? (
                      <pre className="font-mono text-sm whitespace-pre-wrap" style={{ color: '#cdd6f4' }}>
                        {generatedScripts[selectedScriptTest]}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-sm" style={{ color: '#666' }}>No script generated yet</p>
                        <button onClick={generateScripts} disabled={isGenerating}
                          className="px-4 py-2 text-sm rounded disabled:opacity-50"
                          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                        >{isGenerating ? 'Generating...' : 'Generate Script'}</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <p className="text-3xl md:text-4xl mb-3">{ }</p>
                    <p className="text-sm">Select a test case to view its script</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Run List */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r overflow-auto max-h-[40vh] md:max-h-none" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Run History ({e2e.runs.length})
                  </h3>
                  {e2e.runs.length > 0 && (
                    <button onClick={e2e.clearRuns} className="text-xs underline" style={{ color: 'var(--status-fail-text)' }}>Clear All</button>
                  )}
                </div>
                {e2e.runs.length === 0 ? (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>No test runs yet</div>
                ) : (
                  <div className="space-y-2">
                    {e2e.runs.map(run => (
                      <div key={run.id} className="p-3 rounded-lg group relative"
                        style={{ 
                          backgroundColor: selectedRun?.id === run.id ? 'var(--bg-secondary)' : 'transparent',
                          border: selectedRun?.id === run.id ? '1px solid var(--border)' : '1px solid transparent'
                        }}
                      >
                        <button onClick={() => setSelectedRun(run)} className="w-full text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {new Date(run.timestamp).toLocaleString()}
                            </span>
                            <span className="text-xs" style={{ color: run.totalFailed > 0 ? 'var(--status-fail-text)' : 'var(--status-pass-text)' }}>
                              {run.totalPassed}✓ {run.totalFailed}✗
                            </span>
                          </div>
                          <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {run.config.baseUrl} • {run.config.browser}
                          </div>
                        </button>
                        <button onClick={() => { e2e.deleteRun(run.id); if (selectedRun?.id === run.id) setSelectedRun(null) }}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--status-fail-text)' }} title="Delete run"
                        >✕</button>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Run Details</h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(selectedRun.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span style={{ color: 'var(--status-pass-text)' }}>✓ {selectedRun.totalPassed}</span>
                      <span style={{ color: 'var(--status-fail-text)' }}>✗ {selectedRun.totalFailed}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedRun.results.map((result, i) => (
                      <div key={result.testCaseId} className="p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid ${result.status === 'pass' ? 'var(--status-pass-border)' : 'var(--status-fail-border)'}` }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {result.testCaseCode || `Test ${i + 1}`} - {result.testCaseTitle}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded shrink-0"
                            style={{ backgroundColor: result.status === 'pass' ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)', color: result.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}
                          >{result.status.toUpperCase()}</span>
                        </div>
                        {result.error && (
                          <p className="text-xs mt-2 p-2 rounded break-words" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>{result.error}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          {result.steps.map((step, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs">
                              <span className="shrink-0" style={{ color: step.status === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>
                                {step.status === 'pass' ? '✓' : '✗'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{step.step}</span>
                            </div>
                          ))}
                        </div>
                        {result.aiAnalysis && (
                          <div className="mt-2 p-2 rounded text-xs break-words" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                            <strong>AI:</strong> {result.aiAnalysis}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <p className="text-3xl md:text-4xl mb-3">📋</p>
                    <p className="text-sm">Select a run to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 md:p-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs truncate max-w-[200px] md:max-w-none" style={{ color: 'var(--text-tertiary)' }}>
            {isRunning && currentTest && <span>Running: {currentTest.title}</span>}
            {!isRunning && results.length > 0 && <span>{results.length} tests completed</span>}
            {!isRunning && results.length === 0 && activeTab === 'runner' && <span className="hidden sm:inline">Config saved per project</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isRunning}
              className="px-3 md:px-4 py-2 text-sm rounded disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >Close</button>
            {activeTab === 'runner' && (
              isRunning ? (
                <button onClick={stopTests}
                  className="px-3 md:px-4 py-2 text-sm rounded flex items-center gap-2"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >■ Stop</button>
              ) : (
                <button onClick={runTests} disabled={selectedTests.size === 0}
                  className="px-3 md:px-4 py-2 text-sm rounded disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >▶ Run</button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Healing Report Modal */}
      {showHealingReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>🔧 Healing Report</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>AI recommendations</p>
              </div>
              <button onClick={() => setShowHealingReport(false)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap text-xs font-mono break-words" style={{ color: 'var(--text-secondary)' }}>{healingReport}</pre>
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
