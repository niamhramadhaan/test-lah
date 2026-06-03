'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ColumnConfig } from '@/types'

interface ColumnConfigDropdownProps {
  columns: ColumnConfig[]
  onToggle: (key: string) => void
  onRename: (key: string, label: string) => void
}

export function ColumnConfigDropdown({ columns, onToggle, onRename }: ColumnConfigDropdownProps) {
  const [open, setOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (editingKey && inputRef.current) inputRef.current.focus()
  }, [editingKey])

  const startRename = (col: ColumnConfig) => {
    setEditValue(col.label)
    setEditingKey(col.key)
  }

  const commitRename = () => {
    if (editingKey && editValue.trim()) onRename(editingKey, editValue.trim())
    setEditingKey(null)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 text-xs rounded border transition-colors hover:border-[var(--border-hover)]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
      >
        Columns
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 w-48 border z-50"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}
        >
          {columns.map(col => (
            <div
              key={col.key}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => onToggle(col.key)}
                className="accent-current"
                style={{ color: 'var(--accent)' }}
              />
              {editingKey === col.key ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingKey(null) }}
                  className="flex-1 bg-transparent outline-none border-b text-xs"
                  style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
                />
              ) : (
                <span
                  className="flex-1 text-xs cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  onDoubleClick={() => startRename(col)}
                >
                  {col.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
