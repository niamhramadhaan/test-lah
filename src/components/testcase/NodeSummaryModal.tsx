'use client'

import { TestCase, FlowNode } from '@/types'
import { TestStats } from '@/hooks/useTestCases'

interface NodeSummaryModalProps {
  open: boolean
  onClose: () => void
  node: FlowNode
  testCases: TestCase[]
  stats: TestStats
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
  fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
  skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)' },
  untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)' },
}

export function NodeSummaryModal({ open, onClose, node, testCases, stats }: NodeSummaryModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)', animation: 'fadeInUp 200ms ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {node.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                  {node.code}
                </span>
              )}
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {node.label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-[10px] opacity-50 hover:opacity-100"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ×
            </button>
          </div>
          {node.notes && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{node.notes}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 p-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pass" value={stats.pass} color="var(--status-pass-text)" />
          <StatCard label="Fail" value={stats.fail} color="var(--status-fail-text)" />
          <StatCard label="Untested" value={stats.untested} color="var(--status-untested-text)" />
        </div>

        {/* Pass rate bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[10px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <span>Pass Rate</span>
            <span style={{ color: stats.passRate >= 80 ? 'var(--status-pass-text)' : stats.passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)', fontWeight: 600 }}>
              {stats.passRate}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.passRate}%`,
                backgroundColor: stats.passRate >= 80 ? 'var(--status-pass-text)' : stats.passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)',
              }}
            />
          </div>
        </div>

        {/* Test case list */}
        {testCases.length > 0 && (
          <div className="px-5 pb-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Test Cases
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {testCases.map(tc => {
                const sc = STATUS_COLORS[tc.status] || STATUS_COLORS.untested
                return (
                  <div
                    key={tc.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {tc.status}
                    </span>
                    <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {tc.title}
                    </span>
                    {tc.code && (
                      <span className="text-[9px] font-mono flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {tc.code}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {testCases.length === 0 && (
          <div className="px-5 pb-5 text-center">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No test cases for this node yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <button
            onClick={onClose}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-card)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
