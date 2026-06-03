'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FlowNode, TestCase, ColumnConfig, DEFAULT_COLUMNS } from '@/types'
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
import { Dock, DockIcon } from '@/components/ui/dock'
import { Separator } from '@/components/ui/separator'
import type { GeneratedTestCase } from '@/lib/llm'

interface TestCasePanelProps {
  selectedNode: FlowNode | null
  testCases: TestCase[]
  stats: TestStats
  columns: ColumnConfig[]
  projectId: string
  fullscreen?: boolean
  onAddTestCase: (nodeId: string, title: string, steps?: string, expected?: string) => void
  onUpdateTestCase: (nodeId: string, tcId: string, patch: Partial<TestCase>) => void
  onDeleteTestCase: (nodeId: string, tcId: string) => void
  onReorderTestCases: (nodeId: string, newOrder: string[]) => void
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
  fullscreen,
  onAddTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onReorderTestCases,
  onToggleColumn,
  onRenameColumn,
  onUpdateNode,
  onAddColumn,
  onDeleteColumn,
  confirmDialog,
}: TestCasePanelProps) {
  const router = useRouter()
  const [notesOpen, setNotesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [expandAll, setExpandAll] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const newColInputRef = useRef<HTMLInputElement>(null)
  const columnsTrayRef = useRef<HTMLDivElement>(null)

  const visibleColumns = fullscreen ? columns : columns.filter(c => c.key !== 'code')
  const defaultKeys = DEFAULT_COLUMNS.map(c => c.key)

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
            testCases={testCases}
            columns={visibleColumns}
            expandAll={expandAll}
            onUpdate={(tcId, patch) => onUpdateTestCase(selectedNode.id, tcId, patch)}
            onDelete={tcId => onDeleteTestCase(selectedNode.id, tcId)}
            onReorder={newOrder => onReorderTestCases(selectedNode.id, newOrder)}
          />
        )}
      </div>

      {/* Summary footer */}
      <SummaryFooter stats={stats} />

      {/* Dock at bottom */}
      <div className="flex-shrink-0 border-t py-2 flex justify-center relative" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
        {/* Columns tray — positioned above dock center */}
        {columnsOpen && (
          <div
            ref={columnsTrayRef}
            className="absolute z-30 rounded-xl border"
            style={{
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeInUp 200ms ease-out',
              width: 180,
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <h4 className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Columns</h4>
              <button
                onClick={() => setColumnsOpen(false)}
                className="text-[10px] opacity-50 hover:opacity-100"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ×
              </button>
            </div>
            <div className="py-1 max-h-[240px] overflow-y-auto">
              {visibleColumns.map(col => {
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
                        className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover/col:opacity-100 hover:opacity-100 transition-opacity text-[10px]"
                        style={{ color: 'var(--status-fail-text)' }}
                        title={`Delete ${col.label}`}
                      >
                        ×
                      </button>
                    )}
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
                  <span>Add New Column</span>
                </button>
              )}
            </div>
          </div>
        )}

        <Dock direction="middle" iconSize={32} iconMagnification={44} iconDistance={100}>
          {/* Summary — node-level */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setSummaryOpen(true)}
                className="w-full h-full flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                Node Summary
              </div>
            </div>
          </DockIcon>

          <Separator orientation="vertical" className="h-full" />

          {/* Notes */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setNotesOpen(!notesOpen)}
                className="w-full h-full flex items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: notesOpen ? 'var(--bg-secondary)' : 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={notesOpen ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                Notes
              </div>
            </div>
          </DockIcon>

          {/* Export */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setExportOpen(true)}
                className="w-full h-full flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                Export
              </div>
            </div>
          </DockIcon>

          {/* Columns */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setColumnsOpen(!columnsOpen)}
                className="w-full h-full flex items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: columnsOpen ? 'var(--bg-secondary)' : 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={columnsOpen ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                Columns
              </div>
            </div>
          </DockIcon>

          {/* Expand All */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setExpandAll(prev => !prev)}
                className="w-full h-full flex items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: expandAll ? 'var(--bg-secondary)' : 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={expandAll ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {expandAll ? (
                    <>
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  ) : (
                    <>
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  )}
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                {expandAll ? 'Collapse All' : 'Expand All'}
              </div>
            </div>
          </DockIcon>

          <Separator orientation="vertical" className="h-full" />

          {/* Generate */}
          <DockIcon>
            <div className="relative group">
              <button
                onClick={() => setGenerateOpen(true)}
                className="w-full h-full flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                Generate
              </div>
            </div>
          </DockIcon>
        </Dock>
      </div>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        node={selectedNode}
        testCases={testCases}
      />
      <GenerateTestModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        node={selectedNode}
        onGenerate={handleGenerate}
      />
      <NodeSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        node={selectedNode}
        testCases={testCases}
        stats={stats}
      />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
