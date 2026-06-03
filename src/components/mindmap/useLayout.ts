'use client'

import { useMemo } from 'react'
import { FlowNode } from '@/types'
import { computeLayout, NodePosition } from '@/lib/mindmapLayout'

export function useLayout(nodes: FlowNode[]): Map<string, NodePosition> {
  return useMemo(() => computeLayout(nodes), [nodes])
}
