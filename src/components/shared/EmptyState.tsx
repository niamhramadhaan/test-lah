'use client'

interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div className="text-4xl opacity-20">📋</div>
      <p className="text-sm max-w-[280px]" style={{ color: 'var(--text-tertiary)' }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius-pill)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
