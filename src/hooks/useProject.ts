'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Project, AppState, DEFAULT_COLUMNS } from '@/types'

const INITIAL_STATE: AppState = {
  projects: {},
  activeProjectId: null,
  selectedNodeId: null,
}

const SERVER_SYNC_DEBOUNCE_MS = 300
const SERVER_POLL_INTERVAL_MS = 4000

function hasProjects(s: AppState): boolean {
  return Object.keys(s.projects ?? {}).length > 0
}

export function useProject() {
  const [state, setState, lastSaved] = useLocalStorage<AppState>('qa-dashboard', INITIAL_STATE)
  const hydratedRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from the server-backed file store (shared with the MCP endpoint) on
  // mount. Never lets an empty server response (e.g. a fresh .ayu-data store
  // on first run after upgrading) wipe out existing localStorage data — if
  // the server has nothing yet, we seed it from local instead of pulling.
  useEffect(() => {
    let cancelled = false
    fetch('/api/state')
      .then(res => (res.ok ? res.json() : null))
      .then((serverState: AppState | null) => {
        if (cancelled || !serverState) return
        if (hasProjects(serverState)) {
          setState(serverState)
        } else if (hasProjects(state)) {
          fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
          }).catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => { hydratedRef.current = true })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push local changes to the server-backed store, debounced. Skipped until
  // the initial hydration above has resolved so we don't clobber server data
  // with a stale localStorage snapshot.
  useEffect(() => {
    if (!hydratedRef.current) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => {})
    }, SERVER_SYNC_DEBOUNCE_MS)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [state])

  // Poll for out-of-band changes (e.g. from an MCP tool call in another
  // process) while the tab is visible. Last-write-wins, not a merge — and
  // never accepts an empty server response, so a transient/fresh server
  // store can't wipe local data out from under an open tab.
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === 'hidden') return
      fetch('/api/state')
        .then(res => (res.ok ? res.json() : null))
        .then((serverState: AppState | null) => {
          if (serverState && hasProjects(serverState)) setState(serverState)
        })
        .catch(() => {})
    }
    const interval = setInterval(poll, SERVER_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [setState])

  const createProject = useCallback((name: string, type?: string) => {
    const id = crypto.randomUUID()
    const project: Project = {
      id,
      name,
      type: type || '',
      notes: '',
      createdAt: new Date().toISOString(),
      flows: [],
      testCases: {},
      columnConfig: [...DEFAULT_COLUMNS],
      columnConfigs: {},
      edges: [],
      userProfile: { name: '', bannerColor: '#64B5F6' },
      nodeCounter: 0,
      tcCounter: {},
    }
    setState(prev => ({
      ...prev,
      projects: { ...prev.projects, [id]: project },
      activeProjectId: id,
      selectedNodeId: null,
    }))
    return id
  }, [setState])

  const deleteProject = useCallback((id: string) => {
    setState(prev => {
      const { [id]: _, ...rest } = prev.projects
      const remainingIds = Object.keys(rest)
      return {
        ...prev,
        projects: rest,
        activeProjectId: prev.activeProjectId === id
          ? (remainingIds[0] ?? null)
          : prev.activeProjectId,
        selectedNodeId: prev.activeProjectId === id ? null : prev.selectedNodeId,
      }
    })
  }, [setState])

  const switchProject = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeProjectId: id, selectedNodeId: null }))
  }, [setState])

  const renameProject = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [id]: { ...prev.projects[id], name },
      },
    }))
  }, [setState])

  const duplicateProject = useCallback((id: string) => {
    setState(prev => {
      const source = prev.projects[id]
      if (!source) return prev
      const newId = crypto.randomUUID()
      const now = new Date().toISOString()
      const clone: Project = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        createdAt: now,
      }
      return {
        ...prev,
        projects: { ...prev.projects, [newId]: clone },
        activeProjectId: newId,
        selectedNodeId: null,
      }
    })
  }, [setState])

  const importProject = useCallback((json: string): { ok: boolean; error?: string } => {
    try {
      const data = JSON.parse(json)
      if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid JSON' }
      if (!data.name || !data.flows) return { ok: false, error: 'Missing required fields (name, flows)' }

      const newId = crypto.randomUUID()
      const project: Project = {
        id: newId,
        name: data.name,
        createdAt: data.createdAt || new Date().toISOString(),
        flows: Array.isArray(data.flows) ? data.flows : [],
        testCases: data.testCases && typeof data.testCases === 'object' ? data.testCases : {},
        columnConfig: Array.isArray(data.columnConfig) ? data.columnConfig : [...DEFAULT_COLUMNS],
        columnConfigs: data.columnConfigs && typeof data.columnConfigs === 'object' ? data.columnConfigs : {},
        edges: Array.isArray(data.edges) ? data.edges : [],
        userProfile: data.userProfile && typeof data.userProfile === 'object' ? data.userProfile : { name: '', bannerColor: '#64B5F6' },
        nodeCounter: typeof data.nodeCounter === 'number' ? data.nodeCounter : 0,
        tcCounter: data.tcCounter && typeof data.tcCounter === 'object' ? data.tcCounter : {},
      }

      setState(prev => ({
        ...prev,
        projects: { ...prev.projects, [newId]: project },
        activeProjectId: newId,
        selectedNodeId: null,
      }))
      return { ok: true }
    } catch {
      return { ok: false, error: 'Failed to parse project file' }
    }
  }, [setState])

  const setSelectedNodeId = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }))
  }, [setState])

  const updateProject = useCallback((id: string, updater: (p: Project) => Project) => {
    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [id]: updater(prev.projects[id]),
      },
    }))
  }, [setState])

  const activeProject = state.activeProjectId ? state.projects[state.activeProjectId] ?? null : null

  return {
    state,
    setState,
    projects: state.projects,
    activeProject,
    activeProjectId: state.activeProjectId,
    selectedNodeId: state.selectedNodeId,
    createProject,
    deleteProject,
    duplicateProject,
    importProject,
    switchProject,
    renameProject,
    setSelectedNodeId,
    updateProject,
    lastSaved,
  }
}
