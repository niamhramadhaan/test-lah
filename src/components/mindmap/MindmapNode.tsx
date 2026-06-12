'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { FlowNode, TestCase } from '@/types'
import { NodePosition } from '@/lib/mindmapLayout'

interface MindmapNodeProps {
  node: FlowNode
  position: NodePosition
  isSelected: boolean
  testCases: TestCase[]
  isDragged: boolean
  edgeDragActive: boolean
  isEdgeDropTarget: boolean
  deleteMode: boolean
  isDeleteChecked: boolean
  onSelect: (id: string) => void
  onAddChild: (parentId: string, label: string, position?: { x: number; y: number }, direction?: 'horizontal' | 'vertical') => void
  onDelete: (id: string) => void
  onUnlinkNode: (id: string) => void
  onRename: (id: string, label: string) => void
  onUpdateNode: (id: string, patch: Partial<FlowNode>) => void
  onDragStart: (id: string, startClientX: number, startClientY: number, startNodeX: number, startNodeY: number) => void
  onEdgeStart: (id: string, edgeType: 'pass' | 'fail', x: number, y: number, direction: 'horizontal' | 'vertical') => void
  onToggleDeleteCheck: (id: string) => void
  depth: number
  svgRef: React.RefObject<SVGSVGElement>
}

function getNodeSize(depth: number) {
  if (depth === 0) return { w: 160, h: 56 }
  if (depth === 1) return { w: 144, h: 48 }
  return { w: 132, h: 42 }
}

