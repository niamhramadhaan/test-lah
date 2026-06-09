'use client'

import { TestCase, ColumnConfig } from '@/types'
import { TestCaseRow } from './TestCaseRow'

export type SortDirection = 'asc' | 'desc'

interface TestCaseTableProps {
  testCases: TestCase[]
  columns: ColumnConfig[]
  expandAll: boolean
  sortKey?: string | null
  sortDirection?: SortDirection
  onSortChange?: (key: string | null) => void
  onUpdate: (tcId: string, patch: Partial<TestCase>) => void
  onDelete: (tcId: string) => void
  onReorder: (newOrder: string[]) => void
}

const SORTABLE_KEYS = new Set(['case_type', 'status'])

export function TestCaseTable({ testCases, columns, expandAll, sortKey, sortDirection, onSortChange, onUpdate, onDelete, onReorder }: TestCaseTableProps) {
  const visibleCols = columns.filter(c => c.visible)

  const handleHeaderClick = (key: string) => {
    if (!SORTABLE_KEYS.has(key) || !onSortChange) return
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        onSortChange(key)
      } else {
        onSortChange(null)
      }
    } else {
      onSortChange(key)
    }
  }

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
            {visibleCols.map(col => {
              const isSortable = SORTABLE_KEYS.has(col.key)
              const isActive = sortKey === col.key
              return (
                <th
                  key={col.key}
                  className={`px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider border-b ${isSortable ? 'cursor-pointer select-none hover:text-[var(--text-secondary)]' : ''}`}
                  style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)', borderColor: 'var(--border)', whiteSpace: 'nowrap' }}
                  onClick={() => handleHeaderClick(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {isActive && (
                      <span className="text-[8px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              )
            })}
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
