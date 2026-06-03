'use client'

import { Status } from '@/types'

interface StatusPillProps {
  status: Status
  onCycle: () => void
}

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)', label: 'Untested' },
  pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)', label: 'Pass' },
  fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)', label: 'Fail' },
  skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)', label: 'Skip' },
}

export function StatusPill({ status, onCycle }: StatusPillProps) {
  const style = STATUS_STYLES[status]
  return (
    <button
      onClick={onCycle}
      className="px-2.5 py-0.5 text-xs font-medium rounded-full transition-opacity hover:opacity-80 whitespace-nowrap"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {style.label}
    </button>
  )
}
