'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDashboard } from '@/context/DashboardContext'
import { MindmapPanel } from '@/components/mindmap/MindmapPanel'
import { TestCasePanel } from '@/components/testcase/TestCasePanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { TestCaseSearch } from '@/components/testcase/TestCaseSearch'

function formatLastSaved(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const {
    projects, activeProject, activeProjectId, selectedNodeId,
    setSelectedNodeId, switchProject,
    mindmap, testCases, pushState, lastSaved,
    canUndo, canRedo, undo, redo, confirmDialog,
  } = useDashboard()

  const project = projects[projectId] ?? null
  const switchCalledRef = useRef<string | null>(null)

  // Use project directly while activeProjectId syncs via effect
  const activeProj = activeProjectId === projectId ? activeProject : project

  useEffect(() => {
    if (projects[projectId] && switchCalledRef.current !== projectId) {
      switchCalledRef.current = projectId
      switchProject(projectId)
    }
  }, [projectId, projects, switchProject])

  useEffect(() => {
    setSelectedNodeId(null)
  }, [projectId, setSelectedNodeId])

  const selectedNode = useMemo(
    () => activeProj?.flows.find(n => n.id === selectedNodeId) ?? null,
    [activeProj, selectedNodeId],
  )

  const [mobileTab, setMobileTab] = useState<'mindmap' | 'testcases'>('mindmap')
  const [searchOpen, setSearchOpen] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const [dividerHovered, setDividerHovered] = useState(false)
  const [tcFullscreen, setTcFullscreen] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ mouseX: 0, startRatio: 0.5 })

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartRef.current = { mouseX: e.clientX, startRatio: splitRatio }
    setIsDragging(true)
  }, [splitRatio])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragStartRef.current.mouseX
      const deltaRatio = deltaX / rect.width
      setSplitRatio(Math.max(0.1, Math.min(0.9, dragStartRef.current.startRatio + deltaRatio)))
    }
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!project) {
    return (
      <EmptyState
        message="Project not found."
        action={{ label: 'Back to Projects', onClick: () => router.push('/projects') }}
      />
    )
  }

  if (!activeProj) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading project...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex md:hidden border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <button
          onClick={() => setMobileTab('mindmap')}
          className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
          style={{
            color: mobileTab === 'mindmap' ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: mobileTab === 'mindmap' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          Mindmap
        </button>
        <button
          onClick={() => setMobileTab('testcases')}
          className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
          style={{
            color: mobileTab === 'testcases' ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: mobileTab === 'testcases' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          Test Cases
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {lastSaved ? (
            <span>Last saved {formatLastSaved(lastSaved)}</span>
          ) : (
            <span>Not saved yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            title="Search test cases (Ctrl+K)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="text-[9px] px-1 py-0.5 rounded border ml-1 hidden sm:inline" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>⌘K</kbd>
          </button>
          <button
            onClick={() => setTcFullscreen(prev => !prev)}
            className="p-1 rounded transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-tertiary)' }}
            title={tcFullscreen ? 'Exit fullscreen' : 'Expand test cases'}
          >
            {tcFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            )}
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/summary`)}
            className="hidden md:block px-3 py-1 text-xs font-medium rounded-md border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Project Report
          </button>
          <button
            onClick={() => {
              setSaveFeedback(true)
              setTimeout(() => setSaveFeedback(false), 1500)
              const event = new Event('save-project')
              window.dispatchEvent(event)
            }}
            className="px-3 py-1 text-xs font-medium rounded-md border transition-all"
            style={{
              borderColor: saveFeedback ? 'var(--status-pass-text)' : 'var(--border)',
              color: saveFeedback ? 'var(--status-pass-text)' : 'var(--text-secondary)',
              backgroundColor: saveFeedback ? 'var(--status-pass-bg)' : 'transparent',
            }}
          >
            {saveFeedback ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex min-h-0 relative"
        style={{ cursor: isDragging ? 'col-resize' : undefined }}
      >
        {!tcFullscreen && (
          <>
            <div
              ref={leftPanelRef}
              className={`
                ${mobileTab === 'mindmap' ? 'flex' : 'hidden'}
                md:flex flex-col min-w-0 mobile-full-width
              `}
              style={{ width: `${splitRatio * 100}%` }}
            >
          <MindmapPanel
            nodes={mindmap.nodes}
            edges={mindmap.edges}
            testCases={activeProj.testCases ?? {}}
            selectedNodeId={selectedNodeId}
            onSelect={mindmap.selectNode}
            onAddNode={(parentId, label, position, direction) => {
              pushState('Add node')
              mindmap.addNode(parentId, label, position, direction)
            }}
            onDeleteNode={(id) => {
              pushState('Delete node')
              mindmap.deleteNode(id)
            }}
            onDeleteNodes={(ids) => {
              pushState('Delete nodes')
              mindmap.deleteNodes(ids)
            }}
            onUnlinkNode={(id) => {
              pushState('Unlink node')
              mindmap.unlinkNode(id)
            }}
            onRenameNode={(id, label) => {
              pushState('Rename node')
              mindmap.renameNode(id, label)
            }}
            onUpdateNode={(id, patch) => {
              pushState('Update node')
              mindmap.updateNode(id, patch)
            }}
            onAddEdge={(fromId, toId, type) => {
              pushState('Add edge')
              mindmap.addEdge(fromId, toId, type)
            }}
            onDeleteEdge={(edgeId) => {
              pushState('Delete edge')
              mindmap.deleteEdge(edgeId)
            }}
            onUpdateEdge={(edgeId, patch) => {
              pushState('Update edge')
              mindmap.updateEdge(edgeId, patch)
            }}
            onResetLayout={() => {
              pushState('Reset layout')
              mindmap.resetLayout()
            }}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
        </div>

        {/* Animated beam divider */}
        <div
          ref={dividerRef}
          className="hidden md:flex items-center justify-center flex-shrink-0 select-none relative group"
          style={{ width: 20, cursor: 'col-resize' }}
          onMouseDown={handleDividerMouseDown}
          onMouseEnter={() => setDividerHovered(true)}
          onMouseLeave={() => setDividerHovered(false)}
        >
          {/* Background highlight on hover */}
          <div
            className="absolute inset-y-0 -left-2 -right-2 transition-colors duration-150"
            style={{ backgroundColor: dividerHovered || isDragging ? 'var(--bg-secondary)' : 'transparent' }}
          />
          {/* Static line */}
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] transition-opacity duration-150"
            style={{ backgroundColor: 'var(--border)', opacity: dividerHovered || isDragging ? 0 : 1 }}
          />
          {/* Animated beam */}
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] transition-opacity duration-150"
            style={{
              background: 'linear-gradient(180deg, #9E7AFF 0%, #FE8BBB 50%, #9E7AFF 100%)',
              opacity: dividerHovered || isDragging ? 0.8 : 0.4,
              animation: 'beamFlow 3s ease-in-out infinite',
              backgroundSize: '100% 200%',
            }}
          />
          {/* Drag handle dots */}
          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full transition-colors duration-150" style={{ backgroundColor: dividerHovered || isDragging ? 'var(--text-secondary)' : 'var(--text-tertiary)' }} />
            <div className="w-1.5 h-1.5 rounded-full transition-colors duration-150" style={{ backgroundColor: dividerHovered || isDragging ? 'var(--text-secondary)' : 'var(--text-tertiary)' }} />
            <div className="w-1.5 h-1.5 rounded-full transition-colors duration-150" style={{ backgroundColor: dividerHovered || isDragging ? 'var(--text-secondary)' : 'var(--text-tertiary)' }} />
          </div>
        </div>
          </>
        )}

        <div
          ref={rightPanelRef}
          className={`
            ${mobileTab === 'testcases' ? 'flex' : 'hidden'}
            md:flex flex-col min-w-0 mobile-full-width
          `}
          style={{ width: tcFullscreen ? '100%' : `${(1 - splitRatio) * 100}%` }}
        >
          <TestCasePanel
            selectedNode={selectedNode}
            testCases={testCases.testCases}
            stats={testCases.stats}
            columns={selectedNodeId ? (activeProj.columnConfigs?.[selectedNodeId] ?? activeProj.columnConfig ?? []) : (activeProj.columnConfig ?? [])}
            projectId={projectId}
            fullscreen={tcFullscreen}
            onAddTestCase={testCases.addTestCase}
            onUpdateTestCase={testCases.updateTestCase}
            onDeleteTestCase={testCases.deleteTestCase}
            onBulkDelete={testCases.bulkDeleteTestCases}
            onBulkUpdate={testCases.bulkUpdateTestCases}
            onReorderTestCases={testCases.reorderTestCases}
            onToggleColumn={testCases.toggleColumnVisibility}
            onRenameColumn={testCases.updateColumnConfig}
            onUpdateNode={mindmap.updateNode}
            onAddColumn={testCases.addColumn}
            onDeleteColumn={testCases.deleteColumn}
            onReorderColumn={testCases.reorderColumn}
            confirmDialog={confirmDialog}
          />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .mobile-full-width {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Test case search overlay */}
      {searchOpen && activeProj && (
        <TestCaseSearch
          nodes={activeProj.flows}
          testCases={activeProj.testCases ?? {}}
          onSelectNode={(nodeId) => {
            setSelectedNodeId(nodeId)
            mindmap.selectNode(nodeId)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  )
}
