'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { downloadJSON } from '@/lib/export'
import { EmptyState } from '@/components/shared/EmptyState'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { GridPattern } from '@/components/ui/grid-pattern'
import { NumberTicker } from '@/components/ui/number-ticker'
import { MagicCard } from '@/components/ui/magic-card'
import { seedMockProject } from '@/lib/mockData'
import { Project, Status } from '@/types'

const QA_FUN_FACTS = [
  "A good QA is a QA who came to work.",
  "It works on my machine — the developer's final words before every hotfix.",
  "QA: because developers can't be trusted to test their own code.",
  "The bug was a feature all along. We just needed better documentation.",
  "If it's not tested, it's broken. If it is tested, it's probably also broken.",
  "Test early, test often, test everything — then watch the deadline slip anyway.",
  "I found 47 bugs today. 45 of them were in the requirements.",
  "The best part of being a QA is telling developers their code doesn't work.",
  "Automated tests: because manually clicking buttons is for interns.",
  "A QA walks into a bar. Orders 1 beer. Orders 0 beers. Orders 99999999 beers. Orders -1 beers. Orders a lizard.",
  "Severity: Critical. Priority: Low. Translation: It's broken but nobody cares.",
  "The test passed in staging. Production had other plans.",
  "My job is to find creative ways to ruin a developer's afternoon.",
  "We don't have bugs. We have undocumented features with unexpected behavior.",
  "The requirements changed. Again. For the third time. This sprint.",
]

