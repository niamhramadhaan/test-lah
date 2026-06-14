'use client'

import { useState, useRef, useEffect } from 'react'
import { TestCase, ColumnConfig } from '@/types'
import { TestCaseRow } from './TestCaseRow'

interface TestCaseTableProps {
  testCases: TestCase[]
  columns: ColumnConfig[]
  expandAll: boolean
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (tcId: string) => void
  onToggleSelectAll: () => void
  sortKey: string | null
  sortDirection: 'asc' | 'desc'
  onSortChange: (key: string | null) => void
  onUpdate: (tcId: string, patch: Partial<TestCase>) => void
  onDelete: (tcId: string) => void
  onReorder: (newOrder: string[]) => void
  onAddColumn?: (name: string) => void
  onOpenColumns?: () => void
}

export function TestCaseTable({
  testCases,
  columns,
  expandAll,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortKey,
  sortDirection,
  onSortChange,
  onUpdate,
  onDelete,
  onReorder,
  onAddColumn,
  onOpenColumns,
}: TestCaseTableProps) {
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const newColRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingCol && newColRef.current) newColRef.current.focus()
  }, [addingCol])

  const handleAddCol = () => {
    if (newColName.trim() && onAddColumn) {
      onAddColumn(newColName.trim())
    }
    setNewColName('')
    setAddingCol(false)
  }

  const visibleCols = columns.filter(c => c.visible)
  const allSelected = testCases.length > 0 && testCases.every(tc => selectedIds.has(tc.id))
  const someSelected = testCases.some(tc => selectedIds.has(tc.id))

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId === targetId) return
    const ids = testCases.map(tc => tc.id)
    const fromIdx = ids.indexOf(sourceId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...ids]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, sourceId)
    onReorder(newOrder)
  }

  if (testCases.length === 0) return null

  return (
    <div className="overflow-x-auto" style={{ minWidth: 0 }}>
      <table className="text-xs" style={{ minWidth: '900px', width: '100%' }}>
        <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <tr>
            {/* Checkbox header */}
            {selectMode && (
              <th className="px-2 py-1.5 border-b" style={{ borderColor: 'var(--border)', width: 28 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={onToggleSelectAll}
                  className="cursor-pointer accent-[var(--accent)]"
                  style={{ width: 14, height: 14 }}
                />
              </th>
            )}
            {visibleCols.map(col => (
              <th
                key={col.key}
                className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider border-b cursor-pointer select-none hover:bg-[var(--bg-secondary)] transition-colors"
                style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)', whiteSpace: 'nowrap', minWidth: col.key === 'code' ? 60 : undefined }}
                onClick={() => onSortChange(col.key)}
              >
                <div className="flex items-center gap-1">
                  <span>{col.label}</span>
                  {sortKey === col.key && (
                    <span className="text-[8px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="w-8 border-b" style={{ borderColor: 'var(--border)' }}>
              {addingCol ? (
                <input
                  ref={newColRef}
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCol()
                    if (e.key === 'Escape') { setAddingCol(false); setNewColName('') }
                  }}
                  onBlur={handleAddCol}
                  placeholder="Name..."
                  className="w-16 px-1 py-0.5 text-[10px] rounded border outline-none"
                  style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                />
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-5 h-5 flex items-center justify-center rounded text-[10px] transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="Add column"
                >
                  +
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {testCases.map(tc => (
            <TestCaseRow
              key={tc.id}
              tc={tc}
              visibleCols={visibleCols}
              expandAll={expandAll}
              selectMode={selectMode}
              selected={selectedIds.has(tc.id)}
              onToggleSelect={() => onToggleSelect(tc.id)}
              onUpdate={patch => onUpdate(tc.id, patch)}
              onDelete={() => onDelete(tc.id)}
              onDragStart={e => handleDragStart(e, tc.id)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, tc.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
