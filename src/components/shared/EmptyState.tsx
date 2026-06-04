'use client'

interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
        alt=""
        className="w-28 h-28 object-contain select-none opacity-15"
        draggable={false}
      />
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
