'use client'

import { FlowNode, TestCase, ConditionalEdge } from '@/types'
import { MindmapCanvas } from './MindmapCanvas'

interface MindmapPanelProps {
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
  onResetLayout: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function MindmapPanel(props: MindmapPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Flow Map
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {props.nodes.length} node{props.nodes.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        <button
          onClick={props.onResetLayout}
          className="px-2 py-1 text-[10px] rounded border transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
        >
          Reset layout
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <MindmapCanvas
          nodes={props.nodes}
          edges={props.edges}
          testCases={props.testCases}
          selectedNodeId={props.selectedNodeId}
          onSelect={props.onSelect}
          onAddNode={props.onAddNode}
          onDeleteNode={props.onDeleteNode}
          onDeleteNodes={props.onDeleteNodes}
          onUnlinkNode={props.onUnlinkNode}
          onRenameNode={props.onRenameNode}
          onUpdateNode={props.onUpdateNode}
          onAddEdge={props.onAddEdge}
          onDeleteEdge={props.onDeleteEdge}
          onUpdateEdge={props.onUpdateEdge}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
        />
      </div>
    </div>
  )
}
