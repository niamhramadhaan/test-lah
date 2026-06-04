'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useProject } from '@/hooks/useProject'
import { useProfile } from '@/hooks/useProfile'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useMindmap } from '@/hooks/useMindmap'
import { useTestCases } from '@/hooks/useTestCases'
import { useDialog } from '@/components/shared/Dialog'
import type { Project, UserProfile, FlowNode, TestCase, ConditionalEdge, ColumnConfig } from '@/types'
import type { TestStats } from '@/hooks/useTestCases'

interface DashboardContextValue {
  projects: Record<string, Project>
  activeProject: Project | null
  activeProjectId: string | null
  selectedNodeId: string | null
  createProject: (name: string) => string
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => void
  switchProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  setSelectedNodeId: (id: string | null) => void
  updateProject: (id: string, updater: (p: Project) => Project) => void
  profile: UserProfile
  profileInitials: string
  setProfileName: (name: string) => void
  setProfileBannerColor: (color: string) => void
  setProfileAvatarUrl: (url: string) => void
  setProfileRole: (role: string) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  pushState: (label: string) => void
  mindmap: {
    nodes: FlowNode[]
    edges: ConditionalEdge[]
    selectedNodeId: string | null
    addNode: (parentId: string | null, label: string, position?: { x: number; y: number }, direction?: 'horizontal' | 'vertical') => string | null
    deleteNode: (id: string) => void
    deleteNodes: (ids: string[]) => void
    unlinkNode: (id: string) => void
    renameNode: (id: string, label: string) => void
    updateNode: (id: string, patch: Partial<FlowNode>) => void
    selectNode: (id: string | null) => void
    addEdge: (fromId: string, toId: string, type: 'pass' | 'fail' | 'default') => void
    deleteEdge: (edgeId: string) => void
    updateEdge: (edgeId: string, patch: { type?: 'pass' | 'fail' | 'default' }) => void
    resetLayout: () => void
  }
  testCases: {
    testCases: TestCase[]
    stats: TestStats
    addTestCase: (nodeId: string, title: string, steps?: string, expected?: string) => void
    updateTestCase: (nodeId: string, tcId: string, patch: Partial<TestCase>) => void
    deleteTestCase: (nodeId: string, tcId: string) => void
    reorderTestCases: (nodeId: string, newOrder: string[]) => void
    updateColumnConfig: (nodeId: string, key: string, label: string) => void
    toggleColumnVisibility: (nodeId: string, key: string) => void
    addColumn: (nodeId: string, label: string) => void
    deleteColumn: (nodeId: string, key: string) => void
  }
  dialog: ReturnType<typeof useDialog>['dialog']
  alertDialog: (title: string, message: string) => Promise<void>
  confirmDialog: (title: string, message: string) => Promise<boolean>
  promptDialog: (title: string, message: string, defaultValue?: string) => Promise<string | null>
  lastSaved: string | null
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const project = useProject()
  const profileHook = useProfile()
  const undoRedo = useUndoRedo(project.activeProject, project.updateProject)
  const mindmapHook = useMindmap(project.activeProject, project.updateProject, project.selectedNodeId, project.setSelectedNodeId)
  const testCasesHook = useTestCases(project.activeProject, project.updateProject, project.selectedNodeId)
  const dialogs = useDialog()

  const value = useMemo<DashboardContextValue>(() => ({
    projects: project.projects,
    activeProject: project.activeProject,
    activeProjectId: project.activeProjectId,
    selectedNodeId: project.selectedNodeId,
    createProject: project.createProject,
    deleteProject: project.deleteProject,
    duplicateProject: project.duplicateProject,
    switchProject: project.switchProject,
    renameProject: project.renameProject,
    setSelectedNodeId: project.setSelectedNodeId,
    updateProject: project.updateProject,
    profile: profileHook.profile,
    profileInitials: profileHook.initials,
    setProfileName: profileHook.setName,
    setProfileBannerColor: profileHook.setBannerColor,
    setProfileAvatarUrl: profileHook.setAvatarUrl,
    setProfileRole: profileHook.setRole,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    pushState: undoRedo.pushState,
    mindmap: mindmapHook,
    testCases: testCasesHook,
    dialog: dialogs.dialog,
    alertDialog: dialogs.alert,
    confirmDialog: dialogs.confirm,
    promptDialog: dialogs.prompt,
    lastSaved: project.lastSaved,
  }), [project, profileHook, undoRedo, mindmapHook, testCasesHook, dialogs])

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
