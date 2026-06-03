'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FlowNode, TestCase, ConditionalEdge } from '@/types'
import { MindmapNode } from './MindmapNode'
import { useLayout } from './useLayout'
import { DotPattern } from '@/components/ui/dot-pattern'
import { RippleButton } from '@/components/ui/ripple-button'

interface MindmapCanvasProps {
  nodes: FlowNode[]
  edges: ConditionalEdge[]
  testCases: Record<string, TestCase[]>
  selectedNodeId: string | null
  onSelect: (id: string | null) => void
  onAddNode: (parentId: string | null, label: string, position?: { x: number; y: number }, direction?: 'horizontal' | 'vertical') => void
  onDeleteNode: (id: string) => void
  onDeleteNodes: (ids: string[]) => void
  onUnlinkNode: (id: string) => void
  onRenameNode: (id: string, label: string) => void
  onUpdateNode: (id: string, patch: Partial<FlowNode>) => void
  onAddEdge: (fromId: string, toId: string, type: 'pass' | 'fail' | 'default') => void
  onDeleteEdge: (edgeId: string) => void
  onUpdateEdge: (edgeId: string, patch: { type?: 'pass' | 'fail' | 'default' }) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function MindmapCanvas({
  nodes,
  edges,
  testCases,
  selectedNodeId,
  onSelect,
  onAddNode,
  onDeleteNode,
  onDeleteNodes,
  onUnlinkNode,
  onRenameNode,
  onUpdateNode,
  onAddEdge,
  onDeleteEdge,
  onUpdateEdge,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: MindmapCanvasProps) {
  const positions = useLayout(nodes)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodeDrag, setNodeDrag] = useState<{ id: string; startNodeX: number; startNodeY: number; startClientX: number; startClientY: number } | null>(null)
  const [creating, setCreating] = useState(false)
  const [createPos, setCreatePos] = useState<{ x: number; y: number } | null>(null)
  const [edgeDrag, setEdgeDrag] = useState<{ fromId: string; type: 'pass' | 'fail'; startX: number; startY: number; curX: number; curY: number; direction: 'horizontal' | 'vertical' } | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteChecked, setDeleteChecked] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)
  const [unlinkMode, setUnlinkMode] = useState(false)
  const [unlinkChecked, setUnlinkChecked] = useState<Set<string>>(new Set())
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)
  const pendingNodeUpdate = useRef<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(prev => Math.max(0.2, Math.min(3, prev * delta)))
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  const fitView = useCallback(() => {
    const posArr = Array.from(positions.values())
    if (posArr.length === 0) { setScale(1); setPan({ x: 0, y: 0 }); return }
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const minX = Math.min(...posArr.map(p => p.x)) - 80
    const maxX = Math.max(...posArr.map(p => p.x)) + 80
    const minY = Math.min(...posArr.map(p => p.y)) - 80
    const maxY = Math.max(...posArr.map(p => p.y)) + 80
    const contentW = maxX - minX
    const contentH = maxY - minY
    const newScale = Math.min(rect.width / contentW, rect.height / contentH, 1.5)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setScale(newScale)
    setPan({ x: (rect.width / 2 / newScale) - centerX, y: (rect.height / 2 / newScale) - centerY })
  }, [positions])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setScale(s => Math.min(3, s * 1.15)) }
        if (e.key === '-') { e.preventDefault(); setScale(s => Math.max(0.2, s * 0.85)) }
        if (e.key === '0') { e.preventDefault(); fitView() }
      }

      if (e.key === 'Tab' && selectedNodeId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const node = nodes.find(n => n.id === selectedNodeId)
        if (node) {
          const event = new CustomEvent('mindmap:add-child', { detail: { parentId: node.id } })
          window.dispatchEvent(event)
        }
      }

      if (e.key === 'Enter' && selectedNodeId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const node = nodes.find(n => n.id === selectedNodeId)
        if (node) {
          if (node.parentId) {
            const event = new CustomEvent('mindmap:add-child', { detail: { parentId: node.parentId } })
            window.dispatchEvent(event)
          } else {
            const pos = positions.get(node.id)
            if (pos) {
              onAddNode(null, '', { x: pos.x, y: pos.y + 70 })
            }
          }
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setSingleDeleteId(selectedNodeId)
        setShowDeleteConfirm(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, nodes, positions, onAddNode, onDeleteNode, fitView])

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / scale - pan.x,
      y: (clientY - rect.top) / scale - pan.y,
    }
  }, [scale, pan])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setDragging(true)
      setDragStart({ x: e.clientX - pan.x * scale, y: e.clientY - pan.y * scale })
    }
  }, [pan, scale])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({
        x: (e.clientX - dragStart.x) / scale,
        y: (e.clientY - dragStart.y) / scale,
      })
    }
    if (nodeDrag) {
      const startPt = getSvgPoint(nodeDrag.startClientX, nodeDrag.startClientY)
      const curPt = getSvgPoint(e.clientX, e.clientY)
      const dx = curPt.x - startPt.x
      const dy = curPt.y - startPt.y
      const newX = nodeDrag.startNodeX + dx
      const newY = nodeDrag.startNodeY + dy
      pendingNodeUpdate.current = { id: nodeDrag.id, x: newX, y: newY }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingNodeUpdate.current) {
            onUpdateNode(pendingNodeUpdate.current.id, { position: { x: pendingNodeUpdate.current.x, y: pendingNodeUpdate.current.y } })
            pendingNodeUpdate.current = null
          }
          rafRef.current = null
        })
      }
    }
    if (edgeDrag) {
      const pt = getSvgPoint(e.clientX, e.clientY)
      setEdgeDrag(prev => prev ? { ...prev, curX: pt.x, curY: pt.y } : null)
      let found: string | null = null
      for (const node of nodes) {
        if (node.id === edgeDrag.fromId) continue
        const pos = positions.get(node.id)
        if (!pos) continue
        const ddx = pt.x - pos.x
        const ddy = pt.y - pos.y
        if (Math.abs(ddx) < 80 && Math.abs(ddy) < 40) {
          found = node.id
          break
        }
      }
      setHoveredNodeId(found)
    }
  }, [dragging, dragStart, scale, nodeDrag, edgeDrag, getSvgPoint, onUpdateNode, nodes, positions])

  const handleMouseUp = useCallback(() => {
    if (edgeDrag) {
      const pt = { x: edgeDrag.curX, y: edgeDrag.curY }
      for (const node of nodes) {
        const pos = positions.get(node.id)
        if (!pos) continue
        const dx = pt.x - pos.x
        const dy = pt.y - pos.y
        if (Math.abs(dx) < 80 && Math.abs(dy) < 40 && node.id !== edgeDrag.fromId) {
          onAddEdge(edgeDrag.fromId, node.id, edgeDrag.type)
          break
        }
      }
      setEdgeDrag(null)
      setHoveredNodeId(null)
    }
    setDragging(false)
    setNodeDrag(null)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [edgeDrag, nodes, positions, onAddEdge])

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      onSelect(null)
      setCreating(false)
    }
  }, [onSelect])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      const pos = getSvgPoint(e.clientX, e.clientY)
      setCreatePos(pos)
      setCreating(true)
    }
  }, [getSvgPoint])

  const handleCreateSubmit = useCallback((label: string) => {
    if (label.trim()) onAddNode(null, label.trim(), createPos ?? undefined)
    setCreating(false)
    setCreatePos(null)
  }, [onAddNode, createPos])

  const handleNodeDragStart = useCallback((id: string, startClientX: number, startClientY: number, startNodeX: number, startNodeY: number) => {
    setNodeDrag({ id, startNodeX, startNodeY, startClientX, startClientY })
  }, [])

  const handleEdgeStart = useCallback((id: string, type: 'pass' | 'fail', x: number, y: number, direction: 'horizontal' | 'vertical') => {
    setEdgeDrag({ fromId: id, type, startX: x, startY: y, curX: x, curY: y, direction })
  }, [])

  const toggleDeleteMode = useCallback(() => {
    setDeleteMode(prev => !prev)
    setDeleteChecked(new Set())
    setUnlinkMode(false)
    setUnlinkChecked(new Set())
  }, [])

  const toggleUnlinkMode = useCallback(() => {
    setUnlinkMode(prev => !prev)
    setUnlinkChecked(new Set())
    setDeleteMode(false)
    setDeleteChecked(new Set())
  }, [])

  const handleToggleUnlinkCheck = useCallback((edgeId: string) => {
    setUnlinkChecked(prev => {
      const next = new Set(prev)
      if (next.has(edgeId)) {
        next.delete(edgeId)
      } else {
        next.add(edgeId)
      }
      return next
    })
  }, [])

  const handleConfirmUnlink = useCallback(() => {
    Array.from(unlinkChecked).forEach(edgeId => {
      if (edgeId.startsWith('tree-')) {
        const nodeId = edgeId.replace('tree-', '')
        onUnlinkNode(nodeId)
      } else {
        onDeleteEdge(edgeId)
      }
    })
    setUnlinkChecked(new Set())
    setUnlinkMode(false)
  }, [unlinkChecked, onUnlinkNode, onDeleteEdge])

  const handleToggleDeleteCheck = useCallback((id: string) => {
    setDeleteChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (singleDeleteId) {
      onDeleteNode(singleDeleteId)
      setSingleDeleteId(null)
    } else if (deleteChecked.size > 0) {
      onDeleteNodes(Array.from(deleteChecked))
      setDeleteChecked(new Set())
      setDeleteMode(false)
    }
    setShowDeleteConfirm(false)
  }, [singleDeleteId, deleteChecked, onDeleteNode, onDeleteNodes])

  const allPos = Array.from(positions.values())
  const contentW = allPos.length > 0 ? Math.max(...allPos.map(p => p.x)) - Math.min(...allPos.map(p => p.x)) + 400 : 800
  const contentH = allPos.length > 0 ? Math.max(...allPos.map(p => p.y)) - Math.min(...allPos.map(p => p.y)) + 400 : 600

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className="text-neutral-300/60 dark:text-neutral-600/40"
      />

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button onClick={() => setScale(s => Math.min(3, s * 1.2))} className="w-7 h-7 flex items-center justify-center text-xs rounded border transition-colors hover:bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>+</button>
        <button onClick={() => setScale(s => Math.max(0.2, s * 0.8))} className="w-7 h-7 flex items-center justify-center text-xs rounded border transition-colors hover:bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>−</button>
        <button onClick={fitView} className="w-7 h-7 flex items-center justify-center text-[10px] rounded border transition-colors hover:bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>Fit</button>
        <div className="text-[10px] text-center mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{Math.round(scale * 100)}%</div>
        <div className="mt-1 border-t pt-1" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={toggleDeleteMode}
            className="w-7 h-7 flex items-center justify-center text-[10px] rounded border transition-colors"
            style={{
              borderColor: deleteMode ? 'var(--status-fail-text)' : 'var(--border)',
              color: deleteMode ? 'var(--status-fail-text)' : 'var(--text-secondary)',
              backgroundColor: deleteMode ? 'var(--status-fail-bg)' : 'var(--bg-card)',
            }}
            title={deleteMode ? 'Exit delete mode' : 'Delete nodes'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={toggleUnlinkMode}
            className="w-7 h-7 mt-1 flex items-center justify-center text-[10px] rounded border transition-colors"
            style={{
              borderColor: unlinkMode ? 'var(--status-skip-text)' : 'var(--border)',
              color: unlinkMode ? 'var(--status-skip-text)' : 'var(--text-secondary)',
              backgroundColor: unlinkMode ? 'var(--status-skip-bg)' : 'var(--bg-card)',
            }}
            title={unlinkMode ? 'Exit unlink mode' : 'Unlink lines'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3" />
              <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="3 3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-7 h-7 flex items-center justify-center text-xs rounded border transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-25"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
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
          className="w-7 h-7 flex items-center justify-center text-xs rounded border transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-25"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 5H6a3 3 0 0 0 0 6h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M8.5 2.5L11 5 8.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>

      {/* Delete mode toolbar */}
      {deleteMode && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--status-fail-text)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInDown 200ms ease-out',
          }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Select nodes to delete
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
            {deleteChecked.size} selected
          </span>
          <button
            onClick={() => {
              if (deleteChecked.size > 0) setShowDeleteConfirm(true)
            }}
            disabled={deleteChecked.size === 0}
            className="px-3 py-1 text-[11px] font-medium rounded transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--status-fail-text)', color: 'white' }}
          >
            Delete
          </button>
          <button
            onClick={toggleDeleteMode}
            className="px-3 py-1 text-[11px] rounded border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Unlink mode toolbar */}
      {unlinkMode && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--status-skip-text)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInDown 200ms ease-out',
          }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Select lines to unlink
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--status-skip-bg)', color: 'var(--status-skip-text)' }}>
            {unlinkChecked.size} selected
          </span>
          <button
            onClick={handleConfirmUnlink}
            disabled={unlinkChecked.size === 0}
            className="px-3 py-1 text-[11px] font-medium rounded transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--status-skip-text)', color: 'white' }}
          >
            Unlink
          </button>
          <button
            onClick={toggleUnlinkMode}
            className="px-3 py-1 text-[11px] rounded border transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm mx-4 p-5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Delete {singleDeleteId ? 'node' : `${deleteChecked.size} node${deleteChecked.size > 1 ? 's' : ''}`}?
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
              This will permanently remove the {singleDeleteId ? 'node' : `selected node${deleteChecked.size > 1 ? 's' : ''}`} and all their test cases. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--status-fail-text)', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNodeId && (
        <div className="absolute bottom-3 left-3 z-10 flex gap-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>Tab = add child</span>
          <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>Enter = add sibling</span>
          <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>Del = delete</span>
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackgroundClick}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: dragging ? 'grabbing' : nodeDrag ? 'grabbing' : edgeDrag ? 'crosshair' : 'default' }}
      >
        <defs>
          <marker id="arrow-pass" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="var(--status-pass-text)" />
          </marker>
          <marker id="arrow-fail" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="var(--status-fail-text)" />
          </marker>
          <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="var(--text-tertiary)" />
          </marker>
        </defs>

        <g transform={`scale(${scale}) translate(${pan.x}, ${pan.y})`}>
          {nodes.map(node => {
            if (!node.parentId) return null
            const parentPos = positions.get(node.parentId)
            const childPos = positions.get(node.id)
            if (!parentPos || !childPos) return null

            // Check if there's a pass/fail edge between parent and child
            const hasConditionalEdge = edges.some(e =>
              (e.fromId === node.parentId && e.toId === node.id) ||
              (e.fromId === node.id && e.toId === node.parentId)
            )
            // Hide default tree edge if conditional edge exists
            if (hasConditionalEdge) return null

            const parentNode = nodes.find(n => n.id === node.parentId)
            const isVertical = parentNode?.direction === 'vertical'

            const treeEdgeId = `tree-${node.id}`
            const isChecked = unlinkChecked.has(treeEdgeId)

            let pathD: string
            if (isVertical) {
              // Vertical: parent bottom → child top
              const cy1 = parentPos.y + 40
              const cy2 = childPos.y - 40
              pathD = `M ${parentPos.x} ${parentPos.y + 28} C ${parentPos.x} ${cy1}, ${childPos.x} ${cy2}, ${childPos.x} ${childPos.y - 21}`
            } else {
              // Horizontal: parent right → child left
              const cx1 = parentPos.x + 60
              const cx2 = childPos.x - 60
              pathD = `M ${parentPos.x + 70} ${parentPos.y} C ${cx1} ${parentPos.y}, ${cx2} ${childPos.y}, ${childPos.x - 60} ${childPos.y}`
            }

            const midX = (parentPos.x + childPos.x) / 2
            const midY = (parentPos.y + childPos.y) / 2

            return (
              <g key={`tree-edge-${node.id}`}>
                {/* Wider invisible hitbox for clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: unlinkMode ? 'pointer' : 'pointer' }}
                  onClick={() => { unlinkMode ? handleToggleUnlinkCheck(treeEdgeId) : onAddEdge(node.parentId!, node.id, 'pass') }}
                  onDoubleClick={(e) => { e.stopPropagation(); if (!unlinkMode) onUnlinkNode(node.id) }}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={unlinkMode && isChecked ? 'var(--status-skip-text)' : 'var(--border-hover)'}
                  strokeWidth={unlinkMode && isChecked ? 2.5 : 1.5}
                  strokeDasharray={unlinkMode && isChecked ? '6 4' : 'none'}
                  style={{ pointerEvents: 'none', transition: 'stroke 150ms, stroke-width 150ms' }}
                />
                {/* Unlink checkbox on tree edge */}
                {unlinkMode && (
                  <g transform={`translate(${midX}, ${midY})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={-7} y={-7} width={14} height={14} rx={3}
                      fill={isChecked ? 'var(--status-skip-text)' : 'var(--bg-card)'}
                      stroke={isChecked ? 'var(--status-skip-text)' : 'var(--border)'}
                      strokeWidth={1.5}
                    />
                    {isChecked && (
                      <path
                        d="M -4 0 L -1 3 L 4 -2"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {edges.map(edge => {
            const fromPos = positions.get(edge.fromId)
            const toPos = positions.get(edge.toId)
            if (!fromPos || !toPos) return null
            const isPass = edge.type === 'pass'
            const isFail = edge.type === 'fail'
            const isDefault = edge.type === 'default' || (!isPass && !isFail)
            const color = isPass ? 'var(--status-pass-text)' : isFail ? 'var(--status-fail-text)' : 'var(--text-tertiary)'
            const dashArray = isPass ? 'none' : isFail ? '6 4' : '3 3'
            const midX = (fromPos.x + toPos.x) / 2
            const midY = (fromPos.y + toPos.y) / 2 - 12
            const marker = isPass ? 'url(#arrow-pass)' : isFail ? 'url(#arrow-fail)' : 'url(#arrow-default)'
            const isChecked = unlinkChecked.has(edge.id)

            const fromNode = nodes.find(n => n.id === edge.fromId)
            const isVertical = fromNode?.direction === 'vertical'

            let pathD: string
            if (isVertical) {
              pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${fromPos.y + 80}, ${toPos.x} ${toPos.y - 80}, ${toPos.x} ${toPos.y}`
            } else {
              pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + 80} ${fromPos.y}, ${toPos.x - 80} ${toPos.y}, ${toPos.x} ${toPos.y}`
            }

            const handleClick = () => {
              if (unlinkMode) {
                handleToggleUnlinkCheck(edge.id)
              } else if (isPass) {
                onUpdateEdge(edge.id, { type: 'fail' })
              } else if (isFail) {
                onUpdateEdge(edge.id, { type: 'default' })
              } else {
                onUpdateEdge(edge.id, { type: 'pass' })
              }
            }

            return (
              <g key={edge.id}>
                {/* Wider invisible hitbox for clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer' }}
                  onClick={handleClick}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={unlinkMode && isChecked ? 'var(--status-skip-text)' : color}
                  strokeWidth={unlinkMode && isChecked ? 2.5 : hoveredEdge === edge.id ? 2.5 : 1.8}
                  strokeDasharray={unlinkMode && isChecked ? '6 4' : dashArray}
                  markerEnd={unlinkMode ? undefined : marker}
                  style={{ transition: 'stroke-width 150ms ease-out, stroke 150ms ease-out', pointerEvents: 'none' }}
                />
                {/* Unlink checkbox on conditional edge */}
                {unlinkMode && (
                  <g transform={`translate(${midX}, ${midY})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={-7} y={-7} width={14} height={14} rx={3}
                      fill={isChecked ? 'var(--status-skip-text)' : 'var(--bg-card)'}
                      stroke={isChecked ? 'var(--status-skip-text)' : 'var(--border)'}
                      strokeWidth={1.5}
                    />
                    {isChecked && (
                      <path
                        d="M -4 0 L -1 3 L 4 -2"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                )}
                {!unlinkMode && hoveredEdge === edge.id && (
                  <g
                    transform={`translate(${midX}, ${midY - 12})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <rect x={-22} y={-7} width={44} height={14} rx={7} fill={isPass ? 'var(--status-pass-bg)' : isFail ? 'var(--status-fail-bg)' : 'var(--bg-secondary)'} stroke={isPass ? 'var(--status-pass-text)' : isFail ? 'var(--status-fail-text)' : 'var(--border)'} strokeWidth={0.5} />
                    <text textAnchor="middle" dominantBaseline="central" style={{ fill: color, fontSize: 9, fontWeight: 500 }}>
                      {isPass ? 'Pass' : isFail ? 'Fail' : 'Default'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {edgeDrag && (
            <line
              x1={edgeDrag.startX}
              y1={edgeDrag.startY}
              x2={edgeDrag.curX}
              y2={edgeDrag.curY}
              stroke={edgeDrag.type === 'pass' ? 'var(--status-pass-text)' : 'var(--status-fail-text)'}
              strokeWidth={2}
              strokeDasharray="6 4"
              opacity={0.6}
            />
          )}

          {nodes.map(node => {
            const pos = positions.get(node.id)
            if (!pos) return null
            const depth = getDepth(node, nodes)
            return (
              <MindmapNode
                key={node.id}
                node={node}
                position={pos}
                isSelected={node.id === selectedNodeId}
                testCases={testCases[node.id] ?? []}
                isDragged={nodeDrag?.id === node.id}
                edgeDragActive={edgeDrag !== null}
                isEdgeDropTarget={hoveredNodeId === node.id && edgeDrag !== null && node.id !== edgeDrag.fromId}
                deleteMode={deleteMode}
                isDeleteChecked={deleteChecked.has(node.id)}
                onSelect={onSelect}
                onAddChild={(parentId, label, pos, direction) => {
                  onAddNode(parentId, label, pos, direction)
                }}
                onDelete={onDeleteNode}
                onUnlinkNode={onUnlinkNode}
                onRename={onRenameNode}
                onUpdateNode={onUpdateNode}
                onDragStart={handleNodeDragStart}
                onEdgeStart={handleEdgeStart}
                onToggleDeleteCheck={handleToggleDeleteCheck}
                depth={depth}
                svgRef={svgRef}
              />
            )
          })}
        </g>
      </svg>

      {creating && createPos && (
        <InlineCreate
          position={createPos}
          scale={scale}
          pan={pan}
          svgRef={svgRef}
          onSubmit={handleCreateSubmit}
          onCancel={() => setCreating(false)}
        />
      )}

      {nodes.length === 0 && !creating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <RippleButton
            onClick={() => {
              if (!svgRef.current) { setCreatePos({ x: 0, y: 0 }); setCreating(true); return }
              const rect = svgRef.current.getBoundingClientRect()
              const centerX = (rect.width / 2 / scale) - pan.x
              const centerY = (rect.height / 2 / scale) - pan.y
              setCreatePos({ x: centerX, y: centerY })
              setCreating(true)
            }}
            rippleColor="rgba(0,0,0,0.08)"
            className="text-sm px-6 py-2.5"
            style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)', borderRadius: 'var(--radius-pill)', backgroundColor: 'transparent' }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Create your first flow node
            </span>
          </RippleButton>
        </div>
      )}

      {nodes.length > 0 && (
        <Minimap nodes={nodes} positions={positions} pan={pan} scale={scale} />
      )}
    </div>
  )
}

function Minimap({ nodes, positions, pan, scale }: { nodes: FlowNode[]; positions: Map<string, { x: number; y: number }>; pan: { x: number; y: number }; scale: number }) {
  const allPos = Array.from(positions.values())
  if (allPos.length === 0) return null
  const minX = Math.min(...allPos.map(p => p.x))
  const maxX = Math.max(...allPos.map(p => p.x))
  const minY = Math.min(...allPos.map(p => p.y))
  const maxY = Math.max(...allPos.map(p => p.y))
  const padding = 40
  const rangeX = maxX - minX + padding * 2
  const rangeY = maxY - minY + padding * 2
  const mmW = 120
  const mmH = Math.max(60, (rangeY / rangeX) * mmW)
  const sx = mmW / rangeX
  const sy = mmH / rangeY

  return (
    <div
      className="absolute bottom-3 right-3 border z-10"
      style={{ width: mmW, height: mmH, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', opacity: 0.85 }}
    >
      <svg width={mmW} height={mmH}>
        {nodes.map(n => {
          const pos = positions.get(n.id)
          if (!pos) return null
          const cx = (pos.x - minX + padding) * sx
          const cy = (pos.y - minY + padding) * sy
          return <circle key={n.id} cx={cx} cy={cy} r={2.5} fill="var(--accent)" opacity={0.6} />
        })}
      </svg>
    </div>
  )
}

function getDepth(node: FlowNode, allNodes: FlowNode[]): number {
  let depth = 0
  let current = node
  while (current.parentId) {
    depth++
    const parent = allNodes.find(n => n.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return depth
}

function InlineCreate({ position, scale, pan, svgRef, onSubmit, onCancel }: {
  position: { x: number; y: number }
  scale: number
  pan: { x: number; y: number }
  svgRef: React.RefObject<SVGSVGElement>
  onSubmit: (label: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getScreenPos = useCallback(() => {
    if (!svgRef.current) return { left: '50%', top: '50%' }
    const rect = svgRef.current.getBoundingClientRect()
    const screenX = (position.x + pan.x) * scale + rect.left
    const screenY = (position.y + pan.y) * scale + rect.top
    return { left: screenX, top: screenY }
  }, [position, scale, pan, svgRef])

  const screenPos = getScreenPos()
  const nodeW = 144 * scale
  const nodeH = 48 * scale

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (value.trim()) onSubmit(value)
        else onCancel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, onSubmit, onCancel])

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        left: `${screenPos.left}px`,
        top: `${screenPos.top}px`,
        transform: 'translate(-50%, 0)',
      }}
    >
      {/* Connector line */}
      <div
        style={{
          width: 2,
          height: 20 * scale,
          margin: '0 auto',
          backgroundColor: 'var(--border-hover)',
        }}
      />
      {/* Node preview */}
      <div
        style={{
          width: `${nodeW}px`,
          height: `${nodeH}px`,
          border: '1.5px dashed var(--accent)',
          borderRadius: 4 * scale,
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${4 * scale}px`,
        }}
      >
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { if (value.trim()) onSubmit(value) }
            if (e.key === 'Escape') onCancel()
            e.stopPropagation()
          }}
          onBlur={() => { if (value.trim()) onSubmit(value); else onCancel() }}
          placeholder="Name node..."
          className="w-full h-full bg-transparent outline-none text-center text-xs"
          style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}
        />
      </div>
    </div>
  )
}
