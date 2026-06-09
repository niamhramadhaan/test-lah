'use client'

import { useState, useRef, useCallback } from 'react'
import { TestCase, DEFAULT_COLUMNS } from '@/types'

interface ImportTestCasesModalProps {
  open: boolean
  onClose: () => void
  onImport: (cases: Array<{ title: string; steps: string; expected: string }>) => void
  nodeLabel: string
}

type ImportFormat = 'csv' | 'json'

interface ParsedRow {
  title: string
  steps: string
  expected: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Find column indices
  const titleIdx = header.findIndex(h =>
    h === 'title' || h === 'test case' || h === 'testcase' || h === 'name' || h === 'test case title'
  )
  const stepsIdx = header.findIndex(h =>
    h === 'steps' || h === 'test steps' || h === 'step' || h === 'instructions'
  )
  const expectedIdx = header.findIndex(h =>
    h === 'expected' || h === 'expected result' || h === 'expected results' || h === 'result'
  )

  if (titleIdx === -1) {
    throw new Error('Could not find a "title" or "test case" column in the CSV header')
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    const title = (cells[titleIdx] || '').trim()
    if (!title) continue
    rows.push({
      title,
      steps: stepsIdx >= 0 ? (cells[stepsIdx] || '').trim() : '',
      expected: expectedIdx >= 0 ? (cells[expectedIdx] || '').trim() : '',
    })
  }

  if (rows.length === 0) throw new Error('No valid test cases found in CSV')
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

function parseJSON(text: string): ParsedRow[] {
  const data = JSON.parse(text)

  // Accept array directly
  const arr = Array.isArray(data) ? data : data.testCases || data.test_cases || data.cases
  if (!Array.isArray(arr)) {
    throw new Error('JSON must be an array of test cases, or an object with a "testCases" array')
  }

  const rows: ParsedRow[] = []
  for (const item of arr) {
    if (typeof item === 'string') {
      // Simple string array — each string is a title
      if (item.trim()) rows.push({ title: item.trim(), steps: '', expected: '' })
      continue
    }
    if (typeof item !== 'object' || !item) continue

    const title = item.title || item.name || item.testCase || item['test case'] || ''
    if (!title || typeof title !== 'string') continue

    rows.push({
      title: title.trim(),
      steps: String(item.steps || item.instructions || '').trim(),
      expected: String(item.expected || item['expected result'] || item.result || '').trim(),
    })
  }

  if (rows.length === 0) throw new Error('No valid test cases found in JSON')
  return rows
}

export function ImportTestCasesModal({ open, onClose, onImport, nodeLabel }: ImportTestCasesModalProps) {
  const [format, setFormat] = useState<ImportFormat>('csv')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setError(null)
    setPreview(null)
    setDragOver(false)
  }

  const processFile = useCallback((file: File) => {
    setError(null)
    setPreview(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const isJSON = file.name.endsWith('.json') || file.type === 'application/json'
        const rows = isJSON ? parseJSON(text) : parseCSV(text)
        setPreview(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file')
      }
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleConfirm = () => {
    if (!preview || preview.length === 0) return
    onImport(preview)
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={() => { reset(); onClose() }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Import Test Cases
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Import test cases into &ldquo;{nodeLabel}&rdquo; from CSV or JSON
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Format hint */}
          <div className="text-[11px] rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Supported formats:</p>
            <ul className="space-y-0.5 ml-3">
              <li><strong>CSV:</strong> Header row with columns: title, steps, expected (or similar names)</li>
              <li><strong>JSON:</strong> Array of objects with &quot;title&quot;, &quot;steps&quot;, &quot;expected&quot; fields</li>
            </ul>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-lg cursor-pointer transition-colors py-8"
            style={{
              borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
              backgroundColor: dragOver ? 'var(--accent)08' : 'transparent',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Drop a .csv or .json file here, or click to browse
              </span>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Error */}
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Preview ({preview.length} test case{preview.length !== 1 ? 's' : ''})
                </span>
                <button
                  onClick={() => setPreview(null)}
                  className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-[var(--bg-secondary)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
                >
                  Clear
                </button>
              </div>
              <div className="max-h-[200px] overflow-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <table className="text-[11px] w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th className="px-2 py-1.5 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>#</th>
                      <th className="px-2 py-1.5 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Title</th>
                      <th className="px-2 py-1.5 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Steps</th>
                      <th className="px-2 py-1.5 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Expected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td className="px-2 py-1" style={{ color: 'var(--text-primary)' }}>{row.title}</td>
                        <td className="px-2 py-1 max-w-[120px] truncate" style={{ color: 'var(--text-secondary)' }}>{row.steps || '—'}</td>
                        <td className="px-2 py-1 max-w-[120px] truncate" style={{ color: 'var(--text-secondary)' }}>{row.expected || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <div className="px-2 py-1 text-[10px] border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                    ...and {preview.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => { reset(); onClose() }}
            className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview || preview.length === 0}
            className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #8D6E63, #A1887F)', color: '#fff' }}
          >
            Import {preview ? `(${preview.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
