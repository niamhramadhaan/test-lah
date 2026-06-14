'use client'

import { useState } from 'react'
import { UserProfile } from '@/types'

interface ProfileCardModalProps {
  open: boolean
  onClose: () => void
  profile: UserProfile
  initials: string
  stats: {
    projects: number
    testCases: number
    passRate: number
    nodes: number
    edges: number
    pass: number
    fail: number
    skip: number
    untested: number
  }
}

export function ProfileCardModal({ open, onClose, profile, initials, stats }: ProfileCardModalProps) {
  const [flipped, setFlipped] = useState(false)
  const [premiumOpen, setPremiumOpen] = useState(false)

  if (!open) return null

  const shareText = `My Test Lah!:\n${stats.projects} Projects | ${stats.testCases} Cases | ${stats.passRate}% Pass Rate`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Test Lah! Stats', text: shareText }) } catch {}
    } else {
      navigator.clipboard.writeText(shareText)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-72 mx-4"
        onClick={e => e.stopPropagation()}
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative w-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
            transition: 'transform 0.5s ease',
            height: '380px',
          }}
        >
          {/* Front — banner full bleed, avatar + name centered */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border"
            style={{
              backfaceVisibility: 'hidden',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(160deg, ${darkenColor(profile.bannerColor, 0.25)} 0%, ${profile.bannerColor} 50%, ${lightenColor(profile.bannerColor, 0.2)} 100%)` }}
            />

            <div className="relative h-full flex flex-col items-center justify-center px-4">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden border-2 mb-3"
                style={{ borderColor: 'rgba(255,255,255,0.3)' }}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              <h3 className="text-base font-semibold text-white drop-shadow-sm">
                {profile.name || 'Anonymous Tester'}
              </h3>
              <p className="text-xs mt-0.5 text-white/70">
                {profile.role || 'No role set'}
              </p>

              <div className="flex items-center gap-4 mt-4">
                <FrontStat value={stats.projects} label="Projects" />
                <div className="w-px h-6 bg-white/20" />
                <FrontStat value={stats.testCases} label="Cases" />
                <div className="w-px h-6 bg-white/20" />
                <FrontStat value={`${stats.passRate}%`} label="Pass" />
              </div>

              <button
                onClick={() => setFlipped(true)}
                className="mt-5 px-4 py-1.5 text-[11px] font-medium rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                View stats
              </button>
              <button
                onClick={() => setPremiumOpen(true)}
                className="mt-2 px-4 py-1.5 text-[11px] font-medium rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                Get reward for my hardwork
              </button>
            </div>
          </div>

          {/* Back — stats */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Statistics</span>
                <button
                  onClick={() => setFlipped(false)}
                  className="text-[10px] px-2 py-0.5 rounded border transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}
                >
                  Back
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {/* Pass rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Pass Rate</span>
                    <span className="text-sm font-semibold" style={{ color: stats.passRate >= 80 ? 'var(--status-pass-text)' : stats.passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)' }}>
                      {stats.passRate}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${stats.passRate}%`,
                        backgroundColor: stats.passRate >= 80 ? 'var(--status-pass-text)' : stats.passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)',
                      }}
                    />
                  </div>
                </div>

                {/* Status grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  <StatusCell label="Pass" value={stats.pass} color="var(--status-pass-text)" />
                  <StatusCell label="Fail" value={stats.fail} color="var(--status-fail-text)" />
                  <StatusCell label="Skip" value={stats.skip} color="var(--status-skip-text)" />
                  <StatusCell label="New" value={stats.untested} />
                </div>

                {/* Counts */}
                <div className="space-y-1">
                  <CountRow label="Test Cases" value={stats.testCases} />
                  <CountRow label="Flow Nodes" value={stats.nodes} />
                  <CountRow label="Edges" value={stats.edges} />
                  <CountRow label="Projects" value={stats.projects} />
                </div>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full px-3 py-2 text-[11px] font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)] flex items-center justify-center gap-1.5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-2 px-3 py-2 text-[11px] font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
        >
          Close
        </button>
      </div>

      {/* Premium paywall modal */}
      {premiumOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 150ms ease-out' }}
          onClick={() => setPremiumOpen(false)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-skip-bg)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--status-skip-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Premium Feature
              </h3>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Getting rewards for your hardwork is only available for <strong>Premium Users</strong>.
                To upgrade, please transfer to the following VA:
              </p>
              <div className="px-4 py-3 rounded-lg border mb-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Virtual Account</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>0895 332 333 587</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>a/n Qois Ramadhani</p>
              </div>
              <p className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
                *This is a joke. Please don&apos;t actually transfer. Or do. I won&apos;t stop you.
              </p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setPremiumOpen(false)}
                className="w-full px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Fine, I&apos;ll keep working for free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FrontStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/60">{label}</div>
    </div>
  )
}

function StatusCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="py-2 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="text-sm font-medium" style={{ color: color ?? 'var(--text-secondary)' }}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  )
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * amount))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round((255 - ((num >> 8) & 0xff)) * amount))
  const b = Math.min(255, (num & 0xff) + Math.round((255 - (num & 0xff)) * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * amount))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(((num >> 8) & 0xff) * amount))
  const b = Math.max(0, (num & 0xff) - Math.round(((num & 0xff)) * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
