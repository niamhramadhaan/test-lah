'use client'

import { useState } from 'react'

interface DenialModalProps {
  open: boolean
  onClose: () => void
  onTryAgain: () => void
}

function MockQRCode() {
  const dots = []
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const isCorner = (row < 3 && col < 3) || (row < 3 && col > 11) || (row > 11 && col < 3)
      const isFilled = isCorner || Math.random() > 0.5
      if (isFilled) {
        dots.push(
          <rect
            key={`${row}-${col}`}
            x={col * 10 + 5}
            y={row * 10 + 5}
            width={8}
            height={8}
            rx={1}
            fill="#1A1A1A"
          />
        )
      }
    }
  }
  return (
    <svg width="165" height="165" viewBox="0 0 165 165">
      <rect x="0" y="0" width="165" height="165" rx="8" fill="white" />
      {/* Corner patterns */}
      <rect x="5" y="5" width="30" height="30" rx="2" fill="none" stroke="#1A1A1A" strokeWidth="3" />
      <rect x="12" y="12" width="16" height="16" rx="1" fill="#1A1A1A" />
      <rect x="130" y="5" width="30" height="30" rx="2" fill="none" stroke="#1A1A1A" strokeWidth="3" />
      <rect x="137" y="12" width="16" height="16" rx="1" fill="#1A1A1A" />
      <rect x="5" y="130" width="30" height="30" rx="2" fill="none" stroke="#1A1A1A" strokeWidth="3" />
      <rect x="12" y="137" width="16" height="16" rx="1" fill="#1A1A1A" />
      {dots}
    </svg>
  )
}

export function DenialModal({ open, onClose, onTryAgain }: DenialModalProps) {
  const [activeTab, setActiveTab] = useState<'qris' | 'ewallet' | 'va'>('qris')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', animation: 'fadeIn 200ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4"
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
          <div className="px-6 pt-4 pb-2">
            <p className="text-center text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              Maaf, nama kamu tidak terdaftar
            </p>
            <p className="text-center text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              sebagai QA dari SLTR Group. Silahkan melamar dan coba lagi.
            </p>
          </div>

          {/* Mock Payment Section */}
          <div className="px-6 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
              Atau, beli akses langsung
            </p>

            {/* Payment amount */}
            <div className="text-center mb-3">
              <span className="text-2xl font-bold" style={{ color: '#6F4E37' }}>Rp 999.999</span>
            </div>

            {/* Payment method tabs */}
            <div className="flex rounded-lg border overflow-hidden mb-3" style={{ borderColor: 'var(--border)' }}>
              {[
                { key: 'qris' as const, label: 'QRIS' },
                { key: 'ewallet' as const, label: 'E-Wallet' },
                { key: 'va' as const, label: 'Virtual Account' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === tab.key ? '#6F4E37' : 'transparent',
                    color: activeTab === tab.key ? '#fff' : 'var(--text-tertiary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Payment content */}
            <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--border)', backgroundColor: '#FAFAF8' }}>
              {activeTab === 'qris' && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 p-2 bg-white rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    <MockQRCode />
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Scan QR untuk bayar</p>
                </div>
              )}

              {activeTab === 'ewallet' && (
                <div className="space-y-2">
                  {[
                    { name: 'GoPay', color: '#00AA13', letter: 'G' },
                    { name: 'OVO', color: '#4C3494', letter: 'O' },
                    { name: 'DANA', color: '#108EE9', letter: 'D' },
                    { name: 'ShopeePay', color: '#EE4D2D', letter: 'S' },
                  ].map(wallet => (
                    <button
                      key={wallet.name}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors hover:bg-white"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: wallet.color }}
                      >
                        {wallet.letter}
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{wallet.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'va' && (
                <div>
                  <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Nomor Virtual Account</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: '#fff' }}>
                    <span className="flex-1 text-sm font-mono font-semibold tracking-wider" style={{ color: '#6F4E37' }}>
                      8808 1234 5678 9012
                    </span>
                    <button
                      className="text-[10px] px-2 py-1 rounded border transition-colors hover:bg-[var(--bg-secondary)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
                    >
                      Salin
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>a/n Qois Ramadhani</p>
                </div>
              )}
            </div>

            <p className="text-[9px] text-center mb-3" style={{ color: 'var(--text-tertiary)' }}>
              *Ini cuma guyon. Jangan beneran bayar.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex gap-2">
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

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
