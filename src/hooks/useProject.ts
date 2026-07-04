'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalStorage } from './useLocalStorage'
import { Project, AppState, DEFAULT_COLUMNS } from '@/types'
import { queryKeys } from '@/lib/queryKeys'

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

async function fetchServerState(): Promise<AppState | null> {
  const res = await fetch('/api/state')
  return res.ok ? res.json() : null
}

async function pushServerState(next: AppState): Promise<void> {
  await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  })
}

export function useProject() {
  const [state, setState, lastSaved] = useLocalStorage<AppState>('qa-dashboard', INITIAL_STATE)
  const queryClient = useQueryClient()
  const hydratedRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  // Set right before an adopt-triggered setState so the push effect below
  // can tell "this state change came from the server" apart from a real
  // local edit — otherwise every poll response (always a fresh object, even
  // when content is unchanged) looks like a local edit and gets echoed
  // straight back to the server 300ms later, forever.
  const justAdoptedRef = useRef(false)

  // Transport for the server-backed file store (shared with the MCP
  // endpoint). Polls every 4s while the tab is visible (React Query pauses
  // refetchInterval automatically when the document is hidden).
  const stateQuery = useQuery({
    queryKey: queryKeys.state,
    queryFn: fetchServerState,
    refetchInterval: SERVER_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  })

  const pushMutation = useMutation({
    mutationFn: pushServerState,
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(queryKeys.state, variables)
    },
  })

  // Hydrate from / seed the server on the first settled response, then keep
  // adopting out-of-band changes (e.g. an MCP tool call in another process)
  // on every subsequent poll. Never lets an empty server response (e.g. a
  // fresh .ayu-data store on first run) wipe out existing localStorage data
  // — if the server has nothing yet, we seed it from local instead. Skips
  // adoption while a local push is still in flight so a poll response can't
  // clobber an edit that hasn't reached the server yet.
  useEffect(() => {
    if (!stateQuery.isFetched) return
    const serverState = stateQuery.data ?? null

    if (!hydratedRef.current) {
      if (serverState) {
        if (hasProjects(serverState)) {
          justAdoptedRef.current = true
          setState(serverState)
        } else if (hasProjects(stateRef.current)) {
          pushMutation.mutate(stateRef.current)
        }
      }
      hydratedRef.current = true
      return
    }

    if (pushMutation.isPending) return
    if (serverState && hasProjects(serverState)) {
      // Skip if content is unchanged — a fresh fetch is always a new object
      // reference even when nothing actually changed server-side.
      if (JSON.stringify(serverState) === JSON.stringify(stateRef.current)) return
      justAdoptedRef.current = true
      setState(serverState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateQuery.isFetched, stateQuery.dataUpdatedAt])

  // Push local changes to the server-backed store, debounced. Skipped until
  // the initial hydration above has resolved so we don't clobber server data
  // with a stale localStorage snapshot, and skipped when the change was just
  // adopted from the server (nothing new to push back).
  useEffect(() => {
    if (!hydratedRef.current) return
    if (justAdoptedRef.current) {
      justAdoptedRef.current = false
      return
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushMutation.mutate(state)
    }, SERVER_SYNC_DEBOUNCE_MS)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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
        githubRepo: data.githubRepo && typeof data.githubRepo === 'object' ? data.githubRepo : undefined,
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