const QA_QUOTE_AUTHORS = [
  "Sun Tzu, The Art of QA",
  "Albert Einstein, if he were a tester",
  "Marie Curie, probably",
  "Nikola Tesla, but he'd automate it",
  "Socrates, after finding his first bug",
  "Leonardo da Vinci, testing the flying machine",
  "Isaac Newton, when the apple was a bug",
  "Cleopatra, managing her QA team",
  "Galileo, testing if the earth really spins",
  "Confucius, after reading the requirements",
]

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
  const { projects, createProject, deleteProject, duplicateProject, importProject, renameProject, profile, profileInitials, confirmDialog } = useDashboard()
  const projectList = Object.values(projects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [donateOpen, setDonateOpen] = useState(false)
  const [hoveredLater, setHoveredLater] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [summaryProject, setSummaryProject] = useState<Project | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

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

  // Seed mock projects on mount
  useEffect(() => {
    seedMockProject()
  }, [])

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

  const [funFact, setFunFact] = useState<{ fact: string; author: string } | null>(null)

  useEffect(() => {
    const factIdx = Math.floor(Math.random() * QA_FUN_FACTS.length)
    const authorIdx = Math.floor(Math.random() * QA_QUOTE_AUTHORS.length)
    setFunFact({ fact: QA_FUN_FACTS[factIdx], author: QA_QUOTE_AUTHORS[authorIdx] })
  }, [])

  // Inactivity tracking
  const [inactivity, setInactivity] = useState<{ hours: number; minutes: number; never: boolean } | null>(null)

  // Per-project activity map
  const [projectActivity, setProjectActivity] = useState<Record<string, string>>({})

  const [iconInfoOpen, setIconInfoOpen] = useState<string | null>(null)
  const [cardClicked, setCardClicked] = useState<string | null>(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const last = localStorage.getItem('qa-last-test-activity')
      if (!last) {
        setInactivity({ hours: 0, minutes: 0, never: true })
      } else {
        const diff = Date.now() - new Date(last).getTime()
        setInactivity({ hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), never: false })
      }
    } catch { setInactivity({ hours: 0, minutes: 0, never: true }) }

    try {
      const raw = localStorage.getItem('qa-project-activity')
      setProjectActivity(raw ? JSON.parse(raw) : {})
    } catch { setProjectActivity({}) }
  }, [])

  // Update inactivity every minute
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const last = localStorage.getItem('qa-last-test-activity')
        if (!last) { setInactivity({ hours: 0, minutes: 0, never: true }); return }
        const diff = Date.now() - new Date(last).getTime()
        setInactivity({ hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), never: false })
      } catch {}
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  function getActivityStyle(projectId: string): { color: string; opacity: number; animation?: string } {
    const lastStr = projectActivity[projectId]
    if (!lastStr) return { color: 'var(--text-tertiary)', opacity: 0.4 }
    const diff = Date.now() - new Date(lastStr).getTime()
    const hours = diff / 3600000
    if (hours < 1) return { color: '#4CAF50', opacity: 1 } // greenish — just worked
    if (hours < 48) return { color: 'var(--text-secondary)', opacity: Math.max(0.3, 1 - (hours / 48) * 0.7) } // fading
    if (hours < 168) return { color: '#E57373', opacity: 1 } // reddish — 48h+
    return { color: '#E57373', opacity: 1, animation: 'pulse 2s ease-in-out infinite' } // 1 week+ — pulse
  }

  function getLastWorkedText(projectId: string): string {
    const lastStr = projectActivity[projectId]
    if (!lastStr) return 'No activity recorded yet'
    const date = new Date(lastStr)
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function handleCardClick(projectId: string) {
    setCardClicked(projectId)
    setTimeout(() => setCardClicked(null), 300)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const last = localStorage.getItem('qa-last-test-activity')
      if (!last) { setInactivity({ hours: 0, minutes: 0, never: true }); return }
      const diff = Date.now() - new Date(last).getTime()
      setInactivity({ hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), never: false })
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (projectList.length === 0) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          message="No projects yet. Create your first project to get started."
          action={{ label: '+ New Project', onClick: () => setNewProjectOpen(true) }}
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
    const ok = await confirmDialog(
      '⚠️ Hold On!',
      `You won't receive bonus salary if you delete "${name}". This action cannot be undone. Are you sure?`
    )
    if (ok) deleteProject(id)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importProject(reader.result as string)
      if (!result.ok) setImportError(result.error || 'Import failed')
      else setImportError(null)
    }
    reader.readAsText(file)
    e.target.value = ''
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
            onClick={() => setNewProjectOpen(true)}
            className="px-4 py-2 text-sm font-medium rounded-md transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius-pill)' }}
          >
            + New Project
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="p-2 rounded-md border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
            title="Import Project"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Import error */}
      {importError && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
          <span>Import failed: {importError}</span>
          <button onClick={() => setImportError(null)} className="ml-2 font-bold">\u00d7</button>
        </div>
      )}

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
              className="group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[var(--border-hover)] cursor-pointer"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-card)',
                animation: cardClicked === p.id ? 'cardClick 300ms ease-out' : 'none',
              }}
              onClick={() => handleCardClick(p.id)}
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
                {/* Duck watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img
                    src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
                    alt=""
                    className="h-[70%] object-contain select-none"
                    style={{ opacity: 0.08 }}
                  />
                </div>
                {/* Decorative accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ background: passRate >= 80 ? 'var(--status-pass-text)' : passRate >= 50 ? 'var(--status-skip-text)' : totalCases > 0 ? 'var(--status-fail-text)' : 'var(--border)' }}
                />
                {/* Project icon — activity-based color */}
                <div
                  data-icon-trigger
                  className="absolute top-4 left-4 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 z-10"
                  style={{
                    backgroundColor: getFunIcon(p.id).bg,
                    color: getActivityStyle(p.id).color,
                    opacity: getActivityStyle(p.id).opacity,
                    animation: getActivityStyle(p.id).animation || 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)' }}
                  onClick={(e) => { e.stopPropagation(); setIconInfoOpen(p.id) }}
                >
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

                {/* Date + Open */}
                <div className="text-[11px] mt-auto pt-2 border-t flex items-center justify-between" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>
                  <span>Created {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-semibold hover:underline transition-all flex items-center gap-0.5"
                    style={{ color: 'var(--accent)' }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={e => { e.currentTarget.querySelector('.arrow')?.classList.add('translate-x-0.5') }}
                    onMouseLeave={e => { e.currentTarget.querySelector('.arrow')?.classList.remove('translate-x-0.5') }}
                  >
                    Open
                    <span className="arrow inline-block transition-transform duration-150">→</span>
                  </Link>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setSummaryProject(p); setMenuOpen(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1.2" /><line x1="2" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="5" x2="5" y2="10" stroke="currentColor" strokeWidth="1.2" /></svg>
                    Summary
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(p.id, p.name) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateProject(p.id); setMenuOpen(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M8.5 3.5V2.5a1 1 0 00-1-1h-5a1 1 0 00-1 1v5a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.2" /></svg>
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadJSON(p); setMenuOpen(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 7v3a1 1 0 01-1 1H3a1 1 0 01-1-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><polyline points="4 5 6 7 8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><line x1="6" y1="1" x2="6" y2="7" stroke="currentColor" strokeWidth="1.2" /></svg>
                    Export JSON
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
        {funFact && (
          <div className="mt-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs leading-relaxed text-center italic" style={{ color: 'var(--text-secondary)' }}>
              &ldquo;{funFact.fact}&rdquo;
            </p>
            <p className="text-[10px] text-center mt-1" style={{ color: 'var(--text-tertiary)' }}>
              — {funFact.author}
            </p>
          </div>
        )}
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
                Please, Buy me a Coffee..
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                If Test Lah! has been helpful, consider buying Qois a coffee. Any size will do. He&apos;s very tired.
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
        @keyframes cardClick {
          0% { transform: scale(1); }
          50% { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Summary popup */}
      {summaryProject && (
        <ProjectSummaryPopup project={summaryProject} onClose={() => setSummaryProject(null)} />
      )}

      {/* Activity status modal */}
      {iconInfoOpen && (() => {
        const p = projectList.find(proj => proj.id === iconInfoOpen)
        if (!p) return null
        return (
          <div
            className="fixed inset-0 z-[450] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
            onClick={() => setIconInfoOpen(null)}
          >
            <div
              className="w-full max-w-sm mx-4 rounded-xl border p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Activity Status</h4>
              <p className="text-[11px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                The project icon changes color based on how recently you&apos;ve worked on it. Here&apos;s what each state means:
              </p>
              <div className="flex flex-col gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8F5E9', color: '#4CAF50' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#4CAF50' }}>Active (&lt; 1 hour)</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>You just worked on this project. The icon glows green — keep up the momentum!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', opacity: 0.7 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Cooling down (1–48 hours)</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>It&apos;s been a while since you last worked on this. The icon fades gradually — time to check in?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFEBEE', color: '#E57373' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#E57373' }}>Neglected (48+ hours)</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>This project hasn&apos;t seen activity in days. The icon turns red — your test cases are missing you!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFEBEE', color: '#E57373', animation: 'pulse 2s ease-in-out infinite' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#E57373' }}>SOS mode (1+ week)</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>It&apos;s been over a week! The icon pulses red urgently — someone might need to check on this project.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Activity tracking</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Last active: {getLastWorkedText(p.id)}</p>
                  </div>
                  <button
                    onClick={() => { setIconInfoOpen(null); setPremiumModalOpen(true) }}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ backgroundColor: '#4CAF50' }}
                    title="Toggle activity tracking"
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ left: '2px', transform: 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* New project modal */}
      {newProjectOpen && (
        <NewProjectModal
          profileName={profile.name}
          onClose={() => setNewProjectOpen(false)}
          onSubmit={(name, type) => {
            createProject(name, type)
            setNewProjectOpen(false)
          }}
        />
      )}

      {/* Inactivity badge — fixed bottom right */}
      {inactivity && (
        <div className="fixed bottom-4 right-4 z-30" style={{ animation: 'fadeInUp 300ms ease-out' }}>
          <MagicCard
            className="rounded-lg"
            gradientColor="#6F4E37"
            gradientOpacity={0.15}
            gradientFrom="#6F4E37"
            gradientTo="#D7CCC8"
          >
            <div className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex-1">
                <p className="text-[11px] font-medium leading-snug" style={{ color: '#6F4E37' }}>
                  {inactivity.never
                    ? `You haven't done any testing yet, ${profile.name || 'buddy'}.. go to work!`
                    : `It's been ${inactivity.hours}h ${inactivity.minutes}m since you do testing, ${profile.name || 'buddy'}.. go to work!`
                  }
                </p>
              </div>
              <button
                onClick={() => setPremiumModalOpen(true)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold transition-colors hover:bg-black/5"
                style={{ color: 'rgba(111,78,55,0.5)' }}
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </MagicCard>
        </div>
      )}

      {/* Premium paywall joke modal */}
      {premiumModalOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 150ms ease-out' }}
          onClick={() => setPremiumModalOpen(false)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-skip-bg)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--status-skip-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Premium Feature
              </h3>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Closing the gaslight feature is only available for <strong>Premium Users</strong>.
                To upgrade, please transfer to the following VA:
              </p>
              <div className="px-4 py-3 rounded-lg border mb-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Virtual Account</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>0895 332 333 587</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>a/n Qois Ramadhani</p>
              </div>
              <p className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
                *This is a joke. Please don't actually transfer. Or do. I won't stop you.
              </p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="w-full px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Fine, I'll keep being gaslit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewProjectModal({ profileName, onClose, onSubmit }: { profileName: string; onClose: () => void; onSubmit: (name: string, type: string) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (name.trim()) onSubmit(name.trim(), type)
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Project</h3>

        <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Project Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Enter project name..."
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--accent)] mb-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Project Type <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--accent)] mb-4 cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: type ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          <option value="">Select type...</option>
          <option value="Dashboard">Dashboard</option>
          <option value="Website">Website</option>
          <option value="Gak Jelas">Gak Jelas</option>
        </select>

        <div className="flex items-center justify-between mb-4">
          <div className="relative group/tested">
            <span className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
              Tested by {profileName || 'Anonymous'}
            </span>
            <div className="absolute bottom-full left-0 mb-1 px-2 py-1 text-[9px] rounded whitespace-nowrap opacity-0 group-hover/tested:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
              just kidding, you will ask AI to do it anyway
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity hover:opacity-80 disabled:opacity-30"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectSummaryPopup({ project, onClose }: { project: Project; onClose: () => void }) {
  const { updateProject } = useDashboard()
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [typeEditing, setTypeEditing] = useState(false)

  const allCases = Object.values(project.testCases).flat()
  const totalCases = allCases.length
  const pass = allCases.filter(c => c.status === 'pass').length
  const fail = allCases.filter(c => c.status === 'fail').length
  const skip = allCases.filter(c => c.status === 'skip').length
  const untested = allCases.filter(c => c.status === 'untested').length
  const denom = totalCases - skip
  const passRate = denom > 0 ? Math.round((pass / denom) * 100) : 0

  const filteredCases = statusFilter === 'all'
    ? allCases
    : allCases.filter(c => c.status === statusFilter)

  const nodeMap = new Map(project.flows.map(n => [n.id, n]))

  const lastActivityStr = (() => {
    try {
      const raw = localStorage.getItem('qa-project-activity')
      const map = raw ? JSON.parse(raw) : {}
      const last = map[project.id]
      if (!last) return null
      return new Date(last).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return null }
  })()

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl border overflow-hidden max-h-[80vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 200ms ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
            <button onClick={onClose} className="text-[10px] opacity-50 hover:opacity-100" style={{ color: 'var(--text-tertiary)' }}>×</button>
          </div>
          {lastActivityStr ? (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Last worked on {lastActivityStr}
            </p>
          ) : (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              No activity recorded yet
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="px-5 py-3 flex gap-4 text-xs border-b items-center" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <span>Cases: <strong style={{ color: 'var(--text-primary)' }}>{totalCases}</strong></span>
          <span>Pass: <strong style={{ color: 'var(--status-pass-text)' }}>{pass}</strong></span>
          <span>Rate: <strong style={{ color: passRate >= 80 ? 'var(--status-pass-text)' : 'var(--status-fail-text)' }}>{passRate}%</strong></span>
          {typeEditing ? (
            <select
              value={project.type || ''}
              onChange={e => { updateProject(project.id, p => ({ ...p, type: e.target.value })); setTypeEditing(false) }}
              onBlur={() => setTypeEditing(false)}
              className="px-1 py-0.5 text-[11px] rounded border outline-none cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              autoFocus
            >
              <option value="">None</option>
              <option value="Dashboard">Dashboard</option>
              <option value="Website">Website</option>
              <option value="Gak Jelas">Gak Jelas</option>
            </select>
          ) : (
            <span className="flex items-center gap-1">
              Type: <strong style={{ color: 'var(--text-primary)' }}>{project.type || 'Not set'}</strong>
              <button onClick={() => setTypeEditing(true)} className="text-[9px] hover:underline" style={{ color: 'var(--accent)' }}>edit</button>
            </span>
          )}
        </div>

        {/* Status filter pills */}
        <div className="px-5 py-2 flex gap-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          {([['all', 'All'], ['pass', 'Pass'], ['fail', 'Fail'], ['skip', 'Skip'], ['untested', 'Untested']] as const).map(([value, label]) => {
            const isActive = statusFilter === value
            const colors: Record<string, { bg: string; text: string }> = {
              all: { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
              pass: { bg: 'var(--status-pass-bg)', text: 'var(--status-pass-text)' },
              fail: { bg: 'var(--status-fail-bg)', text: 'var(--status-fail-text)' },
              skip: { bg: 'var(--status-skip-bg)', text: 'var(--status-skip-text)' },
              untested: { bg: 'var(--status-untested-bg)', text: 'var(--status-untested-text)' },
            }
            const c = colors[value]
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors"
                style={{
                  backgroundColor: isActive ? c.bg : 'transparent',
                  color: isActive ? c.text : 'var(--text-tertiary)',
                  borderColor: isActive ? 'transparent' : 'var(--border)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-5 py-2 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Node</th>
                <th className="text-left px-5 py-2 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Test Case</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 ? (
                <tr><td colSpan={2} className="px-5 py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>No test cases</td></tr>
              ) : (
                filteredCases.map(tc => {
                  const node = nodeMap.get(tc.id.split('-')[0]) || project.flows.find(n => (project.testCases[n.id] ?? []).some(t => t.id === tc.id))
                  return (
                    <tr key={tc.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-1.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>{node?.label ?? '—'}</td>
                      <td className="px-5 py-1.5" style={{ color: 'var(--text-primary)' }}>{tc.title}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with notes */}
        <div className="border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {project.notes ? (
            <div className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</div>
              <div className="whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">{project.notes}</div>
            </div>
          ) : (
            <div className="px-5 py-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              No notes added yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
