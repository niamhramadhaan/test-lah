'use client'

import { useCallback } from 'react'
import { FlowNode, Project, NodeShape, EdgeType, NodeDirection, createDefaultNode } from '@/types'

export function useMindmap(
  project: Project | null,
  updateProject: (id: string, updater: (p: Project) => Project) => void,
  selectedNodeId: string | null,
  setSelectedNodeId: (id: string | null) => void,
) {
  const nodes = project?.flows ?? []
  const edges = project?.edges ?? []

  const addNode = useCallback((parentId: string | null, label: string, position?: { x: number; y: number }, direction?: NodeDirection): string | null => {
    if (!project) return null
    const id = crypto.randomUUID()
    let nodeCode = ''
    updateProject(project.id, p => {
      const counter = (p.nodeCounter ?? 0) + 1
      // Generate code from label: take first 3 chars uppercase, or N001 fallback
      const clean = (label || '').trim().replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/)
      if (clean.length >= 2) {
        nodeCode = clean.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') + String(counter).padStart(2, '0')
      } else if (clean[0] && clean[0].length >= 2) {
        nodeCode = clean[0].slice(0, 3).toUpperCase() + String(counter).padStart(2, '0')
      } else {
        nodeCode = `N${String(counter).padStart(3, '0')}`
      }
      const newNode = createDefaultNode(id, nodeCode, label, parentId)
      if (position) {
        newNode.position = position
      }
      if (direction) {
        newNode.direction = direction
      }
      const flows = [...p.flows]
      if (parentId) {
        const parentIdx = flows.findIndex(n => n.id === parentId)
        if (parentIdx !== -1) {
          flows[parentIdx] = { ...flows[parentIdx], children: [...flows[parentIdx].children, id] }
        }
      }
      flows.push(newNode)
      return { ...p, flows, testCases: { ...p.testCases, [id]: [] }, nodeCounter: counter }
    })
    setSelectedNodeId(id)
    return id
  }, [project, updateProject, setSelectedNodeId])

  const deleteNode = useCallback((id: string) => {
    if (!project) return
    const toDelete = new Set<string>()
    const collect = (nid: string) => {
      toDelete.add(nid)
      const node = project.flows.find(n => n.id === nid)
      node?.children.forEach(collect)
    }
    collect(id)

    updateProject(project.id, p => {
      const flows = p.flows
        .filter(n => !toDelete.has(n.id))
        .map(n => ({ ...n, children: n.children.filter(c => !toDelete.has(c)) }))
      const testCases = { ...p.testCases }
      toDelete.forEach(did => delete testCases[did])
      const edges = (p.edges ?? []).filter(e => !toDelete.has(e.fromId) && !toDelete.has(e.toId))
      return { ...p, flows, testCases, edges }
    })
    if (toDelete.has(selectedNodeId ?? '')) setSelectedNodeId(null)
  }, [project, updateProject, selectedNodeId, setSelectedNodeId])

  const deleteNodes = useCallback((ids: string[]) => {
    if (!project || ids.length === 0) return
    const toDelete = new Set<string>()
    const collect = (nid: string) => {
      toDelete.add(nid)
      const node = project.flows.find(n => n.id === nid)
      node?.children.forEach(collect)
    }
    ids.forEach(collect)

    updateProject(project.id, p => {
      const flows = p.flows
        .filter(n => !toDelete.has(n.id))
        .map(n => ({ ...n, children: n.children.filter(c => !toDelete.has(c)) }))
      const testCases = { ...p.testCases }
      toDelete.forEach(did => delete testCases[did])
      const edges = (p.edges ?? []).filter(e => !toDelete.has(e.fromId) && !toDelete.has(e.toId))
      return { ...p, flows, testCases, edges }
    })
    if (toDelete.has(selectedNodeId ?? '')) setSelectedNodeId(null)
  }, [project, updateProject, selectedNodeId, setSelectedNodeId])

  const renameNode = useCallback((id: string, label: string) => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      flows: p.flows.map(n => n.id === id ? { ...n, label } : n),
    }))
  }, [project, updateProject])

  const updateNode = useCallback((id: string, patch: Partial<FlowNode>) => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      flows: p.flows.map(n => n.id === id ? { ...n, ...patch } : n),
    }))
  }, [project, updateProject])

  const unlinkNode = useCallback((id: string) => {
    if (!project) return
    updateProject(project.id, p => {
      const node = p.flows.find(n => n.id === id)
      if (!node || !node.parentId) return p
      return {
        ...p,
        flows: p.flows.map(n => {
          if (n.id === id) return { ...n, parentId: null }
          if (n.id === node.parentId) return { ...n, children: n.children.filter(c => c !== id) }
          return n
        }),
      }
    })
  }, [project, updateProject])

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id)
  }, [setSelectedNodeId])

  const addEdge = useCallback((fromId: string, toId: string, type: EdgeType) => {
    if (!project) return
    const edge = { id: crypto.randomUUID(), fromId, toId, type }
    updateProject(project.id, p => ({ ...p, edges: [...(p.edges ?? []), edge] }))
  }, [project, updateProject])

  const deleteEdge = useCallback((edgeId: string) => {
    if (!project) return
    updateProject(project.id, p => ({ ...p, edges: (p.edges ?? []).filter(e => e.id !== edgeId) }))
  }, [project, updateProject])

  const updateEdge = useCallback((edgeId: string, patch: { type?: EdgeType }) => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      edges: (p.edges ?? []).map(e => e.id === edgeId ? { ...e, ...patch } : e),
    }))
  }, [project, updateProject])

  const resetLayout = useCallback(() => {
    if (!project) return
    updateProject(project.id, p => ({
      ...p,
      flows: p.flows.map(n => ({ ...n, position: null })),
    }))
  }, [project, updateProject])

  return {
    nodes,
    edges,
    selectedNodeId,
    addNode,
    deleteNode,
    deleteNodes,
    unlinkNode,
    renameNode,
    updateNode,
    selectNode,
    addEdge,
    deleteEdge,
    updateEdge,
    resetLayout,
  }
}