export const MindmapNode = memo(function MindmapNode({
  node,
  position,
  isSelected,
  testCases,
  isDragged,
  edgeDragActive,
  isEdgeDropTarget,
  deleteMode,
  isDeleteChecked,
  onSelect,
  onAddChild,
  onDelete,
  onUnlinkNode,
  onRename,
  onUpdateNode,
  onDragStart,
  onEdgeStart,
  onToggleDeleteCheck,
  depth,
  svgRef,
}: MindmapNodeProps) {
  const [editing, setEditing] = useState(false)
  const [labelValue, setLabelValue] = useState(node.label)
  const [hovered, setHovered] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [addChildDir, setAddChildDir] = useState<'horizontal' | 'vertical'>('horizontal')
  const [childLabel, setChildLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const childInputRef = useRef<HTMLInputElement>(null)
  const childInputContainerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ startX: 0, startY: 0, moved: false })

  const { w, h } = getNodeSize(depth)

  const hasFail = testCases.some(tc => tc.status === 'fail')
  const hasSkip = testCases.some(tc => tc.status === 'skip')
  const hasUntested = testCases.some(tc => tc.status === 'untested')
  const hasUnpassed = hasFail || hasSkip || hasUntested
  const allPass = testCases.length > 0 && testCases.every(tc => tc.status === 'pass')

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.parentId === node.id) {
        setAddingChild(true)
        setChildLabel('')
      }
    }
    window.addEventListener('mindmap:add-child', handler)
    return () => window.removeEventListener('mindmap:add-child', handler)
  }, [node.id])

  useEffect(() => {
    if (!addingChild) return
    const handler = (e: MouseEvent) => {
      if (childInputContainerRef.current && !childInputContainerRef.current.contains(e.target as Node)) {
        if (childLabel.trim()) {
          commitAddChild()
        } else {
          setAddingChild(false)
          setChildLabel('')
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addingChild, childLabel])

  useEffect(() => {
    if (addingChild && childInputRef.current) {
      childInputRef.current.focus()
    }
  }, [addingChild])

  const startEdit = useCallback(() => {
    setLabelValue(node.label)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [node.label])

  const commitEdit = useCallback(() => {
    if (labelValue.trim()) onRename(node.id, labelValue.trim())
    setEditing(false)
  }, [labelValue, node.id, onRename])

  const commitAddChild = useCallback(() => {
    if (childLabel.trim()) {
      const childPos = addChildDir === 'vertical'
        ? { x: position.x, y: position.y + h + 60 }
        : { x: position.x + w + 120, y: position.y }
      onAddChild(node.id, childLabel.trim(), childPos, addChildDir)
    }
    setAddingChild(false)
    setChildLabel('')
  }, [childLabel, node.id, onAddChild, position.x, position.y, h, w, addChildDir])

  const handleAddChildClick = useCallback((direction: 'horizontal' | 'vertical') => (e: React.MouseEvent) => {
    e.stopPropagation()
    setAddChildDir(direction)
    setAddingChild(true)
    setChildLabel('')
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return
    if (deleteMode) return
    e.stopPropagation()

    const target = e.target as SVGElement
    const isDragHandle = target.closest('[data-drag-handle="true"]')
    if (!isDragHandle) {
      onSelect(node.id)
      return
    }

    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false }

    const preventContext = (ev: Event) => ev.preventDefault()
    document.addEventListener('contextmenu', preventContext)

    const handleMove = (me: MouseEvent) => {
      const dx = me.clientX - dragState.current.startX
      const dy = me.clientY - dragState.current.startY
      if (!dragState.current.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragState.current.moved = true
        onDragStart(node.id, dragState.current.startX, dragState.current.startY, position.x, position.y)
      }
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      setTimeout(() => document.removeEventListener('contextmenu', preventContext), 100)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [node.id, onSelect, onDragStart, deleteMode, position])

  const uid = node.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const showActions = isSelected && !deleteMode
  const rx = 4
  const btnSize = 22
  const arrowSize = 8

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onMouseDown={handleMouseDown}
      onDoubleClick={e => { e.stopPropagation(); if (!deleteMode) startEdit() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: deleteMode ? 'pointer' : 'default', transition: isDragged ? 'none' : 'transform 150ms ease-out' }}
      onClick={() => { if (deleteMode) onToggleDeleteCheck(node.id) }}
    >
      <defs>
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FAF9F7" />
        </linearGradient>
        <filter id={`shadow-${uid}`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" />
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.05" />
        </filter>
        <filter id={`shadow-hover-${uid}`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.08" />
        </filter>
        <filter id={`shadow-drag-${uid}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.2" />
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodOpacity="0.1" />
        </filter>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.4 0 0 0 0 0.8 0 0 0 0 0.4 0 0 0 0.6 0" />
        </filter>
      </defs>

      {/* Top drag handle */}
      {!deleteMode && (
        <g
          data-drag-handle="true"
          transform={`translate(0, ${-h / 2 - 10})`}
          style={{ cursor: isDragged ? 'grabbing' : 'grab' }}
        >
          <rect
            x={-20} y={-7}
            width={40} height={14}
            rx={4}
            fill="var(--bg-card)"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={hovered || isSelected ? 0.9 : 0.5}
            style={{ transition: 'opacity 150ms ease-out' }}
          />
          <circle cx={-8} cy={-1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={-8} cy={1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={-4} cy={-1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={-4} cy={1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={0} cy={-1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={0} cy={1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={4} cy={-1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={4} cy={1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={8} cy={-1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
          <circle cx={8} cy={1.5} r={1.2} fill="var(--text-tertiary)" opacity={0.6} />
        </g>
      )}

      {/* Edge drop target glow */}
      {isEdgeDropTarget && (
        <rect
          x={-w / 2 - 6} y={-h / 2 - 6}
          width={w + 12} height={h + 12}
          rx={rx + 4}
          fill="var(--status-pass-bg)" stroke="var(--status-pass-text)"
          strokeWidth={2} opacity={0.5}
        />
      )}

      {/* Paper card */}
      {(() => {
        const tintFill = hasFail ? 'var(--status-fail-bg)' : hasUnpassed ? 'var(--status-skip-bg)' : allPass ? 'var(--status-pass-bg)' : null
        const tintOpacity = hasFail ? 0.2 : hasUnpassed ? 0.15 : 0.15
        return (
          <>
            {tintFill && <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={tintFill} opacity={tintOpacity} />}
            <rect
              x={-w / 2} y={-h / 2} width={w} height={h} rx={rx}
              fill={`url(#fill-${uid})`}
              stroke={deleteMode && isDeleteChecked ? 'var(--status-fail-text)' : 'var(--border)'}
              strokeWidth={deleteMode && isDeleteChecked ? 2 : 0.5}
              filter={isDragged ? `url(#shadow-drag-${uid})` : hovered ? `url(#shadow-hover-${uid})` : `url(#shadow-${uid})`}
              style={{ transition: 'filter 200ms ease-out, stroke 150ms ease-out' }}
            />
            {/* Paper fold corner */}
            <path
              d={`M ${w / 2 - 10} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${-h / 2 + 10} Z`}
              fill="var(--bg-secondary)"
              opacity={0.5}
            />
            <path
              d={`M ${w / 2 - 10} ${-h / 2} L ${w / 2 - 10} ${-h / 2 + 10} L ${w / 2} ${-h / 2 + 10}`}
              fill="none"
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          </>
        )
      })()}

      {/* Test case status badge */}
      {testCases.length > 0 && !deleteMode && (
        <g
          transform={`translate(${w / 2 - 6}, ${h / 2 - 6})`}
          style={{ opacity: hovered || isSelected ? 1 : 0.7, transition: 'opacity 150ms ease-out' }}
        >
          {/* Badge background */}
          <rect
            x={-12} y={-8}
            width={24} height={16}
            rx={8}
            fill={hasFail ? 'var(--status-fail-bg)' : hasUnpassed ? 'var(--status-skip-bg)' : 'var(--status-pass-bg)'}
            stroke={hasFail ? 'var(--status-fail-text)' : hasUnpassed ? 'var(--status-skip-text)' : 'var(--status-pass-text)'}
            strokeWidth={0.75}
          />
          {/* Count text */}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: hasFail ? 'var(--status-fail-text)' : hasUnpassed ? 'var(--status-skip-text)' : 'var(--status-pass-text)',
              fontSize: 9,
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {hasFail ? testCases.filter(tc => tc.status === 'fail').length : hasUnpassed ? testCases.filter(tc => tc.status !== 'pass').length : testCases.length}/{testCases.length}
          </text>
        </g>
      )}

      {/* Delete checkbox */}
      {deleteMode && (
        <g transform={`translate(${-w / 2 + 8}, 0)`}>
          <rect
            x={-7} y={-7} width={14} height={14} rx={3}
            fill={isDeleteChecked ? 'var(--status-fail-text)' : 'transparent'}
            stroke={isDeleteChecked ? 'var(--status-fail-text)' : 'var(--border)'}
            strokeWidth={1.5}
          />
          {isDeleteChecked && (
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

      {/* Node code badge — visible on hover/selected */}
      {node.code && !deleteMode && (
        <g
          transform={`translate(${-w / 2 + 6}, ${-h / 2 - 11})`}
          style={{ opacity: hovered || isSelected ? 1 : 0, transition: 'opacity 150ms ease-out' }}
        >
          <rect x={0} y={0} width={Math.max(node.code.length * 6.5 + 10, 28)} height={14} rx={7} fill="var(--accent)" opacity={0.08} />
          <text x={5} y={10} style={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {node.code}
          </text>
        </g>
      )}

      {/* Label — clickable to rename */}
      {editing ? (
        <foreignObject x={-w / 2 + 8} y={-h / 2 + 4} width={w - 16} height={h - 8}>
          <input
            ref={inputRef}
            value={labelValue}
            onChange={e => setLabelValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full h-full bg-transparent outline-none text-center text-xs"
            style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </foreignObject>
      ) : (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="select-none"
          onClick={e => { e.stopPropagation(); if (!deleteMode) startEdit() }}
          style={{
            fill: 'var(--text-primary)',
            fontSize: depth === 0 ? 13 : 11.5,
            fontWeight: depth === 0 ? 600 : 450,
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            cursor: hovered && !deleteMode ? 'text' : 'default',
            pointerEvents: 'auto',
          }}
        >
          {node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label}
        </text>
      )}

      {/* Right-bottom action buttons — visible when selected */}
      {showActions && !editing && !edgeDragActive && (
        <>
          {/* Right side buttons — horizontal add + edge */}
          <g transform={`translate(${w / 2 + 3}, ${-btnSize / 2})`}>
            {/* + button (horizontal child) */}
            <g
              onClick={handleAddChildClick('horizontal')}
              onMouseDown={e => e.stopPropagation()}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={0} y={0}
                width={btnSize} height={btnSize}
                rx={3}
                fill="var(--bg-card)"
                stroke="var(--border)"
                strokeWidth={0.75}
                opacity={0.9}
              />
              <line x1={btnSize / 2} y1={5} x2={btnSize / 2} y2={btnSize - 5} stroke="var(--text-tertiary)" strokeWidth={1.5} strokeLinecap="round" />
              <line x1={5} y1={btnSize / 2} x2={btnSize - 5} y2={btnSize / 2} stroke="var(--text-tertiary)" strokeWidth={1.5} strokeLinecap="round" />
            </g>

            {/* Arrow handle — right side */}
            <g
              transform={`translate(${btnSize + 2}, ${(btnSize - arrowSize) / 2})`}
              onMouseDown={e => {
                e.stopPropagation()
                e.preventDefault()
                onEdgeStart(node.id, 'pass', position.x + w / 2 + 3 + btnSize + 2 + arrowSize / 2, position.y - btnSize / 2 + btnSize / 2, 'horizontal')
              }}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
                onEdgeStart(node.id, 'fail', position.x + w / 2 + 3 + btnSize + 2 + arrowSize / 2, position.y - btnSize / 2 + btnSize / 2, 'horizontal')
              }}
              style={{ cursor: 'crosshair' }}
            >
              <circle
                cx={arrowSize / 2}
                cy={arrowSize / 2}
                r={arrowSize / 2}
                fill="var(--status-pass-text)"
                opacity={0.8}
              >
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>

          {/* Bottom side buttons — vertical add + edge */}
          <g transform={`translate(${-btnSize / 2}, ${h / 2 + 3})`}>
            {/* + button (vertical child) */}
            <g
              onClick={handleAddChildClick('vertical')}
              onMouseDown={e => e.stopPropagation()}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={0} y={0}
                width={btnSize} height={btnSize}
                rx={3}
                fill="var(--bg-card)"
                stroke="var(--border)"
                strokeWidth={0.75}
                opacity={0.9}
              />
              <line x1={btnSize / 2} y1={5} x2={btnSize / 2} y2={btnSize - 5} stroke="var(--text-tertiary)" strokeWidth={1.5} strokeLinecap="round" />
              <line x1={5} y1={btnSize / 2} x2={btnSize - 5} y2={btnSize / 2} stroke="var(--text-tertiary)" strokeWidth={1.5} strokeLinecap="round" />
            </g>

            {/* Arrow handle — bottom side */}
            <g
              transform={`translate(${btnSize + 2}, ${(btnSize - arrowSize) / 2})`}
              onMouseDown={e => {
                e.stopPropagation()
                e.preventDefault()
                onEdgeStart(node.id, 'pass', position.x - btnSize / 2 + btnSize / 2, position.y + h / 2 + 3 + btnSize + 2 + arrowSize / 2, 'vertical')
              }}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
                onEdgeStart(node.id, 'fail', position.x - btnSize / 2 + btnSize / 2, position.y + h / 2 + 3 + btnSize + 2 + arrowSize / 2, 'vertical')
              }}
              style={{ cursor: 'crosshair' }}
            >
              <circle
                cx={arrowSize / 2}
                cy={arrowSize / 2}
                r={arrowSize / 2}
                fill="var(--accent)"
                opacity={0.8}
              >
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>
        </>
      )}

      {/* Drop handles during edge drag */}
      {edgeDragActive && !isEdgeDropTarget && (
        <>
          <g transform={`translate(${-w / 2 - 10}, 0)`}>
            <circle r={6} fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          </g>
          <g transform={`translate(0, ${-h / 2 - 10})`}>
            <circle r={6} fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1.5} opacity={0.6} strokeDasharray="3 2" />
          </g>
        </>
      )}

      {/* Inline add child — shows new node preview with line */}
      {addingChild && (
        <g>
          {/* Line from parent to child */}
          {addChildDir === 'vertical' ? (
            <line x1={0} y1={h / 2} x2={0} y2={h / 2 + 50} stroke="var(--border-hover)" strokeWidth={1.5} />
          ) : (
            <line x1={w / 2} y1={0} x2={w / 2 + 50} y2={0} stroke="var(--border-hover)" strokeWidth={1.5} />
          )}
          {/* New node preview */}
          <rect
            x={addChildDir === 'vertical' ? -w / 2 : w / 2 + 50}
            y={addChildDir === 'vertical' ? h / 2 + 50 : -h / 2}
            width={w} height={h}
            rx={rx}
            fill="var(--bg-card)"
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          {/* Inline input for naming */}
          <foreignObject
            x={addChildDir === 'vertical' ? -w / 2 + 4 : w / 2 + 50 + 4}
            y={addChildDir === 'vertical' ? h / 2 + 50 + 4 : -h / 2 + 4}
            width={w - 8} height={h - 8}
          >
            <div ref={childInputContainerRef}>
              <input
                ref={childInputRef}
                value={childLabel}
                onChange={e => setChildLabel(e.target.value)}
                onBlur={() => {
                  if (childLabel.trim()) {
                    commitAddChild()
                  } else {
                    setAddingChild(false)
                    setChildLabel('')
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitAddChild()
                  if (e.key === 'Escape') { setAddingChild(false); setChildLabel('') }
                  e.stopPropagation()
                }}
                onMouseDown={e => e.stopPropagation()}
                placeholder="Name node..."
                className="w-full h-full bg-transparent outline-none text-center text-xs"
                style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  )
})
