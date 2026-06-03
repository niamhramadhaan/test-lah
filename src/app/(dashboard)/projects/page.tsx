'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { GridPattern } from '@/components/ui/grid-pattern'
import { NumberTicker } from '@/components/ui/number-ticker'

const FUN_ICONS: Array<{ emoji: string; bg: string }> = [
  { emoji: '🚀', bg: '#E3F2FD' },
  { emoji: '🎯', bg: '#FFF3E0' },
  { emoji: '🧪', bg: '#F3E5F5' },
  { emoji: '🔥', bg: '#FBE9E7' },
  { emoji: '💡', bg: '#FFFDE7' },
  { emoji: '🛡️', bg: '#E8F5E9' },
  { emoji: '⚡', bg: '#FFF8E1' },
  { emoji: '🎮', bg: '#E8EAF6' },
  { emoji: '🦊', bg: '#FCE4EC' },
  { emoji: '🐝', bg: '#F1F8E9' },
  { emoji: '🦄', bg: '#FDE7F3' },
  { emoji: '🐙', bg: '#E0F7FA' },
  { emoji: '🎪', bg: '#FBE9E7' },
  { emoji: '🍩', bg: '#FFF9C4' },
  { emoji: '🎸', bg: '#F3E5F5' },
  { emoji: '🧊', bg: '#E1F5FE' },
]

function getFunIcon(id: string): { emoji: string; bg: string } {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return FUN_ICONS[Math.abs(hash) % FUN_ICONS.length]
}

