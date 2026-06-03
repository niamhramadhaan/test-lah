'use client'

interface DenialModalProps {
  open: boolean
  onClose: () => void
  onTryAgain: () => void
}

export function DenialModal({ open, onClose, onTryAgain }: DenialModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', animation: 'fadeIn 200ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 300ms ease-out' }}
      >
        {/* Glow effect behind card */}
        <div
          className="absolute -inset-1 rounded-xl opacity-30 blur-xl"
          style={{ background: 'linear-gradient(135deg, #E57373, #FF8A80, #FF5252)' }}
        />

        {/* Card */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
          }}
        >
          {/* Header with gradient */}
          <div
            className="px-6 pt-5 pb-4 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(229,115,115,0.1) 0%, rgba(255,82,82,0.05) 100%)',
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #E57373 0%, #FF5252 100%)',
                  boxShadow: '0 4px 12px rgba(229,115,115,0.3)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: '#C62828' }}
            >
              Login Gagal
            </h3>
          </div>

          {/* Stylized divider */}
          <div className="relative px-6">
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(229,115,115,0.3), rgba(255,82,82,0.3), transparent)' }} />
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #E57373, #FF5252)', boxShadow: '0 0 8px rgba(229,115,115,0.5)' }}
            />
          </div>

          {/* Content */}
          <div className="px-6 pt-4 pb-5">
            <p className="text-center text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              Maaf, nama kamu tidak terdaftar
            </p>
            <p className="text-center text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              sebagai QA dari SLTR Group. Silahkan melamar dan coba lagi, atau lakukan pembayaran ke Qois Ramadhani.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-black/5"
                style={{
                  border: '1px solid rgba(0,0,0,0.1)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                Tutup
              </button>
              <button
                onClick={onTryAgain}
                className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E57373 0%, #FF5252 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(229,115,115,0.3)',
                }}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
