'use client'

import { useState } from 'react'
import { Highlighter } from '@/components/ui/highlighter'

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

const EWALLETS = [
  {
    name: 'GoPay',
    color: '#00AA13',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#00AA13">
        <path d="M12.072.713a15.38 15.38 0 0 0-.643.011C5.317.998.344 5.835.017 11.818c-.266 4.913 2.548 9.21 6.723 11.204 1.557.744 3.405-.19 3.706-1.861.203-1.126-.382-2.241-1.429-2.742-2.373-1.139-3.966-3.602-3.778-6.406.22-3.28 2.931-5.945 6.279-6.171 3.959-.267 7.257 2.797 7.257 6.619 0 2.623-1.553 4.888-3.809 5.965a2.511 2.511 0 0 0-1.395 2.706l.011.056c.295 1.644 2.111 2.578 3.643 1.852C21.233 21.139 24 17.117 24 12.461 23.996 5.995 18.664.749 12.072.711v.002Zm-.061 7.614c-2.331 0-4.225 1.856-4.225 4.139 0 2.282 1.894 4.137 4.225 4.137 2.33 0 4.225-1.855 4.225-4.137 0-2.283-1.895-4.139-4.225-4.139Z" />
      </svg>
    ),
  },
  {
    name: 'OVO',
    color: '#4C3494',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#4C3494" />
        <ellipse cx="12" cy="12" rx="4.5" ry="6" fill="white" />
        <circle cx="12" cy="12" r="2.5" fill="#4C3494" />
      </svg>
    ),
  },
  {
    name: 'DANA',
    color: '#108EE9',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#108EE9" />
        <path d="M7 8.5h2.5v7H7V8.5zM10.5 8.5H13c1.93 0 3 1.2 3 2.85 0 1.5-1 2.7-2.8 2.7h-.7v1.45h-2V8.5zm2 2.4h.6c.66 0 1-.35 1-.95s-.34-.95-1-.95h-.6v1.9z" fill="white" />
      </svg>
    ),
  },
  {
    name: 'ShopeePay',
    color: '#EE4D2D',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#EE4D2D">
        <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z" />
      </svg>
    ),
  },
]

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
            <p className="text-center text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              Sepertinya kamu{' '}
              <Highlighter action="underline" color="#FF5252" strokeWidth={2} animationDuration={800}>
                <span className="font-semibold">bukan bagian dari SLTR Group</span>
              </Highlighter>
              {' '}ya?
            </p>
            <p className="text-center text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Kamu harus{' '}
              <Highlighter action="highlight" color="#FFD54F" animationDuration={1000}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>melamar terlebih dahulu</span>
              </Highlighter>
              {' '}untuk mendapatkan akses, atau{' '}
              <Highlighter action="highlight" color="#FFD54F" animationDuration={1200}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>lakukan pembayaran ke Qois</span>
              </Highlighter>
              {' '}di bawah ini.
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
                  {EWALLETS.map(wallet => (
                    <button
                      key={wallet.name}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors hover:bg-white"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${wallet.color}15` }}>
                        {wallet.logo}
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
