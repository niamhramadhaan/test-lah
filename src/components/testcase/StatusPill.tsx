'use client'

import { Status } from '@/types'

interface StatusPillProps {
  status: Status
  onChange: (status: Status) => void
}

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)', label: 'Untested' },
  pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)', label: 'Pass' },
  fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)', label: 'Fail' },
  skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)', label: 'Skip' },
}

const STATUSES: Status[] = ['untested', 'pass', 'fail', 'skip']

export function StatusPill({ status, onChange }: StatusPillProps) {
  const style = STATUS_STYLES[status]
  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value as Status)}
      className="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer appearance-none"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderRadius: 'var(--radius-pill)',
        minWidth: 72,
      }}
    >
      {STATUSES.map(s => (
        <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
      ))}
    </select>
  )
}
