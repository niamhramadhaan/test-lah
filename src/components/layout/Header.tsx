'use client'

import { useState, useRef, useEffect } from 'react'
import { Project, UserProfile } from '@/types'
import { downloadMarkdown, downloadJSON, downloadCSV, downloadXLSX } from '@/lib/export'
import { Modal } from '@/components/shared/Modal'
import { ProfileDropdown } from './ProfileDropdown'

interface HeaderProps {
  projects: Record<string, Project>
  activeProject: Project | null
  activeProjectId: string | null
  profile: UserProfile
  profileInitials: string
  onSetName: (name: string) => void
  onSetBannerColor: (color: string) => void
  onSetAvatarUrl: (url: string) => void
  onSetRole: (role: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenSummary: () => void
  onCreateProject: (name: string) => void
  onDeleteProject: (id: string) => void
  onSwitchProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
}

export function Header({
  projects,
  activeProject,
  activeProjectId,
  profile,
  profileInitials,
  onSetName,
  onSetBannerColor,
  onSetAvatarUrl,
  onSetRole,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSummary,
  onCreateProject,
  onDeleteProject,
  onSwitchProject,
  onRenameProject,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<'projects' | 'integrations'>('projects')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const projectList = Object.values(projects)

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

  const handleNewProject = () => {
    const name = prompt('Project name:')
    if (name?.trim()) onCreateProject(name.trim())
    setDropdownOpen(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this project?')) onDeleteProject(id)
  }

  const startRename = () => {
    if (!activeProject) return
    setNameValue(activeProject.name)
    setEditingName(true)
  }

  const commitRename = () => {
    if (activeProject && nameValue.trim()) onRenameProject(activeProject.id, nameValue.trim())
    setEditingName(false)
  }

  return (
    <header
      className="flex flex-col border-b"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #8B5CF6 100%)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4L8 1L14 4V12L8 15L2 12V4Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
                <circle cx="8" cy="8" r="2" fill="white" opacity="0.9" />
              </svg>
            </div>
            <div>
              <h1
                className="text-sm font-semibold tracking-tight leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                Test Lah!
              </h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Your Boss&apos;s Favorite QA Tool
              </p>
            </div>
          </div>

          {/* Project selector */}
          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:border-[var(--border-hover)]"
              style={{
                borderColor: dropdownOpen ? 'var(--accent)' : 'var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: dropdownOpen ? 'var(--bg-secondary)' : 'transparent',
              }}
            >
              {activeProject ? (
                editingName ? (
                  <input
                    ref={nameInputRef}
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false) }}
                    onClick={e => e.stopPropagation()}
                    className="bg-transparent outline-none w-32 text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                ) : (
                  <span onDoubleClick={e => { e.stopPropagation(); startRename() }}>
                    {activeProject.name}
                  </span>
                )
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>Select project</span>
              )}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-64 py-1 border z-50"
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
                {projectList.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--bg-secondary)]"
                    onClick={() => { onSwitchProject(p.id); setDropdownOpen(false) }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: p.id === activeProjectId ? 'var(--accent)' : 'var(--border)' }}
                      />
                      <span
                        className="text-sm truncate"
                        style={{ color: p.id === activeProjectId ? 'var(--accent)' : 'var(--text-primary)', fontWeight: p.id === activeProjectId ? 600 : 400 }}
                      >
                        {p.name}
                      </span>
                    </div>
                    <button
                      onClick={e => handleDelete(p.id, e)}
                      className="ml-2 text-xs opacity-0 group-hover:opacity-100 hover:opacity-100 px-1 py-0.5 rounded"
                      style={{ color: 'var(--status-fail-text)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {projectList.length === 0 && (
                  <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>No projects yet</div>
                )}
                <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                <button
                  onClick={handleNewProject}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  New Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions + Profile */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          {activeProject && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="w-7 h-7 flex items-center justify-center text-xs rounded-md border transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-25"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title="Undo (Ctrl+Z)"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 5h5a3 3 0 0 1 0 6H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M5.5 2.5L3 5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="w-7 h-7 flex items-center justify-center text-xs rounded-md border transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-25"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title="Redo (Ctrl+Shift+Z)"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 5H6a3 3 0 0 0 0 6h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M8.5 2.5L11 5 8.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </div>
          )}

          {/* Summary */}
          {activeProject && (
            <button
              onClick={onOpenSummary}
              className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Summary
            </button>
          )}

          {/* Export */}
          {activeProject && (
            <button
              onClick={() => setExportOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Export
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

          {/* Profile */}
          <ProfileDropdown
            profile={profile}
            initials={profileInitials}
            onSetName={onSetName}
            onSetBannerColor={onSetBannerColor}
            onSetAvatarUrl={onSetAvatarUrl}
            onSetRole={onSetRole}
          />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center gap-1 px-6 pb-0">
        <NavItem
          label="All Projects"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          }
          active={activeNav === 'projects'}
          onClick={() => setActiveNav('projects')}
        />
        <NavItem
          label="Integrations"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M7.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
          active={activeNav === 'integrations'}
          onClick={() => setActiveNav('integrations')}
          badge="3"
        />
      </div>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Project">
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Export &ldquo;{activeProject?.name}&rdquo; as:
          </p>
          <button
            onClick={() => { if (activeProject) downloadMarkdown(activeProject); setExportOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm rounded-md border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Markdown (.md)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Formatted tables for documentation</span>
          </button>
          <button
            onClick={() => { if (activeProject) downloadJSON(activeProject); setExportOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm rounded-md border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>JSON (.json)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Full data backup</span>
          </button>
          <button
            onClick={() => { if (activeProject) downloadCSV(activeProject); setExportOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm rounded-md border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>CSV (.csv)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Spreadsheet-compatible format</span>
          </button>
          <button
            onClick={async () => { if (activeProject) await downloadXLSX(activeProject); setExportOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm rounded-md border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Excel (.xlsx)</span>
            <br />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Styled spreadsheet for reporting</span>
          </button>
        </div>
      </Modal>
    </header>
  )
}

function NavItem({ label, icon, active, onClick, badge }: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
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
    </button>
  )
}
