'use client'

import { useCallback } from 'react'
import { TestCase, Project, Status, DEFAULT_COLUMNS } from '@/types'
import * as mutations from '@/lib/mutations/testCases'

function trackProjectActivity(projectId: string) {
  try {
    localStorage.setItem('qa-last-test-activity', new Date().toISOString())
    const raw = localStorage.getItem('qa-project-activity')
    const map = raw ? JSON.parse(raw) : {}
    map[projectId] = new Date().toISOString()
    localStorage.setItem('qa-project-activity', JSON.stringify(map))
  } catch {}
}

export interface TestStats {
  total: number
  pass: number
  fail: number
  skip: number
  untested: number
  blocked: number
  passRate: number
}

function computeStats(cases: TestCase[]): TestStats {
  const total = cases.length
  const pass = cases.filter(c => c.status === 'pass').length
  const fail = cases.filter(c => c.status === 'fail').length
  const skip = cases.filter(c => c.status === 'skip').length
  const untested = cases.filter(c => c.status === 'untested').length
  const blocked = cases.filter(c => c.status === 'blocked').length
  const denom = total - skip
  const passRate = denom > 0 ? Math.round((pass / denom) * 100) : 0
  return { total, pass, fail, skip, untested, blocked, passRate }
}

export function useTestCases(
  project: Project | null,
  updateProject: (id: string, updater: (p: Project) => Project) => void,
  selectedNodeId: string | null,
) {
  const cases: TestCase[] = selectedNodeId && project ? (project.testCases[selectedNodeId] ?? []) : []
  const stats: TestStats = computeStats(cases)

  const addTestCase = useCallback((nodeId: string, title: string, steps?: string, expected?: string) => {
    if (!project) return
    updateProject(project.id, p => mutations.addTestCase(p, nodeId, title, steps, expected).project)
    trackProjectActivity(project.id)
  }, [project, updateProject])

  const updateTestCase = useCallback((nodeId: string, tcId: string, patch: Partial<TestCase>) => {
    if (!project) return
    updateProject(project.id, p => mutations.updateTestCase(p, nodeId, tcId, patch))
    trackProjectActivity(project.id)
  }, [project, updateProject])

  const deleteTestCase = useCallback((nodeId: string, tcId: string) => {
    if (!project) return
    updateProject(project.id, p => mutations.deleteTestCase(p, nodeId, tcId))
  }, [project, updateProject])

  const bulkDeleteTestCases = useCallback((nodeId: string, tcIds: string[]) => {
    if (!project || tcIds.length === 0) return
    updateProject(project.id, p => mutations.bulkDeleteTestCases(p, nodeId, tcIds))
  }, [project, updateProject])

  const bulkUpdateTestCases = useCallback((nodeId: string, tcIds: string[], patch: Partial<TestCase>) => {
    if (!project || tcIds.length === 0) return
    updateProject(project.id, p => mutations.bulkUpdateTestCases(p, nodeId, tcIds, patch))
  }, [project, updateProject])

  const reorderTestCases = useCallback((nodeId: string, newOrder: string[]) => {
    if (!project) return
    updateProject(project.id, p => mutations.reorderTestCases(p, nodeId, newOrder))
  }, [project, updateProject])

  const updateColumnConfig = useCallback((nodeId: string, key: string, label: string) => {
    if (!project) return
    updateProject(project.id, p => {
      const configs = { ...(p.columnConfigs ?? {}) }
      const nodeConfig = configs[nodeId] ?? [...DEFAULT_COLUMNS]
      configs[nodeId] = nodeConfig.map(c => c.key === key ? { ...c, label } : c)
      return { ...p, columnConfigs: configs }
    })
  }, [project, updateProject])

  const toggleColumnVisibility = useCallback((nodeId: string, key: string) => {
    if (!project) return
    updateProject(project.id, p => {
      const configs = { ...(p.columnConfigs ?? {}) }
      const nodeConfig = configs[nodeId] ?? [...DEFAULT_COLUMNS]
      configs[nodeId] = nodeConfig.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
      return { ...p, columnConfigs: configs }
    })
  }, [project, updateProject])

  const addColumn = useCallback((nodeId: string, label: string) => {
    if (!project) return
    const key = label.toLowerCase().replace(/\s+/g, '_')
    updateProject(project.id, p => {
      const configs = { ...(p.columnConfigs ?? {}) }
      const nodeConfig = configs[nodeId] ?? [...DEFAULT_COLUMNS]
      configs[nodeId] = [...nodeConfig, { key, label, visible: true }]
      return { ...p, columnConfigs: configs }
    })
  }, [project, updateProject])

  const deleteColumn = useCallback((nodeId: string, key: string) => {
    if (!project) return
    updateProject(project.id, p => {
      const configs = { ...(p.columnConfigs ?? {}) }
      const nodeConfig = configs[nodeId] ?? [...DEFAULT_COLUMNS]
      configs[nodeId] = nodeConfig.filter(c => c.key !== key)
      return { ...p, columnConfigs: configs }
    })
  }, [project, updateProject])

  const reorderColumn = useCallback((nodeId: string, key: string, direction: 'up' | 'down') => {
    if (!project) return
    updateProject(project.id, p => {
      const configs = { ...(p.columnConfigs ?? {}) }
      const nodeConfig = [...(configs[nodeId] ?? [...DEFAULT_COLUMNS])]
      const idx = nodeConfig.findIndex(c => c.key === key)
      if (idx === -1) return p
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= nodeConfig.length) return p
      const temp = nodeConfig[idx]
      nodeConfig[idx] = nodeConfig[target]
      nodeConfig[target] = temp
      configs[nodeId] = nodeConfig
      return { ...p, columnConfigs: configs }
    })
  }, [project, updateProject])

  return {
    testCases: cases,
    stats,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    bulkDeleteTestCases,
    bulkUpdateTestCases,
    reorderTestCases,
    updateColumnConfig,
    toggleColumnVisibility,
    addColumn,
    deleteColumn,
    reorderColumn,
  }
}
