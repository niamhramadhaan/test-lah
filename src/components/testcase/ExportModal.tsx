'use client'

import { FlowNode, TestCase, ColumnConfig, DEFAULT_COLUMNS } from '@/types'
import { downloadNodeMarkdown, downloadNodeJSON, downloadNodeCSV, downloadNodeXLSX } from '@/lib/export'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  node: FlowNode
  testCases: TestCase[]
  columns?: ColumnConfig[]
}

export function ExportModal({ open, onClose, node, testCases, columns }: ExportModalProps) {
  const exportCols = columns && columns.length > 0 ? columns : DEFAULT_COLUMNS
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Export Test Cases
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Export &ldquo;{node.label}&rdquo; ({testCases.length} case{testCases.length !== 1 ? 's' : ''})
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => { downloadNodeMarkdown(node, testCases, exportCols); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Markdown (.md)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Formatted table for documentation</span>
          </button>
          <button
            onClick={() => { downloadNodeJSON(node, testCases); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>JSON (.json)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Structured data backup</span>
          </button>
          <button
            onClick={() => { downloadNodeCSV(node, testCases, exportCols); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>CSV (.csv)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Spreadsheet-compatible format</span>
          </button>
          <button
            onClick={async () => { await downloadNodeXLSX(node, testCases, exportCols); onClose() }}
            className="w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Excel (.xlsx)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Styled spreadsheet for reporting</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
