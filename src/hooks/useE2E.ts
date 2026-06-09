'use client'

import { useCallback, useMemo } from 'react'
import type { Project, E2EProjectData, E2ERun, E2ESavedScript, E2ERunConfig, E2ETestResult } from '@/types'

const DEFAULT_E2E_CONFIG: E2ERunConfig = {
  baseUrl: 'http://localhost:3000',
  browser: 'chromium',
  headless: true,
  timeout: 30000,
}

const MAX_SAVED_RUNS = 20

export function useE2E(
  activeProject: Project | null,
  updateProject: (id: string, updater: (p: Project) => Project) => void
) {
  const projectId = activeProject?.id

  const e2eData = useMemo<E2EProjectData>(() => {
    return activeProject?.e2eData || {
      config: DEFAULT_E2E_CONFIG,
      runs: [],
      savedScripts: [],
    }
  }, [activeProject?.e2eData])

  const updateE2EData = useCallback((updater: (data: E2EProjectData) => E2EProjectData) => {
    if (!projectId) return
    updateProject(projectId, (p) => ({
      ...p,
      e2eData: updater(p.e2eData || { config: DEFAULT_E2E_CONFIG, runs: [], savedScripts: [] }),
    }))
  }, [projectId, updateProject])

  const saveConfig = useCallback((config: Partial<E2ERunConfig>) => {
    updateE2EData((data) => ({
      ...data,
      config: { ...data.config, ...config },
    }))
  }, [updateE2EData])

  const saveRun = useCallback((run: Omit<E2ERun, 'id' | 'timestamp'>) => {
    const newRun: E2ERun = {
      ...run,
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }

    updateE2EData((data) => ({
      ...data,
      runs: [newRun, ...data.runs].slice(0, MAX_SAVED_RUNS),
    }))

    return newRun
  }, [updateE2EData])

  const deleteRun = useCallback((runId: string) => {
    updateE2EData((data) => ({
      ...data,
      runs: data.runs.filter((r) => r.id !== runId),
    }))
  }, [updateE2EData])

  const clearRuns = useCallback(() => {
    updateE2EData((data) => ({
      ...data,
      runs: [],
    }))
  }, [updateE2EData])

  const saveScript = useCallback((testCaseId: string, title: string, code: string, script: string) => {
    updateE2EData((data) => {
      const existing = data.savedScripts.findIndex((s) => s.testCaseId === testCaseId)
      const updated: E2ESavedScript = {
        id: existing >= 0 ? data.savedScripts[existing].id : `script-${Date.now()}`,
        projectId: projectId!,
        testCaseId,
        title,
        code,
        script,
        updatedAt: new Date().toISOString(),
      }

      const scripts = [...data.savedScripts]
      if (existing >= 0) {
        scripts[existing] = updated
      } else {
        scripts.push(updated)
      }

      return { ...data, savedScripts: scripts }
    })
  }, [projectId, updateE2EData])

  const deleteScript = useCallback((testCaseId: string) => {
    updateE2EData((data) => ({
      ...data,
      savedScripts: data.savedScripts.filter((s) => s.testCaseId !== testCaseId),
    }))
  }, [updateE2EData])

  const getScript = useCallback((testCaseId: string): E2ESavedScript | undefined => {
    return e2eData.savedScripts.find((s) => s.testCaseId === testCaseId)
  }, [e2eData.savedScripts])

  return {
    config: e2eData.config,
    runs: e2eData.runs,
    savedScripts: e2eData.savedScripts,
    saveConfig,
    saveRun,
    deleteRun,
    clearRuns,
    saveScript,
    deleteScript,
    getScript,
  }
}
