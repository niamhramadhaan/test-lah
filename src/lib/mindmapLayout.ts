import { FlowNode } from '@/types'

export interface NodePosition {
  x: number
  y: number
}

const H_GAP = 180
const V_GAP = 70
const ROOT_X = 60

export function computeLayout(nodes: FlowNode[]): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>()
  if (nodes.length === 0) return positions

  const nodeMap = new Map<string, FlowNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  const customNodes = new Set<string>()
  for (const n of nodes) {
    if (n.position) {
      customNodes.add(n.id)
    }
  }

  const roots = nodes.filter(n => n.parentId === null)
  if (roots.length === 0) return positions

  function placeNode(
    nodeId: string,
    depth: number,
    yStart: number,
    offsetX: number,
    offsetY: number,
  ): number {
    const node = nodeMap.get(nodeId)
    if (!node) return yStart

    const isVertical = node.direction === 'vertical'
    const autoX = isVertical ? (node.position?.x ?? offsetX) : ROOT_X + depth * H_GAP

    // Place children first
    let curY = yStart
    for (const cid of node.children) {
      if (isVertical) {
        curY = placeNode(cid, depth, curY, offsetX, offsetY)
      } else {
        curY = placeNode(cid, depth + 1, curY, offsetX, offsetY)
      }
    }

    // Compute center from children positions
    const children = node.children.map(cid => positions.get(cid)).filter(Boolean) as NodePosition[]
    const centerY = children.length > 0
      ? (Math.min(...children.map(c => c.y)) + Math.max(...children.map(c => c.y))) / 2
      : yStart

    if (customNodes.has(nodeId) && node.position) {
      // Custom position: compute offset from auto-layout position, re-place children
      const autoCenterY = children.length > 0 ? centerY : yStart
      const newOffsetX = node.position.x - (isVertical ? node.position.x : autoX)
      const newOffsetY = node.position.y - autoCenterY
      positions.set(nodeId, node.position)
      // Re-place children with this node's offset
      let retryY = yStart
      for (const cid of node.children) {
        if (isVertical) {
          retryY = placeNode(cid, depth, retryY, newOffsetX, newOffsetY)
        } else {
          retryY = placeNode(cid, depth + 1, retryY, newOffsetX, newOffsetY)
        }
      }
      return retryY
    }

    // Auto-placed: apply inherited offset
    if (isVertical) {
      // For vertical nodes, place children below with V_GAP
      positions.set(nodeId, { x: (node.position?.x ?? 0) + offsetX, y: centerY + offsetY })
    } else {
      positions.set(nodeId, { x: autoX + offsetX, y: centerY + offsetY })
    }
    return curY
  }

  let yCursor = 0
  for (const root of roots) {
    yCursor = placeNode(root.id, 0, yCursor, 0, 0)
  }

  // Center vertically around y=300, but skip nodes with custom positions
  const allPos = Array.from(positions.entries())
  if (allPos.length > 0) {
    // Only center based on auto-placed nodes
    const autoPlacedY = allPos
      .filter(([id]) => !customNodes.has(id))
      .map(([, p]) => p.y)

    if (autoPlacedY.length > 0) {
      const minAllY = Math.min(...autoPlacedY)
      const maxAllY = Math.max(...autoPlacedY)
      const centerOffset = (minAllY + maxAllY) / 2

      for (const [id, pos] of allPos) {
        if (!customNodes.has(id)) {
          positions.set(id, { x: pos.x, y: pos.y - centerOffset + 300 })
        }
      }
    }
  }

  return positions
}
