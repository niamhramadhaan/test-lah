'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from 'next/navigation'
import { FlowNode, TestCase, ColumnConfig, DEFAULT_COLUMNS, Status, CASE_TYPES, Project } from '@/types'
import { TestStats } from '@/hooks/useTestCases'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { QuickAddBar } from './QuickAddBar'
import { TestCaseTable } from './TestCaseTable'
import { ColumnConfigDropdown } from './ColumnConfig'
import { SummaryFooter } from './SummaryFooter'
import { ExportModal } from './ExportModal'
import { GenerateTestModal } from './GenerateTestModal'
import { NodeSummaryModal } from './NodeSummaryModal'
import { ImportTestCasesModal } from './ImportTestCasesModal'
import { E2ETestRunner } from './E2ETestRunner'
import { LinkedIssuesSection } from './LinkedIssuesSection'
import { Dock, DockIcon } from '@/components/ui/dock'
import { exportNodeAsMarkdown, exportNodeAsJSON } from '@/lib/export'
import type { GeneratedTestCase } from '@/lib/llm'

interface TestCasePanelProps {
  selectedNode: FlowNode | null
  testCases: TestCase[]
  stats: TestStats
  columns: ColumnConfig[]
  projectId: string
  project?: Pick<Project, 'name' | 'type' | 'notes' | 'githubRepo'> | null
  fullscreen?: boolean
  allNodes?: FlowNode[]
  allTestCases?: Record<string, TestCase[]>
  onSelectNode?: (nodeId: string) => void
  onAddTestCase: (nodeId: string, title: string, steps?: string, expected?: string) => void
  onUpdateTestCase: (nodeId: string, tcId: string, patch: Partial<TestCase>) => void
  onDeleteTestCase: (nodeId: string, tcId: string) => void
  onBulkDelete: (nodeId: string, tcIds: string[]) => void
  onBulkUpdate: (nodeId: string, tcIds: string[], patch: Partial<TestCase>) => void
  onReorderTestCases: (nodeId: string, newOrder: string[]) => void
  onReorderColumn?: (nodeId: string, key: string, direction: 'up' | 'down') => void
  onToggleColumn: (nodeId: string, key: string) => void
  onRenameColumn: (nodeId: string, key: string, label: string) => void
  onUpdateNode: (id: string, patch: Partial<FlowNode>) => void
  onAddColumn?: (nodeId: string, label: string) => void
  onDeleteColumn?: (nodeId: string, key: string) => void
  confirmDialog?: (title: string, message: string) => Promise<boolean>
}

