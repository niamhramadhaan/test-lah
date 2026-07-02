import { Project, TestCase } from '@/types'

export function addTestCase(
  project: Project,
  nodeId: string,
  title: string,
  steps?: string,
  expected?: string,
): { project: Project; testCase: TestCase } {
  const node = project.flows.find(n => n.id === nodeId)
  const nodeCode = node?.code ?? 'N000'
  const existing = project.testCases[nodeId] ?? []
  const counters = { ...(project.tcCounter ?? {}) }
  const next = (counters[nodeId] ?? 0) + 1
  counters[nodeId] = next
  const tcCode = `${nodeCode}-TC${String(next).padStart(3, '0')}`
  const testCase: TestCase = {
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
  const updated: Project = {
    ...project,
    testCases: { ...project.testCases, [nodeId]: [...existing, testCase] },
    tcCounter: counters,
  }
  return { project: updated, testCase }
}

export function updateTestCase(project: Project, nodeId: string, tcId: string, patch: Partial<TestCase>): Project {
  return {
    ...project,
    testCases: {
      ...project.testCases,
      [nodeId]: (project.testCases[nodeId] ?? []).map(tc => tc.id === tcId ? { ...tc, ...patch } : tc),
    },
  }
}

export function deleteTestCase(project: Project, nodeId: string, tcId: string): Project {
  return {
    ...project,
    testCases: {
      ...project.testCases,
      [nodeId]: (project.testCases[nodeId] ?? []).filter(tc => tc.id !== tcId),
    },
  }
}

export function bulkDeleteTestCases(project: Project, nodeId: string, tcIds: string[]): Project {
  const idSet = new Set(tcIds)
  return {
    ...project,
    testCases: {
      ...project.testCases,
      [nodeId]: (project.testCases[nodeId] ?? []).filter(tc => !idSet.has(tc.id)),
    },
  }
}

export function bulkUpdateTestCases(project: Project, nodeId: string, tcIds: string[], patch: Partial<TestCase>): Project {
  const idSet = new Set(tcIds)
  return {
    ...project,
    testCases: {
      ...project.testCases,
      [nodeId]: (project.testCases[nodeId] ?? []).map(tc => idSet.has(tc.id) ? { ...tc, ...patch } : tc),
    },
  }
}

export function reorderTestCases(project: Project, nodeId: string, newOrder: string[]): Project {
  const existing = project.testCases[nodeId] ?? []
  const map = new Map(existing.map(tc => [tc.id, tc]))
  const reordered = newOrder
    .map((id, i) => {
      const tc = map.get(id)
      return tc ? { ...tc, order: i } : null
    })
    .filter((tc): tc is TestCase => tc !== null)
  return { ...project, testCases: { ...project.testCases, [nodeId]: reordered } }
}
