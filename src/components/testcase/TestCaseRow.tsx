'use client'

import { useState, useRef, useEffect } from 'react'
import { TestCase, Status, ColumnConfig, CASE_TYPES, type CaseType } from '@/types'
import { StatusPill } from './StatusPill'

interface TestCaseRowProps {
  tc: TestCase
  visibleCols: ColumnConfig[]
  expandAll: boolean
  selected: boolean
  onToggleSelect: () => void
  onUpdate: (patch: Partial<TestCase>) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

const STATUS_ORDER: Status[] = ['untested', 'pass', 'fail', 'skip']

export function TestCaseRow({ tc, visibleCols, expandAll, selected, onToggleSelect, onUpdate, onDelete, onDragStart, onDragOver, onDrop }: TestCaseRowProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [hovered, setHovered] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingKey && inputRef.current) inputRef.current.focus()
  }, [editingKey])

  const startEdit = (key: string) => {
    setEditValue((tc[key as keyof TestCase] as string) ?? '')
    setEditingKey(key)
  }

  const commitEdit = () => {
    if (editingKey) {
      onUpdate({ [editingKey]: editValue })
      setEditingKey(null)
    }
  }

  const updateStatus = (status: Status) => {
    onUpdate({ status })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingKey !== 'steps') commitEdit()
    if (e.key === 'Escape') { setEditingKey(null); setEditValue('') }
    if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      const keys = visibleCols.filter(c => c.key !== 'status' && c.key !== 'code').map(c => c.key)
      const idx = keys.indexOf(editingKey!)
      const next = e.shiftKey ? keys[idx - 1] : keys[idx + 1]
      if (next) startEdit(next)
    }
  }

  const isLongText = (key: string) => {
    const val = tc[key as keyof TestCase] as string
    return val && val.length > 40
  }

  return (
    <>
      <tr
        className="group transition-colors"
        style={{ backgroundColor: hovered ? 'var(--bg-secondary)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Checkbox */}
        <td className="px-2 py-1.5 border-b" style={{ borderColor: 'var(--border)', width: 28 }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="cursor-pointer accent-[var(--accent)]"
            style={{ width: 14, height: 14 }}
          />
        </td>
        {visibleCols.map(col => (
          <td
            key={col.key}
            className="px-2 py-1.5 text-xs border-b"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', maxWidth: col.key === 'steps' || col.key === 'expected' ? 300 : undefined }}
          >
            {col.key === 'status' ? (
              <StatusPill status={tc.status} onChange={updateStatus} />
            ) : col.key === 'code' ? (
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{tc.code || '—'}</span>
            ) : col.key === 'case_type' ? (
              <CaseTypePill
                value={tc.case_type || 'General'}
                onChange={val => onUpdate({ case_type: val })}
              />
            ) : editingKey === col.key ? (
              col.key === 'steps' ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent outline-none border rounded p-1 text-xs resize-none"
                  style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)', minHeight: 60 }}
                  rows={3}
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent outline-none border-b text-xs"
                  style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
                />
              )
            ) : (
              col.key === 'links' ? (
                <div className="flex items-center gap-1">
                  {tc.links ? (
                    <>
                      <a
                        href={tc.links}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] underline hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--accent)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open Link
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdate({ links: '' }) }}
                        className="text-[10px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity px-0.5"
                        style={{ color: 'var(--status-fail-text)' }}
                        title="Clear link"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span
                      className="cursor-text block text-[11px]"
                      onClick={() => startEdit(col.key)}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Add link...
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="cursor-text block"
                  onClick={() => {
                    if (isLongText(col.key)) {
                      if (expandedKey === col.key) {
                        setExpandedKey(null)
                      } else {
                        setExpandedKey(col.key)
                      }
                    }
                  }}
                  onDoubleClick={() => startEdit(col.key)}
                  title={isLongText(col.key) ? (expandedKey === col.key || expandAll ? 'Click to collapse · Double-click to edit' : 'Click to expand · Double-click to edit') : 'Double-click to edit'}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: (expandedKey === col.key || (expandAll && isLongText(col.key))) ? 'pre-wrap' : 'nowrap',
                    display: 'block',
                    maxHeight: (expandedKey === col.key || (expandAll && isLongText(col.key))) ? 'none' : '1.2em',
                    lineHeight: '1.2em',
                  }}
                >
                  {tc[col.key as keyof TestCase] || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </span>
              )
            )}
          </td>
        ))}
        <td className="px-1 py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          {hovered && (
            <button
              onClick={onDelete}
              className="text-[10px] opacity-50 hover:opacity-100 transition-opacity px-0.5"
              style={{ color: 'var(--status-fail-text)' }}
            >
              ×
            </button>
          )}
        </td>
      </tr>
    </>
  )
}

const CASE_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Positive: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
  Negative: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
  General: { bg: 'var(--bg-secondary)', text: 'var(--text-tertiary)' },
}

function CaseTypePill({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const style = CASE_TYPE_STYLES[value] || CASE_TYPE_STYLES.General
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[10px] font-medium px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {CASE_TYPES.map(ct => (
        <option key={ct} value={ct}>{ct}</option>
      ))}
    </select>
  )
}
