'use client'

interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-2 w-full overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-pill)' }}
    >
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: clamped >= 80 ? 'var(--status-pass-text)' : clamped >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)',
          borderRadius: 'var(--radius-pill)',
        }}
      />
    </div>
  )
}
