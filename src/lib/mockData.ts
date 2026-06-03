import { Project, FlowNode, TestCase, ConditionalEdge, DEFAULT_COLUMNS } from '@/types'

const MOCK_PROJECT_ID = 'mock-dashboard-project'
const MOCK_NODE_ID_1 = 'node-login'
const MOCK_NODE_ID_2 = 'node-dashboard'
const MOCK_NODE_ID_3 = 'node-settings'

const CAKRA_PROJECT_ID = 'mock-cakra-project'
const CAKRA_NODE_1 = 'cakra-overview'
const CAKRA_NODE_2 = 'cakra-datasource'
const CAKRA_NODE_3 = 'cakra-reports'

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

// Revamp Cakra — Mobile Data Aggregator Dashboard
const cakraFlows: FlowNode[] = [
  {
    id: CAKRA_NODE_1,
    code: 'CK-001',
    label: 'Overview Dashboard',
    parentId: null,
    children: [CAKRA_NODE_2, CAKRA_NODE_3],
    shape: 'rounded',
    notes: 'Main dashboard with data summary cards and charts',
    position: { x: 250, y: 100 },
  },
  {
    id: CAKRA_NODE_2,
    code: 'CK-002',
    label: 'Data Sources',
    parentId: CAKRA_NODE_1,
    children: [],
    shape: 'rounded',
    notes: 'Connect and manage mobile data sources',
    position: { x: 100, y: 280 },
  },
  {
    id: CAKRA_NODE_3,
    code: 'CK-003',
    label: 'Reports',
    parentId: CAKRA_NODE_1,
    children: [],
    shape: 'rounded',
    notes: 'Generate and export aggregated reports',
    position: { x: 400, y: 280 },
  },
]

const cakraEdges: ConditionalEdge[] = [
  { id: 'cakra-edge-1', fromId: CAKRA_NODE_1, toId: CAKRA_NODE_2, type: 'pass' },
  { id: 'cakra-edge-2', fromId: CAKRA_NODE_1, toId: CAKRA_NODE_3, type: 'pass' },
]

const cakraTestCases: Record<string, TestCase[]> = {
  [CAKRA_NODE_1]: [
    {
      id: 'ck-tc-001',
      code: 'CK-TC-001',
      title: 'Dashboard loads summary cards',
      steps: '1. Login to Revamp Cakra\n2. Wait for overview to load\n3. Check summary cards',
      expected: 'Summary cards display total data sources, active connections, and last sync time.',
      status: 'pass',
      notes: '',
      links: '',
      order: 0,
    },
    {
      id: 'ck-tc-002',
      code: 'CK-TC-002',
      title: 'Data refresh button works',
      steps: '1. Click refresh button on overview\n2. Wait for loading indicator\n3. Verify data updates',
      expected: 'Loading spinner appears. Data refreshes with latest values from connected sources.',
      status: 'untested',
      notes: '',
      links: '',
      order: 1,
    },
  ],
  [CAKRA_NODE_2]: [
    {
      id: 'ck-tc-003',
      code: 'CK-TC-003',
      title: 'Add new data source',
      steps: '1. Navigate to Data Sources\n2. Click "Add Source"\n3. Enter API endpoint\n4. Enter auth token\n5. Click Connect',
      expected: 'New data source appears in the list with status "Connected". Test connection succeeds.',
      status: 'pass',
      notes: '',
      links: '',
      order: 0,
    },
    {
      id: 'ck-tc-004',
      code: 'CK-TC-004',
      title: 'Remove data source',
      steps: '1. Navigate to Data Sources\n2. Click delete on a source\n3. Confirm deletion',
      expected: 'Data source is removed from list. Associated data is archived.',
      status: 'fail',
      notes: 'Bug: confirmation dialog missing, deletes immediately',
      links: '',
      order: 1,
    },
  ],
  [CAKRA_NODE_3]: [
    {
      id: 'ck-tc-005',
      code: 'CK-TC-005',
      title: 'Generate PDF report',
      steps: '1. Navigate to Reports\n2. Select date range\n3. Click "Generate PDF"\n4. Wait for generation',
      expected: 'PDF file downloads with aggregated data, charts, and summary table.',
      status: 'untested',
      notes: '',
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

export function getCakraProject(): Project {
  return {
    id: CAKRA_PROJECT_ID,
    name: 'Revamp Cakra',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    flows: cakraFlows,
    testCases: cakraTestCases,
    columnConfig: [...DEFAULT_COLUMNS],
    columnConfigs: {},
    edges: cakraEdges,
    userProfile: { name: 'Ayu', bannerColor: '#64B5F6', role: 'QA Lead' },
    nodeCounter: 3,
    tcCounter: {
      [CAKRA_NODE_1]: 2,
      [CAKRA_NODE_2]: 2,
      [CAKRA_NODE_3]: 1,
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
    }

    // Seed Revamp Cakra project
    if (!state.projects[CAKRA_PROJECT_ID]) {
      state.projects[CAKRA_PROJECT_ID] = getCakraProject()
    }

    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // Ignore errors
  }
}
