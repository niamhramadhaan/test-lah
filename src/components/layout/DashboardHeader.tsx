'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDashboard } from '@/context/DashboardContext'
import { useAuth } from '@/hooks/useAuth'
import { downloadMarkdown, downloadJSON } from '@/lib/export'
import { Modal } from '@/components/shared/Modal'
import { ProfileDropdown } from './ProfileDropdown'
import { ProfileCardModal } from './ProfileCardModal'
import { useProgress } from '@/components/shared/GlobalProgress'

const FUN_ICONS: Array<{ icon: React.ReactNode; bg: string }> = [
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="#6F4E37" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.9 1.45h12.76a1 1 0 00.9-1.45l-5.069-10.127A2 2 0 0114 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" fill="#6F4E37" opacity="0.15" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1010 10 4 4 0 01-5-5 4 4 0 01-5-5" /><circle cx="12" cy="12" r="1" fill="#6F4E37" /></svg>, bg: '#F5F0EB' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#6F4E37" opacity="0.2" /></svg>, bg: '#F7F3EE' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>, bg: '#EDE6DD' },
  { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 10-3.214 3.214c.446.166.855.497.925.968a.979.979 0 01-.276.837l-1.61 1.611a2.404 2.404 0 01-1.705.707 2.402 2.402 0 01-1.704-.706l-1.568-1.568a1.026 1.026 0 00-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 11-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 00-.289-.877l-1.568-1.568A2.402 2.402 0 011.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073.978a2.5 2.5 0 103.259-3.259c-.45-.196-.9-.558-.977-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0112 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 113.237 3.237c-.464.18-.894.527-.967 1.02z" /></svg>, bg: '#F5F0EB' },
]

function getFunIcon(id: string): { icon: React.ReactNode; bg: string } {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return FUN_ICONS[Math.abs(hash) % FUN_ICONS.length]
}

export function DashboardHeader() {
  const {
    projects, activeProject, activeProjectId,
    profile, profileInitials,
    setProfileName, setProfileBannerColor, setProfileAvatarUrl, setProfileRole,
    canUndo, canRedo, undo, redo,
    createProject, deleteProject, switchProject, renameProject,
    promptDialog, confirmDialog,
  } = useDashboard()

  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { startProgress, completeProgress } = useProgress()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const projectList = Object.values(projects)

  const stats = useMemo(() => {
    const allCases = projectList.flatMap(p => Object.values(p.testCases).flat())
    const totalCases = allCases.length
    const totalPass = allCases.filter(c => c.status === 'pass').length
    const totalFail = allCases.filter(c => c.status === 'fail').length
    const totalSkip = allCases.filter(c => c.status === 'skip').length
    const totalUntested = allCases.filter(c => c.status === 'untested').length
    const totalNodes = projectList.reduce((sum, p) => sum + p.flows.length, 0)
    const totalEdges = projectList.reduce((sum, p) => sum + (p.edges ?? []).length, 0)
    const denom = totalCases - totalSkip
    const passRate = denom > 0 ? Math.round((totalPass / denom) * 100) : 0
    return {
      projects: projectList.length,
      testCases: totalCases,
      passRate,
      nodes: totalNodes,
      edges: totalEdges,
      pass: totalPass,
      fail: totalFail,
      skip: totalSkip,
      untested: totalUntested,
    }
  }, [projectList])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNewProject = async () => {
    const name = await promptDialog('New Project', 'Enter project name:')
    if (name?.trim()) {
      startProgress('Creating project...')
      createProject(name.trim())
      setTimeout(() => completeProgress('Project created!'), 500)
    }
    setDropdownOpen(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirmDialog('Delete Project', 'This project will be permanently deleted.')
    if (ok) {
      startProgress('Deleting project...')
      deleteProject(id)
      setTimeout(() => completeProgress('Project deleted!'), 500)
    }
  }

  const handleLogout = async () => {
    const ok = await confirmDialog('Logout', 'Are you sure you want to log out?')
    if (ok) {
      startProgress('Logging out...')
      logout()
      setTimeout(() => {
        completeProgress('Logged out!')
        router.push('/login')
      }, 500)
    }
  }

  const startRename = () => {
    if (!activeProject) return
    setNameValue(activeProject.name)
    setEditingName(true)
  }

  const commitRename = () => {
    if (activeProject && nameValue.trim()) renameProject(activeProject.id, nameValue.trim())
    setEditingName(false)
  }

  const activeNav = pathname.startsWith('/integrations')
    ? 'integrations'
    : 'projects'

  return (
    <header
      className="flex flex-col border-b flex-shrink-0 relative"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Background duck logo — centered watermark */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none group/duck">
        <img
          src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
          alt=""
          className="h-[85%] object-contain select-none transition-all duration-300 group-hover/duck:scale-110 group-hover/duck:opacity-[0.15] cursor-pointer"
          style={{ opacity: 0.09, pointerEvents: 'auto' }}
          onClick={() => router.push('/projects')}
          title="Quack! 🦆"
        />
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md overflow-hidden bg-white flex-shrink-0"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
              <img
                src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
                alt="Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Test Lah!
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCardOpen(true)}
            className="px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            My Card
          </button>

          <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--border)' }} />

          <div className="relative z-[60]">
            <ProfileDropdown
              profile={profile}
              initials={profileInitials}
              onSetName={setProfileName}
              onSetBannerColor={setProfileBannerColor}
              onSetAvatarUrl={setProfileAvatarUrl}
              onSetRole={setProfileRole}
            />
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-6 h-6 flex items-center justify-center text-[10px] rounded-md border transition-colors hover:bg-[var(--bg-secondary)] hover:border-[var(--status-fail-text)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            title="Logout"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H3.5A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5M9 10l3-3-3-3M6 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project selector + Nav items row */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-1.5">
        <div className="flex items-center gap-1">
          <NavItem
            label="All Projects"
            href="/projects"
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
            }
            active={activeNav === 'projects'}
          />
          <NavItem
            label="Integrations"
            href="/integrations"
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M7.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
            active={activeNav === 'integrations'}
          />
        </div>

        {/* Project dropdown */}
        <div className="relative z-30" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-md border transition-colors hover:border-[var(--border-hover)]"
            style={{
              borderColor: dropdownOpen ? 'var(--accent)' : 'var(--border)',
              color: activeProject ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: dropdownOpen ? 'var(--bg-secondary)' : 'transparent',
            }}
          >
            {activeProject ? (
              <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getFunIcon(activeProject.id).bg }}>
                {getFunIcon(activeProject.id).icon}
              </span>
            ) : null}
            <span className="truncate max-w-[120px]">
              {pathname === '/projects' ? 'All Projects' : activeProject ? activeProject.name : 'Select project'}
            </span>
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full right-0 mt-1 w-52 py-1 border z-40"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                animation: 'fadeIn 150ms ease-out',
              }}
            >
              <div className="px-3 py-1.5 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Projects
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {projectList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { switchProject(p.id); setDropdownOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors"
                    style={{
                      color: p.id === activeProject?.id ? 'var(--accent)' : 'var(--text-primary)',
                      backgroundColor: p.id === activeProject?.id ? 'var(--bg-secondary)' : 'transparent',
                    }}
                  >
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getFunIcon(p.id).bg }}>
                      {getFunIcon(p.id).icon}
                    </span>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.id === activeProject?.id && (
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={handleNewProject}
                  className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  New Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProfileCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        profile={profile}
        initials={profileInitials}
        stats={stats}
      />
    </header>
  )
}

function NavItem({ label, icon, active, href, badge }: {
  label: string
  icon: React.ReactNode
  active: boolean
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-md transition-colors relative"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
        backgroundColor: active ? 'var(--bg-secondary)' : 'transparent',
      }}
    >
      {icon}
      {label}
      {badge && (
        <span
          className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full leading-none"
          style={{
            backgroundColor: active ? 'var(--accent)' : 'var(--bg-secondary)',
            color: active ? '#fff' : 'var(--text-tertiary)',
          }}
        >
          {badge}
        </span>
      )}
      {active && (
        <div
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}
    </Link>
  )
}
