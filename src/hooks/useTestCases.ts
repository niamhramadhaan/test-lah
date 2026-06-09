'use client'

import { useCallback } from 'react'
import { TestCase, Project, Status, DEFAULT_COLUMNS } from '@/types'

export interface TestStats {
  total: number
  pass: number
  fail: number
  skip: number
  untested: number
  passRate: number
}

function computeStats(cases: TestCase[]): TestStats {
  const total = cases.length
  const pass = cases.filter(c => c.status === 'pass').length
  const fail = cases.filter(c => c.status === 'fail').length
  const skip = cases.filter(c => c.status === 'skip').length
  const untested = cases.filter(c => c.status === 'untested').length
  const denom = total - skip
  const passRate = denom > 0 ? Math.round((pass / denom) * 100) : 0
  return { total, pass, fail, skip, untested, passRate }
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
    const node = project.flows.find(n => n.id === nodeId)
    const nodeCode = node?.code ?? 'N000'
    const existing = project.testCases[nodeId] ?? []
    let tcCode = ''
    updateProject(project.id, p => {
      const counters = { ...(p.tcCounter ?? {}) }
      const next = (counters[nodeId] ?? 0) + 1
      counters[nodeId] = next
      tcCode = `${nodeCode}-TC${String(next).padStart(3, '0')}`
      const tc: TestCase = {
        id: crypto.randomUUID(),
        code: tcCode,
        title,
        steps: steps ?? '',
        expected: expected ?? '',
        status: 'untested',
        case_type: 'General',
        notes: '',
        links: '',
        order: existing.length,
      }
      return {
        ...p,
        testCases: { ...p.testCases, [nodeId]: [...(p.testCases[nodeId] ?? []), tc] },
        tcCounter: counters,
      }
    })
  }, [project, updateProject])

  const updateTestCase = useCallback((nodeId: string, tcId: string, patch: Partial<TestCase>) => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      testCases: {
        ...p.testCases,
        [nodeId]: (p.testCases[nodeId] ?? []).map(tc => tc.id === tcId ? { ...tc, ...patch } : tc),
      },
    }))
  }, [project, updateProject])

  const deleteTestCase = useCallback((nodeId: string, tcId: string) => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      testCases: {
        ...p.testCases,
        [nodeId]: (p.testCases[nodeId] ?? []).filter(tc => tc.id !== tcId),
      },
    }))
  }, [project, updateProject])

  const reorderTestCases = useCallback((nodeId: string, newOrder: string[]) => {
    if (!project) return
    updateProject(project.id, p => {
      const existing = p.testCases[nodeId] ?? []
      const map = new Map(existing.map(tc => [tc.id, tc]))
      const reordered = newOrder.map((id, i) => {
        const tc = map.get(id)
        return tc ? { ...tc, order: i } : null
      }).filter(Boolean) as TestCase[]
      return { ...p, testCases: { ...p.testCases, [nodeId]: reordered } }
    })
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
    reorderTestCases,
    updateColumnConfig,
    toggleColumnVisibility,
    addColumn,
    deleteColumn,
    reorderColumn,
  }
}