export default function ProjectsPage() {
  const { projects, createProject, deleteProject, renameProject, profile, profileInitials, promptDialog, confirmDialog } = useDashboard()
  const projectList = Object.values(projects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [donateOpen, setDonateOpen] = useState(false)

  const stats = useMemo(() => {
    const allCases = projectList.flatMap(p => Object.values(p.testCases).flat())
    const totalCases = allCases.length
    const totalPass = allCases.filter(c => c.status === 'pass').length
    const totalSkip = allCases.filter(c => c.status === 'skip').length
    const totalNodes = projectList.reduce((sum, p) => sum + p.flows.length, 0)
    const denom = totalCases - totalSkip
    const overallPassRate = denom > 0 ? Math.round((totalPass / denom) * 100) : 0
    return { totalCases, totalNodes, overallPassRate }
  }, [projectList])

  if (projectList.length === 0) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          message="No projects yet. Create your first project to get started."
          action={{ label: '+ New Project', onClick: async () => {
            const name = await promptDialog('New Project', 'Enter project name:')
            if (name?.trim()) createProject(name.trim())
          }}}
        />
      </div>
    )
  }

  const startRename = (id: string, name: string) => {
    setEditingId(id)
    setEditValue(name)
    setMenuOpen(null)
  }

  const commitRename = () => {
    if (editingId && editValue.trim()) renameProject(editingId, editValue.trim())
    setEditingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    setMenuOpen(null)
    const ok = await confirmDialog('Delete Project', `Delete "${name}"? This cannot be undone.`)
    if (ok) deleteProject(id)
  }

  return (
    <div className="h-full overflow-auto relative">
      {/* Interactive grid pattern background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <InteractiveGridPattern
          width={48}
          height={48}
          squares={[32, 32]}
          className="opacity-30"
          squaresClassName="fill-neutral-200/20"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--bg-primary) 0%, transparent 15%, transparent 85%, var(--bg-primary) 100%)' }} />
      </div>

      <div className="relative p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>All Projects</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{projectList.length} project{projectList.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDonateOpen(true)}
            className="px-4 py-2 text-sm font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
          >
            Donate
          </button>
          <button
            onClick={async () => {
              const name = await promptDialog('New Project', 'Enter project name:')
              if (name?.trim()) createProject(name.trim())
            }}
            className="px-4 py-2 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius-pill)' }}
          >
            + New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {projectList.map(p => {
          const allCases = Object.values(p.testCases).flat()
          const totalCases = allCases.length
          const pass = allCases.filter(c => c.status === 'pass').length
          const fail = allCases.filter(c => c.status === 'fail').length
          const skip = allCases.filter(c => c.status === 'skip').length
          const untested = allCases.filter(c => c.status === 'untested').length
          const denom = totalCases - skip
          const passRate = denom > 0 ? Math.round((pass / denom) * 100) : 0
          const isEditing = editingId === p.id

          return (
            <div
              key={p.id}
              className="group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[var(--border-hover)]"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
            >
              {/* Grid pattern header */}
              <div className="relative h-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #F7F5F1 0%, #EDEAE3 100%)' }}>
                <GridPattern
                  width={28}
                  height={28}
                  x={-1}
                  y={-1}
                  strokeDasharray="4 2"
                  className="text-neutral-400/20"
                />
                {/* Decorative accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ background: passRate >= 80 ? 'var(--status-pass-text)' : passRate >= 50 ? 'var(--status-skip-text)' : totalCases > 0 ? 'var(--status-fail-text)' : 'var(--border)' }}
                />
                {/* Project icon */}
                <div className="absolute top-4 left-4 w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: getFunIcon(p.id).bg }}>
                  {getFunIcon(p.id).emoji}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col gap-3">
                {/* Name */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                    className="text-sm font-semibold bg-transparent outline-none border-b px-0 py-0.5"
                    style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
                  />
                ) : (
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-1">
                    <NumberTicker value={p.flows.length} className="text-xs font-medium" style={{ color: 'var(--text-primary)' }} />
                    <span>nodes</span>
                  </span>
                  <span className="w-px h-3" style={{ backgroundColor: 'var(--border)' }} />
                  <span className="flex items-center gap-1">
                    <NumberTicker value={totalCases} className="text-xs font-medium" style={{ color: 'var(--text-primary)' }} />
                    <span>cases</span>
                  </span>
                </div>

                {/* Pass rate bar */}
                {totalCases > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Pass rate</span>
                      <span style={{ color: passRate >= 80 ? 'var(--status-pass-text)' : passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)', fontWeight: 600 }}>
                        {passRate}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${passRate}%`,
                          backgroundColor: passRate >= 80 ? 'var(--status-pass-text)' : passRate >= 50 ? 'var(--status-skip-text)' : 'var(--status-fail-text)',
                        }}
                      />
                    </div>
                    {/* Mini status pills */}
                    <div className="flex gap-1 mt-1">
                      {pass > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-pass-bg)', color: 'var(--status-pass-text)' }}>{pass} pass</span>}
                      {fail > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>{fail} fail</span>}
                      {skip > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-skip-bg)', color: 'var(--status-skip-text)' }}>{skip} skip</span>}
                      {untested > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-untested-bg)', color: 'var(--status-untested-text)' }}>{untested} todo</span>}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="text-[10px] mt-auto pt-2 border-t" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>
                  Created {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Actions overlay — visible on hover */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }}
                  className="w-7 h-7 flex items-center justify-center rounded-md border text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="2.5" r="1" fill="currentColor" />
                    <circle cx="6" cy="6" r="1" fill="currentColor" />
                    <circle cx="6" cy="9.5" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {/* Dropdown menu — outside the card link */}
              {menuOpen === p.id && (
                <div
                  className="absolute top-11 right-3 z-30 py-1 min-w-[140px] border rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
                >
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => setMenuOpen(null)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Open
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(p.id, p.name) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Rename
                  </button>
                  <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--status-fail-text)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M4.5 3V1.5h3V3M3 3v7.5h6V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Delete
                  </button>
                </div>
              )}

              {/* Card link — covers card content but not dropdown */}
              <Link href={`/projects/${p.id}`} className="absolute inset-0 z-0" onClick={() => setMenuOpen(null)} />
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      <div className="relative mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: profile.bannerColor, color: '#fff' }}>
                {profileInitials}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.name || 'Anonymous Tester'}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{profile.role || 'No role set'}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Projects</div>
            <NumberTicker value={projectList.length} className="text-lg font-semibold" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Test Cases</div>
            <NumberTicker value={stats.totalCases} className="text-lg font-semibold" style={{ color: 'var(--status-pass-text)' }} />
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Flow Nodes</div>
            <NumberTicker value={stats.totalNodes} className="text-lg font-semibold" style={{ color: '#9E7AFF' }} />
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Pass Rate</div>
            <div className="flex items-baseline gap-0.5">
              <NumberTicker value={stats.overallPassRate} className="text-lg font-semibold" style={{ color: stats.overallPassRate >= 80 ? 'var(--status-pass-text)' : 'var(--status-skip-text)' }} />
              <span className="text-sm font-medium" style={{ color: stats.overallPassRate >= 80 ? 'var(--status-pass-text)' : 'var(--status-skip-text)' }}>%</span>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Donate popup */}
      {donateOpen && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
          onClick={() => setDonateOpen(false)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Coffee header */}
            <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center" style={{ background: 'linear-gradient(180deg, #FFF8E1 0%, var(--bg-card) 100%)' }}>
              <div className="w-16 h-16 mb-3 flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M8 16h24v20a8 8 0 01-8 8H16a8 8 0 01-8-8V16z" fill="#6F4E37" />
                  <path d="M32 20h4a4 4 0 010 8h-4" stroke="#6F4E37" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M14 12c0-2 2-4 4-4s4 2 4 4" stroke="#BCAAA4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  <path d="M20 10c0-2 2-4 4-4s4 2 4 4" stroke="#BCAAA4" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                  <rect x="6" y="38" width="28" height="4" rx="2" fill="#D7CCC8" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Buy the Developer a Coffee!
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                If Test Lah! has been helpful, consider buying Qois a coffee. Minimum 1 litre, please. He&apos;s very tired.
              </p>
            </div>

            {/* Address */}
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Pickup Location</p>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Toko Kopi TUKU — BSD</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Ruko Sektor 1.3, Blok RB No. 1<br />
                Jl. Griya Loka Raya No.1<br />
                Rw. Buntu, Kec. Serpong<br />
                Kota Tangerang Selatan, Banten 15310
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setDonateOpen(false)}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Maybe Later
              </button>
              <a
                href="https://maps.google.com/?q=Toko+Kopi+TUKU+BSD"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg text-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#6F4E37', color: '#fff' }}
              >
                Open in Maps
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
