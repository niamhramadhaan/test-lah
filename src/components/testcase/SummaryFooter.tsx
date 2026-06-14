'use client'

import { useState, useRef, useEffect } from 'react'
import { FlowNode, TestCase } from '@/types'
import { TestStats } from '@/hooks/useTestCases'

interface SummaryFooterProps {
  stats: TestStats
  fullscreen?: boolean
  nodes?: FlowNode[]
  allTestCases?: Record<string, TestCase[]>
  selectedNodeId?: string | null
  onSelectNode?: (nodeId: string) => void
}

export function SummaryFooter({ stats, fullscreen, nodes, allTestCases, selectedNodeId, onSelectNode }: SummaryFooterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 text-xs border-t flex-wrap relative"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong></span>
      <span>
        Pass: <strong style={{ color: 'var(--status-pass-text)' }}>{stats.pass}</strong>
        {stats.total > 0 && ` (${stats.passRate}%)`}
      </span>
      <span>Fail: <strong style={{ color: 'var(--status-fail-text)' }}>{stats.fail}</strong></span>
      <span>Skip: <strong style={{ color: 'var(--status-skip-text)' }}>{stats.skip}</strong></span>
      <span>Untested: <strong style={{ color: 'var(--status-untested-text)' }}>{stats.untested}</strong></span>

      {/* Fullscreen node jump dropdown */}
      {fullscreen && nodes && nodes.length > 0 && (
        <div className="ml-auto relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 12 16 16 12" />
              <line x1="12" y1="8" x2="12" y2="16" />
            </svg>
            {nodes.find(n => n.id === selectedNodeId)?.label || 'Jump to node'}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute z-50 bottom-full right-0 mb-1 w-56 max-h-[240px] overflow-y-auto rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)',
                animation: 'fadeInUp 150ms ease-out',
              }}
            >
              {nodes.map(node => {
                const cases = allTestCases?.[node.id] ?? []
                const isActive = node.id === selectedNodeId
                const passCount = cases.filter(tc => tc.status === 'pass').length
                const failCount = cases.filter(tc => tc.status === 'fail').length
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      onSelectNode?.(node.id)
                      setDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-left transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{
                      backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <span className="truncate font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {node.label}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {cases.length > 0 && (
                        <>
                          {failCount > 0 && <span style={{ color: 'var(--status-fail-text)', fontSize: 9 }}>{failCount}f</span>}
                          {passCount > 0 && <span style={{ color: 'var(--status-pass-text)', fontSize: 9 }}>{passCount}p</span>}
                          <span className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>{cases.length}</span>
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
