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
      className="relative flex flex-col border-b flex-shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Background duck logo */}
      <img
        src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
        alt=""
        className="absolute left-0 top-0 h-full object-contain pointer-events-none select-none"
        style={{ opacity: 0.04, width: 'auto' }}
      />

      <div className="relative z-10 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg overflow-hidden bg-white"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <img
                src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                Test Lah!
              </h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Your Boss&apos;s Favorite QA Tool
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCardOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              My Card
            </button>

            <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

            <ProfileDropdown
              profile={profile}
              initials={profileInitials}
              onSetName={setProfileName}
              onSetBannerColor={setProfileBannerColor}
              onSetAvatarUrl={setProfileAvatarUrl}
              onSetRole={setProfileRole}
            />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-7 h-7 flex items-center justify-center text-xs rounded-md border transition-colors hover:bg-[var(--bg-secondary)] hover:border-[var(--status-fail-text)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
              title="Logout"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H3.5A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5M9 10l3-3-3-3M6 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Project dropdown — below profile/logout */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border transition-colors hover:border-[var(--border-hover)]"
              style={{
                borderColor: dropdownOpen ? 'var(--accent)' : 'var(--border)',
                color: activeProject ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: dropdownOpen ? 'var(--bg-secondary)' : 'transparent',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="5" height="5" rx="1" />
                <rect x="8" y="1" width="5" height="5" rx="1" />
                <rect x="1" y="8" width="5" height="5" rx="1" />
                <rect x="8" y="8" width="5" height="5" rx="1" />
              </svg>
              <span className="truncate max-w-[140px]">
                {activeProject ? activeProject.name : 'Select project'}
              </span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1 w-56 py-1 border z-50"
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
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors"
                      style={{
                        color: p.id === activeProject?.id ? 'var(--accent)' : 'var(--text-primary)',
                        backgroundColor: p.id === activeProject?.id ? 'var(--bg-secondary)' : 'transparent',
                      }}
                    >
                      <span className="flex-1 truncate">{p.name}</span>
                      {p.id === activeProject?.id && (
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={handleNewProject}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--accent)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-1 px-6 pb-0">
        <NavItem
          label="All Projects"
          href="/projects"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M7.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
          active={activeNav === 'integrations'}
          badge="3"
        />
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
