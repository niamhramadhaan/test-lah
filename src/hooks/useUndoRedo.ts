'use client'

import { useState, useCallback, useRef } from 'react'
import { AppState, Project } from '@/types'
import { readStorage, writeStorage } from '@/lib/storage'

const MAX_HISTORY = 50

interface HistoryEntry {
  label: string
  projectSnapshot: Project
}

export function useUndoRedo(
  activeProject: Project | null,
  updateProject: (id: string, updater: (p: Project) => Project) => void,
) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const skipPush = useRef(false)

  const pushState = useCallback((label: string) => {
    if (!activeProject || skipPush.current) {
      skipPush.current = false
      return
    }
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      const next = [...trimmed, { label, projectSnapshot: JSON.parse(JSON.stringify(activeProject)) }]
      if (next.length > MAX_HISTORY) next.shift()
      return next
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [activeProject, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex < 0 || !activeProject) return
    const entry = history[historyIndex]
    if (!entry) return
    skipPush.current = true
    updateProject(activeProject.id, () => entry.projectSnapshot)
    setHistoryIndex(prev => prev - 1)
  }, [history, historyIndex, activeProject, updateProject])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !activeProject) return
    const entry = history[historyIndex + 1]
    if (!entry) return
    skipPush.current = true
    updateProject(activeProject.id, () => entry.projectSnapshot)
    setHistoryIndex(prev => prev + 1)
  }, [history, historyIndex, activeProject, updateProject])

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1
  const recentActions = history.slice(-10).map(h => h.label).reverse()

  return { pushState, undo, redo, canUndo, canRedo, recentActions }
}
