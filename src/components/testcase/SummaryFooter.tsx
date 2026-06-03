'use client'

import { TestStats } from '@/hooks/useTestCases'

interface SummaryFooterProps {
  stats: TestStats
}

export function SummaryFooter({ stats }: SummaryFooterProps) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 text-xs border-t flex-wrap"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong></span>
      <span>
        Pass: <strong style={{ color: 'var(--status-pass-text)' }}>{stats.pass}</strong>
        {stats.total > 0 && ` (${stats.passRate}%)`}
      </span>
      <span>Fail: <strong style={{ color: 'var(--status-fail-text)' }}>{stats.fail}</strong></span>
      <span>Skip: <strong style={{ color: 'var(--status-skip-text)' }}>{stats.skip}</strong></span>
      <span>Untested: <strong style={{ color: 'var(--status-untested-text)' }}>{stats.untested}</strong></span>
    </div>
  )
}
