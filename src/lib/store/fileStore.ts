import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { AppState, Project, DEFAULT_COLUMNS } from '@/types'
import { getDataDir } from '@/lib/dataDir'

const DATA_DIR = getDataDir()
const STATE_FILE = path.join(DATA_DIR, 'state.json')

const INITIAL_STATE: AppState = {
  projects: {},
  activeProjectId: null,
  selectedNodeId: null,
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readState(): AppState {
  ensureDataDir()
  if (!fs.existsSync(STATE_FILE)) {
    writeState(INITIAL_STATE)
    return INITIAL_STATE
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw) as AppState
  } catch {
    return INITIAL_STATE
  }
}

export function writeState(state: AppState): void {
  ensureDataDir()
  const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8')
  fs.renameSync(tmpFile, STATE_FILE)
}

// Serializes writes within this process so a browser autosave and an MCP
// tool call can't interleave and clobber each other's read-modify-write.
let writeQueue: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => T): Promise<T> {
  const result = writeQueue.then(fn)
  writeQueue = result.catch(() => {})
  return result
}

export function getProject(state: AppState, projectId: string): Project {
  const project = state.projects[projectId]
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return project
}

export async function updateProject(
  projectId: string,
  updater: (p: Project) => Project,
): Promise<Project> {
  return withLock(() => {
    const state = readState()
    const project = getProject(state, projectId)
    const updated = updater(project)
    const nextState: AppState = {
      ...state,
      projects: { ...state.projects, [projectId]: updated },
    }
    writeState(nextState)
    return updated
  })
}

export async function createProject(name: string, type?: string): Promise<Project> {
  return withLock(() => {
    const state = readState()
    const id = randomUUID()
    const project: Project = {
      id,
      name,
      type: type || '',
      notes: '',
      createdAt: new Date().toISOString(),
      flows: [],
      testCases: {},
      columnConfig: [...DEFAULT_COLUMNS],
      columnConfigs: {},
      edges: [],
      userProfile: { name: '', bannerColor: '#64B5F6' },
      nodeCounter: 0,
      tcCounter: {},
    }
    writeState({
      ...state,
      projects: { ...state.projects, [id]: project },
    })
    return project
  })
}
