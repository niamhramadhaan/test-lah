'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { FlowNode, TestCase } from '@/types'

interface TestCaseSearchProps {
  nodes: FlowNode[]
  testCases: Record<string, TestCase[]>
  onSelectNode: (nodeId: string) => void
  onClose: () => void
}

interface SearchResult {
  node: FlowNode
  testCase: TestCase
  matchField: 'title' | 'steps' | 'expected' | 'code'
  matchText: string
}

export function TestCaseSearch({ nodes, testCases, onSelectNode, onClose }: TestCaseSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    const matches: SearchResult[] = []

    for (const node of nodes) {
      const cases = testCases[node.id] ?? []
      for (const tc of cases) {
        const titleMatch = tc.title.toLowerCase().includes(q)
        const stepsMatch = tc.steps.toLowerCase().includes(q)
        const expectedMatch = tc.expected.toLowerCase().includes(q)
        const codeMatch = tc.code.toLowerCase().includes(q)

        if (titleMatch || stepsMatch || expectedMatch || codeMatch) {
          let matchField: SearchResult['matchField'] = 'title'
          let matchText = tc.title

          if (stepsMatch) { matchField = 'steps'; matchText = tc.steps }
          else if (expectedMatch) { matchField = 'expected'; matchText = tc.expected }
          else if (codeMatch) { matchField = 'code'; matchText = tc.code }

          matches.push({ node, testCase: tc, matchField, matchText })
        }
      }
    }

    return matches
  }, [query, nodes, testCases])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = useCallback((result: SearchResult) => {
    onSelectNode(result.node.id)
    onClose()
  }, [onSelectNode, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }, [results, selectedIndex, handleSelect, onClose])

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + q.length)
    const after = text.slice(idx + q.length)
    return (
      <>
        {before.length > 30 && '...'}{before.length > 30 ? before.slice(-30) : before}
        <mark style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 2, padding: '0 1px' }}>{match}</mark>
        {after.slice(0, 40)}{after.length > 40 && '...'}
      </>
    )
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)' },
    pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
    fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
    skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)' },
  }

  return (
    <div
      className="fixed inset-0 z-[350] flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search test cases..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No test cases found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.map((result, i) => {
            const sc = statusColors[result.testCase.status] || statusColors.untested
            return (
              <div
                key={`${result.node.id}-${result.testCase.id}`}
                data-search-item
                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                style={{
                  backgroundColor: i === selectedIndex ? 'var(--bg-secondary)' : 'transparent',
                  borderLeft: i === selectedIndex ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: sc.text }}
                />

                <div className="flex-1 min-w-0">
                  {/* Node name */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {result.node.code || result.node.label}
                    </span>
                  </div>

                  {/* Test case title */}
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {highlightMatch(result.testCase.title, query)}
                  </div>

                  {/* Match preview */}
                  {result.matchField !== 'title' && (
                    <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{result.matchField}:</span>{' '}
                      {highlightMatch(result.matchText, query)}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sc.bg, color: sc.text }}
                >
                  {result.testCase.status}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        {query.trim() && results.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <kbd className="text-[9px] px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>↑↓</kbd>
              <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="text-[9px] px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>↵</kbd>
              <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>go to node</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