export function TestCasePanel({
  selectedNode,
  testCases,
  stats,
  columns,
  projectId,
  project,
  fullscreen,
  allNodes,
  allTestCases,
  onSelectNode,
  onAddTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onBulkDelete,
  onBulkUpdate,
  onReorderTestCases,
  onReorderColumn,
  onToggleColumn,
  onRenameColumn,
  onUpdateNode,
  onAddColumn,
  onDeleteColumn,
  confirmDialog,
}: TestCasePanelProps) {
  const router = useRouter()
  const [notesOpen, setNotesOpen] = useState(false)
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [e2eRunnerOpen, setE2eRunnerOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [expandAll, setExpandAll] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set())
  const [caseTypeFilters, setCaseTypeFilters] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const newColInputRef = useRef<HTMLInputElement>(null)
  const columnsTrayRef = useRef<HTMLDivElement>(null)

  const visibleColumns = fullscreen ? columns : columns.filter(c => c.key !== 'code')
  const defaultKeys = DEFAULT_COLUMNS.map(c => c.key)

  // Clear selection when node changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedNode?.id])

  // Selection helpers
  const toggleSelect = useCallback((tcId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(tcId)) next.delete(tcId)
      else next.add(tcId)
      return next
    })
  }, [])

  // Filter helpers
  const toggleStatusFilter = useCallback((status: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

  const clearStatusFilters = useCallback(() => setStatusFilters(new Set()), [])

  const toggleCaseTypeFilter = useCallback((ct: string) => {
    setCaseTypeFilters(prev => {
      const next = new Set(prev)
      if (next.has(ct)) next.delete(ct)
      else next.add(ct)
      return next
    })
  }, [])

  const clearCaseTypeFilters = useCallback(() => setCaseTypeFilters(new Set()), [])

  const activeFilterCount = statusFilters.size + caseTypeFilters.size

  // Filter by status + case type
  const filteredTestCases = testCases.filter(tc => {
    const statusMatch = statusFilters.size === 0 || statusFilters.has(tc.status)
    const typeMatch = caseTypeFilters.size === 0 || caseTypeFilters.has(tc.case_type)
    return statusMatch && typeMatch
  })

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTestCases.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTestCases.map(tc => tc.id)))
    }
  }, [selectedIds.size, filteredTestCases])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBulkDelete = useCallback(async () => {
    if (!selectedNode || selectedIds.size === 0) return
    if (confirmDialog) {
      const ok = await confirmDialog('Delete Test Cases', `Delete ${selectedIds.size} selected test case(s)?`)
      if (!ok) return
    }
    onBulkDelete(selectedNode.id, Array.from(selectedIds))
    setSelectedIds(new Set())
  }, [selectedNode, selectedIds, onBulkDelete, confirmDialog])

  const handleBulkStatus = useCallback((status: Status) => {
    if (!selectedNode || selectedIds.size === 0) return
    onBulkUpdate(selectedNode.id, Array.from(selectedIds), { status })
    setSelectedIds(new Set())
  }, [selectedNode, selectedIds, onBulkUpdate])

  const handleSortChange = (key: string | null) => {
    if (key === null) {
      setSortKey(null)
    } else if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedTestCases = sortKey ? [...filteredTestCases].sort((a, b) => {
    const aVal = (a[sortKey as keyof TestCase] as string) || ''
    const bVal = (b[sortKey as keyof TestCase] as string) || ''
    const cmp = aVal.localeCompare(bVal)
    return sortDirection === 'asc' ? cmp : -cmp
  }) : filteredTestCases

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    if (!selectMode || selectedIds.size === 0) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); handleBulkStatus('pass') }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleBulkStatus('fail') }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); handleBulkStatus('skip') }
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); handleBulkStatus('untested') }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); handleBulkStatus('blocked') }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handleBulkDelete() }
      if (e.key === 'Escape') { e.preventDefault(); clearSelection() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectMode, selectedIds.size, handleBulkStatus, handleBulkDelete, clearSelection])

  // Focus new column input
  useEffect(() => {
    if (addingColumn && newColInputRef.current) newColInputRef.current.focus()
  }, [addingColumn])

  // Close columns tray when clicking outside
  useEffect(() => {
    if (!columnsOpen) return
    const handler = (e: MouseEvent) => {
      if (columnsTrayRef.current && !columnsTrayRef.current.contains(e.target as Node)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [columnsOpen])

  const handleGenerate = useCallback((cases: GeneratedTestCase[]) => {
    if (!selectedNode) return
    for (const tc of cases) {
      onAddTestCase(selectedNode.id, tc.title, tc.steps, tc.expected)
    }
  }, [selectedNode, onAddTestCase])

  const handleImport = useCallback((cases: Array<{ title: string; steps: string; expected: string }>) => {
    if (!selectedNode) return
    for (const tc of cases) {
      onAddTestCase(selectedNode.id, tc.title, tc.steps, tc.expected)
    }
  }, [selectedNode, onAddTestCase])

  if (!selectedNode) {
    return (
      <div className="h-full">
        <EmptyState message="Select a node from the mindmap to view its test cases." />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          {selectedNode.label}
        </h2>
        <ProgressBar value={stats.passRate} />

        {/* Filter and action row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {/* Select mode controls */}
          <button
            onClick={() => {
              setSelectMode(prev => !prev)
              if (selectMode) setSelectedIds(new Set())
            }}
            className="px-3 py-0.5 text-[10px] font-medium rounded-sm border transition-colors"
            style={{
              backgroundColor: selectMode ? 'var(--accent)' : 'transparent',
              color: selectMode ? '#fff' : 'var(--text-tertiary)',
              borderColor: selectMode ? 'transparent' : 'var(--border)',
            }}
          >
            Select
          </button>
          {selectMode && selectedIds.size > 0 && (
            <>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-sm" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="px-2 py-0.5 text-[10px] font-medium rounded-sm border transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Unselect All
              </button>
            </>
          )}

          {/* Filter toggle */}
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => setFiltersOpen(prev => !prev)}
              className="relative p-1 rounded-sm transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: activeFilterCount > 0 || filtersOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
              title="Filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeFilterCount > 0 ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            {activeFilterCount > 0 && !filtersOpen && (
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Action buttons */}
          <button
            onClick={() => setNotesOpen(prev => !prev)}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ color: notesOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title="Notes"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => project?.githubRepo && setIssuesOpen(prev => !prev)}
            disabled={!project?.githubRepo}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: issuesOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title={project?.githubRepo ? 'Linked GitHub Issues' : 'Link a repo in project summary first'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </button>
          <button
            onClick={() => setExpandAll(prev => !prev)}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ color: expandAll ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title={expandAll ? 'Collapse All' : 'Expand All'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {expandAll ? (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                  <polyline points="7 3 3 6 7 9" />
                  <polyline points="17 15 21 18 17 21" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                  <polyline points="17 3 21 6 17 9" />
                  <polyline points="7 15 3 18 7 21" />
                </>
              )}
            </svg>
          </button>
        </div>

          {/* Expandable filter pills — inline */}
          {filtersOpen && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--border)' }} />
              {([['all', 'All'], ['untested', 'Untested'], ['pass', 'Pass'], ['fail', 'Fail'], ['skip', 'Skip'], ['blocked', 'Blocked']] as const).map(([value, label]) => {
                const isActive = value === 'all' ? statusFilters.size === 0 : statusFilters.has(value)
                const count = value === 'all' ? testCases.length : testCases.filter(tc => tc.status === value).length
                const colors: Record<string, { bg: string; text: string }> = {
                  all: { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
                  untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)' },
                  pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
                  fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
                  skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)' },
                  blocked: { bg: 'var(--status-blocked-bg)', text: 'var(--status-blocked-text)' },
                }
                const c = colors[value]
                return (
                  <button
                    key={value}
                    onClick={() => value === 'all' ? clearStatusFilters() : toggleStatusFilter(value)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors"
                    style={{
                      backgroundColor: isActive ? c.bg : 'transparent',
                      color: isActive ? c.text : 'var(--text-tertiary)',
                      borderColor: isActive ? 'transparent' : 'var(--border)',
                    }}
                  >
                    {label}
                    <span
                      className="px-1 py-0 text-[9px] rounded-full min-w-[16px] text-center"
                      style={{
                        backgroundColor: isActive ? 'rgba(0,0,0,0.1)' : 'var(--bg-secondary)',
                        color: isActive ? c.text : 'var(--text-tertiary)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
              <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--border)' }} />
              {([['all', 'All'], ...CASE_TYPES.map(ct => [ct, ct] as const)] as const).map(([value, label]) => {
                const isActive = value === 'all' ? caseTypeFilters.size === 0 : caseTypeFilters.has(value)
                const count = value === 'all' ? testCases.length : testCases.filter(tc => tc.case_type === value).length
                const typeColors: Record<string, { bg: string; text: string }> = {
                  all: { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
                  Positive: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
                  Negative: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
                  General: { bg: 'var(--bg-secondary)', text: 'var(--text-tertiary)' },
                }
                const c = typeColors[value] || typeColors.General
                return (
                  <button
                    key={`ct-${value}`}
                    onClick={() => value === 'all' ? clearCaseTypeFilters() : toggleCaseTypeFilter(value)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors"
                    style={{
                      backgroundColor: isActive ? c.bg : 'transparent',
                      color: isActive ? c.text : 'var(--text-tertiary)',
                      borderColor: isActive ? 'transparent' : 'var(--border)',
                    }}
                  >
                    {label}
                    <span
                      className="px-1 py-0 text-[9px] rounded-full min-w-[16px] text-center"
                      style={{
                        backgroundColor: isActive ? 'rgba(0,0,0,0.1)' : 'var(--bg-secondary)',
                        color: isActive ? c.text : 'var(--text-tertiary)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
      </div>

      {/* Notes section */}
      {notesOpen && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Node Notes</label>
          <textarea
            value={selectedNode.notes ?? ''}
            onChange={e => onUpdateNode(selectedNode.id, { notes: e.target.value })}
            placeholder="Add notes for this node..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none border resize-none"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {/* Linked GitHub Issues section */}
      {issuesOpen && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Linked GitHub Issues</label>
          <LinkedIssuesSection node={selectedNode} githubRepo={project?.githubRepo} onUpdateNode={onUpdateNode} />
        </div>
      )}

      {/* Quick add bar */}
      <div className="px-4 py-3">
        <QuickAddBar
          onAdd={title => onAddTestCase(selectedNode.id, title)}
          nodeLabel={selectedNode.label}
        />
      </div>

      {/* Test case table */}
      <div className="flex-1 min-h-0 overflow-auto px-2">
        {testCases.length === 0 ? (
          <EmptyState message="No test cases yet. Use the quick-add bar or Generate button to add test cases." />
        ) : (
          <TestCaseTable
            testCases={sortedTestCases}
            columns={visibleColumns}
            expandAll={expandAll}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onUpdate={(tcId, patch) => onUpdateTestCase(selectedNode.id, tcId, patch)}
            onDelete={tcId => onDeleteTestCase(selectedNode.id, tcId)}
            onReorder={newOrder => onReorderTestCases(selectedNode.id, newOrder)}
            onAddColumn={onAddColumn ? (name: string) => onAddColumn(selectedNode.id, name) : undefined}
            onOpenColumns={() => setColumnsOpen(true)}
          />
        )}
      </div>

      {/* Bulk action bar — bottom of table area */}
      {selectMode && selectedIds.size > 0 && (
        <div
          className="px-4 py-2 border-t flex items-center gap-3"
          style={{ borderColor: 'var(--border)', animation: 'fadeInUp 150ms ease-out' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size} selected
          </span>

          <div className="flex-1" />

          {/* Bulk status buttons with keyboard shortcuts */}
          {([['pass', 'P'], ['fail', 'F'], ['skip', 'K'], ['untested', 'U'], ['blocked', 'B']] as const).map(([status, key]) => (
            <button
              key={status}
              onClick={() => handleBulkStatus(status)}
              className="px-2 py-1 text-[10px] font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title={`Mark ${status} (${key})`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <kbd className="ml-1 text-[8px] px-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{key}</kbd>
            </button>
          ))}

          <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

          {/* Bulk delete */}
          <button
            onClick={handleBulkDelete}
            className="px-2 py-1 text-[10px] font-medium rounded-md border transition-colors hover:bg-[var(--status-fail-bg)]"
            style={{ borderColor: 'var(--border)', color: 'var(--status-fail-text)' }}
            title="Delete (D)"
          >
            Delete
            <kbd className="ml-1 text-[8px] px-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>D</kbd>
          </button>

          {/* Clear selection */}
          <button
            onClick={clearSelection}
            className="px-1.5 py-1 text-[10px] font-medium rounded-md transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-tertiary)' }}
            title="Clear (Esc)"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary footer */}
      <SummaryFooter
        stats={stats}
        fullscreen={fullscreen}
        nodes={allNodes}
        allTestCases={allTestCases}
        selectedNodeId={selectedNode?.id}
        onSelectNode={onSelectNode}
      />

      {/* Dock at bottom */}
      <div className="flex-shrink-0 border-t py-2 flex justify-center relative" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
        {/* Columns tray — positioned above dock, centered */}
        {columnsOpen && (
          <div
            ref={columnsTrayRef}
            className="absolute z-30 rounded-lg border"
            style={{
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 4,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 150ms ease-out',
              width: 180,
            }}
          >
            <div className="py-1 max-h-[240px] overflow-y-auto">
              {columns.map((col, colIdx) => {
                const isCustom = !defaultKeys.includes(col.key)
                return (
                  <div
                    key={col.key}
                    className="flex items-center justify-between px-3 py-1.5 text-[11px] hover:bg-[var(--bg-secondary)] transition-colors group/col"
                  >
                    <button
                      onClick={() => selectedNode && onToggleColumn(selectedNode.id, col.key)}
                      className="flex items-center gap-2 flex-1 text-left"
                      style={{ color: col.visible ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                    >
                      <span className="w-3 text-center">{col.visible ? '✓' : ''}</span>
                      <span>{col.label}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                      <button
                        onClick={() => selectedNode && onReorderColumn?.(selectedNode.id, col.key, 'up')}
                        disabled={colIdx === 0}
                        className="w-4 h-4 flex items-center justify-center rounded text-[10px] disabled:opacity-20 hover:bg-[var(--bg-secondary)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => selectedNode && onReorderColumn?.(selectedNode.id, col.key, 'down')}
                        disabled={colIdx === columns.length - 1}
                        className="w-4 h-4 flex items-center justify-center rounded text-[10px] disabled:opacity-20 hover:bg-[var(--bg-secondary)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Move down"
                      >
                        ↓
                      </button>
                      {isCustom && (
                        <button
                          onClick={async () => {
                            if (!selectedNode || !onDeleteColumn) return
                            const hasData = testCases.some(tc => {
                              const val = (tc as unknown as Record<string, unknown>)[col.key]
                              return val && typeof val === 'string' && val.trim() !== ''
                            })
                            if (hasData && confirmDialog) {
                              const ok = await confirmDialog('Delete Column', `This column has data in some test cases. Delete "${col.label}" anyway?`)
                              if (!ok) return
                            }
                            onDeleteColumn(selectedNode.id, col.key)
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded hover:opacity-100 transition-opacity text-[10px]"
                          style={{ color: 'var(--status-fail-text)' }}
                          title={`Delete ${col.label}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Add new column — inline */}
              {addingColumn ? (
                <div className="px-3 py-1.5">
                  <input
                    ref={newColInputRef}
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newColName.trim()) {
                        onAddColumn?.(selectedNode!.id, newColName.trim())
                        setNewColName('')
                        setAddingColumn(false)
                      }
                      if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') }
                    }}
                    onBlur={() => {
                      if (newColName.trim()) {
                        onAddColumn?.(selectedNode!.id, newColName.trim())
                      }
                      setNewColName('')
                      setAddingColumn(false)
                    }}
                    placeholder="Column name..."
                    className="w-full px-2 py-1 text-[11px] rounded border outline-none"
                    style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full px-3 py-1.5 text-[11px] text-left flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <span className="w-3 text-center">+</span>
                  <span>Add Column</span>
                </button>
              )}
            </div>
          </div>
        )}

        <Dock direction="middle" iconSize={36}>
          {/* Category 1: View */}
          <DockIcon label="Summary" onClick={() => setSummaryOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </DockIcon>
          <DockIcon label="Columns" onClick={() => setColumnsOpen(!columnsOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={columnsOpen ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </DockIcon>

          <div className="w-px h-5 mx-0.5 flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />

          {/* Category 2: Data */}
          {/* Transfer — hover expands to show Export | Import */}
          <TransferDockIcon
            onExport={() => setExportOpen(true)}
            onImport={() => setImportOpen(true)}
          />

          {/* Copy — hover expands to show Markdown | JSON */}
          <CopyDockIcon
            selectedNode={selectedNode}
            filteredTestCases={filteredTestCases}
            columns={columns}
          />

          <div className="w-px h-5 mx-0.5 flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />

          {/* Category 3: Tools */}
          <DockIcon label="E2E Test" onClick={() => setE2eRunnerOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </DockIcon>
          <DockIcon label="Generate" onClick={() => setGenerateOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </DockIcon>
        </Dock>
      </div>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        node={selectedNode}
        testCases={sortedTestCases}
        columns={columns}
      />
      <GenerateTestModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        node={selectedNode}
        project={project}
        onGenerate={handleGenerate}
      />
      <NodeSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        node={selectedNode}
        testCases={testCases}
        stats={stats}
      />
      <ImportTestCasesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        nodeLabel={selectedNode.label}
      />

      {e2eRunnerOpen && selectedNode && (
        <E2ETestRunner
          testCases={testCases}
          projectId={projectId}
          nodeId={selectedNode.id}
          onUpdateTestCase={onUpdateTestCase}
          onClose={() => setE2eRunnerOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function CopyDockIcon({ selectedNode, filteredTestCases, columns }: {
  selectedNode: FlowNode
  filteredTestCases: TestCase[]
  columns: ColumnConfig[]
}) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState<'md' | 'json' | null>(null)

  const handleCopy = (format: 'md' | 'json') => {
    const text = format === 'md'
      ? exportNodeAsMarkdown(selectedNode, filteredTestCases, columns)
      : exportNodeAsJSON(selectedNode, filteredTestCases)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(format)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div
      className="relative flex items-center cursor-pointer rounded-lg"
      style={{ height: 36 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        {hovered && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none" style={{ opacity: 0.15 }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'dockShimmer 1.5s ease-in-out',
            }} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-0 overflow-hidden whitespace-nowrap flex-shrink-0"
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy('md') }}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: copied === 'md' ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {copied === 'md' ? 'Copied!' : 'Markdown'}
            </button>
            <span className="text-[10px]" style={{ color: 'var(--border)' }}>|</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy('json') }}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: copied === 'json' ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {copied === 'json' ? 'Copied!' : 'JSON'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TransferDockIcon({ onExport, onImport }: {
  onExport: () => void
  onImport: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative flex items-center cursor-pointer rounded-lg"
      style={{ height: 36 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 014-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 01-4 4H3" />
        </svg>
        {hovered && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none" style={{ opacity: 0.15 }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'dockShimmer 1.5s ease-in-out',
            }} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-0 overflow-hidden whitespace-nowrap flex-shrink-0"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onExport() }}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Export
            </button>
            <span className="text-[10px]" style={{ color: 'var(--border)' }}>|</span>
            <button
              onClick={(e) => { e.stopPropagation(); onImport() }}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Import
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
