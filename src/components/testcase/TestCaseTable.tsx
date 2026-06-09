'use client'

import { TestCase, ColumnConfig } from '@/types'
import { TestCaseRow } from './TestCaseRow'

interface TestCaseTableProps {
  testCases: TestCase[]
  columns: ColumnConfig[]
  expandAll: boolean
  selectedIds: Set<string>
  onToggleSelect: (tcId: string) => void
  onToggleSelectAll: () => void
  onUpdate: (tcId: string, patch: Partial<TestCase>) => void
  onDelete: (tcId: string) => void
  onReorder: (newOrder: string[]) => void
}

export function TestCaseTable({
  testCases,
  columns,
  expandAll,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
  onDelete,
  onReorder,
}: TestCaseTableProps) {
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
            {visibleCols.map(col => (
              <th
                key={col.key}
                className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider border-b"
                style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)', whiteSpace: 'nowrap' }}
              >
                {col.label}
              </th>
            ))}
            <th className="w-6 border-b" style={{ borderColor: 'var(--border)' }} />
          </tr>
        </thead>
        <tbody>
          {testCases.map(tc => (
            <TestCaseRow
              key={tc.id}
              tc={tc}
              visibleCols={visibleCols}
              expandAll={expandAll}
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
