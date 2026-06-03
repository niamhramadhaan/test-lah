'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { GridPattern } from '@/components/ui/grid-pattern'
import { NumberTicker } from '@/components/ui/number-ticker'

const FUN_ICONS: Array<{ icon: React.ReactNode; bg: string }> = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="#6F4E37" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.9 1.45h12.76a1 1 0 00.9-1.45l-5.069-10.127A2 2 0 0114 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" fill="#6F4E37" opacity="0.15" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10 4 4 0 01-5-5 4 4 0 01-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 10-3.214 3.214c.446.166.855.497.925.968a.979.979 0 01-.276.837l-1.61 1.611a2.404 2.404 0 01-1.705.707 2.402 2.402 0 01-1.704-.706l-1.568-1.568a1.026 1.026 0 00-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 11-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 00-.289-.877l-1.568-1.568A2.402 2.402 0 011.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073.978a2.5 2.5 0 103.259-3.259c-.45-.196-.9-.558-.977-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0112 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 113.237 3.237c-.464.18-.894.527-.967 1.02z" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>, bg: '#EDE6DD' },
]

function getFunIcon(id: string): { icon: React.ReactNode; bg: string } {
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
  const [hoveredLater, setHoveredLater] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

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
            className="px-4 py-2 text-sm font-medium rounded-md border transition-all hover:scale-105"
            style={{
              borderColor: '#6F4E37',
              color: '#6F4E37',
              borderRadius: 'var(--radius-pill)',
              boxShadow: '0 0 12px rgba(111,78,55,0.3), 0 0 24px rgba(111,78,55,0.15)',
              animation: 'glowPulse 2s ease-in-out infinite',
            }}
          >
            Donate Please 🥺👉👈
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
                <div className="absolute top-4 left-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: getFunIcon(p.id).bg }}>
                  {getFunIcon(p.id).icon}
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
                  ref={menuRef}
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
            className="w-full max-w-lg mx-4 rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Coffee header */}
            <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center" style={{ background: 'linear-gradient(180deg, #FFF8E1 0%, var(--bg-card) 100%)' }}>
              <div className="w-20 h-20 mb-4 flex items-center justify-center">
                <svg width="60" height="60" viewBox="0 0 48 48" fill="none">
                  <path d="M8 16h24v20a8 8 0 01-8 8H16a8 8 0 01-8-8V16z" fill="#6F4E37" />
                  <path d="M32 20h4a4 4 0 010 8h-4" stroke="#6F4E37" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M14 12c0-2 2-4 4-4s4 2 4 4" stroke="#BCAAA4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  <path d="M20 10c0-2 2-4 4-4s4 2 4 4" stroke="#BCAAA4" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                  <rect x="6" y="38" width="28" height="4" rx="2" fill="#D7CCC8" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Buy the Developer a Slush Coffee!
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                If Test Lah! has been helpful, consider buying Qois a <strong>Slush Coffee</strong>. Minimum <strong>1 litre</strong>, please. He&apos;s very tired.
              </p>
            </div>

            {/* Address */}
            <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Pickup Location</p>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Toko Kopi TUKU — BSD</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Ruko Sektor 1.3, Blok RB No. 1, Jl. Griya Loka Raya No.1, Serpong, Tangerang Selatan
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
              <div
                className="flex-1 relative"
                onMouseEnter={() => setHoveredLater(true)}
                onMouseLeave={() => setHoveredLater(false)}
              >
                <button
                  onClick={() => setDonateOpen(false)}
                  className="w-full px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Maybe Later
                </button>

                {/* Pinterest tooltip — above button */}
                {hoveredLater && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[410] rounded-xl border overflow-hidden"
                    style={{
                      width: 240,
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                      animation: 'fadeInUp 200ms ease-out',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://i.pinimg.com/564x/82/74/4d/82744d1c73b0296c5f32e6f669ac05e6.jpg"
                      alt="Maybe next time?"
                      width={240}
                      className="w-full h-auto block"
                      style={{ borderRadius: 11 }}
                    />
                  </div>
                )}
              </div>
              <a
                href="https://maps.google.com/?q=Toko+Kopi+TUKU+BSD"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg text-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#6F4E37', color: '#fff' }}
              >
                Open in Maps
              </a>
            </div>

            {/* Quran verse footer */}
            <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: '#FAFAF8' }}>
              <p className="text-xs text-center leading-relaxed mb-3" style={{ color: 'var(--text-secondary)', direction: 'rtl' }}>
                اِنَّ الْمُصَّدِّقِيْنَ وَالْمُصَّدِّقٰتِ وَاَقْرَضُوا اللّٰهَ قَرْضًا حَسَنًا يُّضٰعَفُ لَهُمْ وَلَهُمْ اَجْرٌ كَرِيْمٌ ١٨
              </p>
              <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                &ldquo;Sesungguhnya orang-orang yang bersedekah baik laki-laki maupun perempuan dan meminjamkan kepada Allah dengan pinjaman yang baik, akan dilipatgandakan (balasannya) bagi mereka; dan mereka akan mendapat pahala yang mulia.&rdquo; (QS Al Hadid: 18)
              </p>
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
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateY(-50%) translateX(16px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(111,78,55,0.3), 0 0 24px rgba(111,78,55,0.15); }
          50% { box-shadow: 0 0 20px rgba(111,78,55,0.5), 0 0 40px rgba(111,78,55,0.25); }
        }
      `}</style>
    </div>
  )
}
