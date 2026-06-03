'use client'

import { useState, useRef, useEffect } from 'react'

interface QuickAddBarProps {
  onAdd: (title: string) => void
  nodeLabel: string
}

export function QuickAddBar({ onAdd, nodeLabel }: QuickAddBarProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [nodeLabel])

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder={`Add test case for "${nodeLabel}"...`}
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none border transition-colors focus:border-[var(--border-hover)]"
        style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-4 py-2 text-sm font-medium rounded-md transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}
      >
        + Add
      </button>
    </div>
  )
}
