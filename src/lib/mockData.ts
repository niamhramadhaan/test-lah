import { Project, FlowNode, TestCase, ConditionalEdge, DEFAULT_COLUMNS } from '@/types'

const MOCK_PROJECT_ID = 'mock-dashboard-project'
const MOCK_NODE_ID_1 = 'node-login'
const MOCK_NODE_ID_2 = 'node-dashboard'
const MOCK_NODE_ID_3 = 'node-settings'

const mockFlows: FlowNode[] = [
  {
    id: MOCK_NODE_ID_1,
    code: 'N-001',
    label: 'Login Page',
    parentId: null,
    children: [MOCK_NODE_ID_2],
    shape: 'rounded',
    notes: 'User authentication flow',
    position: { x: 250, y: 100 },
  },
  {
    id: MOCK_NODE_ID_2,
    code: 'N-002',
    label: 'Dashboard',
    parentId: MOCK_NODE_ID_1,
    children: [MOCK_NODE_ID_3],
    shape: 'rounded',
    notes: 'Main dashboard view after login',
    position: { x: 250, y: 250 },
  },
  {
    id: MOCK_NODE_ID_3,
    code: 'N-003',
    label: 'Settings',
    parentId: MOCK_NODE_ID_2,
    children: [],
    shape: 'rounded',
    notes: 'User settings and preferences',
    position: { x: 250, y: 400 },
  },
]

const mockEdges: ConditionalEdge[] = [
  { id: 'edge-1', fromId: MOCK_NODE_ID_1, toId: MOCK_NODE_ID_2, type: 'pass' },
  { id: 'edge-2', fromId: MOCK_NODE_ID_2, toId: MOCK_NODE_ID_3, type: 'pass' },
]

const mockTestCases: Record<string, TestCase[]> = {
  [MOCK_NODE_ID_1]: [
    {
      id: 'tc-001',
      code: 'TC-001',
      title: 'Valid login with correct credentials',
      steps: '1. Open login page\n2. Enter valid username\n3. Enter valid password\n4. Click "Login" button',
      expected: 'User is redirected to Dashboard page. Welcome message displays username.',
      status: 'pass',
      notes: 'Tested with user "Ayu"',
      links: '',
      order: 0,
    },
    {
      id: 'tc-002',
      code: 'TC-002',
      title: 'Invalid login with wrong credentials',
      steps: '1. Open login page\n2. Enter invalid username\n3. Enter any password\n4. Click "Login" button',
      expected: 'Error popup appears: "Maaf, nama kamu tidak terdaftar". User stays on login page.',
      status: 'pass',
      notes: 'DenialModal should appear',
      links: '',
      order: 1,
    },
    {
      id: 'tc-003',
      code: 'TC-003',
      title: 'Login page UI elements visibility',
      steps: '1. Open login page\n2. Check logo image\n3. Check title text\n4. Check input field\n5. Check button',
      expected: 'Logo displays duck image. Title shows "QA Management Tools". Input has placeholder. Button shows "Masuk ke Dashboard".',
      status: 'untested',
      notes: 'Visual regression check',
      links: '',
      order: 2,
    },
  ],
  [MOCK_NODE_ID_2]: [
    {
      id: 'tc-004',
      code: 'TC-004',
      title: 'Dashboard loads project list',
      steps: '1. Login successfully\n2. Wait for dashboard to load\n3. Check project dropdown',
      expected: 'Project list displays all created projects. Header shows QA Dashboard logo.',
      status: 'pass',
      notes: '',
      links: '',
      order: 0,
    },
    {
      id: 'tc-005',
      code: 'TC-005',
      title: 'Create new project',
      steps: '1. Click project dropdown\n2. Click "New Project"\n3. Enter project name\n4. Confirm',
      expected: 'New project appears in dropdown. Progress bar shows "Project created!"',
      status: 'fail',
      notes: 'Bug: progress bar not showing on some browsers',
      links: '',
      order: 1,
    },
  ],
  [MOCK_NODE_ID_3]: [
    {
      id: 'tc-006',
      code: 'TC-006',
      title: 'Access settings page',
      steps: '1. Login\n2. Navigate to /profile\n3. Check profile form',
      expected: 'Profile page loads with name, avatar color, and role fields.',
      status: 'skip',
      notes: 'Settings page not implemented yet',
      links: '',
      order: 0,
    },
  ],
}

export function getMockProject(): Project {
  return {
    id: MOCK_PROJECT_ID,
    name: 'Simple Dashboard QA',
    createdAt: new Date().toISOString(),
    flows: mockFlows,
    testCases: mockTestCases,
    columnConfig: [...DEFAULT_COLUMNS],
    columnConfigs: {},
    edges: mockEdges,
    userProfile: { name: 'Ayu', bannerColor: '#81C784', role: 'QA Engineer' },
    nodeCounter: 3,
    tcCounter: {
      [MOCK_NODE_ID_1]: 3,
      [MOCK_NODE_ID_2]: 2,
      [MOCK_NODE_ID_3]: 1,
    },
  }
}

export function seedMockProject(): void {
  if (typeof window === 'undefined') return

  const key = 'qa-dashboard'
  try {
    const raw = localStorage.getItem(key)
    const state = raw ? JSON.parse(raw) : { projects: {}, activeProjectId: null, selectedNodeId: null }

    // Only seed if mock project doesn't exist
    if (!state.projects[MOCK_PROJECT_ID]) {
      state.projects[MOCK_PROJECT_ID] = getMockProject()
      state.activeProjectId = MOCK_PROJECT_ID
      localStorage.setItem(key, JSON.stringify(state))
    }
  } catch {
    // Ignore errors
  }
}
