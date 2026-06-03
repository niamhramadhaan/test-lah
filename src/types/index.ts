export type Status = 'untested' | 'pass' | 'fail' | 'skip'

export type NodeShape = 'rect' | 'rounded' | 'diamond' | 'circle' | 'pill'

export type EdgeType = 'pass' | 'fail' | 'default'

export type NodeDirection = 'horizontal' | 'vertical'

export interface FlowNode {
  id: string
  code: string
  label: string
  parentId: string | null
  children: string[]
  shape: NodeShape
  notes: string
  position: { x: number; y: number } | null
  direction?: NodeDirection
}

export interface ConditionalEdge {
  id: string
  fromId: string
  toId: string
  type: EdgeType
}

export interface TestCase {
  id: string
  code: string
  title: string
  steps: string
  expected: string
  status: Status
  notes: string
  links: string
  order: number
}

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
}

export interface UserProfile {
  name: string
  bannerColor: string
  avatarUrl?: string
  role?: string
}

export interface Project {
  id: string
  name: string
  createdAt: string
  flows: FlowNode[]
  testCases: Record<string, TestCase[]>
  columnConfig: ColumnConfig[]
  columnConfigs: Record<string, ColumnConfig[]>
  edges: ConditionalEdge[]
  userProfile: UserProfile
  nodeCounter: number
  tcCounter: Record<string, number>
}

export interface AppState {
  projects: Record<string, Project>
  activeProjectId: string | null
  selectedNodeId: string | null
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'code', label: 'ID', visible: true },
  { key: 'title', label: 'Test Case', visible: true },
  { key: 'steps', label: 'Steps', visible: true },
  { key: 'expected', label: 'Expected Result', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'notes', label: 'Notes', visible: true },
  { key: 'links', label: 'Links', visible: false },
]

export const AVATAR_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD',
  '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
  '#4DB6AC', '#81C784', '#AED581', '#FFD54F',
  '#FFB74D', '#FF8A65', '#A1887F', '#90A4AE',
]

export function createDefaultNode(id: string, code: string, label: string, parentId: string | null): FlowNode {
  return { id, code, label, parentId, children: [], shape: 'rounded', notes: '', position: null }
}
